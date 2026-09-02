"use client";

import { useCallback, useEffect, useState } from "react";
import type { Invoice, InvoiceStatus } from "@/lib/types";

const DOT: Record<InvoiceStatus, string> = {
  created: "",
  onramp_pending: "pending",
  fiat_paid: "pending",
  crypto_settled: "ok",
  underpaid: "bad",
  overpaid: "bad",
  failed: "bad",
  expired: "bad",
};

const EXPLAIN: Record<InvoiceStatus, string> = {
  created: "Invoice open. Address assigned, nothing observed.",
  onramp_pending: "Provider is processing KYC / payment authorisation.",
  fiat_paid: "Fiat captured by the provider. Crypto NOT confirmed — do not release goods.",
  crypto_settled: "Confirmed on chain within tolerance. Safe to release.",
  underpaid: "Confirmed on chain but below the tolerance band — request a top-up.",
  overpaid: "Confirmed on chain but above the tolerance band — credit the difference.",
  failed: "Terminal failure. The fiat leg refunds via the provider, not by us.",
  expired: "Invoice expired before settlement.",
};

interface Props {
  invoiceId: string;
  widgetUrl: string | null;
  signContent: string | null;
  signature: string | null;
  devSimulators: boolean;
}

export default function PayClient({
  invoiceId,
  widgetUrl,
  signContent,
  signature,
  devSimulators,
}: Props) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [release, setRelease] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/invoices/${invoiceId}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { invoice: Invoice; releaseAllowed: boolean };
    setInvoice(body.invoice);
    setRelease(body.releaseAllowed);
  }, [invoiceId]);

  // Poll for state changes. In production this is where you'd subscribe to your
  // own event stream instead — the webhook and the chain watcher both land in
  // the same invoice record either way.
  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [refresh]);

  async function post(path: string, body: Record<string, unknown>, label: string) {
    setBusy(label);
    try {
      await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId, ...body }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const expected = invoice?.expectedCrypto;

  return (
    <div className="grid">
      <div>
        <div className="card">
          <h2>Invoice state</h2>
          {invoice ? (
            <>
              <div style={{ margin: "10px 0 6px" }}>
                <span className="status">
                  <span className={`dot ${DOT[invoice.status]}`} />
                  {invoice.status}
                </span>
                {release && (
                  <span className="status" style={{ marginLeft: 8 }}>
                    <span className="dot ok" />
                    release allowed
                  </span>
                )}
              </div>
              <p className="hint">{EXPLAIN[invoice.status]}</p>

              <dl className="kv">
                <dt>Deposit address</dt>
                <dd>{invoice.depositAddress}</dd>
                <dt>Charge</dt>
                <dd>
                  {invoice.amountFiat} {invoice.fiatCurrency}
                </dd>
                <dt>Expected</dt>
                <dd>
                  {expected != null
                    ? `${expected.toFixed(6)} ${invoice.asset.symbol} ±${(invoice.tolerance.underPct * 100).toFixed(1)}/${(invoice.tolerance.overPct * 100).toFixed(1)}%`
                    : "no quote — settling on received amount"}
                </dd>
                <dt>Provider leg</dt>
                <dd>
                  {invoice.onramp
                    ? `${invoice.onramp.provider ?? "?"} · ${invoice.onramp.status}${
                        invoice.onramp.outAmount != null
                          ? ` · out ${invoice.onramp.outAmount}`
                          : ""
                      }`
                    : "—"}
                </dd>
                <dt>On-chain leg</dt>
                <dd>
                  {invoice.chain
                    ? `${invoice.chain.amount} ${invoice.asset.symbol} · ${invoice.chain.confirmations} conf · ${invoice.chain.txHash.slice(0, 18)}…`
                    : "—"}
                </dd>
                <dt>partnerContext</dt>
                <dd>{invoice.id}</dd>
              </dl>
            </>
          ) : (
            <p className="muted">Loading…</p>
          )}
        </div>

        {devSimulators && (
          <div className="card" style={{ marginTop: 20 }}>
            <h2>Simulators (dev only)</h2>
            <p className="hint">
              Webhook buttons build an Onramper-shaped payload, sign it with the webhook
              secret and POST it to the real receiver. Deposit buttons stand in for your
              chain watcher.
            </p>
            <div className="btnrow">
              {(["pending", "paid", "completed", "failed"] as const).map((s) => (
                <button
                  key={s}
                  className="small"
                  disabled={busy !== null}
                  onClick={() =>
                    void post("/api/dev/simulate-webhook", { status: s }, `wh:${s}`)
                  }
                >
                  {busy === `wh:${s}` ? "…" : `webhook: ${s}`}
                </button>
              ))}
            </div>
            <div className="btnrow">
              <button
                className="small"
                disabled={busy !== null}
                onClick={() =>
                  void post("/api/dev/simulate-deposit", { confirmations: 1 }, "dep:1")
                }
              >
                deposit · 1 conf
              </button>
              <button
                className="small"
                disabled={busy !== null}
                onClick={() => void post("/api/dev/simulate-deposit", {}, "dep:ok")}
              >
                deposit · confirmed
              </button>
              <button
                className="small"
                disabled={busy !== null || expected == null}
                onClick={() =>
                  void post(
                    "/api/dev/simulate-deposit",
                    { amount: Number(((expected ?? 0) * 0.9).toFixed(6)) },
                    "dep:under",
                  )
                }
              >
                deposit · 10% short
              </button>
              <button
                className="small"
                disabled={busy !== null || expected == null}
                onClick={() =>
                  void post(
                    "/api/dev/simulate-deposit",
                    { amount: Number(((expected ?? 0) * 1.2).toFixed(6)) },
                    "dep:over",
                  )
                }
              >
                deposit · 20% over
              </button>
            </div>
            <div className="btnrow">
              <button
                className="small"
                disabled={busy !== null}
                onClick={() =>
                  void post(
                    "/api/dev/simulate-webhook",
                    { status: "completed", walletAddress: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef" },
                    "wh:tamper",
                  )
                }
              >
                webhook · wrong address
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ marginTop: 20 }}>
          <h2>Event log</h2>
          <ul className="log">
            {(invoice?.events ?? [])
              .slice()
              .reverse()
              .map((ev, i) => (
                <li key={`${ev.at}-${i}`}>
                  <div className="t">{ev.at.replace("T", " ").slice(0, 19)}</div>
                  <div className="e">{ev.type}</div>
                  <div>{ev.detail}</div>
                </li>
              ))}
            {invoice?.events.length === 0 && <li className="muted">No events.</li>}
          </ul>
        </div>
      </div>

      <div>
        <div className="frame-shell">
          {widgetUrl ? (
            /*
             * camera + microphone are required for the provider's KYC step, which
             * runs in a nested iframe inside the widget. `payment` is required for
             * Apple/Google Pay where the provider supports it. No `sandbox`
             * attribute: adding one blocks the provider popups some flows need.
             */
            <iframe
              className="widget"
              title="Onramper checkout"
              src={widgetUrl}
              allow="accelerometer; autoplay; camera; gyroscope; payment; microphone"
            />
          ) : (
            <p className="muted" style={{ padding: 40 }}>
              Widget URL unavailable — see the error above.
            </p>
          )}
        </div>

        {signContent && (
          <div className="card" style={{ marginTop: 20 }}>
            <h2>What was signed</h2>
            <p className="hint">
              HMAC-SHA256 over the unencoded, alphabetically ordered wallet params. Change
              one character of the address in the URL and the widget rejects it — that is
              what makes this a payment rather than a purchase.
            </p>
            <div className="sig">{signContent}</div>
            <div className="sig">signature = {signature}</div>
          </div>
        )}
      </div>
    </div>
  );
}
