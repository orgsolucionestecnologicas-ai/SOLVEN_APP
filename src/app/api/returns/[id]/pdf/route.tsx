export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { getReturnById } from "@/modules/returns";
import { ReturnCreditNotePDFDocument } from "@/app/ui/return-credit-note-pdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    throw e;
  }

  const { id } = await params;

  const [returnRecord, settings] = await Promise.all([
    getReturnById(id, tenantId),
    prisma.storeSettings.findUnique({ where: { tenantId } })
  ]);

  if (!returnRecord) {
    return new NextResponse("Devolución no encontrada", { status: 404 });
  }

  const businessName = settings?.businessName ?? "SOLVEN";

  try {
    const buffer = await renderToBuffer(
      React.createElement(ReturnCreditNotePDFDocument, { returnRecord, businessName }) as React.ReactElement<DocumentProps>
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="nota-credito-${returnRecord.id.slice(-8)}.pdf"`,
      }
    });
  } catch {
    return new NextResponse("Error al generar el PDF", { status: 500 });
  }
}
