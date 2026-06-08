export const dynamic = 'force-dynamic';
import {
  DebtPaymentAmountError,
  listDebtPayments,
  registerDebtPayment
} from "../../../modules/debts";
import {
  DebtPaymentValidationError,
  type RegisterDebtPaymentInput
} from "../../../modules/debts/debt-payment-validation";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isPrismaRecordNotFoundError,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../_shared/responses";
import { ForbiddenError, requireRole, requireTenantId, UnauthorizedError } from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  try {
    const debtPayments = await listDebtPayments(tenantId);
    return successResponse(debtPayments);
  } catch {
    return errorResponse("Could not load debt payments.");
  }
}

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER", "CASHIER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Debt payment input must be an object.", 400);
  }

  try {
    const debtPayment = await registerDebtPayment(
      requestBody as RegisterDebtPaymentInput,
      tenantId
    );
    return successResponse(debtPayment, 201);
  } catch (error) {
    if (error instanceof DebtPaymentValidationError) {
      return errorResponse("Invalid debt payment input.", 400, error.reasons);
    }
    if (error instanceof DebtPaymentAmountError) {
      return errorResponse(error.message, 400);
    }
    if (isPrismaRecordNotFoundError(error)) {
      return errorResponse("Debt was not found.", 400);
    }
    return errorResponse("Could not save debt payment.");
  }
}
