export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { requireTenantId } from "@/lib/tenant";
import { errorResponse, successResponse } from "../../_shared/responses";

export async function POST(request: Request) {
  const tenantId = await requireTenantId();
  try {
    const body = await request.json();
    const question = typeof body?.question === "string" ? body.question.trim() : null;
    if (!question || question.length < 3) {
      return errorResponse("Pregunta inválida.", 400);
    }
    await prisma.helpQuery.create({
      data: { tenantId, question: question.slice(0, 500) },
    });
    return successResponse({ ok: true });
  } catch {
    return errorResponse("No se pudo registrar la consulta.");
  }
}

export async function GET() {
  const tenantId = await requireTenantId();
  try {
    const queries = await prisma.helpQuery.groupBy({
      by: ["question"],
      where: { tenantId },
      _count: { question: true },
      orderBy: { _count: { question: "desc" } },
      take: 50,
    });
    return successResponse(
      queries.map((q) => ({ question: q.question, count: q._count.question }))
    );
  } catch {
    return errorResponse("No se pudieron cargar las consultas.");
  }
}
