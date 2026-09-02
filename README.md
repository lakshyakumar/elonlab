# Gateway × Onramper — embedded fiat→crypto checkout

Next.js 15 (App Router, TypeScript, API routes only — no separate backend). A fiat card
payment settles as USDC/USDT to a **per-customer deposit address**, with the Onramper
widget embedded in the merchant page rather than a redirect to a third-party site.

Everything is here: the signed-URL minting, the webhook receiver with signature
verification, the invoice state machine, the reconciliation against a tolerance band, and
simulators for the legs the sandbox cannot produce.

## Run

No credentials required.

```bash
npm install
npm run dev        # http://localhost:3000
```

With no `.env.local` at all it boots in **mock mode** and the whole lifecycle works.

### Three modes

| `ONRAMPER_MODE` | Widget | Address locked | Webhooks | Use it for |
|---|---|---|---|---|
| `mock` *(default)* | local `/mock/widget` | **yes** — HMAC verified on receipt | real, signed, ours | building and testing the integration |
| `preview` | real `buy.onramper.com` | no | not ours | looking at the genuine widget UI |
| `live` | real `buy.onramper.{dev,com}` | **yes** | real, yours | staging and production |

**Mock** is a stand-in for `buy.onramper.dev` that consumes the *same* signed URL, does
the one thing that matters — recompute the HMAC over the wallet params and refuse the
session if it doesn't match — then walks quote → KYC → card → payout, firing real signed
webhooks at `/api/webhooks/onramper`. Everything downstream of the widget is the
production code path. Tamper with the address in the URL bar and the mock rejects it,
which is the whole mechanism demonstrated in one screen.

**Preview** renders the real widget using the public API key published in Onramper's own
integration docs (`pk_prod_01HETEQF46GSK6BS5JWKDF31BT`). Three limits, all hard: it is a
`pk_prod` key, so entering a card is **real money**; wallet params are unsigned without
the matching signing secret, so the destination is **not** locked and is omitted from the
URL entirely; and the webhooks belong to that key's owner, so the invoice only advances
via the simulators. Look, don't pay.

### Live mode credentials

All three come from Onramper during onboarding. There is no self-serve signup, no public
sandbox key, and nothing here can substitute for them — they are per-account secrets.

| Variable | What it is |
|---|---|
| `ONRAMPER_API_KEY` | `pk_test_…` sandbox / `pk_prod_…` production. The env is inferred from this prefix. |
| `ONRAMPER_SIGNING_SECRET` | **Separate** secret for HMAC-signing the wallet params in the widget URL. Not the API key. |
| `ONRAMPER_WEBHOOK_SECRET` | Verifies `X-Onramper-Webhook-Signature`. Separate again. |
| `APP_BASE_URL` | Mock widget origin, and the `successRedirectUrl` / `failureRedirectUrl` target. |
| `ONRAMPER_ONLY_ONRAMPS` | Provider allowlist. Start with `banxa` — the most complete sandbox, EUR/GBP. |
| `ENABLE_DEV_SIMULATORS` | `/api/dev/*`. On by default outside live mode. **Never true in production.** |

Ask your Onramper contact for a sandbox key *and both secrets* — the signing secret is
easy to forget and without it the wallet params can't be signed, which is the entire
integration. Sandbox bases are `buy.onramper.dev` / `api.onramper.dev`; production is
`.com`.

## The flow

```
1. POST /api/invoices          → invoice + assigned deposit address + reverse quote
2. GET  /pay/[id]              → server mints the SIGNED widget URL, renders it in an iframe
3. customer pays by card       → inside the iframe, on your domain
4. POST /api/webhooks/onramper → provider status, correlated by partnerContext = invoice id
5. chain watcher sees deposit  → invoice settles only when the amount confirms in band
```

### Address locking (the part that makes it a payment)

`wallets`, `networkWallets` and `walletAddressTags` are the only params Onramper requires
you to sign. `signContent` is those keys, alphabetically ordered, joined `key=value` with
`&`, **unencoded**, no leading `?`; HMAC-SHA256 with the signing secret; appended as
`&signature=<hex>`. See `src/lib/onramper.ts`. The customer cannot edit a signed address,
which is what turns "buy crypto" into "pay this invoice".

This demo uses `networkWallets=<network>:<address>` — one address for every token on that
chain, the right shape for an EVM deposit address that takes both USDC and USDT.

### Staying in-frame

- `hideTopBar=true`, `redirectAtCheckout=false`, `preventTxnClose=true`
- iframe `allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"` — camera
  is required for the KYC step, which runs in a nested iframe inside the widget
- **no `sandbox` attribute** on the iframe; adding one blocks provider popups
- `onlyOnramps` restricted to providers verified to render in-frame **for that country** —
  3DS step-ups, Apple/Google Pay and open-banking flows still break out on several
  providers, so `successRedirectUrl` / `failureRedirectUrl` land the customer back on
  `/complete` rather than a provider thank-you page
- CSP `frame-src` allows the widget origin (`next.config.ts`)

### Why the invoice has two legs

Fiat in is exact; crypto out is not. The provider re-prices at execution and deducts a
network fee, so `outAmount` never equals a clean expected number. The invoice therefore
carries `expectedCrypto` (from `GET /quotes/{fiat}/{crypto}`) plus a tolerance band —
default −2% / +5% — and settles on what actually arrives:

| Invoice status | Meaning |
|---|---|
| `created` | Address assigned, nothing observed |
| `onramp_pending` | Provider processing KYC / authorisation |
| `fiat_paid` | Fiat captured, **crypto not confirmed — do not release goods** |
| `crypto_settled` | Confirmed on chain within tolerance. `releaseAllowed = true` |
| `underpaid` / `overpaid` | Confirmed but outside the band — top-up or credit |
| `failed` | Terminal. The fiat leg refunds via the provider; the crypto leg does not reverse |

Onramper's `paid` means fiat captured and `completed` means the payout was broadcast —
neither is proof value landed in your address, so neither reaches `crypto_settled`. Only
the chain watcher does that.

### Reconciliation notes

- match on `partnerContext` → invoice id; the on-chain sender is the provider's hot wallet,
  never the customer, so sender heuristics are useless
- webhooks retry and arrive out of order — handling is idempotent per
  (`transactionId`, `status`), see `applyOnramperWebhook`
- the payload's `walletAddress` is checked against the invoice's address; a mismatch fails
  the invoice for manual review instead of crediting it
- unmatched payloads still return 2xx, otherwise the provider retries forever

## Testing in mock mode

Create an invoice on `/`, then on `/pay/[id]` pay in the frame. The mock walks the
provider states 1.2s apart while the invoice panel beside it moves `created →
onramp_pending → fiat_paid → crypto_settled`, and the event log shows each webhook and
chain event as it lands. "Simulate a declined payment instead" takes the failure branch.
The simulator buttons remain available for the cases the widget doesn't produce:
underpayment, overpayment, a deposit stuck at one confirmation, and a tampered address.

Verified with no `.env.local` present: valid signature → widget renders with the
destination shown as locked; one character changed in the address → widget refuses the
session; full walk → `crypto_settled` with `releaseAllowed: true`.

## Testing against the real sandbox

Sandbox providers settle on **no chain, real or test**, and Apple/Google Pay cannot be
tested there. So: drive the card flow for real in the widget, then play the remaining legs
with the simulators on `/pay/[id]`.

Provider test credentials: Banxa EUR/GBP card `4242 4242 4242 4242` (US: `4444 3333 2222
1111`), OTP `7203`. Topper OTP is always `000-000`. Sardine: append `+low-risk` to the
email to skip fraud checks. AlchemyPay and Fonbnk have no real sandbox — they take live
payments.

The webhook simulator builds an Onramper-shaped payload, signs it with the webhook secret
and POSTs it to the real receiver, so the signature and reconciliation paths under test are
the production ones. Verified end to end: bad signature → 401; `pending → paid →
completed`; duplicate delivery → no-op; deposit at 1 confirmation → held; confirmed
deposit → settled; 10% short → `underpaid`; 20% over → `overpaid`; tampered address →
`failed`.

`GET /api/onramper/assets` proxies `/supported/assets` with your key — use it to confirm
the real crypto/network ids, since the sets differ between sandbox and production and a
wrong `onlyCryptos` value shows an empty widget with no error.

## What to replace before production

1. **`src/lib/addresses.ts`** — swap the fake deriver for your HD derivation / custody
   addresses. Use `viem`'s `getAddress` for EIP-55 checksumming.
2. **`src/lib/store.ts`** — the in-memory `Map` becomes your invoices table. Keep the
   webhook idempotency key and the `partnerContext` = invoice-id contract.
3. **On-chain leg** — `/api/dev/simulate-deposit` is a stand-in for your existing indexer.
   The onramp integration feeds that watcher, it doesn't replace it.
4. **`ENABLE_DEV_SIMULATORS=false`**, and stop returning `signContent`/`signature` from
   `/api/onramper/session` (they are exposed here only because seeing them is the point).
5. **The commercial question** — Onramper's docs show wallet and dapp integrations, not
   merchant payments. Providers KYC the payer and deliver to an address the payer does not
   control, which several providers' terms restrict, and fresh per-invoice addresses can
   trip risk scoring. Get the payments use case and the permitted provider list confirmed
   in writing before building on this. Settle the refund policy at the same time: the fiat
   leg refunds through the provider, the crypto leg is irreversible.

## Sources

- [Supported widget parameters](https://docs.onramper.com/docs/supported-widget-parameters)
- [Widget URL signing](https://docs.onramper.com/docs/signing-widget-url)
- [Widget integration options](https://docs.onramper.com/docs/integration-steps)
- [Webhook setup](https://docs.onramper.com/docs/optional-webhook-setup)
- [Sandbox testing guide](https://docs.onramper.com/docs/testing-overview)
- [Provider testing credentials](https://docs.onramper.com/docs/provider-sandbox-guide)
