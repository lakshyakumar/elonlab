/**
 * The cart the shipping step renders. Comes from the basket in a real
 * storefront; hard-coded here so the page can be opened directly.
 */
export interface Order {
  item: {
    name: string;
    /** Pack description shown under the product name. */
    spec: string;
    quantity: number;
    unitPrice: number;
  };
  subtotal: number;
  shipping: number;
  shippingRegion: string;
  total: number;
  currency: "GBP" | "EUR" | "USD";
  /** Account email the confirmation goes to. */
  email: string;
}

const SYMBOLS: Record<Order["currency"], string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
};

/**
 * Formatted without `Intl` on purpose: the page renders on the server and
 * hydrates on the client, and a locale difference between the two would be a
 * hydration mismatch on every price.
 */
export function formatMoney(amount: number, currency: Order["currency"]): string {
  return `${SYMBOLS[currency]}${amount.toFixed(2)}`;
}

/** Pre-filled delivery details, so the demo can be walked without typing. */
export const DEMO_SHIPPING = {
  fullName: "John Smith",
  address: "123 Research Lane, Science Park, London, UK",
  postcode: "SW1A 1AA",
  phone: "+44 7700 900123",
};

export const DEMO_ORDER: Order = {
  item: {
    name: "BPC 157",
    spec: "10 x 5mg vials",
    quantity: 1,
    unitPrice: 98.75,
  },
  subtotal: 98.75,
  shipping: 0,
  shippingRegion: "UK",
  total: 98.75,
  currency: "GBP",
  email: "xecobar827@mediseat.com",
};
