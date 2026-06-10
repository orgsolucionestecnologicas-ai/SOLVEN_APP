import { prisma } from "@/lib/prisma";

export type CodePrefix = "CLI" | "SRV" | "PROD" | "COT" | "TKT" | "FAC";

export async function generateCode(prefix: CodePrefix): Promise<string> {
  const counter = await prisma.$transaction(async (tx) => {
    return tx.codeCounter.upsert({
      where: { id: prefix },
      create: { id: prefix, lastVal: 1 },
      update: { lastVal: { increment: 1 } }
    });
  });

  return `${prefix}-${String(counter.lastVal).padStart(4, "0")}`;
}
