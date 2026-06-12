export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { unauthorizedResponse } from "../../_shared/responses";
import { UnauthorizedError, requireTenantId } from "@/lib/tenant";

export async function GET(request: Request) {
  let tenantId: string;
  try {
    tenantId = await requireTenantId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    throw e;
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "ventas";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(`${fromParam}T00:00:00`) : undefined;
  const to = toParam ? new Date(`${toParam}T23:59:59.999`) : undefined;

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

      const header = "fecha,folio,cliente,forma_pago,productos,total";
      const rows = sales.map((s) => {
        const fecha = new Date(s.saleDate).toLocaleDateString("es-AR");
        const folio = s.folio ?? "";
        const cliente = s.customer?.name ?? "";
        const pago = s.paymentType;
        const productos = s.items
          .map((i) => {
            const nombre = i.product?.name ?? i.service?.name ?? "";
            return `${nombre} x${i.quantity}`;
          })
          .join(" | ");
        const total = s.totalAmount.toString();
        return `"${fecha}","${folio}","${cliente}","${pago}","${productos.replace(/"/g, '""')}","${total}"`;
      });

      const csv = [header, ...rows].join("\n");
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ventas-${today}.csv"`,
        },
      });
    }

    if (type === "productos") {
      const products = await prisma.product.findMany({
        where: { tenantId },
        orderBy: { name: "asc" },
      });

      const header = "nombre,codigo,categoria,precio_costo,precio_venta,stock,stock_minimo,iva";
      const rows = products.map((p) => {
        const nombre = `"${p.name.replace(/"/g, '""')}"`;
        const codigo = p.productCode ?? "";
        const cat = p.categoryName ?? "";
        return `${nombre},"${codigo}","${cat}",${p.costPrice},${p.salePrice},${p.stock},${p.minStock},${p.ivaRate}`;
      });

      const csv = [header, ...rows].join("\n");
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="productos-${today}.csv"`,
        },
      });
    }

    return new Response(JSON.stringify({ error: { message: "Tipo de reporte no válido." } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: { message: "No se pudo generar el reporte." } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
