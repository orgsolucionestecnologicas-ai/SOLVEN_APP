export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import {
  sendCancellationEmail,
  sendPaymentFailedEmail,
  sendTrialEndingEmail,
  sendWelcomeEmail
} from "@/lib/email";

async function verifySignature(body: string, signatureHex: string): Promise<boolean> {
  const secret = process.env.REBILL_WEBHOOK_SECRET;
  if (!secret) return true; // Allow in dev without secret

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const sigBytes = new Uint8Array(signatureHex.length / 2);
  for (let i = 0; i < signatureHex.length; i += 2) {
    sigBytes[i / 2] = parseInt(signatureHex.slice(i, i + 2), 16);
  }

  return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(body));
}

type RebillEvent = {
  type: string;
  data: {
    id?: string;
    customer?: { email?: string };
    current_period_end?: string;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-rebill-signature") ?? "";

  if (!(await verifySignature(rawBody, signature))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: RebillEvent;
  try {
    event = JSON.parse(rawBody) as RebillEvent;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = event;

  try {
    if (type === "subscription.activated" || type === "subscription.created") {
      const customerEmail = data.customer?.email;
      if (customerEmail) {
        const tenant = await prisma.tenant.findUnique({
          where: { email: customerEmail.toLowerCase() },
          include: { subscription: true }
        });
        if (tenant?.subscription) {
          await prisma.subscription.update({
            where: { tenantId: tenant.id },
            data: { status: "ACTIVE", rebillSubscriptionId: data.id ?? null }
          });
          await sendWelcomeEmail(customerEmail, tenant.businessName);
        }
      }
    } else if (type === "payment.success" || type === "invoice.paid") {
      if (data.id) {
        const sub = await prisma.subscription.findUnique({
          where: { rebillSubscriptionId: data.id }
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "ACTIVE",
              currentPeriodEnd: data.current_period_end
                ? new Date(data.current_period_end)
                : undefined
            }
          });
        }
      }
    } else if (type === "payment.failed" || type === "invoice.payment_failed") {
      if (data.id) {
        const sub = await prisma.subscription.findFirst({
          where: { rebillSubscriptionId: data.id },
          include: { tenant: true }
        });
        if (sub) {
          await prisma.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
          await sendPaymentFailedEmail(sub.tenant.email, sub.tenant.businessName);
        }
      }
    } else if (type === "subscription.cancelled") {
      if (data.id) {
        const sub = await prisma.subscription.findFirst({
          where: { rebillSubscriptionId: data.id },
          include: { tenant: true }
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "CANCELLED", cancelledAt: new Date() }
          });
          await sendCancellationEmail(sub.tenant.email, sub.tenant.businessName);
        }
      }
    } else if (type === "subscription.trial_will_end") {
      if (data.id) {
        const sub = await prisma.subscription.findFirst({
          where: { rebillSubscriptionId: data.id },
          include: { tenant: true }
        });
        if (sub?.trialEndsAt) {
          const daysLeft = Math.max(0, Math.ceil(
            (sub.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ));
          await sendTrialEndingEmail(sub.tenant.email, sub.tenant.businessName, daysLeft);
        }
      }
    }
  } catch (err) {
    console.error("[webhook/rebill] Error processing event:", type, err);
  }

  return Response.json({ received: true });
}
