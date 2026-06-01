export const dynamic = 'force-dynamic';
import { createDebt, listDebts } from "../../../modules/debts";
import {
  type CreateDebtInput,
  DebtValidationError
} from "../../../modules/debts/debt-validation";
import {
  errorResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse
} from "../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const debts = await listDebts(tenantId);
    return successResponse(debts);
  } catch {
    return errorResponse("Could not load debts.");
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
    return errorResponse("Debt input must be an object.", 400);
  }

  try {
    const debt = await createDebt(requestBody as CreateDebtInput, tenantId);
    return successResponse(debt, 201);
  } catch (error) {
    if (error instanceof DebtValidationError) {
      return errorResponse("Invalid debt input.", 400, error.reasons);
    }
    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("Customer was not found.", 400);
    }
    return errorResponse("Could not save debt.");
  }
}
