import { getServerConfig, SUPPORTED_ASSETS } from "@/lib/config";
import CheckoutForm from "../CheckoutForm";
import { listInvoices } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * The integration dashboard — invoice creation, mode banners and the recent
 * invoice list. This is the screen the README calls `/`; the storefront took
 * that path over, so it lives here now.
 */
export default function DevDashboard() {
  const cfg = getServerConfig();
  const invoices = listInvoices().slice(0, 8);

  return (
    <>
      <header className="top">
        <h1>Gateway × Onramper</h1>
        <span className={`pill ${cfg.mode === "mock" ? "sandbox" : "prod"}`}>
          {cfg.mode}
        </span>
        <span className="pill">
          {cfg.mode === "mock" ? "local mock widget" : cfg.widgetBase.replace("https://", "")}
        </span>
        {cfg.onlyOnramps.length > 0 && (
          <span className="pill">onlyOnramps: {cfg.onlyOnramps.join(",")}</span>
        )}
        {cfg.devSimulators && <span className="pill">simulators on</span>}
      </header>

      <div className="wrap">
        {cfg.mode === "mock" && (
          <div className="warn-box">
            <strong>Mock mode — no Onramper account needed.</strong> The iframe points at
            this app&apos;s own <code>/mock/widget</code>, which consumes the same signed
            URL and verifies the HMAC the way Onramper does, then fires real signed
            webhooks at the receiver. Everything after the widget is production code. Set{" "}
            <code>ONRAMPER_MODE=live</code> with your own key and secrets to swap in the
            real widget; <code>ONRAMPER_MODE=preview</code> renders the real widget with
            the public key from Onramper&apos;s docs (no address lock, real money — look,
            don&apos;t pay).
          </div>
        )}

        {cfg.mode === "preview" && (
          <div className="err-box" style={{ marginBottom: 20 }}>
            <strong>Preview mode — real widget, borrowed production key.</strong> This
            renders <code>buy.onramper.com</code> with the public key from Onramper&apos;s
            integration docs. It is a <code>pk_prod</code> key, so entering a card takes
            real money; the wallet params are unsigned and therefore omitted, so the
            destination is <em>not</em> locked and nothing would reach your address; and
            the webhooks belong to that key&apos;s owner, so the invoice only advances via
            the simulators. Use it to see the genuine UI, not to test payments.
          </div>
        )}

        {cfg.mode === "live" && cfg.missingForLive.length > 0 && (
          <div className="warn-box">
            <strong>Missing env:</strong> {cfg.missingForLive.join(", ")}.
          </div>
        )}

        <div className="grid">
          <div>
            <div className="card">
              <h2>Merchant checkout</h2>
              <p className="hint">
                Creates an invoice, assigns the customer&apos;s deposit address, and
                reverse-quotes the expected token amount. Nothing is sent to Onramper yet.
              </p>
              <CheckoutForm assets={SUPPORTED_ASSETS.map((a) => ({ ...a }))} />
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <h2>How this stays on your domain</h2>
              <p className="hint" style={{ margin: 0 }}>
                The widget renders in an iframe on <code>/pay/[invoice]</code>. The
                destination address is HMAC-signed server-side, so the customer cannot
                edit it. <code>partnerContext</code> carries the invoice id into every
                webhook. Providers that force a 3DS or bank redirect come back via{" "}
                <code>successRedirectUrl</code> — restrict <code>onlyOnramps</code> to the
                ones you have verified render in-frame for the customer&apos;s country.
              </p>
            </div>
          </div>

          <div className="card">
            <h2>Recent invoices</h2>
            <p className="hint">In-memory — resets when the server restarts.</p>
            {invoices.length === 0 ? (
              <p className="muted" style={{ fontSize: 12.5 }}>
                None yet.
              </p>
            ) : (
              <table className="tx">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Amount</th>
                    <th>Asset</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.id}</td>
                      <td>
                        {inv.amountFiat} {inv.fiatCurrency}
                      </td>
                      <td>
                        {inv.asset.symbol}/{inv.asset.networkId}
                      </td>
                      <td>{inv.status}</td>
                      <td>
                        <a href={`/pay/${inv.id}`}>open</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
