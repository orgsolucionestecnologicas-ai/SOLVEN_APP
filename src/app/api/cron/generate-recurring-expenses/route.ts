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
    const { generatedCount, failures } = await generateDueRecurringExpenses();

    if (failures.length > 0) {
      // Cada falla ya está aislada por tenant (ver recurring-expense-data-access.ts) —
      // esto es solo para que quede visible en los logs del cron, no para abortar la respuesta.
      console.error("generate-recurring-expenses: fallas por tenant", failures);
    }

    return successResponse({ generated: generatedCount, failures });
  } catch {
    return errorResponse("Error al generar gastos recurrentes.");
  }
}
