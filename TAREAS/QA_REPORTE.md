# QA_REPORTE — QA-CHROME-01 (29/07/2026)

App: SOLVEN — Gestión Comercial (https://solven-app-484v.vercel.app)
Tenant: SOLVEN Test (arcaEnabled = false, verificado antes de empezar ✅)
Fecha: 29/07/2026
Alcance: Recorrido completo de comerciante real — login, ajustes, catálogo, apertura de caja, ventas, cliente/deuda, cotización, devolución, promoción, cierre de caja, reportes, permisos.

Hallazgos
[Severidad: Crítico] No existe mecanismo de venta a crédito/fiado
Pantalla: POS — modal "Cobrar"
Pasos: Intenté vender a "Cliente Prueba QA" dejando el pago pendiente o parcial para registrarlo como deuda.
Esperado: Poder marcar la venta como fiado/cuenta corriente y que quede como deuda del cliente.
Real: El dropdown de método de pago solo ofrece Efectivo, Tarjeta, Transferencia, Venta web, Otro. Dejar el monto en $0 o parcial bloquea el botón "Confirmar cobro" ("Pendiente por asignar"). En el perfil del cliente (pestaña "Deuda") solo existe "Registrar pago/abono" (para cobrar deuda existente), no para crearla. Esto bloqueó completar ese paso del recorrido tal como se pidió.
[Severidad: Crítico] Movimientos de caja y reportes usan el monto pre-descuento en ventas con promoción
Pantalla: Movimientos de Caja / Cierre de Caja / Reportes > Ventas
Pasos: Vendí "Coca Cola 1.5L" con la promo "Promo QA 10% Bebidas" aplicada (cobrado real: $1.404,00).
Esperado: Que el movimiento de caja, el cierre de caja y el reporte de ventas registren $1.404,00 (monto realmente cobrado).
Real: Los tres lugares muestran $1.560,00 (monto sin descuento) — confirmado en Movimientos de Caja ("Cobro de factura V-6KO7A9" +$1.560,00), en Cierre de Caja ("Ventas totales: $9.740,00", debería ser $9.584,00) y en Reportes > Ventas (folio #6KO7A9, Total $1.560,00). El "efectivo esperado" en caja queda sobreestimado en $156 cada vez que se usa una promoción, aunque el sistema "cuadre" internamente por ser consistente con su propio error.
[Severidad: Crítico] Roles no-Propietario tienen acceso completo a Ajustes por defecto
Pantalla: Ajustes > Usuarios > Permisos por rol
Pasos: Revisé la matriz de permisos por rol; luego cerré sesión e inicié sesión con un usuario Cajero de prueba ("Cajero Prueba QA").
Esperado: Un rol Cajero no debería tener acceso a Ajustes (configuración del negocio, Usuarios, Fiscal/ARCA, etc.).
Real: Todas las secciones, incluyendo "Ajustes", aparecen habilitadas por defecto para Cajero, Inventario, Solo Lectura y Supervisor — solo "Propietario" tiene el checkbox de Ajustes bloqueado. Confirmado en la práctica: con la sesión del Cajero de prueba pude acceder completamente a Configuración General, Usuarios, Métodos de pago, Descuentos, Sucursales, Inventario y Fiscal (incluido el toggle de ARCA).
[Severidad: Alto] La promoción "Automática" no se aplica automáticamente al agregar el producto
Pantalla: POS — carrito de venta
Pasos: Creé "Promo QA 10% Bebidas" con Activación Automática y la agregué al carrito con Coca Cola 1.5L.
Esperado: El descuento se calcule apenas se agrega el producto elegible al carrito.
Real: El descuento no se aplicó al agregar el producto; solo se calculó después de abrir manualmente el panel lateral "Promociones" y cerrarlo. Contradice la definición de "automática".
[Severidad: Alto] Cotización no limpia Email/Teléfono al cambiar de cliente
Pantalla: Cotizaciones > Nueva cotización
Pasos: Con un cliente ya seleccionado, escribí un nombre de cliente distinto en el campo "Cliente".
Esperado: Los campos Email y Teléfono se limpien o actualicen según el nuevo cliente.
Real: Quedan con los datos de contacto del cliente anterior, lo que podría generar cotizaciones enviadas con datos de contacto mezclados de dos clientes distintos. Tuve que corregirlos manualmente.
[Severidad: Importante] Categoría de producto incorrecta en Reportes
Pantalla: Reportes > Productos > Rendimiento por producto
Pasos: Comparé la categoría mostrada para "Coca Cola 1.5L" en Reportes vs. en Productos (catálogo).
Esperado: Misma categoría en ambas pantallas ("Bebidas").
Real: En Reportes aparece como "Otros"; en el catálogo real es "Bebidas".
[Severidad: Importante] Vista de configuración del negocio inconsistente entre usuarios del mismo tenant
Pantalla: Ajustes > Mi Negocio (con sesión de usuario Cajero)
Pasos: El Propietario completó y guardó los datos del negocio (nombre, teléfono, etc.). Luego inicié sesión como "Cajero Prueba QA" y entré a la misma sección.
Esperado: Ver los mismos datos guardados por el Propietario (mismo tenant/negocio).
Real: Muestra "Configuración completa: 0/8 campos", con todos los campos vacíos (incluso tras recargar la página). Sugiere una posible falla de sincronización o vista engañosa para roles no-Propietario.
[Severidad: Medio/Importante] No hay campo de IVA/alícuota por producto
Pantalla: Productos > Nuevo producto
Pasos: Intenté asignar una alícuota de IVA específica a un producto nuevo.
Esperado: Poder elegir la alícuota de IVA por producto (o que al menos se aplique el "IVA por defecto" configurado en Ajustes).
Real: No existe ese campo en el formulario. Confirmado además que los tickets de venta siempre muestran "Impuestos (0%)" — nunca se aplica IVA a pesar de que Ajustes tiene configurado "IVA por defecto para productos nuevos: 21%".
[Severidad: Importante, no verificado por seguridad] "Imprimir factura" visible con ARCA deshabilitado
Pantalla: POS — modal de confirmación de venta
Pasos: Al confirmar una venta, observé las opciones del modal.
Esperado: Que no se ofrezca "Imprimir factura" (fiscal) si ARCA está deshabilitado, o que quede claro que es solo el ticket interno.
Real: La opción "Imprimir factura" aparece igual con ARCA desactivado. No la probé por precaución (riesgo de confundir con comprobante fiscal real), pero el texto puede generar confusión.
[Severidad: Bajo] Placeholder de "Mensaje de agradecimiento" se ve como texto real
Pantalla: Ajustes > Documentos
Pasos: Observé el campo antes de completarlo.
Esperado: El texto de ejemplo/placeholder debería verse en gris tenue, como cualquier placeholder.
Real: Se renderiza en color oscuro/negro, indistinguible de un dato ya guardado.
[Severidad: Bajo] Campo "Código/SKU" dice que se autogenera pero es obligatorio
Pantalla: Productos > Nuevo producto
Pasos: Dejé el campo SKU vacío confiando en el texto "Se generará al guardar".
Esperado: Que se genere automáticamente al guardar, sin bloquear el formulario.
Real: El formulario no permite guardar si está vacío; hay que presionar manualmente el botón "Auto".
[Severidad: Bajo] Selección de vendedor sin feedback visual en modal de venta
Pantalla: POS > "Iniciar nueva venta"
Pasos: Abrí el modal sin seleccionar la card de "Código vendedor" y presioné "Confirmar e iniciar venta".
Esperado: Un error o indicación de que falta seleccionar vendedor.
Real: El botón permanece clickeable y no muestra error, pero no hace nada hasta seleccionar explícitamente la card del vendedor (fallo silencioso confuso).
[Severidad: Bajo] Carrito se elimina sin pedir confirmación
Pantalla: POS — carrito activo
Pasos: Eliminé un carrito de prueba con productos cargados.
Esperado: Un diálogo de confirmación ("¿estás seguro?") antes de borrar un carrito con contenido.
Real: Se borra inmediatamente sin confirmación — riesgo de pérdida accidental de una venta en curso.
[Severidad: Bajo] Badge de "venta suspendida" con comportamiento inconsistente
Pantalla: POS
Pasos: Suspendí una venta, navegué fuera del POS y volví.
Esperado: El badge y el carrito suspendido persistan de forma consistente.
Real: En una ocasión el badge desapareció y no se pudo recuperar el carrito; en otra sí persistió. Comportamiento inconsistente.
[Severidad: Bajo] "Devoluciones" no se refleja en el resumen de Cierre de Caja
Pantalla: Cierre de Caja — resumen
Pasos: Procesé una devolución de $1.170,00 y luego abrí el resumen de cierre de caja.
Esperado: Que "(-) Devoluciones" muestre $1.170,00.
Real: Muestra "$0,00", aunque el movimiento sí aparece correctamente como "Salida" en Movimientos de Caja. Inconsistencia entre secciones.
[Severidad: Bajo] Indicador de caja en sidebar no se actualiza tras el cierre
Pantalla: Barra lateral izquierda
Pasos: Cerré la caja exitosamente ("¡Caja cerrada exitosamente!").
Esperado: El indicador debería mostrar caja cerrada inmediatamente.
Real: Siguió mostrando "Caja abierta · $18.570,00" tras el cierre exitoso (posible estado no refrescado).
Nota positiva

El flujo de devolución con selector de método de reintegro (FIX-07) funcionó correctamente: se procesó la devolución parcial, se reintegró el monto correcto, y el stock de "Detergente Ala 750ml" volvió a subir de 24 a 25 unidades como se esperaba.

Cosas que NO se probaron (por seguridad, según instrucciones)
"Imprimir factura" real (para no arriesgar ninguna emisión fiscal, aunque ARCA estaba deshabilitado).
No se habilitó ARCA en ningún momento.
