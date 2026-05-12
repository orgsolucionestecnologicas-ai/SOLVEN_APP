export const dynamic = 'force-dynamic';
import { listSessions } from "../../../../modules/cash-register";
import { errorResponse, successResponse } from "../../_shared/responses";

export async function GET() {
  try {
    const sessions = await listSessions();
    return successResponse(sessions);
  } catch {
    return errorResponse("No se pudieron obtener las sesiones de caja.");
  }
}
