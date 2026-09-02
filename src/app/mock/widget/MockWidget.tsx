"use client";

import { useState } from "react";

type Step = "quote" | "kyc" | "card" | "processing" | "done" | "failed";

interface Props {
  invoiceId: string;
  amountFiat: number;
  fiatCurrency: string;
  symbol: string;
  networkId: string;
  lockedAddress: string;
  quote: {
    rate: number;
    providerFeeFiat: number;
    networkFeeCrypto: number;
    payout: number;
  };
  successRedirectUrl: string;
  failureRedirectUrl: string;
}

const PROGRESS: { step: string; label: string }[] = [
  { step: "pending", label: "Order created, payment authorised" },
  { step: "paid", label: "Fiat captured by the provider" },
  { step: "completed", label: "Payout broadcast to the network" },
  { step: "broadcast", label: "Deposit seen on chain (1 confirmation)" },
  { step: "confirmed", label: "Deposit confirmed — invoice settles" },
];

export default function MockWidget(props: Props) {
  const [step, setStep] = useState<Step>("quote");
  const [email, setEmail] = useState("payer@example.com");
  const [otp, setOtp] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const short = `${props.lockedAddress.slice(0, 10)}…${props.lockedAddress.slice(-8)}`;

  async function advance(s: string, extra: Record<string, unknown> = {}) {
    await fetch("/api/mock/advance", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invoiceId: props.invoiceId, step: s, ...extra }),
    });
    setDone((d) => [...d, s]);
  }

  async function pay() {
    setBusy(true);
    setStep("processing");
    // Paced so the merchant page beside it visibly moves through each state.
    for (const { step: s } of PROGRESS) {
      await advance(s);
      await new Promise((r) => setTimeout(r, 1200));
    }
    setBusy(false);
    setStep("done");
  }

  async function fail() {
    setBusy(true);
    await advance("failed");
    setBusy(false);
    setStep("failed");
  }

  function leave(url: string) {
    // Same-origin in mock mode, so this works. The real widget does its own
    // top-level redirect to successRedirectUrl / failureRedirectUrl.
    if (window.top) window.top.location.href = url;
  }

  return (
    <div className="mw">
      <div className="mw-head">
        <span className="mw-brand">mockramp</span>
        <span className="mw-badge ok">signature verified</span>
        <span className="mw-steps">
          {step === "quote" ? 1 : step === "kyc" ? 2 : step === "card" ? 3 : 4}/4
        </span>
      </div>

      <div className="mw-body">
        {step === "quote" && (
          <>
            <h3>Buy {props.symbol}</h3>
            <p>
              Paying a merchant order. The destination is fixed by the merchant and cannot
              be changed here.
            </p>
            <div className="mw-big">
              {props.amountFiat.toFixed(2)} {props.fiatCurrency}
            </div>
            <div className="mw-sub">
              ≈ {props.quote.payout.toFixed(6)} {props.symbol} on {props.networkId}
            </div>
            <div className="mw-rows">
              <div>
                <span>Rate</span>
                <span>
                  1 {props.fiatCurrency} = {props.quote.rate} {props.symbol}
                </span>
              </div>
              <div>
                <span>Provider fee</span>
                <span>
                  {props.quote.providerFeeFiat.toFixed(2)} {props.fiatCurrency}
                </span>
              </div>
              <div>
                <span>Network fee</span>
                <span>
                  {props.quote.networkFeeCrypto} {props.symbol}
                </span>
              </div>
              <div>
                <span>You receive</span>
                <span>
                  {props.quote.payout.toFixed(6)} {props.symbol}
                </span>
              </div>
            </div>
            <div className="mw-lock">
              <div className="l">🔒 Destination (locked by signature)</div>
              <div className="a">{props.lockedAddress}</div>
            </div>
            <button className="go" onClick={() => setStep("kyc")}>
              Continue
            </button>
          </>
        )}

        {step === "kyc" && (
          <>
            <h3>Verify your email</h3>
            <p>
              Stands in for the provider&apos;s KYC step. In the real widget this runs in a
              nested iframe and needs camera access for document and selfie capture.
            </p>
            <label htmlFor="em">Email</label>
            <input id="em" value={email} onChange={(e) => setEmail(e.target.value)} />
            <label htmlFor="otp">Verification code</label>
            <input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="000000"
            />
            <div className="mw-hint">Any 6 digits. Real sandbox codes: Banxa 7203, Topper 000-000.</div>
            <button className="go" disabled={otp.trim().length < 6} onClick={() => setStep("card")}>
              Verify
            </button>
          </>
        )}

        {step === "card" && (
          <>
            <h3>Card details</h3>
            <p>
              Sending {props.quote.payout.toFixed(6)} {props.symbol} to {short} on{" "}
              {props.networkId}.
            </p>
            <label htmlFor="pan">Card number</label>
            <input id="pan" defaultValue="4242 4242 4242 4242" disabled />
            <div className="mw-row2">
              <div>
                <label htmlFor="exp">Expiry</label>
                <input id="exp" defaultValue="12/29" disabled />
              </div>
              <div>
                <label htmlFor="cvc">CVC</label>
                <input id="cvc" defaultValue="123" disabled />
              </div>
            </div>
            <div className="mw-hint">
              No money moves — this posts signed webhooks to the merchant&apos;s receiver.
            </div>
            <button className="go" disabled={busy} onClick={() => void pay()}>
              Pay {props.amountFiat.toFixed(2)} {props.fiatCurrency}
            </button>
            <button className="link" disabled={busy} onClick={() => void fail()}>
              Simulate a declined payment instead
            </button>
          </>
        )}

        {(step === "processing" || step === "done") && (
          <>
            <h3>{step === "done" ? "Payment complete" : "Processing"}</h3>
            <p>
              Each line below fires a real signed webhook or a simulated chain event at the
              merchant. Watch the invoice panel behind this frame.
            </p>
            <ul className="mw-prog">
              {PROGRESS.map((p) => (
                <li key={p.step} className={done.includes(p.step) ? "done" : ""}>
                  <span className="mk">{done.includes(p.step) ? "✓" : "·"}</span>
                  {p.label}
                </li>
              ))}
            </ul>
            {step === "done" && (
              <button className="go" onClick={() => leave(props.successRedirectUrl)}>
                Return to merchant
              </button>
            )}
          </>
        )}

        {step === "failed" && (
          <>
            <h3>Payment declined</h3>
            <p>
              The provider marked the order failed. The invoice stays open until it
              expires; the fiat leg refunds through the provider, never on chain.
            </p>
            <button className="go" onClick={() => leave(props.failureRedirectUrl)}>
              Return to merchant
            </button>
          </>
        )}
      </div>

      <div className="mw-foot">
        Mock provider — no Onramper account, no real money, no chain. Set
        ONRAMPER_MODE=live with your own keys to swap in the real widget.
      </div>
    </div>
  );
}
