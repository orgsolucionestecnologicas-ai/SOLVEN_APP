import type { KnowledgeEntry } from "./types";

export const navigationEntries: KnowledgeEntry[] = [
  {
    id: "nav-dashboard",
    section: "dashboard",
    route: "/dashboard",
    title: "Dashboard",
    keywords: ["inicio", "dashboard", "resumen", "metricas", "alertas"],
    answer:
      "El Dashboard es el inicio operativo. Muestra ventas del dia, caja, stock bajo, accesos rapidos y estado general del negocio.",
    steps: ["Ir a Dashboard desde el menu lateral", "Revisar tarjetas de ventas, caja y alertas"],
  },
  {
    id: "nav-pos",
    section: "pos",
    route: "/pos",
    title: "Ventas / POS",
    keywords: ["venta", "pos", "cobrar", "ticket", "factura", "carrito"],
    answer:
      "Ventas / POS sirve para buscar productos o servicios, armar el carrito, elegir cliente, aplicar promos y confirmar cobros.",
    steps: ["Ir a Ventas", "Agregar items", "Elegir metodo de pago", "Confirmar venta"],
  },
  {
    id: "nav-returns",
    section: "returns",
    route: "/returns",
    title: "Devoluciones",
    keywords: ["devolucion", "retorno", "reembolso", "stock"],
    answer:
      "Devoluciones permite buscar la venta original, seleccionar items devueltos y reponer stock automaticamente.",
    steps: ["Ir a Devoluciones", "Buscar venta", "Elegir productos y cantidades", "Confirmar"],
  },
  {
    id: "nav-products",
    section: "products",
    route: "/products",
    title: "Productos",
    keywords: ["producto", "precio", "costo", "iva", "codigo", "categoria"],
    answer:
      "Productos concentra alta y edicion de articulos: nombre, codigo, categoria, precios, IVA, stock minimo y estado.",
    steps: ["Ir a Productos", "Usar Nuevo producto o editar desde la lista"],
  },
  {
    id: "nav-services",
    section: "services",
    route: "/services",
    title: "Servicios",
    keywords: ["servicio", "mano de obra", "precio", "activo"],
    answer:
      "Servicios permite cargar prestaciones vendibles sin stock fisico, con codigo, nombre, descripcion, precio y estado activo.",
    steps: ["Ir a Servicios", "Crear o editar servicios", "Usarlos desde el POS"],
  },
  {
    id: "nav-inventory",
    section: "inventory",
    route: "/inventory",
    title: "Inventario",
    keywords: ["inventario", "stock", "movimientos", "ajuste", "entrada", "reponer"],
    answer:
      "Inventario muestra stock, alertas, entradas, ajustes y movimientos de cada producto con trazabilidad.",
    steps: ["Ir a Inventario", "Usar Ajuste, Entrada o Movimientos segun lo que necesites"],
  },
  {
    id: "nav-customers",
    section: "customers",
    route: "/customers",
    title: "Clientes",
    keywords: ["cliente", "deuda", "fiado", "historial", "telefono"],
    answer:
      "Clientes permite crear contactos, ver historial de compras, deuda pendiente y registrar pagos.",
    steps: ["Ir a Clientes", "Buscar o crear cliente", "Entrar a su ficha para ver compras y deuda"],
  },
  {
    id: "nav-cash",
    section: "cash",
    route: "/cash-movements",
    title: "Caja",
    keywords: ["caja", "arqueo", "apertura", "cierre", "movimiento", "retiro"],
    answer:
      "Caja administra apertura, cierre, arqueo, entradas, salidas y movimientos manuales del efectivo.",
    steps: ["Ir a Caja", "Abrir sesion", "Registrar movimientos", "Cerrar con conteo"],
  },
  {
    id: "nav-quotes",
    section: "quotes",
    route: "/quotes",
    title: "Cotizaciones",
    keywords: ["cotizacion", "presupuesto", "quote", "vencimiento", "confirmar"],
    answer:
      "Cotizaciones permite crear presupuestos, enviarlos, controlarlos por estado y convertirlos en venta.",
    steps: ["Ir a Cotizaciones", "Crear presupuesto", "Enviar o confirmar cuando el cliente acepte"],
  },
  {
    id: "nav-reports",
    section: "reports",
    route: "/reports",
    title: "Reportes",
    keywords: ["reporte", "balance", "ventas", "gastos", "ranking", "exportar"],
    answer:
      "Reportes muestra ventas, ingresos, gastos, productos vendidos y comparativas por periodo.",
    steps: ["Ir a Reportes", "Elegir periodo", "Revisar ventas, gastos y productos"],
  },
  {
    id: "nav-promotions",
    section: "promotions",
    route: "/promotions",
    title: "Promociones",
    keywords: ["promo", "promocion", "descuento", "codigo", "2x1", "oferta"],
    answer:
      "Promociones permite definir descuentos por porcentaje, monto fijo, especiales, combos y codigos.",
    steps: ["Ir a Promociones", "Crear promo", "Definir vigencia y activacion"],
  },
  {
    id: "nav-settings",
    section: "settings",
    route: "/settings",
    title: "Configuracion",
    keywords: ["configuracion", "negocio", "arca", "impresora", "moneda", "idioma"],
    answer:
      "Configuracion guarda datos del negocio, preferencias visuales, moneda, zona horaria, impresora y ARCA.",
    steps: ["Ir a Configuracion", "Editar campos", "Guardar cambios"],
  },
  {
    id: "nav-users",
    section: "users",
    route: "/usuarios",
    title: "Usuarios",
    keywords: ["usuario", "rol", "permisos", "owner", "cashier", "inventory", "readonly"],
    answer:
      "Usuarios administra accesos y roles: OWNER, CASHIER, INVENTORY y READONLY.",
    steps: ["Ir a Usuarios", "Crear usuario", "Asignar rol", "Guardar"],
  },
  {
    id: "nav-account",
    section: "account",
    route: "/cuenta",
    title: "Mi cuenta",
    keywords: ["cuenta", "suscripcion", "plan", "rebill", "trial", "pago"],
    answer:
      "Mi cuenta muestra datos de suscripcion, plan, estado de pago y vencimientos.",
    steps: ["Ir a Mi cuenta", "Revisar estado del plan y fechas"],
  },
];
