import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";
import { deliverMockWebhook } from "@/lib/mockProvider";
import { getInvoice } from "@/lib/store";
import type { OnramperStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DEV ONLY. Fires one Onramper-shaped webhook at our own receiver, signed with
 * the webhook secret, so the signature and reconciliation paths under test are
 * the production ones.
 *
 * Needed even against the real sandbox: not every provider there fires
 * webhooks, and none of them settle on chain.
 */
export async function POST(req: Request) {
  if (!getServerConfig().devSimulators) {
    return NextResponse.json({ error: "simulators disabled" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
  const status = (typeof body.status === "string" ? body.status : "pending") as OnramperStatus;

  const invoice = getInvoice(invoiceId);
  if (!invoice) return NextResponse.json({ error: "unknown invoice" }, { status: 404 });

  const result = await deliverMockWebhook(invoice, status, {
    provider: typeof body.provider === "string" ? body.provider : undefined,
    driftPct: typeof body.driftPct === "number" ? body.driftPct : undefined,
    walletAddress: typeof body.walletAddress === "string" ? body.walletAddress : undefined,
  });

  return NextResponse.json({
    delivered: result.httpStatus,
    response: result.response,
    payload: result.payload,
  });
}
