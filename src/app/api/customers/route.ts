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
  successResponse
} from "../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const customers = await listCustomers(tenantId);
    return successResponse(customers);
  } catch {
    return errorResponse("Could not load customers.");
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
