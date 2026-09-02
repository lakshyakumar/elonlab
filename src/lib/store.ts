import crypto from "node:crypto";
import {
  DEFAULT_TOLERANCE,
  getServerConfig,
  INVOICE_TTL_MINUTES,
  SUPPORTED_ASSETS,
} from "./config";
import { getDepositAddress } from "./addresses";
import { getBestQuote } from "./onramper";
import type { AssetRef, Invoice, InvoiceEvent } from "./types";

/**
 * In-memory invoice store. Survives HMR by hanging off globalThis; replace with
 * your real table. Two properties the real one must keep:
 *   - the invoice id is what goes out as partnerContext, so it must be
 *     unguessable-ish and stable
 *   - webhook handling must be idempotent per (transactionId, status)
 */
const globalStore = globalThis as unknown as { __invoices?: Map<string, Invoice> };
const invoices: Map<string, Invoice> = (globalStore.__invoices ??= new Map());

export function findAsset(cryptoId: string): AssetRef | null {
  const hit = SUPPORTED_ASSETS.find((a) => a.cryptoId === cryptoId);
  return hit ? { ...hit } : null;
}

export interface CreateInvoiceInput {
  customerId: string;
  amountFiat: number;
  fiatCurrency: string;
  cryptoId: string;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const asset = findAsset(input.cryptoId);
  if (!asset) throw new Error(`Unsupported asset: ${input.cryptoId}`);

  const id = `inv_${crypto.randomBytes(9).toString("base64url")}`;
  const now = new Date();
  const depositAddress = getDepositAddress(input.customerId, asset.networkId);

  // Best-effort reverse quote so we have something to hold the received amount
  // against. Null is a legitimate outcome (no key, provider down, pair not
  // quotable) and the invoice then settles purely on what arrives.
  const quote = await getBestQuote(input.fiatCurrency, asset.cryptoId, input.amountFiat);

  // With simulators on and no usable API key, stub the expected amount so the
  // tolerance-band logic is still exercisable. Never do this in production:
  // there, "no quote" genuinely means "settle on what arrives".
  const stubbed =
    quote == null && getServerConfig().devSimulators
      ? Number((input.amountFiat * 0.985).toFixed(6))
      : null;

  const invoice: Invoice = {
    id,
    customerId: input.customerId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + INVOICE_TTL_MINUTES * 60_000).toISOString(),
    amountFiat: input.amountFiat,
    fiatCurrency: input.fiatCurrency.toUpperCase(),
    asset,
    depositAddress,
    expectedCrypto: quote?.payout ?? stubbed,
    tolerance: { ...DEFAULT_TOLERANCE },
    status: "created",
    onramp: null,
    chain: null,
    events: [],
  };

  addEvent(
    invoice,
    "invoice.created",
    quote
      ? `Expecting ~${quote.payout} ${asset.symbol} at ${depositAddress} (quote via ${quote.provider})`
      : stubbed != null
        ? `No live quote — using stubbed expectation of ${stubbed} ${asset.symbol} at ${depositAddress}`
        : `No quote available — will settle on the amount actually received at ${depositAddress}`,
  );

  invoices.set(id, invoice);
  return invoice;
}

export function getInvoice(id: string): Invoice | null {
  return invoices.get(id) ?? null;
}

export function listInvoices(): Invoice[] {
  return [...invoices.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveInvoice(invoice: Invoice): void {
  invoices.set(invoice.id, invoice);
}

export function addEvent(invoice: Invoice, type: string, detail: string): InvoiceEvent {
  const event: InvoiceEvent = { at: new Date().toISOString(), type, detail };
  invoice.events.push(event);
  return event;
}
