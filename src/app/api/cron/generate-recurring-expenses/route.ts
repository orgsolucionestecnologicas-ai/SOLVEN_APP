export const dynamic = "force-dynamic";
import { generateDueRecurringExpenses } from "../../../../modules/recurring-expenses";
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
    const generated = await generateDueRecurringExpenses();
    return successResponse({ generated });
  } catch {
    return errorResponse("Error al generar gastos recurrentes.");
  }
}
