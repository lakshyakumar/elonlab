import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerConfig } from "@/lib/config";
import { buildWidgetSession } from "@/lib/onramper";
import { getInvoice } from "@/lib/store";
import PayClient from "./PayClient";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = getInvoice(id);
  if (!invoice) notFound();

  const cfg = getServerConfig();

  // Minted on the server: the signing secret never crosses to the client, and
  // the customer receives a URL whose destination address is already locked.
  let widgetUrl: string | null = null;
  let signContent: string | null = null;
  let signature: string | null = null;
  let sessionError: string | null = null;

  try {
    const session = buildWidgetSession({
      asset: invoice.asset,
      depositAddress: invoice.depositAddress,
      amountFiat: invoice.amountFiat,
      fiatCurrency: invoice.fiatCurrency,
      partnerContext: invoice.id,
    });
    widgetUrl = session.url;
    signContent = session.signContent;
    signature = session.signature;
  } catch (err) {
    sessionError = err instanceof Error ? err.message : "could not build widget session";
  }

  return (
    <>
      <header className="top">
        <h1>
          <Link href="/">Gateway × Onramper</Link> — {invoice.id}
        </h1>
        <span className={`pill ${cfg.mode === "mock" ? "sandbox" : "prod"}`}>
          {cfg.mode}
        </span>
        <span className="pill">
          {invoice.amountFiat} {invoice.fiatCurrency} → {invoice.asset.symbol} on{" "}
          {invoice.asset.networkId}
        </span>
      </header>

      <div className="wrap">
        {cfg.mode === "mock" && (
          <div className="warn-box">
            <strong>Mock provider.</strong> Pay in the frame on the right — it walks the
            provider states and fires real signed webhooks, and this panel moves with
            them. Nothing real: no account, no money, no chain.
          </div>
        )}

        {cfg.mode === "preview" && (
          <div className="err-box" style={{ marginBottom: 20 }}>
            <strong>Preview: real widget, live production key, no address lock.</strong>{" "}
            Do not enter card details — that is real money going to a wallet that is not
            this invoice&apos;s. Advance the invoice with the simulators instead.
          </div>
        )}

        {cfg.mode === "live" && cfg.env === "sandbox" && (
          <div className="warn-box">
            <strong>Sandbox:</strong> providers here settle on no chain, real or test, so
            nothing will ever arrive at the deposit address. Drive the card flow in the
            widget for real (Banxa EUR/GBP test card <code>4242 4242 4242 4242</code>, OTP{" "}
            <code>7203</code>), then use the simulator buttons to play the webhook and
            on-chain legs.
          </div>
        )}

        {sessionError && (
          <div className="err-box" style={{ marginBottom: 20 }}>
            <strong>Cannot mint widget URL:</strong> {sessionError}
          </div>
        )}

        <PayClient
          invoiceId={invoice.id}
          widgetUrl={widgetUrl}
          signContent={signContent}
          signature={signature}
          devSimulators={cfg.devSimulators}
        />
      </div>
    </>
  );
}
