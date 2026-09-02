import { addEvent } from "./store";
import type {
  ChainLeg,
  Invoice,
  OnramperStatus,
  OnramperWebhookPayload,
} from "./types";

const MIN_CONFIRMATIONS: Record<string, number> = {
  ethereum: 12,
  polygon: 128,
  base: 8,
  arbitrum: 8,
};

const TERMINAL: Invoice["status"][] = ["crypto_settled", "failed", "expired"];

function isOnramperStatus(v: unknown): v is OnramperStatus {
  return (
    v === "new" ||
    v === "pending" ||
    v === "paid" ||
    v === "completed" ||
    v === "failed" ||
    v === "canceled"
  );
}

/**
 * Fold an Onramper webhook into the invoice.
 *
 * The single most important rule here: `paid` means the provider captured the
 * customer's fiat, and `completed` means the provider says it broadcast the
 * payout. Neither is proof that value landed in our address, so neither moves
 * the invoice to crypto_settled — only a confirmed on-chain deposit does.
 */
export function applyOnramperWebhook(
  invoice: Invoice,
  payload: OnramperWebhookPayload,
): { changed: boolean; note: string } {
  const status = isOnramperStatus(payload.status) ? payload.status : null;
  if (!status) {
    return { changed: false, note: `Ignored unknown status: ${String(payload.status)}` };
  }

  const transactionId = payload.transactionId ?? invoice.onramp?.transactionId ?? "unknown";

  // Idempotency: providers retry, and statuses can arrive out of order.
  if (
    invoice.onramp &&
    invoice.onramp.transactionId === transactionId &&
    invoice.onramp.status === status
  ) {
    return { changed: false, note: `Duplicate ${status} for ${transactionId}` };
  }

  invoice.onramp = {
    transactionId,
    onrampTransactionId: payload.onrampTransactionId,
    provider: payload.onramp,
    status,
    inAmount: payload.inAmount,
    sourceCurrency: payload.sourceCurrency,
    outAmount: payload.outAmount,
    targetCurrency: payload.targetCurrency,
    walletAddress: payload.walletAddress,
    paymentMethod: payload.paymentMethod,
    country: payload.country,
    partnerFee: payload.partnerFee,
    txHash: payload.txHash,
    updatedAt: payload.statusDate ?? new Date().toISOString(),
  };

  // Defence in depth: the address in the payload must be the one we signed.
  // A mismatch means the URL was tampered with or the wrong invoice matched.
  if (
    payload.walletAddress &&
    payload.walletAddress.toLowerCase() !== invoice.depositAddress.toLowerCase()
  ) {
    addEvent(
      invoice,
      "reconcile.address_mismatch",
      `Webhook wallet ${payload.walletAddress} != invoice address ${invoice.depositAddress}`,
    );
    invoice.status = "failed";
    return { changed: true, note: "Address mismatch — invoice failed for manual review" };
  }

  const before = invoice.status;

  switch (status) {
    case "new":
    case "pending":
      if (!TERMINAL.includes(invoice.status) && invoice.status !== "fiat_paid") {
        invoice.status = "onramp_pending";
      }
      break;
    case "paid":
      if (!TERMINAL.includes(invoice.status)) invoice.status = "fiat_paid";
      break;
    case "completed":
      // Provider claims payout is on its way. Still not settled: wait for chain.
      if (!TERMINAL.includes(invoice.status)) invoice.status = "fiat_paid";
      break;
    case "failed":
    case "canceled":
      if (!TERMINAL.includes(invoice.status)) invoice.status = "failed";
      break;
  }

  addEvent(
    invoice,
    `onramp.${status}`,
    [
      payload.onramp ? `provider=${payload.onramp}` : null,
      payload.inAmount != null
        ? `in=${payload.inAmount} ${payload.sourceCurrency ?? ""}`.trim()
        : null,
      payload.outAmount != null
        ? `out=${payload.outAmount} ${payload.targetCurrency ?? ""}`.trim()
        : null,
      `invoice ${before} -> ${invoice.status}`,
    ]
      .filter(Boolean)
      .join(" | "),
  );

  return { changed: true, note: `Applied ${status}` };
}

/**
 * Fold a deposit seen by the chain watcher into the invoice.
 *
 * The sender is the provider's hot wallet, never the customer, so sender-based
 * matching is useless: match on (address, invoice open) and then check the
 * amount against the tolerance band.
 */
export function applyChainDeposit(invoice: Invoice, deposit: ChainLeg): string {
  invoice.chain = deposit;

  const required = MIN_CONFIRMATIONS[invoice.asset.networkId] ?? 12;
  if (deposit.confirmations < required) {
    addEvent(
      invoice,
      "chain.seen",
      `${deposit.amount} ${invoice.asset.symbol} in ${deposit.txHash.slice(0, 12)}… (${deposit.confirmations}/${required} confirmations)`,
    );
    return "seen, awaiting confirmations";
  }

  if (invoice.expectedCrypto == null) {
    invoice.status = "crypto_settled";
    addEvent(
      invoice,
      "chain.settled",
      `Settled on received amount: ${deposit.amount} ${invoice.asset.symbol} (no quote to compare against)`,
    );
    return "settled on received amount";
  }

  const lower = invoice.expectedCrypto * (1 - invoice.tolerance.underPct);
  const upper = invoice.expectedCrypto * (1 + invoice.tolerance.overPct);
  const deltaPct = ((deposit.amount - invoice.expectedCrypto) / invoice.expectedCrypto) * 100;
  const summary = `${deposit.amount} ${invoice.asset.symbol} vs expected ${invoice.expectedCrypto.toFixed(6)} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(2)}%)`;

  if (deposit.amount < lower) {
    invoice.status = "underpaid";
    addEvent(
      invoice,
      "chain.underpaid",
      `${summary} — below ${(invoice.tolerance.underPct * 100).toFixed(1)}% band, request top-up`,
    );
    return "underpaid";
  }
  if (deposit.amount > upper) {
    invoice.status = "overpaid";
    addEvent(
      invoice,
      "chain.overpaid",
      `${summary} — above ${(invoice.tolerance.overPct * 100).toFixed(1)}% band, credit the difference`,
    );
    return "overpaid";
  }

  invoice.status = "crypto_settled";
  addEvent(invoice, "chain.settled", `${summary} — within tolerance`);
  return "settled";
}

/** The only condition under which the merchant should release goods. */
export function releaseAllowed(invoice: Invoice): boolean {
  return invoice.status === "crypto_settled";
}
