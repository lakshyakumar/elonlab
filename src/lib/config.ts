import type { OnramperEnv } from "./types";

const WIDGET_BASE: Record<OnramperEnv, string> = {
  sandbox: "https://buy.onramper.dev",
  production: "https://buy.onramper.com",
};

const API_BASE: Record<OnramperEnv, string> = {
  sandbox: "https://api.onramper.dev",
  production: "https://api.onramper.com",
};

/**
 * mock    — no Onramper credentials needed. The widget URL points at this app's
 *           own /mock/widget, which consumes the exact same signed URL, verifies
 *           the signature the way Onramper does, and drives the real webhook
 *           receiver. Full lifecycle, nothing real.
 * preview — the REAL widget rendered with the public API key from Onramper's own
 *           docs. Shows you the genuine UI and provider list. Three hard limits:
 *           it is a *production* key, so any card entry is real money; wallet
 *           params cannot be signed without the matching signing secret, so the
 *           destination address is NOT locked and is omitted entirely; and
 *           webhooks go to that key's owner, not to us, so the invoice will not
 *           advance on its own. Look, don't pay.
 * live    — the real widget with your own key and secrets. The only mode where
 *           the address lock and the webhooks are actually yours.
 */
export type ProviderMode = "mock" | "preview" | "live";

/**
 * Public key published in Onramper's own integration docs. Fine for looking at
 * the widget; not yours, and production.
 */
const PREVIEW_API_KEY = "pk_prod_01HETEQF46GSK6BS5JWKDF31BT";

/** Stable dev-only secrets so mock mode runs with an empty .env.local. */
const DEV_SIGNING_SECRET = "dev-signing-secret-do-not-use-in-production";
const DEV_WEBHOOK_SECRET = "dev-webhook-secret-do-not-use-in-production";

export interface ServerConfig {
  mode: ProviderMode;
  env: OnramperEnv;
  apiKey: string;
  signingSecret: string;
  webhookSecret: string;
  /** Where the iframe points. In mock mode this app's own /mock/widget. */
  widgetBase: string;
  /** Real Onramper widget base, regardless of mode (shown in the UI). */
  onramperWidgetBase: string;
  apiBase: string;
  appBaseUrl: string;
  onlyOnramps: string[];
  devSimulators: boolean;
  /** Env vars that live mode needs and does not have. */
  missingForLive: string[];
}

/**
 * Reads server-side config. Never import this from a client component — it
 * touches the signing secret.
 */
export function getServerConfig(): ServerConfig {
  const apiKey = process.env.ONRAMPER_API_KEY ?? "";
  const explicit = process.env.ONRAMPER_ENV as OnramperEnv | undefined;
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  // pk_test => sandbox, pk_prod => production. Explicit env wins.
  const env: OnramperEnv =
    explicit === "production" || explicit === "sandbox"
      ? explicit
      : apiKey.startsWith("pk_prod")
        ? "production"
        : "sandbox";

  const usableKey = apiKey !== "" && !apiKey.includes("replace_me");
  const missingForLive = [
    !usableKey && "ONRAMPER_API_KEY",
    !process.env.ONRAMPER_SIGNING_SECRET && "ONRAMPER_SIGNING_SECRET",
    !process.env.ONRAMPER_WEBHOOK_SECRET && "ONRAMPER_WEBHOOK_SECRET",
  ].filter(Boolean) as string[];

  // Default to mock. Asking for live without credentials falls back to mock
  // rather than rendering a broken iframe; preview needs nothing.
  const requested = (process.env.ONRAMPER_MODE ?? "mock").toLowerCase();
  const mode: ProviderMode =
    requested === "live" && missingForLive.length === 0
      ? "live"
      : requested === "preview"
        ? "preview"
        : "mock";

  const previewKey = process.env.ONRAMPER_PREVIEW_API_KEY ?? PREVIEW_API_KEY;
  const effectiveEnv: OnramperEnv = mode === "preview" ? "production" : env;

  return {
    mode,
    env: effectiveEnv,
    apiKey: mode === "preview" ? previewKey : apiKey,
    // In mock mode both HMACs are ours on both sides, so fixed dev secrets are
    // fine and mean the demo needs no .env.local at all.
    signingSecret:
      process.env.ONRAMPER_SIGNING_SECRET ?? (mode === "mock" ? DEV_SIGNING_SECRET : ""),
    webhookSecret:
      process.env.ONRAMPER_WEBHOOK_SECRET ?? (mode === "mock" ? DEV_WEBHOOK_SECRET : ""),
    widgetBase:
      mode === "mock" ? `${appBaseUrl}/mock/widget` : WIDGET_BASE[effectiveEnv],
    onramperWidgetBase: WIDGET_BASE[effectiveEnv],
    apiBase: API_BASE[effectiveEnv],
    appBaseUrl,
    onlyOnramps: (process.env.ONRAMPER_ONLY_ONRAMPS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    // Simulators default on outside live mode; opt out with ENABLE_DEV_SIMULATORS=false.
    // In preview mode they are the only way to advance an invoice, because the
    // real webhooks go to the key owner rather than to us.
    devSimulators:
      process.env.ENABLE_DEV_SIMULATORS === "true" ||
      (mode !== "live" && process.env.ENABLE_DEV_SIMULATORS !== "false"),
    missingForLive,
  };
}

/**
 * Assets this demo settles in. The `cryptoId` / `networkId` strings are what
 * Onramper expects in `onlyCryptos` / `networkWallets`; verify them for your
 * account with GET {apiBase}/supported/assets (exposed at /api/onramper/assets)
 * because availability differs between sandbox and production.
 */
export const SUPPORTED_ASSETS = [
  { cryptoId: "usdc_ethereum", networkId: "ethereum", symbol: "USDC", decimals: 6 },
  { cryptoId: "usdt_ethereum", networkId: "ethereum", symbol: "USDT", decimals: 6 },
  { cryptoId: "usdc_polygon", networkId: "polygon", symbol: "USDC", decimals: 6 },
  { cryptoId: "usdt_polygon", networkId: "polygon", symbol: "USDT", decimals: 6 },
  { cryptoId: "usdc_base", networkId: "base", symbol: "USDC", decimals: 6 },
  { cryptoId: "usdc_arbitrum", networkId: "arbitrum", symbol: "USDC", decimals: 6 },
] as const;

export const DEFAULT_TOLERANCE = { underPct: 0.02, overPct: 0.05 };
export const INVOICE_TTL_MINUTES = 60;
