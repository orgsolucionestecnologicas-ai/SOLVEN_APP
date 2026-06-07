export const dynamic = 'force-dynamic';
import { createExpense, listExpenses } from "../../../modules/expenses";
import {
  type CreateExpenseInput,
  ExpenseValidationError
} from "../../../modules/expenses/expense-validation";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  paginatedResponse,
  successResponse
} from "../_shared/responses";
import { requireRole, requireTenantId } from "@/lib/tenant";

export async function GET(request: Request) {
  const tenantId = await requireTenantId();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : undefined;
  const to = toParam ? new Date(`${toParam}T23:59:59.999`) : undefined;
  try {
    const result = await listExpenses(tenantId, { page, limit, from, to });
    return paginatedResponse(result.data, page, limit, result.total);
  } catch {
    return errorResponse("No se pudieron cargar los gastos.");
  }
}

export async function POST(request: Request) {
  const { tenantId } = await requireRole(["OWNER", "CASHIER"]);
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Expense input must be an object.", 400);
  }

  try {
    const expense = await createExpense(requestBody as CreateExpenseInput, tenantId);
    return successResponse(expense, 201);
  } catch (error) {
    if (error instanceof ExpenseValidationError) {
      return errorResponse("Invalid expense input.", 400, error.reasons);
    }
    return errorResponse("Could not save expense.");
  }
}
