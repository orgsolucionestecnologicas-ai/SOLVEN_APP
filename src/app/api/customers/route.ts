export const dynamic = 'force-dynamic';
import { createCustomer, listCustomers } from "../../../modules/customers";
import {
  type CreateCustomerInput,
  CustomerValidationError
} from "../../../modules/customers/customer-validation";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  paginatedResponse,
  successResponse
} from "../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET(request: Request) {
  const tenantId = await requireTenantId();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  try {
    const result = await listCustomers(tenantId, { page, limit });
    return paginatedResponse(result.data, page, limit, result.total);
  } catch {
    return errorResponse("No se pudieron cargar los clientes.");
  }
}

export async function POST(request: Request) {
  const tenantId = await requireTenantId();
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Customer input must be an object.", 400);
  }

  try {
    const customer = await createCustomer(requestBody as CreateCustomerInput, tenantId);
    return successResponse(customer, 201);
  } catch (error) {
    if (error instanceof CustomerValidationError) {
      return errorResponse("Invalid customer input.", 400, error.reasons);
    }
    return errorResponse("Could not save customer.");
  }
}
