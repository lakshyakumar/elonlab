"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "./checkout/icons";

/**
 * The only control on the home page. Interposes a warning before the checkout
 * so nobody arrives at a payment screen thinking this is a real shop.
 */
export default function DemoGate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="sf-pay-btn sf-standalone-btn"
        onClick={() => setOpen(true)}
      >
        Checkout
      </button>

      <dialog
        className="sf-modal"
        ref={dialogRef}
        aria-labelledby="sf-demo-title"
        onClose={() => setOpen(false)}
      >
        <div className="sf-modal-inner">
          <div className="sf-modal-head">
            <span className="sf-modal-badge">
              <AlertTriangle />
            </span>
            <div className="sf-modal-heading">
              <h3 id="sf-demo-title">This is a demo app</h3>
              <p className="sf-modal-sub">
                Please don&apos;t pay. The checkout ahead is a demonstration of the
                payment flow — no order will be placed and nothing will be shipped.
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

          <div className="sf-modal-actions">
            <button type="button" className="sf-btn-ghost" onClick={() => setOpen(false)}>
              Go back
            </button>
            <button
              type="button"
              className="sf-btn-solid"
              onClick={() => router.push("/checkout")}
            >
              I understand, continue
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
