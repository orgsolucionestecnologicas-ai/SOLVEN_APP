export const dynamic = "force-dynamic";
import { expireOverdueQuotes } from "../../../../modules/quotes";
import { errorResponse, successResponse } from "../../_shared/responses";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV !== "development" || cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return errorResponse("Unauthorized", 401);
    }
  }

  try {
    const expired = await expireOverdueQuotes();
    return successResponse({ expired });
  } catch {
    return errorResponse("Error al expirar cotizaciones.");
  }
}
