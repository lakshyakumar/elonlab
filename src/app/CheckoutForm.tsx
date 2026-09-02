"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AssetOption {
  cryptoId: string;
  networkId: string;
  symbol: string;
  decimals: number;
}

export default function CheckoutForm({ assets }: { assets: AssetOption[] }) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("cus_10482");
  const [amount, setAmount] = useState("120");
  const [fiat, setFiat] = useState("EUR");
  const [cryptoId, setCryptoId] = useState(assets[0]?.cryptoId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerId,
          amountFiat: Number(amount),
          fiatCurrency: fiat,
          cryptoId,
        }),
      });
      const body = (await res.json()) as { invoice?: { id: string }; error?: string };
      if (!res.ok || !body.invoice) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.push(`/pay/${body.invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="cus">Customer id</label>
      <input
        id="cus"
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        placeholder="cus_10482"
      />

      <div className="row">
        <div>
          <label htmlFor="amt">Amount</label>
          <input
            id="amt"
            value={amount}
            inputMode="decimal"
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="fiat">Fiat</label>
          <select id="fiat" value={fiat} onChange={(e) => setFiat(e.target.value)}>
            {/* Banxa's sandbox is the most complete one and works with EUR/GBP. */}
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      <label htmlFor="asset">Settle in</label>
      <select id="asset" value={cryptoId} onChange={(e) => setCryptoId(e.target.value)}>
        {assets.map((a) => (
          <option key={a.cryptoId} value={a.cryptoId}>
            {a.symbol} · {a.networkId} ({a.cryptoId})
          </option>
        ))}
      </select>

      {error && (
        <div className="err-box" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}

      <button className="primary" type="submit" disabled={busy}>
        {busy ? "Creating invoice…" : "Create invoice & open checkout"}
      </button>
    </form>
  );
}
