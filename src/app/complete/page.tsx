import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Landing target for successRedirectUrl / failureRedirectUrl.
 *
 * This is the safety net for providers that break out of the iframe (3DS
 * step-up, open banking, Apple Pay). The customer comes back here, not to the
 * provider's own thank-you page. Note that arriving here proves nothing about
 * settlement — the invoice state still comes from the webhook plus the chain.
 */
export default async function Complete({
  searchParams,
}: {
  searchParams: Promise<{ invoice?: string; result?: string }>;
}) {
  const { invoice, result } = await searchParams;
  const ok = result === "success";

  return (
    <>
      <header className="top">
        <h1>
          <Link href="/">Gateway × Onramper</Link> — checkout returned
        </h1>
        <span className="pill">{result ?? "unknown"}</span>
      </header>
      <div className="wrap">
        <div className="card" style={{ maxWidth: 620 }}>
          <h2>{ok ? "Provider reported success" : "Provider reported a failure"}</h2>
          <p className="hint">
            {ok
              ? "The customer finished the provider flow. This redirect is not proof of settlement — the invoice only becomes settled when the webhook and the chain watcher agree."
              : "The customer abandoned or the provider declined. The invoice stays open until it expires."}
          </p>
          {invoice && (
            <p>
              <Link href={`/pay/${invoice}`}>Back to invoice {invoice}</Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
