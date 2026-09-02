import { NextResponse } from "next/server";
import { getInvoice } from "@/lib/store";
import { releaseAllowed } from "@/lib/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const invoice = getInvoice(id);
  if (!invoice) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({
    invoice,
    releaseAllowed: releaseAllowed(invoice),
  });
}
