import crypto from "node:crypto";

/**
 * Stand-in for your real address assignment.
 *
 * In the gateway this is whatever you already have: an HD wallet derivation
 * (m/44'/60'/0'/0/i keyed by customer index), a per-customer smart account, or
 * addresses leased from a custody provider. The only contract the onramp
 * integration cares about is this: given a customer, return a stable EVM
 * address you are already watching on chain.
 *
 * Sandbox note: Onramper's sandbox settles on no chain at all, real or test, so
 * nothing ever arrives at this address. The on-chain leg is exercised with
 * /api/dev/simulate-deposit instead.
 */
const assigned = new Map<string, string>();

export function getDepositAddress(customerId: string, networkId: string): string {
  // One address per (customer, chain). EVM chains share an address in practice;
  // keyed per chain here so the demo also works if you add a non-EVM asset.
  const key = `${networkId}:${customerId}`;
  const existing = assigned.get(key);
  if (existing) return existing;

  // Deterministic, obviously-fake address derived from the customer id.
  // Lowercase is a valid EVM address form (EIP-55 checksumming is optional);
  // real code would return viem's getAddress(...) output.
  const digest = crypto.createHash("sha256").update(key).digest("hex");
  const address = `0x${digest.slice(0, 40)}`;
  assigned.set(key, address);
  return address;
}
