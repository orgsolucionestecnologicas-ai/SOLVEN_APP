export const dynamic = "force-dynamic";

import React from "react";
import { NextResponse } from "next/server";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError, requireRole } from "@/lib/tenant";
import { formatARS } from "@/lib/format-currency";
import { ReportPDFDocument, type ReportPDFColumn } from "@/app/ui/report-pdf";

export async function GET(request: Request) {
  let tenantId: string;
  try {
    ({ tenantId } = await requireRole(["OWNER"]));
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (e instanceof UnauthorizedError) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "ventas";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(`${fromParam}T00:00:00-03:00`) : undefined;
  const to = toParam ? new Date(`${toParam}T23:59:59.999-03:00`) : undefined;
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
      const columns: ReportPDFColumn[] = [
        { width: 1.1 },
        { width: 0.7 },
        { width: 1.5 },
        { width: 1 },
        { width: 3 },
        { align: "right", width: 1 },
      ];
      const rows = sales.map((s) => {
        const fecha = new Date(s.saleDate).toLocaleDateString("es-AR");
        const folio = String(s.folio ?? "");
        const cliente = s.customer?.name ?? "";
        const productos = s.items
          .map((i) => `${i.product?.name ?? i.service?.name ?? ""} x${i.quantity}`)
          .join(" | ");
        return [fecha, folio, cliente, s.paymentType, productos, formatARS(Number(s.totalAmount))];
      });
      const totalAmount = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      const totalsRow = [null, null, null, null, `${sales.length} venta(s)`, formatARS(totalAmount)];

      const buffer = await renderToBuffer(
        React.createElement(ReportPDFDocument, {
          businessName,
          reportTitle: "Reporte de ventas",
          rangeLabel,
          headers,
          rows,
          columns,
          totalsRow,
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
      const columns: ReportPDFColumn[] = [
        { width: 2.4 },
        { width: 1 },
        { width: 1.3 },
        { align: "right", width: 1 },
        { align: "right", width: 1 },
        { align: "right", width: 0.8 },
        { align: "right", width: 0.9 },
        { align: "right", width: 0.7 },
      ];
      const rows = products.map((p) => [
        p.name,
        p.productCode ?? "",
        p.categoryName ?? "",
        p.costPrice ? formatARS(Number(p.costPrice)) : "",
        formatARS(Number(p.salePrice)),
        p.stock.toString(),
        p.minStock.toString(),
        p.ivaRate.toString(),
      ]);
      const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
      const totalsRow = [`${products.length} producto(s)`, null, null, null, null, `${totalStock}`, null, null];

      const buffer = await renderToBuffer(
        React.createElement(ReportPDFDocument, {
          businessName,
          reportTitle: "Reporte de productos",
          rangeLabel,
          headers,
          rows,
          columns,
          totalsRow,
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
