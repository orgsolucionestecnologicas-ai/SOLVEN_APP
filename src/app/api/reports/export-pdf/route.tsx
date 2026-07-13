export const dynamic = "force-dynamic";

import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireTenantId } from "@/lib/tenant";
import { ReportPDFDocument } from "@/app/ui/report-pdf";

export async function GET(request: Request) {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "ventas";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : undefined;
  const to = toParam ? new Date(`${toParam}T23:59:59.999`) : undefined;
  const rangeLabel = from && to ? `${fromParam} a ${toParam}` : "Todo el período";

  const settings = await prisma.storeSettings.findUnique({ where: { tenantId } });
  const businessName = settings?.businessName ?? "SOLVEN";

  try {
    if (type === "ventas") {
      const where = {
        tenantId,
        ...(from ? { saleDate: { gte: from, ...(to ? { lte: to } : {}) } } : {}),
      };
      const sales = await prisma.sale.findMany({
        where,
        orderBy: { saleDate: "desc" },
        include: {
          customer: { select: { name: true } },
          items: {
            include: {
              product: { select: { name: true } },
              service: { select: { name: true } },
            },
          },
        },
      });

      const headers = ["Fecha", "Folio", "Cliente", "Forma de pago", "Productos", "Total"];
      const rows = sales.map((s) => {
        const fecha = new Date(s.saleDate).toLocaleDateString("es-AR");
        const folio = String(s.folio ?? "");
        const cliente = s.customer?.name ?? "";
        const productos = s.items
          .map((i) => `${i.product?.name ?? i.service?.name ?? ""} x${i.quantity}`)
          .join(" | ");
        return [fecha, folio, cliente, s.paymentType, productos, s.totalAmount.toString()];
      });

      const buffer = await renderToBuffer(
        React.createElement(ReportPDFDocument, {
          businessName,
          reportTitle: "Reporte de ventas",
          rangeLabel,
          headers,
          rows,
        }) as React.ReactElement<DocumentProps>
      );

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="ventas-${today}.pdf"`,
        },
      });
    }

    if (type === "productos") {
      const products = await prisma.product.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      });

      const headers = ["Nombre", "Código", "Categoría", "Precio costo", "Precio venta", "Stock", "Stock mínimo", "IVA"];
      const rows = products.map((p) => [
        p.name,
        p.productCode ?? "",
        p.categoryName ?? "",
        p.costPrice.toString(),
        p.salePrice.toString(),
        p.stock.toString(),
        p.minStock.toString(),
        p.ivaRate.toString(),
      ]);

      const buffer = await renderToBuffer(
        React.createElement(ReportPDFDocument, {
          businessName,
          reportTitle: "Reporte de productos",
          rangeLabel,
          headers,
          rows,
        }) as React.ReactElement<DocumentProps>
      );

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="productos-${today}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: { message: "Tipo de reporte no válido." } }, { status: 400 });
  } catch {
    return NextResponse.json({ error: { message: "No se pudo generar el reporte." } }, { status: 500 });
  }
}
