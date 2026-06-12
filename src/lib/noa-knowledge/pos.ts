import type { KnowledgeEntry } from "./types";

export const posEntries: KnowledgeEntry[] = [
  {
    id: "pos-sale",
    section: "pos",
    route: "/pos",
    title: "Registrar venta",
    keywords: ["vender", "venta", "cobrar", "carrito", "efectivo", "credito", "mixto", "ventaweb"],
    answer:
      "En POS agregas productos o servicios al carrito, elegis cliente si hace falta, seleccionas metodo de pago y confirmas. La venta descuenta stock y genera caja o deuda segun corresponda.",
    steps: ["Ir a Ventas", "Buscar producto o servicio", "Agregar al carrito", "Elegir pago", "Confirmar venta"],
    roles: "OWNER y CASHIER pueden vender. READONLY solo consulta.",
  },
  {
    id: "pos-invoice-ticket",
    section: "pos",
    route: "/pos",
    title: "Ticket o factura",
    keywords: ["ticket", "factura", "arca", "cae", "comprobante"],
    answer:
      "El ticket siempre esta disponible. La factura ARCA se emite solo si el negocio tiene ARCA configurado y la venta se marca para facturar. Venta con CAE es factura; sin CAE es ticket.",
    steps: ["En POS revisar comprobante", "Elegir ticket o factura si ARCA esta activo", "Confirmar venta"],
  },
  {
    id: "pos-promos",
    section: "pos",
    route: "/pos",
    title: "Aplicar promociones",
    keywords: ["promo", "descuento", "codigo", "oferta", "rebaja"],
    answer:
      "Las promociones activas pueden aplicarse de forma automatica o por codigo, segun como fueron configuradas en Promociones.",
    steps: ["Armar carrito", "Ingresar codigo si aplica", "Verificar descuento", "Confirmar venta"],
  },
];
