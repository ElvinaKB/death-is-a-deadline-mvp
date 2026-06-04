import type { PaymentMethod } from "@stripe/stripe-js";
import { SavedPaymentMethod } from "../types/payment.types";

export const DUPLICATE_SAVED_CARD_MESSAGE =
  "This card is already saved. Select it from your saved cards above.";

export const CARD_ADDED_MESSAGE = "Card added";

export function savedCardIdentity(
  method: Pick<
    SavedPaymentMethod,
    "fingerprint" | "brand" | "last4" | "expMonth" | "expYear"
  >,
): string {
  if (method.fingerprint) return method.fingerprint;
  return `${method.brand}-${method.last4}-${method.expMonth ?? ""}-${method.expYear ?? ""}`;
}

export function dedupeSavedPaymentMethods(
  methods: SavedPaymentMethod[],
): SavedPaymentMethod[] {
  const seen = new Set<string>();
  return methods.filter((method) => {
    const key = savedCardIdentity(method);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeBrand(brand?: string | null): string {
  return (brand ?? "").trim().toLowerCase();
}

export function findMatchingSavedCard(
  card: {
    fingerprint?: string | null;
    last4?: string | null;
    brand?: string | null;
    exp_month?: number;
    exp_year?: number;
  },
  savedMethods: SavedPaymentMethod[],
): SavedPaymentMethod | undefined {
  if (!card.last4 || savedMethods.length === 0) return undefined;

  if (card.fingerprint) {
    const byFingerprint = savedMethods.find(
      (method) => method.fingerprint === card.fingerprint,
    );
    if (byFingerprint) return byFingerprint;
  }

  if (card.exp_month != null && card.exp_year != null) {
    const byExpiry = savedMethods.find(
      (method) =>
        method.last4 === card.last4 &&
        method.expMonth === card.exp_month &&
        method.expYear === card.exp_year,
    );
    if (byExpiry) return byExpiry;
  }

  const sameLast4 = savedMethods.filter((method) => method.last4 === card.last4);
  if (sameLast4.length === 0) return undefined;

  const cardBrand = normalizeBrand(card.brand);
  if (cardBrand) {
    const byBrand = sameLast4.find(
      (method) => normalizeBrand(method.brand) === cardBrand,
    );
    if (byBrand) return byBrand;
  }

  if (sameLast4.length === 1) return sameLast4[0];

  return undefined;
}

export function isDuplicateOfSavedCard(
  paymentMethod: PaymentMethod,
  savedMethods: SavedPaymentMethod[],
): boolean {
  if (paymentMethod.type !== "card" || !paymentMethod.card) return false;
  return !!findMatchingSavedCard(paymentMethod.card, savedMethods);
}
