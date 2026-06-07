export const dynamic = 'force-dynamic';
import { createUser, listUsers, UserValidationError } from "../../../modules/users";
import {
  errorResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse
} from "../_shared/responses";
import { requireRole } from "@/lib/tenant";

export async function GET() {
  const { tenantId } = await requireRole(["OWNER"]);
  try {
    const users = await listUsers(tenantId);
    return successResponse(users);
  } catch {
    return errorResponse("No se pudieron cargar los usuarios.");
  }
}

export async function POST(request: Request) {
  const { tenantId } = await requireRole(["OWNER"]);
  let requestBody: unknown;

  try {
    requestBody = await request.json();
  } catch {
    return invalidJsonResponse();
  }

  if (!isRequestObject(requestBody)) {
    return errorResponse("User input must be an object.", 400);
  }

  try {
    const user = await createUser(
      requestBody as { name: string; email: string; password: string; role: string },
      tenantId
    );
    return successResponse(user, 201);
  } catch (error) {
    if (error instanceof UserValidationError) {
      return errorResponse("Datos de usuario inválidos.", 400, error.reasons);
    }
    return errorResponse("No se pudo crear el usuario.");
  }
}
