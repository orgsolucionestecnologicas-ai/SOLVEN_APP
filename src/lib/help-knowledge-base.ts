export type HelpEntry = {
  id: string;
  module: string;
  keywords: string[];
  question: string;
  answer: string;
  steps?: string[];
  tip?: string;
};

export const HELP_KNOWLEDGE_BASE: HelpEntry[] = [
  // ── CAJA ────────────────────────────────────────────────────────────────────
  {
    id: "caja-abrir",
    module: "caja",
    keywords: ["abrir", "caja", "turno", "apertura", "inicio", "sesion", "open"],
    question: "¿Cómo abro la caja al inicio del turno?",
    answer: "Para abrir la caja tenés que ir a la sección Caja y hacer click en 'Abrir caja'. Ingresá el monto inicial en efectivo y confirmá.",
    steps: [
      "Ir al módulo Caja en el menú lateral",
      "Hacer click en el botón 'Abrir caja'",
      "Ingresar el monto de efectivo con el que empezás el turno",
      "Confirmar la apertura"
    ],
    tip: "Siempre abrí la caja antes de registrar ventas en efectivo. Si no hay caja abierta, el sistema no te va a dejar cobrar."
  },
  {
    id: "caja-cerrar",
    module: "caja",
    keywords: ["cerrar", "caja", "cuadre", "cierre", "turno", "fin", "close"],
    question: "¿Cómo cierro la caja y hago el cuadre?",
    answer: "Para cerrar la caja, andá a la sección Caja y hacé click en 'Cerrar sesión'. Ingresá el efectivo que contás físicamente y el sistema calcula la diferencia con lo esperado.",
    steps: [
      "Ir al módulo Caja",
      "Hacer click en 'Cerrar sesión'",
      "Contar el dinero físico en caja",
      "Ingresar el monto contado",
      "El sistema muestra la diferencia entre lo esperado y lo contado",
      "Confirmar el cierre"
    ],
    tip: "Si hay diferencia, anotala en el campo de observaciones para rastrear el origen."
  },
  {
    id: "caja-movimiento-manual",
    module: "caja",
    keywords: ["movimiento", "manual", "entrada", "salida", "dinero", "retiro", "adelanto", "deposito", "caja"],
    question: "¿Cómo registro un movimiento manual de caja?",
    answer: "Podés registrar entradas o salidas de efectivo que no corresponden a ventas o gastos desde el módulo Caja.",
    steps: [
      "Ir al módulo Caja",
      "Hacer click en 'Nuevo movimiento'",
      "Seleccionar el tipo: Entrada o Salida",
      "Ingresar el monto y una descripción",
      "Confirmar el movimiento"
    ],
    tip: "Usá esta función para registrar adelantos de caja, retiros del propietario o cualquier movimiento de efectivo fuera del flujo normal."
  },
  {
    id: "caja-sesion-abierta",
    module: "caja",
    keywords: ["sesion", "abierta", "error", "no cierra", "ya existe", "caja", "abierta", "problema"],
    question: "¿Qué hago si ya hay una sesión de caja abierta?",
    answer: "Si el sistema dice que ya hay una caja abierta, primero tenés que cerrar la sesión actual antes de abrir una nueva.",
    steps: [
      "Ir al módulo Caja",
      "Buscar la sesión abierta en el historial",
      "Hacer click en 'Cerrar sesión'",
      "Completar el cierre con el monto contado",
      "Ahora podés abrir una nueva sesión"
    ],
    tip: "Nunca puede haber dos sesiones de caja abiertas al mismo tiempo en el mismo negocio."
  },
  {
    id: "caja-historial",
    module: "caja",
    keywords: ["historial", "movimientos", "ver", "caja", "registro", "listado", "consultar"],
    question: "¿Cómo veo el historial de movimientos de caja?",
    answer: "El historial completo de movimientos está en la sección Caja. Podés filtrar por fecha para ver períodos específicos.",
    steps: [
      "Ir al módulo Caja",
      "Ver la lista de movimientos con fecha, tipo y monto",
      "Usar el filtro de fecha para acotar el período"
    ]
  },

  // ── VENTAS / POS ─────────────────────────────────────────────────────────────
  {
    id: "pos-venta-contado",
    module: "ventas",
    keywords: ["venta", "contado", "efectivo", "cobrar", "registrar", "pos", "vender", "cash"],
    question: "¿Cómo registro una venta al contado?",
    answer: "Las ventas al contado se registran desde el módulo Ventas (POS). Buscás los productos, los agregás al carrito y confirmás el pago.",
    steps: [
      "Ir al módulo Ventas",
      "Buscar el producto por nombre o código",
      "Hacer click en el producto para agregarlo al carrito",
      "Ajustar la cantidad si es necesario",
      "Seleccionar 'Efectivo' como método de pago",
      "Hacer click en 'Confirmar venta'"
    ],
    tip: "Necesitás tener la caja abierta para registrar ventas en efectivo."
  },
  {
    id: "pos-venta-credito",
    module: "ventas",
    keywords: ["credito", "fiado", "deuda", "cliente", "venta", "cuenta", "fiar", "credit"],
    question: "¿Cómo registro una venta a crédito (fiado)?",
    answer: "Para registrar una venta a crédito, el cliente tiene que estar cargado en el sistema. El sistema crea una deuda automáticamente.",
    steps: [
      "Ir al módulo Ventas",
      "Agregar los productos al carrito",
      "Seleccionar el cliente usando el buscador de clientes",
      "Cambiar el tipo de pago a 'Crédito'",
      "Confirmar la venta — se crea la deuda automáticamente"
    ],
    tip: "Si el cliente no existe, primero tenés que crearlo en el módulo Clientes."
  },
  {
    id: "pos-descuento",
    module: "ventas",
    keywords: ["descuento", "promocion", "codigo", "rebaja", "precio", "oferta", "reducir"],
    question: "¿Cómo aplico un descuento en una venta?",
    answer: "Podés aplicar descuentos usando promociones configuradas o ingresando un código promocional en el punto de venta.",
    steps: [
      "Agregar los productos al carrito",
      "Hacer click en el campo de código promocional",
      "Ingresar el código de la promoción",
      "El descuento se aplica automáticamente"
    ],
    tip: "Para crear promociones primero tenés que configurarlas en el módulo Promociones."
  },
  {
    id: "pos-buscar-producto",
    module: "ventas",
    keywords: ["buscar", "producto", "pos", "nombre", "codigo", "barra", "encontrar"],
    question: "¿Cómo busco un producto en el punto de venta?",
    answer: "Podés buscar productos por nombre o código de barras usando la barra de búsqueda en la pantalla de ventas.",
    steps: [
      "Hacer click en el campo de búsqueda en el POS",
      "Escribir el nombre o código del producto",
      "Seleccionar el producto de los resultados"
    ],
    tip: "Si tenés un lector de código de barras, podés escanearlo directamente en el campo de búsqueda."
  },
  {
    id: "pos-historial-ventas",
    module: "ventas",
    keywords: ["historial", "ventas", "dia", "ver", "consultar", "listado", "registro"],
    question: "¿Cómo veo el historial de ventas del día?",
    answer: "El historial de ventas está en la pestaña 'Historial' dentro del módulo Ventas.",
    steps: [
      "Ir al módulo Ventas",
      "Hacer click en la pestaña 'Historial'",
      "Ver el listado de ventas con fecha, monto y tipo de pago"
    ]
  },

  // ── PRODUCTOS ────────────────────────────────────────────────────────────────
  {
    id: "productos-nuevo",
    module: "productos",
    keywords: ["nuevo", "producto", "agregar", "crear", "alta", "registrar", "add"],
    question: "¿Cómo agrego un producto nuevo?",
    answer: "Podés agregar productos nuevos desde el módulo Productos haciendo click en el botón 'Nuevo producto'.",
    steps: [
      "Ir al módulo Productos",
      "Hacer click en 'Nuevo producto'",
      "Completar el nombre, precio de costo y precio de venta",
      "Ingresar el stock inicial",
      "Asignar una categoría (opcional)",
      "Guardar el producto"
    ],
    tip: "El sistema genera automáticamente un código PROD-XXXX para cada producto nuevo."
  },
  {
    id: "productos-editar-precio",
    module: "productos",
    keywords: ["editar", "precio", "modificar", "cambiar", "actualizar", "producto", "costo", "venta"],
    question: "¿Cómo edito el precio de un producto?",
    answer: "Para editar un producto, hacé click en el ícono de lápiz en la fila del producto en la lista.",
    steps: [
      "Ir al módulo Productos",
      "Encontrar el producto que querés editar",
      "Hacer click en el ícono de editar (lápiz)",
      "Modificar el precio de costo o de venta",
      "Guardar los cambios"
    ],
    tip: "El stock se ajusta desde el módulo Inventario, no desde la edición del producto."
  },
  {
    id: "productos-categoria",
    module: "productos",
    keywords: ["categoria", "categorias", "agregar", "crear", "nueva", "clasificar", "grupo"],
    question: "¿Cómo agrego una categoría?",
    answer: "Las categorías se crean desde el módulo Inventario o desde el formulario de nuevo producto.",
    steps: [
      "Ir a Inventario > Categorías",
      "Hacer click en 'Nueva categoría'",
      "Ingresar el nombre de la categoría",
      "Guardar"
    ]
  },
  {
    id: "productos-codigo-barras",
    module: "productos",
    keywords: ["codigo", "barras", "ean", "upc", "escanear", "lector", "barra", "scanner"],
    question: "¿Cómo asigno un código de barras a un producto?",
    answer: "Al crear o editar un producto podés ingresar el código de barras en el campo correspondiente.",
    steps: [
      "Ir al módulo Productos",
      "Editar el producto",
      "En el campo 'Código de barras', ingresar el código manualmente o escanear",
      "Guardar el producto"
    ],
    tip: "Una vez asignado, podés usar el lector de código de barras en el POS para buscarlo automáticamente."
  },
  {
    id: "productos-desactivar",
    module: "productos",
    keywords: ["desactivar", "inactivo", "ocultar", "quitar", "producto", "baja", "eliminar"],
    question: "¿Cómo desactivo un producto sin eliminarlo?",
    answer: "Podés marcar un producto como inactivo desde el módulo Productos para que no aparezca en el POS.",
    steps: [
      "Ir al módulo Productos",
      "Encontrar el producto",
      "Usar el menú de opciones (tres puntos)",
      "Seleccionar 'Desactivar'"
    ],
    tip: "Los productos inactivos no se pueden vender pero conservan su historial."
  },

  // ── INVENTARIO ───────────────────────────────────────────────────────────────
  {
    id: "inventario-entrada",
    module: "inventario",
    keywords: ["entrada", "mercaderia", "stock", "recibir", "compra", "agregar", "reponer"],
    question: "¿Cómo hago una entrada de mercadería?",
    answer: "Las entradas de mercadería se registran desde el módulo Inventario en la pestaña 'Entradas'.",
    steps: [
      "Ir al módulo Inventario",
      "Hacer click en 'Nueva entrada'",
      "Seleccionar el producto",
      "Ingresar la cantidad recibida",
      "Confirmar la entrada"
    ]
  },
  {
    id: "inventario-ajuste",
    module: "inventario",
    keywords: ["ajuste", "stock", "manual", "correccion", "diferencia", "conteo", "fisico", "inventario"],
    question: "¿Cómo ajusto el stock manualmente?",
    answer: "Podés corregir el stock de un producto desde Inventario > Ajustes cuando el stock del sistema difiere del stock físico.",
    steps: [
      "Ir al módulo Inventario",
      "Hacer click en 'Nuevo ajuste'",
      "Seleccionar el producto",
      "Ingresar el stock correcto",
      "Indicar el motivo del ajuste",
      "Confirmar"
    ],
    tip: "Siempre anotá el motivo del ajuste para tener trazabilidad."
  },
  {
    id: "inventario-stock-bajo",
    module: "inventario",
    keywords: ["stock", "bajo", "minimo", "alerta", "agotado", "poco", "falta", "reponer"],
    question: "¿Cómo veo qué productos tienen stock bajo?",
    answer: "El módulo Inventario tiene una pestaña 'Alertas' donde se listan todos los productos con stock bajo o agotado.",
    steps: [
      "Ir al módulo Inventario",
      "Hacer click en la pestaña 'Alertas'",
      "Ver la lista de productos con stock crítico"
    ],
    tip: "También podés ver el stock bajo en el Dashboard en la sección de resumen."
  },
  {
    id: "inventario-historial",
    module: "inventario",
    keywords: ["historial", "movimientos", "producto", "trazabilidad", "log", "registro", "cuando", "inventario"],
    question: "¿Cómo veo el historial de movimientos de un producto?",
    answer: "El historial de movimientos de stock se puede ver en Inventario > Movimientos.",
    steps: [
      "Ir al módulo Inventario",
      "Hacer click en la pestaña 'Movimientos'",
      "Buscar el producto por nombre",
      "Ver todos los movimientos con fecha, tipo y cantidad"
    ]
  },
  {
    id: "inventario-tipos-movimiento",
    module: "inventario",
    keywords: ["tipos", "movimiento", "entrada", "ajuste", "venta", "devolucion", "significado", "que es"],
    question: "¿Qué significa cada tipo de movimiento de inventario?",
    answer: "Los movimientos de inventario registran todos los cambios de stock con su origen.",
    steps: [
      "SALE: descuento de stock por una venta",
      "RETURN: reposición de stock por una devolución",
      "ADJUSTMENT: ajuste manual del stock",
      "ENTRY: entrada de mercadería (compra)",
    ],
    tip: "Cada movimiento tiene la fecha exacta y el usuario que lo generó."
  },

  // ── CLIENTES ─────────────────────────────────────────────────────────────────
  {
    id: "clientes-nuevo",
    module: "clientes",
    keywords: ["nuevo", "cliente", "agregar", "crear", "alta", "registrar", "add"],
    question: "¿Cómo agrego un cliente nuevo?",
    answer: "Podés agregar clientes desde el módulo Clientes haciendo click en 'Nuevo cliente'.",
    steps: [
      "Ir al módulo Clientes",
      "Hacer click en 'Nuevo cliente'",
      "Completar el nombre (obligatorio)",
      "Agregar teléfono y email (opcional)",
      "Guardar"
    ]
  },
  {
    id: "clientes-ver-deuda",
    module: "clientes",
    keywords: ["deuda", "cliente", "fiado", "ver", "cuanto", "saldo", "pendiente", "debe"],
    question: "¿Cómo veo la deuda de un cliente?",
    answer: "La deuda actual de un cliente aparece en la ficha del cliente y también en el módulo Deudas.",
    steps: [
      "Ir al módulo Clientes",
      "Buscar y hacer click en el cliente",
      "En la ficha, ver la tarjeta 'Deuda actual'"
    ]
  },
  {
    id: "clientes-pago-deuda",
    module: "clientes",
    keywords: ["pago", "deuda", "parcial", "abonar", "cobrar", "cliente", "saldar", "cuota"],
    question: "¿Cómo registro un pago parcial de deuda?",
    answer: "Los pagos de deuda se registran desde la ficha del cliente o desde el módulo Deudas.",
    steps: [
      "Ir a la ficha del cliente",
      "Hacer click en 'Registrar pago'",
      "Ingresar el monto del pago",
      "Confirmar — la deuda se reduce automáticamente"
    ],
    tip: "El sistema registra el movimiento de caja automáticamente cuando cobrás una deuda."
  },
  {
    id: "clientes-historial-compras",
    module: "clientes",
    keywords: ["historial", "compras", "cliente", "ventas", "ver", "registro", "lista"],
    question: "¿Cómo veo el historial de compras de un cliente?",
    answer: "El historial de compras está en la ficha del cliente, pestaña 'Compras'.",
    steps: [
      "Ir al módulo Clientes",
      "Hacer click en el cliente",
      "Ir a la pestaña 'Compras'",
      "Ver el listado de todas las ventas del cliente"
    ]
  },
  {
    id: "clientes-eliminar",
    module: "clientes",
    keywords: ["eliminar", "borrar", "cliente", "quitar", "dar de baja", "delete"],
    question: "¿Cómo elimino un cliente?",
    answer: "Podés eliminar un cliente desde su ficha si no tiene deudas pendientes.",
    steps: [
      "Ir a la ficha del cliente",
      "Hacer click en el menú '...' (tres puntos)",
      "Seleccionar 'Eliminar cliente'",
      "Confirmar la eliminación"
    ],
    tip: "No se puede eliminar un cliente si tiene deudas pendientes. Primero saldá la deuda."
  },

  // ── DEVOLUCIONES ─────────────────────────────────────────────────────────────
  {
    id: "devoluciones-procesar",
    module: "devoluciones",
    keywords: ["devolucion", "devolver", "producto", "venta", "retorno", "reembolso", "procesar"],
    question: "¿Cómo proceso una devolución?",
    answer: "Las devoluciones se procesan desde el módulo Devoluciones buscando la venta original.",
    steps: [
      "Ir al módulo Devoluciones",
      "Buscar la venta original por número o cliente",
      "Seleccionar la venta",
      "Indicar qué productos y en qué cantidad se devuelven",
      "Confirmar la devolución"
    ],
    tip: "Podés hacer devoluciones parciales — no es necesario devolver toda la venta."
  },
  {
    id: "devoluciones-stock",
    module: "devoluciones",
    keywords: ["stock", "devolucion", "repone", "inventario", "vuelve", "que pasa"],
    question: "¿Qué pasa con el stock cuando hago una devolución?",
    answer: "Al procesar una devolución, el stock de los productos devueltos se repone automáticamente en el inventario. El sistema registra el movimiento con el motivo 'RETURN' para que quede trazabilidad."
  },
  {
    id: "devoluciones-caja",
    module: "devoluciones",
    keywords: ["caja", "devolucion", "efectivo", "dinero", "reembolso", "cash", "que pasa"],
    question: "¿Qué pasa con la caja cuando devuelvo una venta en efectivo?",
    answer: "Si la venta original fue en efectivo, al procesarla como devolución se registra automáticamente una salida de caja por el monto devuelto.",
    tip: "Para ventas a crédito, la devolución reduce la deuda pendiente del cliente en lugar de generar un movimiento de caja."
  },

  // ── PROMOCIONES ──────────────────────────────────────────────────────────────
  {
    id: "promociones-2x1",
    module: "promociones",
    keywords: ["2x1", "dos por uno", "promocion", "crear", "oferta", "bundle"],
    question: "¿Cómo creo una promoción 2x1?",
    answer: "Las promociones 2x1 se crean desde el módulo Promociones seleccionando el tipo 'Dos por uno'.",
    steps: [
      "Ir al módulo Promociones",
      "Hacer click en 'Nueva promoción'",
      "Seleccionar tipo 'Dos por uno'",
      "Elegir el producto al que aplica",
      "Establecer las fechas de vigencia",
      "Guardar y activar"
    ]
  },
  {
    id: "promociones-porcentaje",
    module: "promociones",
    keywords: ["porcentaje", "descuento", "promocion", "crear", "10%", "20%", "rebaja"],
    question: "¿Cómo creo un descuento por porcentaje?",
    answer: "Podés crear descuentos porcentuales para productos, categorías o toda la tienda.",
    steps: [
      "Ir al módulo Promociones",
      "Hacer click en 'Nueva promoción'",
      "Seleccionar tipo 'Porcentaje de descuento'",
      "Ingresar el porcentaje (ej: 10)",
      "Elegir si aplica a todos los productos, una categoría o un producto específico",
      "Establecer vigencia y guardar"
    ]
  },
  {
    id: "promociones-activar",
    module: "promociones",
    keywords: ["activar", "desactivar", "promocion", "encender", "apagar", "pausar"],
    question: "¿Cómo activo o desactivo una promoción?",
    answer: "Desde la lista de promociones podés activar o pausar cualquier promoción con el toggle de estado.",
    steps: [
      "Ir al módulo Promociones",
      "Encontrar la promoción en la lista",
      "Usar el toggle de estado para activar o desactivar"
    ]
  },

  // ── REPORTES ─────────────────────────────────────────────────────────────────
  {
    id: "reportes-ventas-mes",
    module: "reportes",
    keywords: ["ventas", "mes", "reporte", "mensual", "ver", "consultar", "total"],
    question: "¿Cómo veo las ventas del mes?",
    answer: "Los reportes de ventas se ven desde el módulo Reportes con el filtro de período mensual.",
    steps: [
      "Ir al módulo Reportes",
      "Seleccionar 'Este mes' en el filtro de período",
      "Ver el resumen de ventas totales, promedio y cantidad"
    ]
  },
  {
    id: "reportes-comparar",
    module: "reportes",
    keywords: ["comparar", "periodos", "anterior", "mes", "semana", "vs", "diferencia"],
    question: "¿Cómo comparo ventas entre períodos?",
    answer: "El módulo Reportes muestra comparaciones automáticas entre el período actual y el anterior.",
    steps: [
      "Ir al módulo Reportes",
      "Seleccionar el período a analizar",
      "El sistema muestra el período actual vs el anterior con variación porcentual"
    ]
  },
  {
    id: "reportes-productos-vendidos",
    module: "reportes",
    keywords: ["productos", "mas", "vendidos", "top", "ranking", "populares", "reporte"],
    question: "¿Qué muestra el reporte de productos más vendidos?",
    answer: "El reporte de productos muestra cuáles son los más vendidos por cantidad de unidades y por monto total en el período seleccionado.",
    steps: [
      "Ir al módulo Reportes",
      "Ir a la pestaña 'Productos'",
      "Ver el ranking de productos por unidades vendidas o por monto"
    ]
  },

  // ── CONFIGURACIÓN ────────────────────────────────────────────────────────────
  {
    id: "config-nombre-negocio",
    module: "configuracion",
    keywords: ["nombre", "negocio", "cambiar", "configuracion", "perfil", "empresa", "tienda"],
    question: "¿Cómo cambio el nombre del negocio?",
    answer: "El nombre del negocio se cambia desde la sección Configuración.",
    steps: [
      "Ir al módulo Configuración",
      "En 'Información del negocio', editar el campo 'Nombre del negocio'",
      "Guardar los cambios"
    ]
  },
  {
    id: "config-moneda",
    module: "configuracion",
    keywords: ["moneda", "divisa", "pesos", "dolar", "currency", "cambiar", "configuracion"],
    question: "¿Cómo cambio la moneda?",
    answer: "La moneda se configura desde el módulo Configuración en la sección de ajustes regionales.",
    steps: [
      "Ir al módulo Configuración",
      "Buscar la sección 'Moneda y región'",
      "Seleccionar la moneda deseada",
      "Guardar"
    ]
  },
  {
    id: "config-contrasena",
    module: "configuracion",
    keywords: ["contrasena", "password", "cambiar", "seguridad", "clave", "nueva"],
    question: "¿Cómo cambio la contraseña?",
    answer: "Podés cambiar tu contraseña desde el módulo Configuración en la sección de seguridad.",
    steps: [
      "Ir al módulo Configuración",
      "Buscar la sección 'Seguridad'",
      "Ingresar tu contraseña actual",
      "Ingresar y confirmar la nueva contraseña",
      "Guardar"
    ]
  },

  // ── GENERAL / SUSCRIPCIÓN ────────────────────────────────────────────────────
  {
    id: "suscripcion-vencimiento",
    module: "suscripcion",
    keywords: ["vencimiento", "prueba", "trial", "expira", "suscripcion", "vence", "periodo", "gratis"],
    question: "¿Qué pasa cuando vence el período de prueba?",
    answer: "Cuando vence el período de prueba de 14 días, el acceso al sistema queda bloqueado hasta que actives una suscripción.",
    tip: "Te recomendamos activar tu plan antes del vencimiento para no perder el acceso a tus datos."
  },
  {
    id: "suscripcion-renovar",
    module: "suscripcion",
    keywords: ["renovar", "pagar", "suscripcion", "plan", "activar", "comprar", "contratar"],
    question: "¿Cómo renuevo la suscripción?",
    answer: "Para renovar o activar tu suscripción podés hacerlo desde la página de suscripción vencida o contactando a soporte.",
    steps: [
      "Ir a la página de suscripción",
      "Hacer click en 'Actualizar plan'",
      "Elegir el plan y completar el pago"
    ]
  },
  {
    id: "soporte-contacto",
    module: "soporte",
    keywords: ["soporte", "contacto", "ayuda", "email", "problema", "error", "consulta", "escribir"],
    question: "¿Cómo contacto a soporte?",
    answer: "Podés contactar al equipo de soporte de SOLVEN por email a orgsolucionestecnologicas@gmail.com.",
    tip: "Describí el problema con el mayor detalle posible e incluí capturas de pantalla si podés."
  }
];
