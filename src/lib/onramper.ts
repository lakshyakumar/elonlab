import crypto from "node:crypto";
import { getServerConfig, type ProviderMode } from "./config";
import type { AssetRef } from "./types";

/**
 * The three widget params that carry a destination address are the only ones
 * Onramper requires you to sign, and signing them is what turns "buy crypto"
 * into "pay this invoice": the customer cannot edit a signed address.
 *
 * signContent rules (from Onramper's signing docs):
 *   - only these keys, sorted alphabetically: networkWallets, walletAddressTags, wallets
 *   - joined `key=value` with `&`, no leading `?`
 *   - values left UNENCODED here (`:` and `,` stay literal) even though the
 *     final URL percent-encodes them
 */
const SIGNED_KEYS = ["networkWallets", "walletAddressTags", "wallets"] as const;
type SignedKey = (typeof SIGNED_KEYS)[number];

export function buildSignContent(params: Partial<Record<SignedKey, string>>): string {
  return SIGNED_KEYS.filter((k) => params[k])
    .map((k) => `${k}=${params[k]}`)
    .join("&");
}

export function signContent(secret: string, content: string): string {
  return crypto.createHmac("sha256", secret).update(content).digest("hex");
}

export interface WidgetSessionInput {
  asset: AssetRef;
  depositAddress: string;
  amountFiat: number;
  fiatCurrency: string;
  /** Our invoice id. Comes back on every webhook and on GET /transactions/{id}. */
  partnerContext: string;
  /** Optional destination tag / memo, for chains that need one (XRP etc.). */
  addressTag?: string;
}

export interface WidgetSession {
  url: string;
  signContent: string;
  signature: string;
  env: string;
  mode: ProviderMode;
}

/**
 * Recomputes the signature over the wallet params exactly as Onramper does on
 * receipt, and reports whether the URL is intact. The mock widget calls this to
 * prove the address really is locked — flip one character of the address in the
 * URL bar and the widget refuses the session.
 */
export function verifyWalletSignature(
  received: { networkWallets?: string; wallets?: string; walletAddressTags?: string },
  signature: string | null,
): { valid: boolean; expected: string; content: string } {
  const cfg = getServerConfig();
  const content = buildSignContent(received);
  const expected = signContent(cfg.signingSecret, content);
  return { valid: signature !== null && signature === expected, expected, content };
}

/**
 * Builds the signed, address-locked widget URL. Server-side only: the signing
 * secret must never reach the browser, so the URL is minted per invoice on the
 * server and handed to the client already signed.
 */
export function buildWidgetSession(input: WidgetSessionInput): WidgetSession {
  const cfg = getServerConfig();
  if (cfg.mode === "live" && !cfg.apiKey) throw new Error("ONRAMPER_API_KEY is not set");
  if (cfg.mode !== "preview" && !cfg.signingSecret) {
    throw new Error("ONRAMPER_SIGNING_SECRET is not set");
  }

  // Preview borrows a public key that is not ours, so we hold no signing secret
  // for it. Unsigned wallet params are rejected by the widget, so they are left
  // out entirely — which is exactly why preview cannot lock the destination.
  const canSign = cfg.mode !== "preview";

  // networkWallets binds one address to every token on that chain — the right
  // shape for an EVM deposit address that can receive both USDC and USDT.
  const signed: Partial<Record<SignedKey, string>> = canSign
    ? { networkWallets: `${input.asset.networkId}:${input.depositAddress}` }
    : {};
  if (canSign && input.addressTag) {
    signed.walletAddressTags = `${input.asset.cryptoId}:${input.addressTag}`;
  }

  const content = buildSignContent(signed);
  const signature = canSign ? signContent(cfg.signingSecret, content) : "";

  const params = new URLSearchParams({
    apiKey: cfg.apiKey || "pk_mock_local",
    mode: "buy",
    // Pin the asset so the customer cannot switch to something we don't watch.
    onlyCryptos: input.asset.cryptoId,
    onlyCryptoNetworks: input.asset.networkId,
    defaultCrypto: input.asset.cryptoId,
    defaultFiat: input.fiatCurrency,
    defaultAmount: String(input.amountFiat),
    // Correlation key: echoed back on webhooks and order lookups.
    partnerContext: input.partnerContext,
    // Keep the flow inside our page as far as the provider allows.
    hideTopBar: "true",
    redirectAtCheckout: "false",
    preventTxnClose: "true",
    successRedirectUrl: `${cfg.appBaseUrl}/complete?invoice=${input.partnerContext}&result=success`,
    failureRedirectUrl: `${cfg.appBaseUrl}/complete?invoice=${input.partnerContext}&result=failure`,
  });

  if (cfg.onlyOnramps.length > 0) {
    // Restrict to providers you have verified render inside a nested iframe in
    // the customer's country. New providers are NOT auto-added when this is set.
    params.set("onlyOnramps", cfg.onlyOnramps.join(","));
  }

  // Signed params are appended last, followed by the signature itself.
  for (const key of SIGNED_KEYS) {
    const value = signed[key];
    if (value) params.set(key, value);
  }
  if (signature) params.set("signature", signature);

  // Real widget lives at the origin root (buy.onramper.dev/?...); the mock lives
  // at a path, so don't inject a trailing slash there.
  const url =
    cfg.mode === "mock"
      ? `${cfg.widgetBase}?${params.toString()}`
      : `${cfg.widgetBase}/?${params.toString()}`;

  return { url, signContent: content, signature, env: cfg.env, mode: cfg.mode };
}

/** Constant-time comparison of the webhook signature header. */
export function verifyWebhookSignature(rawBody: string, header: string | null): boolean {
  const cfg = getServerConfig();
  if (!cfg.webhookSecret || !header) return false;
  const expected = crypto
    .createHmac("sha256", cfg.webhookSecret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(header.trim().toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Reverse-quote: how much crypto does `amountFiat` actually buy right now?
 * Used to set the expected amount on the invoice. It is an estimate — the
 * provider re-prices at execution and deducts a network fee — which is exactly
 * why the invoice carries a tolerance band instead of an exact amount.
 */
export async function getBestQuote(
  fiatCurrency: string,
  cryptoId: string,
  amountFiat: number,
): Promise<{ payout: number; provider: string } | null> {
  const cfg = getServerConfig();
  if (!cfg.apiKey) return null;

  const url = `${cfg.apiBase}/quotes/${encodeURIComponent(
    fiatCurrency.toLowerCase(),
  )}/${encodeURIComponent(cryptoId)}?amount=${amountFiat}&type=buy`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: cfg.apiKey, accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const body: unknown = await res.json();
    const rows = Array.isArray(body) ? body : [];
    let best: { payout: number; provider: string } | null = null;

    for (const row of rows) {
      if (typeof row !== "object" || row === null) continue;
      const r = row as Record<string, unknown>;
      if (r.errors) continue;
      const payout = typeof r.payout === "number" ? r.payout : Number(r.payout);
      if (!Number.isFinite(payout) || payout <= 0) continue;
      const provider = typeof r.ramp === "string" ? r.ramp : "unknown";
      if (!best || payout > best.payout) best = { payout, provider };
    }
    return best;
  } catch {
    return null;
  }
}
