import { Fragment } from "react";
import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import ShippingCheckout from "./ShippingCheckout";
import { DEMO_ORDER } from "./order";
import "./storefront.css";
import {
  ArrowLeft,
  BrandMark,
  Cart,
  FlaskConical,
  Globe,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  User,
} from "./icons";

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

export const metadata: Metadata = {
  title: "Shipping Details — Echelon Labs",
  description: "Enter your delivery information to continue.",
};

/**
 * Presentational only — this is a demo of the shipping step, so nothing in the
 * chrome navigates. Give these `href`s when the surrounding storefront exists.
 */
const NAV = ["Products", "Testing & COA", "Resources", "About", "Contact"];

const STEPS = ["Cart", "Shipping", "Payment", "Confirmation"] as const;
const CURRENT_STEP = "Shipping";

export default function ShippingPage() {
  return (
    <div className={`sf ${sans.variable} ${mono.variable}`}>
      <div className="sf-notice">
        This is a demo app — please don&apos;t pay
      </div>

      <header className="sf-header">
        <div className="sf-header-inner">
          {/* Stands in for the nav once the links no longer fit. */}
          <span className="sf-burger" aria-label="Menu">
            <Menu />
          </span>

          <span className="sf-brand">
            <BrandMark className="sf-brand-mark" />
            <span className="sf-wordmark">ECHELON LABS</span>
          </span>

          <nav className="sf-nav">
            {NAV.map((label) => (
              <span key={label} className="sf-nav-link">
                {label}
              </span>
            ))}
            <span className="sf-nav-link with-icon">
              <ShieldCheck />
              Become a Partner
            </span>
          </nav>

          <div className="sf-header-tools">
            <span className="sf-ghost-btn">
              <LogIn />
              Partner Login
            </span>

            <span className="sf-locale">
              <Globe />
              <span className="sf-flag" role="img" aria-label="United Kingdom">
                🇬🇧
              </span>
              UK
            </span>

            <span className="sf-icon-btn" aria-label="Cart, 1 item">
              <Cart />
              <span className="sf-cart-count">1</span>
            </span>

            <span className="sf-icon-btn" aria-label="Account">
              <User />
            </span>

            <span className="sf-icon-btn" aria-label="Sign out">
              <LogOut />
            </span>
          </div>
        </div>
      </header>

      <main className="sf-main">
        <div className="sf-page-head">
          <span className="sf-back" aria-label="Back to cart">
            <ArrowLeft />
          </span>
          <div>
            <h1>Shipping Details</h1>
            <p>Enter your delivery information to continue</p>
          </div>
        </div>

        <nav className="sf-steps" aria-label="Checkout progress">
          {STEPS.map((step, i) => (
            <Fragment key={step}>
              {i > 0 && (
                <span className="sep" aria-hidden>
                  &#10230;
                </span>
              )}
              <span
                className={step === CURRENT_STEP ? "current" : undefined}
                aria-current={step === CURRENT_STEP ? "step" : undefined}
              >
                {step}
              </span>
            </Fragment>
          ))}
        </nav>

        <ShippingCheckout order={DEMO_ORDER} />
      </main>

      <footer className="sf-footer">
        <div className="sf-footer-inner">
          <FlaskConical />
          <p style={{ margin: 0 }}>
            For Research Use Only. Products are intended for laboratory research and
            development by qualified professionals. Not for human consumption. Not approved
            for medical, veterinary, cosmetic, food, or diagnostic use.
          </p>
        </div>
      </footer>
    </div>
  );
}
