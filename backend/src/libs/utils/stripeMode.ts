export type StripeMode = "test" | "live";

export function getStripeKeyMode(key: string | undefined): StripeMode | null {
  if (!key) return null;
  if (key.startsWith("sk_live_") || key.startsWith("pk_live_")) return "live";
  if (key.startsWith("sk_test_") || key.startsWith("pk_test_")) return "test";
  return null;
}

export function getBackendStripeMode(): StripeMode {
  const mode = getStripeKeyMode(process.env.STRIPE_SECRET_KEY);
  if (!mode) {
    throw new Error("Invalid STRIPE_SECRET_KEY — expected sk_test_ or sk_live_");
  }
  return mode;
}
