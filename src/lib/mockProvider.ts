import crypto from "node:crypto";
import { getServerConfig } from "./config";
import type { Invoice, OnramperStatus, OnramperWebhookPayload } from "./types";

/**
 * Builds an Onramper-shaped webhook payload for an invoice and delivers it to
 * our own receiver over HTTP, signed with the webhook secret.
 *
 * Going over HTTP rather than calling the handler directly is deliberate: the
 * signature check, the raw-body read and the reconciliation path exercised here
 * are the same ones production traffic hits.
 */
export interface DeliverOptions {
  provider?: string;
  /** Percentage drift applied to the expected amount, e.g. -0.7 for -0.7%. */
  driftPct?: number;
  /** Override the destination address, to demonstrate the mismatch guard. */
  walletAddress?: string;
  country?: string;
  paymentMethod?: string;
}

export function buildMockPayload(
  invoice: Invoice,
  status: OnramperStatus,
  opts: DeliverOptions = {},
): OnramperWebhookPayload {
  // A provider spread plus a network fee means outAmount never equals a clean
  // expected number — the reason invoices carry a tolerance band at all.
  const drift = opts.driftPct ?? -0.7;
  const expected = invoice.expectedCrypto ?? invoice.amountFiat * 0.995;
  const outAmount = Number((expected * (1 + drift / 100)).toFixed(6));
  const settled = status !== "new" && status !== "pending";

  return {
    transactionId: `onr_${invoice.id.slice(4, 12)}`,
    onrampTransactionId: `${opts.provider ?? "mockramp"}_${invoice.id.slice(4, 10)}`,
    onramp: opts.provider ?? "mockramp",
    status,
    statusDate: new Date().toISOString(),
    inAmount: invoice.amountFiat,
    sourceCurrency: invoice.fiatCurrency,
    outAmount: settled ? outAmount : undefined,
    targetCurrency: invoice.asset.symbol,
    walletAddress: opts.walletAddress ?? invoice.depositAddress,
    paymentMethod: opts.paymentMethod ?? "creditcard",
    country: opts.country ?? "de",
    partnerContext: invoice.id,
    partnerFee: 0.005,
  };
}

export interface DeliveryResult {
  httpStatus: number;
  response: unknown;
  payload: OnramperWebhookPayload;
}

export async function deliverMockWebhook(
  invoice: Invoice,
  status: OnramperStatus,
  opts: DeliverOptions = {},
): Promise<DeliveryResult> {
  const cfg = getServerConfig();
  const payload = buildMockPayload(invoice, status, opts);
  const rawBody = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", cfg.webhookSecret)
    .update(rawBody)
    .digest("hex");

  const res = await fetch(`${cfg.appBaseUrl}/api/webhooks/onramper`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-onramper-webhook-signature": signature,
    },
    body: rawBody,
  });

  return {
    httpStatus: res.status,
    response: await res.json().catch(() => null),
    payload,
  };
}

/** Mock quote breakdown, so the widget can show where the money goes. */
export function mockQuote(invoice: Invoice): {
  rate: number;
  providerFeeFiat: number;
  networkFeeCrypto: number;
  payout: number;
} {
  const providerFeeFiat = Number((invoice.amountFiat * 0.0089).toFixed(2));
  const rate = invoice.fiatCurrency === "USD" ? 1.0 : invoice.fiatCurrency === "GBP" ? 1.27 : 1.08;
  const networkFeeCrypto = invoice.asset.networkId === "ethereum" ? 3.4 : 0.12;
  const payout = Number(
    ((invoice.amountFiat - providerFeeFiat) * rate - networkFeeCrypto).toFixed(6),
  );
  return { rate, providerFeeFiat, networkFeeCrypto, payout };
}
