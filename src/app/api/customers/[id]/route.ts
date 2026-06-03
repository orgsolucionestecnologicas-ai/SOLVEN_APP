export const dynamic = 'force-dynamic';
import {
  CustomerValidationError,
  type UpdateCustomerInput,
  updateCustomer
} from "../../../../modules/customers";
import {
  errorResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse
} from "../../_shared/responses";
import { requireTenantId } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, tenantId] = await Promise.all([params, requireTenantId()]);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(body)) {
    return errorResponse("Customer update input must be an object.", 400);
  }

  try {
    const customer = await updateCustomer(id, body as UpdateCustomerInput, tenantId);
    return successResponse(customer);
  } catch (error) {
    if (error instanceof CustomerValidationError) {
      return errorResponse("Invalid customer input.", 400, error.reasons);
    }
    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("Cliente no encontrado.", 404);
    }
    return errorResponse("No se pudo actualizar el cliente.");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const [{ id }, tenantId] = await Promise.all([params, requireTenantId()]);

  const customer = await prisma.customer.findFirst({ where: { id, tenantId } });
  if (!customer) {
    return errorResponse("Cliente no encontrado.", 404);
  }

  const hasPendingDebt = await prisma.debt.findFirst({
    where: { customerId: id, remainingAmount: { gt: 0 } }
  });

  if (hasPendingDebt) {
    return errorResponse("No podés eliminar un cliente con deudas pendientes.", 400);
  }

  try {
    await prisma.customer.delete({ where: { id } });
    return successResponse({ deleted: true });
  } catch {
    return errorResponse("No se pudo eliminar el cliente.");
  }
}
