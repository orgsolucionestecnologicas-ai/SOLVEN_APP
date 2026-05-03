import {
  createCashMovement,
  listCashMovements
} from "../../../modules/cash";
import {
  CashMovementValidationError,
  type CreateCashMovementInput
} from "../../../modules/cash/cash-movement-validation";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse
} from "../_shared/responses";

export async function GET() {
  try {
    const cashMovements = await listCashMovements();

    return successResponse(cashMovements);
  } catch {
    return errorResponse("Could not load cash movements.");
  }
}

export async function POST(request: Request) {
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("Cash movement input must be an object.", 400);
  }

  try {
    const cashMovement = await createCashMovement(
      requestBody as CreateCashMovementInput
    );

    return successResponse(cashMovement, 201);
  } catch (error) {
    if (error instanceof CashMovementValidationError) {
      return errorResponse("Invalid cash movement input.", 400, error.reasons);
    }

    return errorResponse("Could not save cash movement.");
  }
}
