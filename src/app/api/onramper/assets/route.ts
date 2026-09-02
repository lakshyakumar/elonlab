import { NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxies GET {apiBase}/supported/assets so you can confirm the real crypto and
 * network ids for your account. Sandbox and production expose different sets,
 * which is the usual reason a `onlyCryptos` filter silently shows nothing.
 */
export async function GET() {
  const cfg = getServerConfig();
  if (!cfg.apiKey) {
    return NextResponse.json({ error: "ONRAMPER_API_KEY is not set" }, { status: 500 });
  }

  const res = await fetch(`${cfg.apiBase}/supported/assets?type=buy`, {
    headers: { Authorization: cfg.apiKey, accept: "application/json" },
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
