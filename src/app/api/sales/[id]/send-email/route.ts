export const dynamic = "force-dynamic";
import { getSaleById, SaleNotFoundError } from "../../../../../modules/sales";
import { sendSaleReceiptEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import {
  errorResponse,
  forbiddenResponse,
  successResponse,
  unauthorizedResponse
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
    const sale = await getSaleById(id, tenantId);

    if (!sale.customer?.email) {
      return errorResponse("El cliente no tiene email registrado.", 400);
    }

    const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
    const businessName = settings?.businessName ?? "SOLVEN";

    await sendSaleReceiptEmail(sale.customer.email, sale, sale.items, businessName);

    return successResponse({ sent: true });
  } catch (error) {
    if (error instanceof SaleNotFoundError) return errorResponse(error.message, 404);
    return errorResponse("No se pudo enviar el comprobante por email.");
  }
}
