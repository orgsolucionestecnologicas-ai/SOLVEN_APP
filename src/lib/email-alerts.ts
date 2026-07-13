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

export async function notifyLowStockIfEnabled(
  tenantId: string,
  products: { name: string; stock: number }[]
): Promise<void> {
  if (products.length === 0) return;
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
    if (!settings?.lowStockEmailAlerts) return;
    const owner = await getOwnerEmailAndBusinessName(tenantId);
    if (!owner) return;
    await sendLowStockAlertEmail(owner.email, owner.businessName, products);
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
