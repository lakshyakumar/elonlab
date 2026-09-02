"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Coins,
  CreditCard,
  HelpCircle,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Tag,
  User,
  VialThumb,
  X,
} from "./icons";
import type { Order } from "./order";
import { DEMO_SHIPPING, formatMoney } from "./order";

/**
 * Onramper's own public docs key, in `buy` mode. Unsigned: it carries no wallet
 * params and no `partnerContext`, so the destination address is not locked and
 * nothing correlates back to an invoice. It is also a `pk_prod` key — a card
 * entered here moves real money.
 */
const CARD_WIDGET_URL =
  "https://buy.onramper.com/?apiKey=pk_prod_01HETEQF46GSK6BS5JWKDF31BT&mode=buy";

interface Props {
  order: Order;
}

type View = "method" | "card";

export default function ShippingCheckout({ order }: Props) {
  const [fullName, setFullName] = useState(DEMO_SHIPPING.fullName);
  const [address, setAddress] = useState(DEMO_SHIPPING.address);
  const [postcode, setPostcode] = useState(DEMO_SHIPPING.postcode);
  const [phone, setPhone] = useState(DEMO_SHIPPING.phone);
  const [discount, setDiscount] = useState("");
  const [discountError, setDiscountError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("method");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  /**
   * A separate window rather than an iframe: Onramper answers with
   * `frame-ancestors … https://localhost http://localhost`, and a portless
   * host-source matches only the scheme's default port, so embedding is refused
   * on any dev port.
   */
  function openCardWindow() {
    const w = 460;
    const h = 720;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 3);
    const win = window.open(
      CARD_WIDGET_URL,
      "onramper-pay",
      `popup=yes,width=${w},height=${h},left=${Math.round(left)},top=${Math.round(top)}`,
    );
    setPopupBlocked(win === null);
    win?.focus();
  }

  function payByCard() {
    setView("card");
    openCardWindow();
  }

  // `showModal` gives us the top layer, the backdrop and Esc-to-close for free.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  function openMethods(e: React.FormEvent) {
    e.preventDefault();
    setView("method");
    setOpen(true);

    // No invoice is created for the docs-key widget, so keep the address the
    // customer typed rather than dropping it on the floor.
    try {
      sessionStorage.setItem(
        "echelon:shipping:last",
        JSON.stringify({ fullName, address, postcode, phone, email: order.email }),
      );
    } catch {
      // Private-mode storage failures must not block checkout.
    }
  }

  const money = (n: number) => formatMoney(n, order.currency);

  return (
    <>
      <form className="sf-grid" onSubmit={openMethods}>
        <section className="sf-card">
          <h2 className="sf-card-title">
            <MapPin />
            Delivery Address
          </h2>

          <div className="sf-field">
            <label htmlFor="sf-name">
              <User />
              Full Name
            </label>
            <input
              id="sf-name"
              name="name"
              autoComplete="name"
              placeholder="John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="sf-field">
            <label htmlFor="sf-address">
              <MapPin />
              Full Address
            </label>
            <textarea
              id="sf-address"
              name="address"
              autoComplete="street-address"
              rows={3}
              placeholder="123 Research Lane, Science Park, London, UK"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="sf-field-pair">
            <div>
              <label htmlFor="sf-postcode">
                <Mail />
                Postal / Zip Code
              </label>
              <input
                id="sf-postcode"
                name="postalCode"
                autoComplete="postal-code"
                placeholder="SW1A 1AA"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="sf-phone">
                <Phone />
                Phone Number
              </label>
              <input
                id="sf-phone"
                name="tel"
                type="tel"
                autoComplete="tel"
                placeholder="+44 7700 900123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <p className="sf-email-note">
            <Mail />
            <span>Confirmation email will be sent to:</span>
            <strong>{order.email}</strong>
          </p>
        </section>

        <aside className="sf-card">
          <h2 className="sf-card-title">
            <Package />
            Order Summary
          </h2>

          <div className="sf-line-item">
            <VialThumb className="sf-line-item-thumb" />
            <div>
              <div className="sf-line-item-name">{order.item.name}</div>
              <div className="sf-line-item-spec">{order.item.spec}</div>
              <div className="sf-line-item-price">
                {order.item.quantity} × <span className="amt">{money(order.item.unitPrice)}</span>
              </div>
            </div>
          </div>

          <hr className="sf-rule" />

          <div className="sf-discount-label">
            <Tag />
            Discount Code
          </div>
          <div className="sf-discount-row">
            <input
              aria-label="Discount code"
              placeholder="Enter code"
              value={discount}
              onChange={(e) => {
                setDiscount(e.target.value);
                setDiscountError(null);
              }}
            />
            <button
              type="button"
              className="sf-apply-btn"
              disabled={discount.trim() === ""}
              onClick={() => setDiscountError("That discount code is not recognised.")}
            >
              Apply
            </button>
          </div>

          <hr className="sf-rule" />

          <div className="sf-total-row">
            <span className="lbl">Subtotal ({order.item.quantity} kit)</span>
            <span className="val">{money(order.subtotal)}</span>
          </div>
          <div className="sf-total-row">
            <span className="lbl">Shipping ({order.shippingRegion})</span>
            {order.shipping === 0 ? (
              <span className="val word">Free</span>
            ) : (
              <span className="val">{money(order.shipping)}</span>
            )}
          </div>
          <div className="sf-total-row grand">
            <span className="lbl">Total</span>
            <span className="val">{money(order.total)}</span>
          </div>

          <button className="sf-pay-btn" type="submit">
            <CreditCard />
            Continue to Payment
          </button>

          <p className="sf-secure">
            <ShieldCheck />
            Secure crypto payment
          </p>

          {discountError && <div className="sf-error">{discountError}</div>}

          <span className="sf-help">
            <HelpCircle />
            Struggling to pay? See our simple guide
          </span>

          <p className="sf-ruo">
            <AlertTriangle />
            For Research Use Only. Not for human consumption.
          </p>
        </aside>
      </form>

      <dialog
        className="sf-modal"
        ref={dialogRef}
        aria-labelledby="sf-modal-title"
        onClose={() => {
          setOpen(false);
          setView("method");
          setPopupBlocked(false);
        }}
      >
        <div className="sf-modal-inner">
          <div className="sf-modal-head">
            {view === "card" && (
              <button
                type="button"
                className="sf-modal-back"
                aria-label="Back to payment methods"
                onClick={() => setView("method")}
              >
                <ArrowLeft />
              </button>
            )}
            <div className="sf-modal-heading">
              <h3 id="sf-modal-title">
                {view === "method" ? "Choose how to pay" : "Pay by card"}
              </h3>
              <p className="sf-modal-sub">
                {view === "method" ? (
                  <>
                    Order total <span className="amt">{money(order.total)}</span>
                  </>
                ) : (
                  "The payment window opens separately."
                )}
              </p>
            </div>
            <button
              type="button"
              className="sf-modal-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              <X />
            </button>
          </div>

          {view === "method" ? (
            <div className="sf-modal-options">
              <button type="button" className="sf-option" disabled>
                <Coins />
                <span className="sf-option-text">
                  <span className="sf-option-label">
                    Pay via crypto
                    <span className="sf-option-tag">Unavailable</span>
                  </span>
                  <span className="sf-option-desc">
                    Send USDC or USDT from your own wallet.
                  </span>
                </span>
                <ChevronRight className="sf-option-chev" />
              </button>

              <button type="button" className="sf-option go" onClick={payByCard}>
                <CreditCard />
                <span className="sf-option-text">
                  <span className="sf-option-label">Pay via cards</span>
                  <span className="sf-option-desc">Debit or credit card.</span>
                </span>
                <ChevronRight className="sf-option-chev" />
              </button>
            </div>
          ) : (
            <>
              <p className="sf-modal-note">
                <CreditCard />
                <span>
                  Finish the payment in the window that just opened, then come back to
                  this page.
                </span>
              </p>

              {popupBlocked && (
                <div className="sf-error">
                  Your browser blocked the payment window. Allow pop-ups for this site,
                  then try again.
                </div>
              )}

              <div className="sf-modal-actions">
                <button type="button" className="sf-btn-ghost" onClick={openCardWindow}>
                  Reopen window
                </button>
                <button
                  type="button"
                  className="sf-btn-solid"
                  onClick={() => setOpen(false)}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
