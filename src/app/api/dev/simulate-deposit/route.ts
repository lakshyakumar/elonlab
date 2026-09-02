import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { getInvoice, saveInvoice } from "@/lib/store";
import { applyChainDeposit } from "@/lib/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DEV ONLY. Stands in for your chain watcher: "a transfer of N tokens to this
 * invoice's deposit address just got C confirmations".
 *
 * In production this is your existing indexer/webhook on the address — the
 * onramp integration does not replace it, it feeds it.
 */
export async function POST(req: Request) {
  const cfg = getServerConfig();
  if (!cfg.devSimulators) {
    return NextResponse.json({ error: "simulators disabled" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
  const invoice = getInvoice(invoiceId);
  if (!invoice) return NextResponse.json({ error: "unknown invoice" }, { status: 404 });

  // Default to whatever the provider said it sent, else the quoted amount.
  const fallback = invoice.onramp?.outAmount ?? invoice.expectedCrypto ?? invoice.amountFiat;
  const amount = typeof body.amount === "number" ? body.amount : Number(fallback);
  const confirmations = typeof body.confirmations === "number" ? body.confirmations : 200;

  const outcome = applyChainDeposit(invoice, {
    txHash: typeof body.txHash === "string" ? body.txHash : `0x${crypto.randomBytes(32).toString("hex")}`,
    amount,
    confirmations,
    observedAt: new Date().toISOString(),
  });

  saveInvoice(invoice);
  return NextResponse.json({ outcome, status: invoice.status, invoice });
}
