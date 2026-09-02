export type OnramperEnv = "sandbox" | "production";

/**
 * Onramper's own transaction statuses, as delivered by the webhook.
 *
 *   new       -> order created at the provider
 *   pending   -> provider is processing (KYC / payment auth / settlement)
 *   paid      -> FIAT captured. Crypto has NOT necessarily been sent.
 *   completed -> provider says the crypto payout was broadcast
 *   failed    -> terminal failure
 *   canceled  -> user or provider aborted
 */
export type OnramperStatus =
  | "new"
  | "pending"
  | "paid"
  | "completed"
  | "failed"
  | "canceled";

/**
 * Our invoice lifecycle. Deliberately separate from the onramp status: fiat
 * capture and on-chain settlement are two different facts and the goods must
 * not be released on the first one.
 */
export type InvoiceStatus =
  | "created" // address assigned, nothing seen yet
  | "onramp_pending" // widget session opened / provider processing
  | "fiat_paid" // provider captured fiat, crypto not confirmed on chain
  | "crypto_settled" // on-chain deposit confirmed within tolerance
  | "underpaid" // on-chain deposit confirmed, below tolerance band
  | "overpaid" // on-chain deposit confirmed, above tolerance band
  | "failed"
  | "expired";

export interface AssetRef {
  /** Onramper crypto id, e.g. "usdc_polygon". Confirm against /supported/assets. */
  cryptoId: string;
  /** Onramper network id, e.g. "polygon". */
  networkId: string;
  /** Display symbol. */
  symbol: string;
  /** Token decimals, used for on-chain amount comparison. */
  decimals: number;
}

export interface OnrampLeg {
  transactionId: string;
  onrampTransactionId?: string;
  provider?: string;
  status: OnramperStatus;
  inAmount?: number;
  sourceCurrency?: string;
  outAmount?: number;
  targetCurrency?: string;
  walletAddress?: string;
  paymentMethod?: string;
  country?: string;
  partnerFee?: number;
  txHash?: string;
  updatedAt: string;
}

export interface ChainLeg {
  txHash: string;
  /** Human-readable token amount (already scaled down by decimals). */
  amount: number;
  confirmations: number;
  observedAt: string;
}

export interface InvoiceEvent {
  at: string;
  type: string;
  detail: string;
}

export interface Invoice {
  id: string;
  customerId: string;
  createdAt: string;
  expiresAt: string;

  /** What the merchant is charging, denominated in fiat. */
  amountFiat: number;
  fiatCurrency: string;

  asset: AssetRef;
  /** The customer's assigned deposit address. Locked into the signed widget URL. */
  depositAddress: string;

  /**
   * Expected crypto amount from the Onramper quote at invoice creation.
   * null when no quote was obtainable — then we settle purely on received amount.
   */
  expectedCrypto: number | null;
  /** Tolerance band applied to expectedCrypto, as fractions (0.02 = 2%). */
  tolerance: { underPct: number; overPct: number };

  status: InvoiceStatus;
  onramp: OnrampLeg | null;
  chain: ChainLeg | null;
  events: InvoiceEvent[];
}

export interface OnramperWebhookPayload {
  transactionId?: string;
  onrampTransactionId?: string;
  onramp?: string;
  status?: string;
  statusDate?: string;
  inAmount?: number;
  outAmount?: number;
  sourceCurrency?: string;
  targetCurrency?: string;
  walletAddress?: string;
  paymentMethod?: string;
  country?: string;
  partnerContext?: string;
  partnerFee?: number;
  txHash?: string;
  [key: string]: unknown;
}
