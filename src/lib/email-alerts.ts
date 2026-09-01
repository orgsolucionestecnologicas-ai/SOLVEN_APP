import { prisma } from "@/lib/prisma";
import { sendCashRegisterDifferenceAlertEmail, sendLowStockAlertEmail } from "@/lib/email";

async function getOwnerEmailAndBusinessName(tenantId: string): Promise<{ email: string; businessName: string } | null> {
  const [owner, settings] = await Promise.all([
    prisma.user.findFirst({ where: { tenantId, role: "OWNER" } }),
    prisma.storeSettings.findUnique({ where: { tenantId } })
  ]);
  if (!owner?.email) return null;
  return { email: owner.email, businessName: settings?.businessName ?? "SOLVEN" };
}

const LOW_STOCK_ALERT_THROTTLE_MS = 12 * 60 * 60 * 1000;

export async function notifyLowStockIfEnabled(
  tenantId: string,
  products: { id: string; name: string; stock: number }[]
): Promise<void> {
  if (products.length === 0) return;
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
    if (!settings?.lowStockEmailAlerts) return;

    const recentAlerts = await prisma.productLowStockAlert.findMany({
      where: {
        productId: { in: products.map((product) => product.id) },
        lastNotifiedAt: { gte: new Date(Date.now() - LOW_STOCK_ALERT_THROTTLE_MS) }
      },
      select: { productId: true }
    });
    const recentlyNotifiedIds = new Set(recentAlerts.map((alert) => alert.productId));
    const productsToNotify = products.filter((product) => !recentlyNotifiedIds.has(product.id));
    if (productsToNotify.length === 0) return;

    const owner = await getOwnerEmailAndBusinessName(tenantId);
    if (!owner) return;
    await sendLowStockAlertEmail(owner.email, owner.businessName, productsToNotify);

    const now = new Date();
    await Promise.all(
      productsToNotify.map((product) =>
        prisma.productLowStockAlert.upsert({
          where: { productId: product.id },
          create: { tenantId, productId: product.id, lastNotifiedAt: now },
          update: { lastNotifiedAt: now }
        })
      )
    );
  } catch (err) {
    console.error("[email-alerts] failed to send low stock alert", err);
  }
}

export async function notifyCashDifferenceIfEnabled(tenantId: string, difference: number): Promise<void> {
  if (Math.abs(difference) < 0.005) return;
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
    if (!settings?.cashDifferenceEmailAlerts) return;
    const owner = await getOwnerEmailAndBusinessName(tenantId);
    if (!owner) return;
    await sendCashRegisterDifferenceAlertEmail(owner.email, owner.businessName, difference);
  } catch (err) {
    console.error("[email-alerts] failed to send cash difference alert", err);
  }
}
