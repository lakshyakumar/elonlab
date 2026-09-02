import { NextResponse } from "next/server";
import { buildWidgetSession } from "@/lib/onramper";
import { addEvent, getInvoice, saveInvoice } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mints the signed, address-locked widget URL for an invoice.
 *
 * Exists as an endpoint so a SPA checkout can fetch it, but the signing secret
 * stays on the server either way — the client only ever sees a finished URL.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const invoiceId = (body as Record<string, unknown>)?.invoiceId;
  if (typeof invoiceId !== "string") {
    return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
  }

  const invoice = getInvoice(invoiceId);
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (new Date(invoice.expiresAt) < new Date()) {
    return NextResponse.json({ error: "invoice expired" }, { status: 409 });
  }

  try {
    const session = buildWidgetSession({
      asset: invoice.asset,
      depositAddress: invoice.depositAddress,
      amountFiat: invoice.amountFiat,
      fiatCurrency: invoice.fiatCurrency,
      partnerContext: invoice.id,
    });

    addEvent(invoice, "widget.session_minted", `Signed URL issued (${session.env})`);
    saveInvoice(invoice);

    // signContent/signature are returned here only because this is a demo and
    // seeing them is the point. Do not expose them in production.
    return NextResponse.json(session);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "failed to build session" },
      { status: 500 },
    );
  }
}
