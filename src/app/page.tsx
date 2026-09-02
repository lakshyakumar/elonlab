import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import DemoGate from "./DemoGate";
import "./checkout/storefront.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--sf-font",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--sf-mono",
  display: "swap",
});

export default function Home() {
  return (
    <div className={`sf sf-centered ${sans.variable} ${mono.variable}`}>
      <DemoGate />
    </div>
  );
}
