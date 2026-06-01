import { prisma } from "../libs/config/prisma";
import { stripe } from "../libs/config/stripe";

export async function findStripeCustomerIdForStudent(
  studentId: string,
): Promise<string | null> {
  const existing = await prisma.payment.findFirst({
    where: { studentId, stripeCustomerId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { stripeCustomerId: true },
  });
  return existing?.stripeCustomerId ?? null;
}

export async function getOrCreateStripeCustomerForStudent(
  studentId: string,
): Promise<string> {
  const existingId = await findStripeCustomerIdForStudent(studentId);
  if (existingId) {
    try {
      await stripe.customers.retrieve(existingId);
      return existingId;
    } catch {
      // Stripe customer removed — create a new one
    }
  }

  const user = await prisma.users.findUnique({
    where: { id: studentId },
    select: { email: true, raw_user_meta_data: true },
  });

  const meta = user?.raw_user_meta_data as { name?: string } | null;
  const customer = await stripe.customers.create({
    email: user?.email ?? undefined,
    name: meta?.name,
    metadata: { student_id: studentId },
  });

  return customer.id;
}
