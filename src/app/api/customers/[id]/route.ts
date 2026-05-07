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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

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
    const customer = await updateCustomer(id, body as UpdateCustomerInput);
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
