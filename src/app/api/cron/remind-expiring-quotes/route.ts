export const dynamic = "force-dynamic";
import { sendQuoteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "../../_shared/responses";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const quotes = await prisma.quote.findMany({
      where: {
        status: { in: ["DRAFT", "SENT"] },
        validUntil: { gte: now, lte: cutoff },
        reminderSentAt: null,
      },
      include: { items: true },
    });

    const businessNameByTenant = new Map<string, string>();
    let remindersSent = 0;

    for (const quote of quotes) {
      if (!quote.customerEmail) {
        // Sin email no hay forma de notificar automáticamente por este canal — se marca igual para no reintentar.
        await prisma.quote.update({ where: { id: quote.id }, data: { reminderSentAt: now } });
        continue;
      }

      let businessName = businessNameByTenant.get(quote.tenantId);
      if (!businessName) {
        const settings = await prisma.storeSettings.findUnique({ where: { tenantId: quote.tenantId } });
        businessName = settings?.businessName ?? "SOLVEN";
        businessNameByTenant.set(quote.tenantId, businessName);
      }

      await sendQuoteEmail(quote.customerEmail, quote, quote.items, businessName);
      await prisma.quote.update({ where: { id: quote.id }, data: { reminderSentAt: now } });
      remindersSent += 1;
    }

    return successResponse({ checked: quotes.length, remindersSent });
  } catch {
    return errorResponse("Error al enviar recordatorios de cotizaciones por vencer.");
  }
}
