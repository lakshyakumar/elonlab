import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/onramper";
import { addEvent, getInvoice, saveInvoice } from "@/lib/store";
import { applyOnramperWebhook } from "@/lib/reconcile";
import type { OnramperWebhookPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Onramper webhook receiver.
 *
 * Two non-obvious requirements:
 *  1. the HMAC is computed over the RAW body, so read req.text() and parse
 *     afterwards — never re-serialize the parsed object
 *  2. always answer 2xx once the payload is durably accepted, even if we can't
 *     match it to an invoice, otherwise the provider retries forever. Park
 *     unmatched payloads for manual review instead.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-onramper-webhook-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: OnramperWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as OnramperWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  // partnerContext is the invoice id we put into the signed widget URL.
  const invoiceId = typeof payload.partnerContext === "string" ? payload.partnerContext : null;
  if (!invoiceId) {
    console.warn("[onramper] webhook without partnerContext", payload.transactionId);
    return NextResponse.json({ received: true, matched: false, reason: "no partnerContext" });
  }

  const invoice = getInvoice(invoiceId);
  if (!invoice) {
    console.warn("[onramper] webhook for unknown invoice", invoiceId);
    return NextResponse.json({ received: true, matched: false, reason: "unknown invoice" });
  }

  const result = applyOnramperWebhook(invoice, payload);
  if (!result.changed) addEvent(invoice, "onramp.noop", result.note);
  saveInvoice(invoice);

  return NextResponse.json({
    received: true,
    matched: true,
    invoiceStatus: invoice.status,
    note: result.note,
  });
}
