import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { deliverMockWebhook } from "@/lib/mockProvider";
import { applyChainDeposit } from "@/lib/reconcile";
import { getInvoice, saveInvoice } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Step = "pending" | "paid" | "completed" | "broadcast" | "confirmed" | "failed";

/**
 * Drives one step of the mock provider's lifecycle. Called by the mock widget,
 * which is the only thing allowed to talk to it — mock mode is a dev-time
 * substitute for an Onramper account, never something to ship.
 */
export async function POST(req: Request) {
  const cfg = getServerConfig();
  if (cfg.mode !== "mock") {
    return NextResponse.json({ error: "mock mode is not active" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
  const step = (typeof body.step === "string" ? body.step : "") as Step;
  const invoice = getInvoice(invoiceId);
  if (!invoice) return NextResponse.json({ error: "unknown invoice" }, { status: 404 });

  // Provider-side statuses go out as real signed webhooks.
  if (step === "pending" || step === "paid" || step === "completed" || step === "failed") {
    const result = await deliverMockWebhook(invoice, step, {
      driftPct: typeof body.driftPct === "number" ? body.driftPct : undefined,
    });
    const after = getInvoice(invoiceId);
    return NextResponse.json({
      step,
      delivered: result.httpStatus,
      invoiceStatus: after?.status ?? invoice.status,
    });
  }

  // Chain-side steps stand in for the deposit watcher.
  if (step === "broadcast" || step === "confirmed") {
    const amount =
      typeof body.amount === "number"
        ? body.amount
        : (invoice.onramp?.outAmount ?? invoice.expectedCrypto ?? invoice.amountFiat);
    const txHash =
      invoice.chain?.txHash ?? `0x${crypto.randomBytes(32).toString("hex")}`;

    const outcome = applyChainDeposit(invoice, {
      txHash,
      amount: Number(amount),
      confirmations: step === "broadcast" ? 1 : 500,
      observedAt: new Date().toISOString(),
    });
    saveInvoice(invoice);
    return NextResponse.json({ step, outcome, invoiceStatus: invoice.status });
  }

  return NextResponse.json({ error: `unknown step: ${step}` }, { status: 400 });
}
