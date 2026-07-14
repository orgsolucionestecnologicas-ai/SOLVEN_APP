export const dynamic = 'force-dynamic';
import { createRecurringExpense, listRecurringExpenses } from "../../../modules/recurring-expenses";
import {
  type CreateRecurringExpenseInput,
  RecurringExpenseValidationError
} from "../../../modules/recurring-expenses/recurring-expense-validation";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../_shared/responses";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  try {
    const recurringExpenses = await listRecurringExpenses(tenantId);
    return successResponse(recurringExpenses);
  } catch {
    return errorResponse("No se pudieron cargar los gastos recurrentes.");
  }
}

export async function POST(request: Request) {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
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
    return errorResponse("Recurring expense input must be an object.", 400);
  }

  try {
    const recurringExpense = await createRecurringExpense(
      requestBody as CreateRecurringExpenseInput,
      tenantId
    );
    return successResponse(recurringExpense, 201);
  } catch (error) {
    if (error instanceof RecurringExpenseValidationError) {
      return errorResponse("Invalid recurring expense input.", 400, error.reasons);
    }
    return errorResponse("Could not save recurring expense.");
  }
}
