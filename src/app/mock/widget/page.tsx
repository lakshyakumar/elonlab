import { getServerConfig } from "@/lib/config";
import { verifyWalletSignature } from "@/lib/onramper";
import { mockQuote } from "@/lib/mockProvider";
import { getInvoice } from "@/lib/store";
import MockWidget from "./MockWidget";
import "./mock.css";

export const dynamic = "force-dynamic";

/**
 * Stand-in for buy.onramper.dev, so the demo runs with no Onramper account.
 *
 * It consumes the *same* signed URL the real widget would, and does the one
 * thing that matters for correctness: recompute the HMAC over the wallet params
 * and refuse the session if it doesn't match. Everything downstream of it —
 * signed webhooks, reconciliation, the invoice state machine — is the real code
 * path. Point ONRAMPER_MODE=live at the real widget and nothing else changes.
 */
export default async function MockWidgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string): string | undefined => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const cfg = getServerConfig();
  const signature = one("signature") ?? null;

  // Exactly what Onramper checks on receipt.
  const check = verifyWalletSignature(
    {
      networkWallets: one("networkWallets"),
      wallets: one("wallets"),
      walletAddressTags: one("walletAddressTags"),
    },
    signature,
  );

  if (!check.valid) {
    return (
      <div className="mw">
        <div className="mw-head">
          <span className="mw-brand">mockramp</span>
          <span className="mw-badge bad">signature invalid</span>
        </div>
        <div className="mw-body">
          <h3>This checkout link was altered</h3>
          <p>
            The destination address in the URL does not match its signature, so the
            session is refused. This is the mechanism that makes the merchant&apos;s
            address unchangeable by the payer.
          </p>
          <div className="mw-code">
            <div>
              <span>received</span> {signature ?? "(none)"}
            </div>
            <div>
              <span>expected</span> {check.expected}
            </div>
            <div>
              <span>over</span> {check.content || "(no wallet params)"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const invoiceId = one("partnerContext") ?? "";
  const invoice = getInvoice(invoiceId);

  if (!invoice) {
    return (
      <div className="mw">
        <div className="mw-head">
          <span className="mw-brand">mockramp</span>
          <span className="mw-badge bad">no order</span>
        </div>
        <div className="mw-body">
          <h3>Unknown order</h3>
          <p>
            No invoice matches <code>partnerContext={invoiceId || "(missing)"}</code>. The
            in-memory store resets on restart — create a new invoice.
          </p>
        </div>
      </div>
    );
  }

  const quote = mockQuote(invoice);
  const networkWallets = one("networkWallets") ?? "";
  const lockedAddress = networkWallets.split(":")[1] ?? invoice.depositAddress;

  return (
    <MockWidget
      invoiceId={invoice.id}
      amountFiat={invoice.amountFiat}
      fiatCurrency={invoice.fiatCurrency}
      symbol={invoice.asset.symbol}
      networkId={invoice.asset.networkId}
      lockedAddress={lockedAddress}
      quote={quote}
      successRedirectUrl={one("successRedirectUrl") ?? `${cfg.appBaseUrl}/complete`}
      failureRedirectUrl={one("failureRedirectUrl") ?? `${cfg.appBaseUrl}/complete`}
    />
  );
}
