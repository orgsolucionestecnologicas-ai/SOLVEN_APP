export const dynamic = 'force-dynamic';
import { listExpenseBudgets, upsertExpenseBudget } from "../../../modules/expense-budgets";
import {
  ExpenseBudgetValidationError,
  type UpsertExpenseBudgetInput
} from "../../../modules/expense-budgets/expense-budget-validation";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
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
    const budgets = await listExpenseBudgets(tenantId);
    return successResponse(budgets);
  } catch {
    return errorResponse("No se pudieron cargar los presupuestos.");
  }
}

export async function POST(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
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
    return errorResponse("Expense budget input must be an object.", 400);
  }

  try {
    const budget = await upsertExpenseBudget(requestBody as UpsertExpenseBudgetInput, tenantId);
    return successResponse(budget, 201);
  } catch (error) {
    if (error instanceof ExpenseBudgetValidationError) {
      return errorResponse("Invalid expense budget input.", 400, error.reasons);
    }
    return errorResponse("Could not save expense budget.");
  }
}
