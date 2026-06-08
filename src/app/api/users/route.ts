export const dynamic = 'force-dynamic';
import { createUser, listUsers, UserValidationError } from "../../../modules/users";
import {
  errorResponse,
  forbiddenResponse,
  invalidJsonResponse,
  isRequestObject,
  successResponse,
  unauthorizedResponse
} from "../_shared/responses";
import { ForbiddenError, requireRole, UnauthorizedError } from "@/lib/tenant";

export async function GET() {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) return forbiddenResponse();
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }
  try {
    const users = await listUsers(tenantId);
    return successResponse(users);
  } catch {
    return errorResponse("No se pudieron cargar los usuarios.");
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
