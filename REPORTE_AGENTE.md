# REPORTE — QA Interfaz SOLVEN
## Estado: COMPLETADO
## Pantallas revisadas: 22/22
## Problemas encontrados: 9
## Problemas corregidos: 5
## Problemas que requieren decisión de Diego:
- `customer-new-form.tsx`: Los campos Cédula/RNC, Dirección, Ciudad y Código postal se muestran en el formulario de nuevo cliente pero sus valores son **silenciosamente descartados** al guardar — el backend no los acepta y el schema no los almacena. Decisión: ¿agregar esos campos al schema, o quitar los inputs del formulario?
- `customer-detail.tsx` menú "..." (3 botones sin handler): "Exportar historial", "Enviar estado de cuenta" y "Eliminar cliente" están visibles pero no hacen nada. Decisión: ¿implementar o quitar?
- `products-inventory.tsx` botón "Estadísticas" (ícono BarChart2) en cada fila de producto: no tiene onClick. Decisión: ¿implementar o quitar?
- `app-shell.tsx`: "Tienda Demo" y "Propietario" hardcodeados en el sidebar inferior. Decisión: ¿leer del tenant/settings o mantener por ahora?

---

## Detalle por sección

### Auth
- `/login` — Sin problemas. Validación HTML5, mensajes en español, link a /register correcto, loading state correcto.
- `/register` — Sin problemas. Validación de contraseñas, loading state, mensajes de error en español.

### Sistema
- `/suscripcion-vencida` — Sin problemas. Banner TRIAL y PAST_DUE en app-shell funcionan correctamente. Links de checkout y soporte presentes.

### Dashboard
- `/dashboard` — **3 bugs corregidos**: acciones rápidas "Nuevo producto", "Nuevo cliente" y "Ajuste de stock" apuntaban a rutas incorrectas (`/products`, `/customers`, `/products`). Ahora apuntan a `/products/new`, `/customers/new` e `/inventory/adjust`.
- Alias `formatMXN` confuso (función argentina renombrada como México) **corregido** → `formatARS`.
- Estado vacío: muestra "Sin ventas registradas" correctamente.
- Skeleton de carga implementado.

### POS / Ventas
- `/pos` — Sin problemas visibles en UI. Maneja caja cerrada con banner y botones deshabilitados. Estados de carga y error para productos presentes. Cart persistido en localStorage. Servicios fallan silenciosamente (sin error state) — documentado en REPORTE_TESTING.md como bug menor.
- `/sales` — Historial carga con estados de carga y vacío.
- `/returns` — Formulario de devolución carga ventas, busca por cliente, valida cantidades. Sin problemas de UI.

### Productos
- `/products` — Sin problemas. Búsqueda, filtros, paginación, modales de crear/editar/ajustar todos correctos en UI.
- `/products/new` — Formulario completo con validación, preview en tiempo real, redirección post-guardado.
- `/products/[id]` — Edición carga datos iniciales, muestra stock como solo lectura.
- **Bug corregido**: Botón "Desactivar" en el menú contextual de cada producto no tenía implementación y solo cerraba el menú. Eliminado.

### Inventario
- `/inventory` — Tabs Stock actual / Movimientos / Entradas / Salidas / Ajustes / Alertas. Carga con estados vacíos correctos.
- `/inventory/entry` — Formulario de entrada de mercadería funcional.
- `/inventory/adjust` — Formulario de ajuste funcional.

### Clientes
- `/customers` — Lista con búsqueda, estados de carga y vacío. Acciones de pago y nueva venta correctas.
- `/customers/new` — Formulario completo. **Problema documentado** para Diego: campos Cédula, Dirección, Ciudad, Código Postal son recogidos en el formulario pero descartados al guardar (no están en el schema).
- `/customers/[id]` — Detalle del cliente.
  - **Bug corregido**: mostraba teléfono, email y cédula generados algorítmicamente desde el ID del cliente como si fueran datos reales. Eliminados.
  - **Bug corregido**: mostraba "Límite de crédito: $10.000" hardcodeado sin ninguna fuente de datos real. Eliminado.
  - **Problema documentado** para Diego: botones "Exportar historial", "Enviar estado de cuenta", "Eliminar cliente" visibles en el menú "..." pero sin funcionalidad.
- `/customers/[id]/payment` — Formulario de pago de deuda funcional.

### Caja
- `/cash-movements` — Movimientos con filtros de fecha, totales del día, apertura/cierre de caja. Sin problemas.
- `/cash-movements/new` — Formulario de movimiento manual con selección de tipo y categoría. Sin problemas.

### Finanzas
- `/debts` — Lista de deudas con filtros por estado, búsqueda, paginación. Sin problemas.
- `/expenses` — Lista de gastos con categorías, filtros, formulario inline. Sin problemas.

### Gestión
- `/promotions` — CRUD de promociones, todos los tipos de promoción, estados activo/inactivo. Sin problemas de UI.
- `/reports` — Reportes de ventas, productos, clientes, inventario con filtros de período. Sin problemas.
- `/settings` — Formulario de configuración del negocio con persistencia. Sin problemas.

---

## Tests: 176 pasando / 37 archivos
## Commit: ecfc851 fix: QA pass — UI corrections and consistency fixes
