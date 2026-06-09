export const dynamic = "force-dynamic";
import {
  getQuoteById,
  QuoteNotFoundError,
} from "../../../../../modules/quotes";
import { sendQuoteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse,
} from "../../../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "CASHIER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const { id } = await params;

  try {
    const quote = await getQuoteById(id, tenantId);

    if (!quote.customerEmail) {
      return errorResponse("El cliente no tiene email registrado.", 400);
    }

    if (quote.status !== "DRAFT" && quote.status !== "SENT") {
      return errorResponse("Solo se pueden enviar recordatorios a cotizaciones activas.", 400);
    }

    const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
    const businessName = settings?.businessName ?? "SOLVEN";

    await sendQuoteEmail(quote.customerEmail, quote, quote.items, businessName);

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        status: quote.status === "DRAFT" ? "SENT" : "SENT",
        reminderSentAt: new Date(),
      },
    });

    return successResponse({ sent: true });
  } catch (error) {
    if (error instanceof QuoteNotFoundError) return errorResponse(error.message, 404);
    return errorResponse("No se pudo enviar el recordatorio.");
  }
}
