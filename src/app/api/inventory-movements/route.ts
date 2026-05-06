import { prisma } from "@/lib/prisma";

import { errorResponse, successResponse } from "../_shared/responses";

export async function GET() {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } } }
    });
    return successResponse(movements);
  } catch {
    return errorResponse("No se pudieron cargar los movimientos de inventario.");
  }
}
