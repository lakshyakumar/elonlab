import { NextResponse } from "next/server";
import { createInvoice, findAsset, listInvoices } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ invoices: listInvoices() });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const customerId = typeof b.customerId === "string" ? b.customerId.trim() : "";
  const cryptoId = typeof b.cryptoId === "string" ? b.cryptoId : "";
  const fiatCurrency = typeof b.fiatCurrency === "string" ? b.fiatCurrency : "EUR";
  const amountFiat = Number(b.amountFiat);

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 });
  }
  if (!Number.isFinite(amountFiat) || amountFiat <= 0) {
    return NextResponse.json({ error: "amountFiat must be a positive number" }, { status: 400 });
  }
  if (!findAsset(cryptoId)) {
    return NextResponse.json({ error: `unsupported cryptoId: ${cryptoId}` }, { status: 400 });
  }

  const invoice = await createInvoice({ customerId, amountFiat, fiatCurrency, cryptoId });
  return NextResponse.json({ invoice }, { status: 201 });
}
