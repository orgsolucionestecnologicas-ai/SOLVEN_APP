export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { requireTenantId, UnauthorizedError } from "@/lib/tenant";
import { QuotePDFDocument } from "@/app/ui/quote-pdf";

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

  const [quote, settings] = await Promise.all([
    prisma.quote.findFirst({
      where: { id, tenantId },
      include: { items: true, customer: true }
    }),
    prisma.storeSettings.findUnique({ where: { tenantId } })
  ]);

  if (!quote) {
    return new NextResponse("Cotización no encontrada", { status: 404 });
  }

  const businessName = settings?.businessName ?? "SOLVEN";

  try {
    const buffer = await renderToBuffer(
      React.createElement(QuotePDFDocument, { quote, businessName }) as React.ReactElement<DocumentProps>
    );

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cotizacion-${quote.quoteNumber}.pdf"`,
      }
    });
  } catch {
    return new NextResponse("Error al generar el PDF", { status: 500 });
  }
}
