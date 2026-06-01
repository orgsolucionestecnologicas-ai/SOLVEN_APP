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
  successResponse
} from "../_shared/responses";
import { requireTenantId } from "@/lib/tenant";

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const expenses = await listExpenses(tenantId);
    return successResponse(expenses);
  } catch {
    return errorResponse("Could not load expenses.");
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
