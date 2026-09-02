import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gateway × Onramper — embedded fiat checkout",
  description:
    "Demo: fiat card payment settling as USDC/USDT to a per-customer deposit address, via a signed Onramper widget embedded in the merchant page.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
