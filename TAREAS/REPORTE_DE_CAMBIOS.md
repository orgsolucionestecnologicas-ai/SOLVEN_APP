# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## Tarea 099 — Secciones colapsables: Negocio / Fiscal / Sistema — 2026-07-13
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/settings.tsx`
**Hallazgo previo a implementar:** la tarea suponía que "Mi Negocio" era un formulario largo y continuo con secciones (datos del negocio, regional, ARCA, toggles de sistema) visibles todas juntas. En realidad `settings.tsx` ya usa un patrón de barra lateral de categorías (`CATEGORIES`, 13 ítems) + panel único (`renderContent()`/`activeCategory`) que muestra una sola categoría a la vez — no hay contenido largo para "colapsar" dentro de una vista continua. Se adaptó el pedido a la arquitectura real: en vez de colapsar secciones de un formulario, se agruparon las 13 categorías de la barra lateral en 3 bloques colapsables (Negocio/Fiscal/Sistema), cada uno expandible/colapsable de forma independiente, sin tocar `renderContent()`, `activeCategory` ni ninguna sección individual (`GeneralSection`, `DocumentosSection`, `FacturacionARCASection`, `SeguridadSection`, `SistemaSection`, `ComingSoonSection`).
**Cambios realizados:**
- `Category` ahora incluye `group: "negocio" | "fiscal" | "sistema"`. Mapeo aplicado a las 13 categorías existentes (ninguna eliminada ni renombrada): Negocio = general, usuarios, pagos, descuentos, sucursales, inventario. Fiscal = documentos, arca (incluye los campos de Tareas 096-098). Sistema = nube, notificaciones, integraciones, sistema, seguridad (toggles de `TogglesConfig` + seguridad).
- Nuevo estado `expandedGroups` (uno por grupo, `negocio` expandido por defecto ya que contiene la categoría inicial "general") con un `useEffect` que expande automáticamente el grupo de la categoría activa al cambiarla (por ejemplo, al navegar desde `QuickCards` o el `<select>` mobile a una categoría de un grupo colapsado), sin colapsar los demás grupos que el usuario haya abierto manualmente.
- La barra lateral desktop (`lg:block`) ahora renderiza 3 encabezados de grupo (botón + ícono `ChevronDown` que rota) con la lista de categorías de cada grupo debajo, visible solo si el grupo está expandido.
- El `<select>` mobile y `QuickCards` (que ya navegaban por `CATEGORIES` sin pasar por la barra lateral) quedaron intactos — siguen mostrando las 13 categorías sin agrupar, ya que no dependen de la agrupación visual de la barra lateral.
- No se tocó `SettingsNav.tsx`, `SettingsContent.tsx` ni `NegocioPanel.tsx` (navegación de nivel superior "Mi Negocio"/"Usuarios"/"Suscripción" sin cambios). No se cambió el comportamiento de guardado de ningún campo, solo la agrupación visual de la barra lateral de categorías.
**Validación:** `npm run lint` ok, `npm run typecheck` ok, `npm run build` ok (requerido explícitamente por la tarea).
**Notas:** "Usuarios" no se convirtió en bloque colapsable propio dentro de esta vista (ya vive en su página propia vía `SettingsNav`), tal como indica la tarea — la categoría interna "usuarios" (placeholder `ComingSoonSection`, distinta de la página real) se dejó agrupada dentro de "Negocio" sin eliminarla.

## Tarea 098 — IVA por defecto configurable para productos nuevos — 2026-07-13
**Estado:** ✅ Completada
**Archivos modificados:** `prisma/schema.prisma` (+ migración `20260712230538_add_default_iva_rate`), `src/modules/settings/settings-validation.ts`, `src/app/ui/settings.tsx`, `src/app/ui/products-inventory.tsx`
**Hallazgo previo a implementar:** el archivo que la tarea suponía tenía el valor hardcodeado (`src/app/ui/product-form.tsx`, la página `/products/new`) en realidad **no tiene ningún campo de IVA** — ese formulario nunca envía `ivaRate` al crear un producto, así que siempre queda con el default del servidor. El selector de IVA con `useState<number>(0.21)` hardcodeado que la tarea describía está en realidad en `CreateProductModal` dentro de `src/app/ui/products-inventory.tsx` (el modal rápido de alta de producto usado desde el listado de productos). Se corrigió ahí, no en `product-form.tsx` (que no tenía nada que cambiar). No se tocó `product-validation.ts` (el fallback `let ivaRate = 0.21` para cuando `ivaRate` no viene en el payload, usado por `/products/new` y por la importación CSV) porque está fuera de los archivos permitidos por la tarea y su default sigue siendo el mismo valor (0.21) que ya representaba el comportamiento actual — no cambia nada para quien no configuró un valor distinto.
**Cambios realizados:**
- `StoreSettings.defaultIvaRate Float @default(0.21)` (mismo valor que hoy está hardcodeado, sin efecto hasta que se configure distinto).
- Selector "IVA por defecto para productos nuevos" agregado a la sección "Documentos" de `settings.tsx` (mismas opciones y etiquetas que el selector de IVA ya usado en `products-inventory.tsx`: 21%/10,5%/27%/Exento), guardado vía `PATCH /api/settings`.
- `CreateProductModal` en `products-inventory.tsx` ahora trae `defaultIvaRate` desde `GET /api/settings` al montar y lo usa como valor inicial del selector de IVA (en vez de `0.21` fijo); si el fetch falla o no hay configuración, se mantiene el fallback `0.21` original.
**Validación:** `npm run lint` ok, `npm run typecheck` ok, `npm run build` ok, migración aplicada. `npx vitest run` en `products`, `api/products` y `settings`: 15 tests pasados, sin fallos.
**Notas:** No se modificó `Product.ivaRate` en el schema ni el IVA de productos existentes. No se agregó campo de IVA a `product-form.tsx` — agregar uno ahí sería una funcionalidad nueva no pedida por la tarea (esa página hoy no lo pide en el formulario).

---

## Tarea 097 — Número inicial de comprobante — 2026-07-13
**Estado:** ✅ Completada
**Archivos modificados:** `prisma/schema.prisma` (+ migración `20260712225153_add_initial_receipt_number`), `src/modules/sales/sale-data-access.ts`, `src/modules/settings/settings-validation.ts`, `src/app/ui/settings.tsx`
**Hallazgo previo a implementar:** `folio` es un contador por tenant (`sale.findFirst({ where: { tenantId }, orderBy: { folio: "desc" } })`), pero `receiptNumber` usaba el modelo `CodeCounter` (sin `tenantId`, sin scope de tenant) con una fila global compartida por **todos los tenants** para cada prefijo ("TKT"/"FAC"). Esto significa que, antes de este cambio, la numeración de tickets/facturas era global entre negocios distintos, no por negocio — una violación de la regla "TODOS los queries Prisma deben tener where: tenantId" de `CLAUDE.md`. Configurar un "número inicial" por tenant sobre un contador global habría numerado mal los comprobantes de otros tenants, así que era un prerrequisito necesario (no una tarea aparte) corregir el scope de `receiptNumber` para que sea por tenant y por `receiptType`, igual que `folio`. Se verificó que ningún otro módulo usa `codeCounter` con los ids "TKT"/"FAC" (los otros prefijos — CLI/SRV/PROD/COT — no se tocaron).
**Cambios realizados:**
- `StoreSettings.initialReceiptNumber Int @default(0)` (default `0` = sin efecto para tenants existentes).
- `createSale` ahora busca la última venta del mismo tenant y mismo `receiptType` ordenada por `receiptNumber` descendente; si existe, el próximo comprobante es `último + 1` (igual que antes, pero ahora scopeado por tenant). Si no existe ninguna venta previa de ese tipo para ese tenant, usa `StoreSettings.initialReceiptNumber` (si es mayor a 0) o `1` por defecto. Nunca reescribe ni renumera ventas ya emitidas.
- Se eliminó el uso de `codeCounter.upsert` en `createSale` (reemplazado por el cálculo scopeado por tenant descrito arriba).
- Nuevo campo "Número inicial de comprobante" en la sección "Documentos" de `settings.tsx` (input numérico, con nota de que solo aplica antes del primer comprobante), guardado vía `PATCH /api/settings`.
**Validación:** `npm run lint` ok, `npm run typecheck` ok, `npm run build` ok, migración aplicada. `npm test`: 204 passed / 1 failed / 2 skipped — el único fallo es el bug conocido y preexistente de Tarea 081 (`createSale` no crea `Debt` para ventas CREDIT), no relacionado a este cambio. Los tests de `sale-data-access` y de la ruta de ventas (salvo ese caso CREDIT ya roto) pasan igual que antes.
**Notas:** No se tocó la lógica ARCA/AFIP (la numeración fiscal de facturas electrónicas usa el CAE de ARCA, no `receiptNumber`).

---

## Tarea 096 — Datos AFIP completos: punto de venta, condición IVA, tipo de responsable — 2026-07-13
**Estado:** ✅ Verificada (ya estaba implementada)
**Archivos modificados:** ninguno
**Cambios realizados:** Se verificó que `TenantARCAConfig` ya tiene `cuit String`, `puntoVenta Int` y `condicionIVA String` (comentario en el schema: `"RI" | "MONO"`), y que `FacturacionARCASection` en `src/app/ui/settings.tsx` expone los tres como formulario editable ("Datos del emisor": CUIT sin guiones, punto de venta numérico, y un `<select>` de Condición IVA con "Responsable Inscripto"/"Monotributista"), conectado a `POST /api/tenants/arca-config` (guarda) y `GET /api/tenants/arca-config` (carga inicial). "Condición IVA" cubre el "tipo de responsable" pedido por la tarea — no son dos campos separados que falten. No se agregó "Exento" ni otra condición fiscal adicional al `<select>`: para el perfil de emisor de SOLVEN (comercios minoristas chicos/medianos que emiten con ARCA/AFIP) Responsable Inscripto y Monotributista cubren la casuística real del proyecto; agregar opciones no solicitadas específicamente iba en contra de la regla de "menos es más".
**Notas:** No se ejecutó build/test porque no hubo cambios de código.

---

## Tarea 095 — Personalización del ticket: logo, pie de página, mensaje de agradecimiento — 2026-07-13
**Estado:** ✅ Completada
**Archivos modificados:** `prisma/schema.prisma` (+ migración `20260712221619_add_receipt_customization`), `src/modules/settings/settings-validation.ts`, `src/app/ui/settings.tsx`, `src/app/ui/pos.tsx`
**Cambios realizados:** Se agregaron `logoUrl String @default("")`, `receiptFooterMessage String @default("")` y `receiptThankYouMessage String @default("¡Gracias por su compra!")` al modelo `StoreSettings`. Se extendió `validateUpsertSettingsInput` en `settings-validation.ts` para aceptar y persistir estos 3 campos (necesario para que `PATCH /api/settings` no los descarte). En `settings.tsx` se creó `DocumentosSection` (nueva, cableada a la categoría "documentos" que antes mostraba `ComingSoonSection`) con los 3 campos editables, guardados vía el mismo `PATCH /api/settings` ya usado por el resto de `StoreSettings` — el guardado envía de vuelta el objeto completo recibido del `GET /api/settings` (`{ ...raw, logoUrl, receiptFooterMessage, receiptThankYouMessage }`) en lugar de solo los 3 campos nuevos, para no pisar con valores por defecto el resto de la configuración del negocio (la validación de este endpoint reconstruye el registro completo a partir del payload recibido, no hace merge parcial contra la base). En `pos.tsx`, `PrintModal` ahora trae `logoUrl`/`receiptFooterMessage`/`receiptThankYouMessage` en el mismo fetch a `/api/settings` que ya traía `businessName`, e inyecta en `handlePrintTicket`: el logo como `<img>` centrado arriba del nombre del negocio (solo si `logoUrl` no está vacío), el mensaje de agradecimiento reemplazando el texto fijo anterior, y el pie de página como línea adicional al final del ticket (solo si no está vacío).
**Notas:** No se tocó `handlePrintInvoice` (factura) ni el resto del template del ticket (ítems, totales) — cambio acotado a lo pedido. No se implementó subida de archivos: el logo es una URL externa pegada manualmente, según restricción explícita de la tarea. Build, lint, typecheck y migración OK. `npm test`: 204 passed / 1 failed / 2 skipped — el único fallo es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081.

---

## Tarea 094 — Estado activo/inactivo de usuario — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `prisma/schema.prisma` (+ migración `20260712212556_add_user_active`), `src/app/api/auth/login/route.ts`, `src/modules/users/user-data-access.ts`, `src/modules/users/index.ts`, `src/app/api/users/[id]/route.ts`, `src/app/ui/users-list.tsx`
**Cambios realizados:** Se agregó `active Boolean @default(true)` al modelo `User`. En `POST /api/auth/login`, después de verificar la contraseña y antes de buscar la suscripción, se bloquea el login con 401 (`"Usuario desactivado. Contactá al propietario de la cuenta."`) si `user.active === false`, sin crear sesión. Se agregó `setUserActive(id, active, tenantId, currentUserId)` en `user-data-access.ts`, replicando el mismo resguardo de auto-protección que ya tenían `updateUserRole`/`deleteUser` (un usuario no puede desactivarse a sí mismo). Se extendió el `PATCH /api/users/[id]` existente (en vez de crear una ruta nueva) para aceptar un body `{ active: boolean }` además del `{ role: string }` ya soportado, sin romper el uso actual desde `handleRoleChange`. En `users-list.tsx`: nueva columna "Estado" con badge Activo/Inactivo, y un botón "Activar"/"Desactivar" (ícono `Power`) junto al de "Eliminar"; desactivar requiere confirmación en un modal (mismo patrón que el de eliminar), reactivar es inmediato. Se verificó que `deleteUser` no tiene ningún resguardo de historial (solo bloquea auto-eliminación) y que `AuditLog.userId` es una relación FK real hacia `User` sin `onDelete` explícito — por lo que eliminar un usuario con historial de auditoría ya fallaría por restricción de base de datos; desactivar es la alternativa segura que preserva ventas y auditoría intactas.
**Notas:** No se implementó cierre de sesión forzado para usuarios ya logueados al momento de desactivarlos (su sesión JWT seguirá siendo válida hasta que expire o cierren sesión manualmente) — limitación conocida, fuera de alcance de esta tarea. No se tocó `DELETE /api/users/[id]` (se mantiene disponible). Build, lint y typecheck OK. `npm test`: 203 passed / 2 failed / 2 skipped — 1 es el bug preexistente ya documentado en la Tarea 081, y el otro (`dashboard summary > calculates core business metrics from existing database data`, `Can't reach database server`) es un flake transitorio de conexión a Neon, confirmado al re-ejecutar ese archivo en aislamiento (pasó limpio, 1/1). Esta tarea no tocó nada relacionado al dashboard.

---

## Tarea 093 — Click en el cliente navega al perfil completo sin perder el contexto — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/debts-list.tsx`, `src/app/ui/customer-detail.tsx`
**Cambios realizados:** El `Link` al nombre del cliente en la tabla de `debts-list.tsx` ya navegaba a `/customers/${debt.customerId}`; se le agregó el query param `?from=deudas`. En `customer-detail.tsx` (usado por `src/app/customers/[id]/page.tsx`) se agregó `useSearchParams()` para detectar `from=deudas`; cuando está presente, el enlace "Volver a clientes" que ya existía arriba del contenido del perfil cambia dinámicamente a "Volver a Deudas" y apunta a `/debts` en vez de `/customers`. No se implementó persistencia completa de filtros en la URL de `/debts` (fuera de alcance según la restricción explícita de la tarea) — alcanza con volver a la sección.
**Notas:** Build, lint y typecheck OK. `npm test`: 205 passed / 2 failed / 2 skipped en la corrida completa — 1 es el bug preexistente ya documentado en la Tarea 081, y el otro (`products API database integration > lists products after creation`, `Can't reach database server`) es un flake transitorio de conexión a Neon, confirmado al re-ejecutar ese archivo en aislamiento (pasó limpio, 2/2). Esta tarea no tocó nada relacionado a productos.

---

## Tarea 092 — Monto total adeudado en grande en la parte superior — 2026-07-12
**Estado:** ✅ Verificada (ya cubierta por la Tarea 085)
**Archivos modificados:** ninguno
**Cambios realizados:** Se verificó que `MetricCard Icon={AlertCircle}` ("Total deuda", `totalDebt`) es la primera de las 4 tarjetas de métricas en `src/app/ui/debts-list.tsx` (línea 381), y que las 4 tarjetas comparten `text-2xl font-bold` (línea 683 de `MetricCard`) — es decir, el monto total adeudado ya es lo primero y más grande que se ve al entrar a la sección de deudas, tal cual lo dejó la Tarea 085. No se hizo ningún cambio de código, siguiendo la instrucción explícita del prompt de la tarea de no duplicar la tarjeta ni modificar tamaños si ya está cubierto.
**Notas:** No se ejecutó build/test porque no hubo cambios de código.

---

## Tarea 091 — Barra de progreso de pago por deuda — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/debts-list.tsx`
**Cambios realizados:** En `DebtDetailModal`, debajo de la grilla de 3 columnas (Deuda total / Pendiente / Pagado), se agregó una barra de progreso horizontal (`bg-slate-100` de fondo, `bg-emerald-500` de relleno con ancho `(paidAmount / totalAmount) * 100`%) con el porcentaje como texto ("X% pagado"). También se agregó una versión compacta de la misma barra en la fila de la tabla principal, debajo del monto de saldo pendiente — entró sin romper el layout existente (`whitespace-nowrap`), así que se implementó en ambos lugares. Para deudas totalmente pagadas la barra se ve completa (100%, con `Math.min(100, ...)` como resguardo contra redondeos).
**Notas:** No se modificó `/api/debts` ni el schema de Prisma — cálculo puramente derivado de `totalAmount`/`remainingAmount` ya disponibles. Build, lint y typecheck OK. `npm test`: 204 passed / 1 failed / 2 skipped — el único fallo es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081.

---

## Tarea 090 — Marcar deuda como incobrable con nota (baja contable) — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `prisma/schema.prisma` (+ migración `20260712202356_add_debt_write_off`), `src/modules/debts/debt-data-access.ts`, `src/modules/debts/index.ts`, `src/app/api/debts/[id]/write-off/route.ts` (nuevo), `src/app/ui/debts-list.tsx`
**Cambios realizados:** Se agregaron los campos `writtenOff Boolean @default(false)`, `writeOffNote String?` y `writeOffAt DateTime?` al modelo `Debt`, aplicados con `npx prisma migrate dev --name add-debt-write-off`. Se agregó `writeOffDebt(id, note, tenantId)` en `debt-data-access.ts`, que valida nota no vacía y actualiza con `where: { id, tenantId }` (mismo patrón de scoping por tenant que `updateUserRole`/`deleteUser`, 404 automático vía `P2025` si la deuda no pertenece al tenant). Se creó `PATCH /api/debts/[id]/write-off` con `requireRole(["OWNER"])` (decisión contable sensible). En `debts-list.tsx`: nuevo botón ícono `Ban` "Marcar como incobrable" en cada fila con saldo pendiente y en el footer de `DebtDetailModal` (nuevo prop `onWriteOff`), que abren `WriteOffDebtModal` (nota obligatoria vía `<textarea>`, mismo patrón `submitError`/`isSubmitting` que los demás modales). Las deudas con `writtenOff: true` muestran un badge gris/slate "Incobrable" (prioridad sobre Pagada/Vencida/Pendiente) en la tabla y en el header de `DebtDetailModal`, y se excluyen de `totalDebt`, `activeDebtsCount`, `customersWithDebtCount` y `topDebtors`. No se borra ningún `Debt` ni `DebtPayment` — la baja es un estado, el historial de pagos se conserva intacto.
**Notas:** No se modificó `exportDebtsToCsv` (Tarea 087) — queda fuera de alcance de esta tarea (solo pide tabla y `DebtDetailModal`); una deuda incobrable exportará hoy como "Pendiente" en el CSV, pendiente de una tarea futura si se requiere. Build, lint y typecheck OK. `npm test`: 204 passed / 1 failed / 2 skipped — el único fallo es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081 (`createSale` no genera `Debt` para ventas a crédito).

---

## Tarea 089 — Ordenar por mayor monto / más antigua / más reciente / por cliente — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/debts-list.tsx`
**Cambios realizados:** El selector de orden ya implementaba "Más recientes", "Mayor deuda" y "Cliente A-Z". Se agregó la opción faltante `"oldest"` ("Más antiguas") tanto en el `<select>` como en la rama correspondiente del `useMemo` de `filteredDebts` (`result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())`). Ordenamiento puramente client-side, igual que los otros 3 criterios.
**Notas:** No se modificó `/api/debts` ni el schema de Prisma. Build, lint y typecheck OK. `npm test`: 205 passed / 2 failed / 2 skipped en la corrida completa — 1 es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081, y el otro son 2 fallos de conexión a Neon (`Timed out fetching a new connection from the connection pool` y `Server has closed the connection`) que desaparecieron al re-ejecutar los archivos afectados (`core-business-flow.integration.test.ts`, `debt-payments/route.integration.test.ts`) en aislamiento — confirmados como flakes transitorios, no relacionados con este cambio puramente de UI.

---

## Tarea 088 — Enviar recordatorio de pago por WhatsApp desde la deuda — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/modules/debts/debt-data-access.ts`, `src/app/ui/debts-list.tsx`
**Cambios realizados:** Se agregó `phone: true` al `select` del cliente en `listDebts` (`debt-data-access.ts`), y `DebtWithCustomer`/`DebtRecord` ahora incluyen `customer.phone`. En `debts-list.tsx` se agregó un botón verde "Recordar por WhatsApp" (ícono `MessageCircle`) en cada fila de deuda pendiente de la tabla y en `DebtDetailModal`, replicando el patrón existente `shareLastSaleWhatsApp` de `pos.tsx`: arma un texto con `encodeURIComponent` (nombre del negocio, nombre del cliente, saldo pendiente, fecha de vencimiento si existe) y abre `https://wa.me/<telefono-limpio>?text=...` en una pestaña nueva, apuntando directo al teléfono del cliente (limpiado de caracteres no numéricos) en vez de abrir el selector de contacto. El nombre del negocio se obtiene de `GET /api/settings` (mismo patrón que `pos.tsx`). Si el cliente no tiene teléfono cargado, el botón queda deshabilitado con tooltip "Cliente sin teléfono registrado".
**Notas:** No se integró ninguna API oficial de WhatsApp Business — es siempre una acción manual del usuario vía `wa.me`, igual que el patrón ya existente. No se modificó el schema de Prisma. Build, lint y typecheck OK. `npm test`: 204 passed / 1 failed / 2 skipped — el único fallo es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081 (`createSale` no genera `Debt` para ventas a crédito). El flake transitorio de Neon visto en tareas anteriores (`prevents concurrent payments from overpaying a debt`) no se repitió en esta corrida.

---

## Tarea 087 — Exportar listado de deudas a CSV / Excel — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/debts-list.tsx`
**Cambios realizados:** Se agregó un botón "Exportar CSV" al inicio de la fila de filtros (mismo lugar y estilo que en `sales-list.tsx`/`cash-movements-list.tsx`). Genera el CSV en el cliente con el mismo patrón ya usado (`escapeCsvValue` + `Blob` + `URL.createObjectURL` + click programático + `revokeObjectURL`, sin librerías nuevas) a partir de `filteredDebts` (las deudas visibles según los filtros aplicados, no solo la página actual), con columnas Cliente, Deuda total, Saldo pendiente, Estado (Pendiente/Pagada/Vencida, reutilizando `isOverdueDebt` de la Tarea 084), Fecha de creación y Fecha de vencimiento. Descarga con nombre `deudas_YYYY-MM-DD.csv` (fecha actual).
**Notas:** No se modificó `/api/debts` ni el schema de Prisma. No existe archivo de test dedicado para `debts-list.tsx`. Build, lint y typecheck OK. `npm test`: 203 passed / 2 failed / 2 skipped — ambos fallos son preexistentes y no relacionados: `creates a credit sale with debt through the API flow` es el mismo bug ya documentado en la Tarea 081 (`createSale` no genera `Debt` para ventas a crédito), y `prevents concurrent payments from overpaying a debt` es el mismo flake transitorio de Neon ya visto y confirmado en las Tareas 084 y 086. Esta tarea no tocó ningún archivo de backend/API, por lo que ninguno de los dos fallos puede ser una regresión introducida aquí.

---

## Tarea 086 — Fecha de vencimiento de deuda configurable al registrarla — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/debts-list.tsx`, `src/modules/debts/debt-validation.ts`, `src/modules/debts/debt-data-access.ts`, `src/modules/debts/debt-validation.test.ts`
**Cambios realizados:** El botón "Nueva deuda" (antes decorativo, sin `onClick`) ahora abre un nuevo componente `CreateDebtModal` con buscador de cliente con debounce (mismo patrón que `NewQuoteModal` en `quotes-list.tsx`, contra `GET /api/customers?search=...`), un campo de monto total obligatorio y un campo de fecha de vencimiento opcional (`<input type="date">`). Al confirmar hace `POST /api/debts` con `{ customerId, totalAmount, dueDate }`; al éxito cierra el modal y refresca la lista (mismo patrón `refreshKey` usado tras registrar un pago). Se agregó soporte para `dueDate` (opcional, valida que sea una fecha válida si viene) en `CreateDebtInput`/`validateCreateDebtInput`, y `createDebt` ahora persiste el campo agregado en la Tarea 084. No se modificó `/api/debts/route.ts` — ya pasaba el body completo a `createDebt` sin cambios necesarios. No se tocó cómo se generan las deudas automáticas desde ventas a crédito.
**Notas:** Build, lint y typecheck OK. Se actualizó el test unitario existente `debt-validation.test.ts` (el resultado de `validateCreateDebtInput` ahora incluye `dueDate`) y se agregaron 2 casos nuevos (fecha válida / fecha inválida). `npm test`: tras el ajuste, 203 passed / 1 failed / 2 skipped — el único fallo es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081 (`createSale` no genera `Debt` para ventas a crédito). Dos fallos adicionales vistos en la corrida completa (`prevents concurrent payments from overpaying a debt` y `stock-adjustment` con timeout de transacción) fueron confirmados como flakes transitorios de Neon al re-ejecutarse en aislamiento — pasaron sin cambios de código.

---

## Tarea 085 — Total global adeudado visible en el encabezado de la sección — 2026-07-12
**Estado:** ✅ Ya estaba implementada — sin cambios
**Archivos modificados:** ninguno
**Verificación:** En `src/app/ui/debts-list.tsx`, la primera de las 4 tarjetas de métricas (`MetricCard` con ícono `AlertCircle` rojo, título "Total deuda") ya muestra `totalDebt` (suma de `remainingAmount` de todas las deudas) en `text-2xl font-bold`, justo debajo del encabezado "Deudas" de la sección. Es suficientemente prominente y no se mezcla con las otras 3 tarjetas. No se modificó `totalDebt`, `/api/debts` ni el schema de Prisma.

---

## Tarea 084 — Deudas vencidas automáticamente marcadas con badge 'Vencida' en rojo — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `prisma/schema.prisma`, `prisma/migrations/20260712190719_add_debt_due_date/`, `src/app/ui/debts-list.tsx`
**Cambios realizados:** Se agregó el campo opcional `dueDate DateTime?` al modelo `Debt` (migración `add-debt-due-date`, aplicada). En `debts-list.tsx` se agregó `dueDate: string | null` al tipo `DebtRecord` y una función `isOverdueDebt` con el criterio exacto `dueDate !== null && new Date(dueDate) < new Date() && Number(remainingAmount) > 0`. Cuando una deuda cumple ese criterio, la tabla principal y el detalle (`DebtDetailModal`) muestran un badge rojo "Vencida" en lugar de "Pendiente" en la columna/estado.
**Notas:** No se tocó `debt-data-access.ts` — `listDebts` usa `include` (no `select`) por lo que `dueDate` ya se devuelve automáticamente. No se agregó formulario para cargar `dueDate` (queda para la Tarea 086). Build, lint y typecheck OK. `npm test`: 199 passed / 4 failed / 2 skipped en la corrida completa, pero al re-ejecutar en aislamiento los 3 archivos de integración que fallaron (`dashboard/summary`, `products`, `debt-payment-data-access`) los 7 tests pasaron sin cambios — fueron cortes transitorios de conexión a Neon ("Can't reach database server"), no una regresión. El único fallo restante es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081 (`createSale` no genera `Debt` para ventas a crédito).

---

## Tarea 083 — Confirmación de dos pasos con resumen antes de procesar la devolución — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/returns.tsx`
**Cambios realizados:** El botón "Procesar devolución" del formulario "Nueva devolución" ahora es "Revisar devolución" y no envía nada directamente — pasa a un paso intermedio dentro del mismo formulario (estado `formStep`, sin modal aparte) que muestra un resumen: productos a devolver con cantidad y si reponen o no stock, el motivo y nota seleccionados, y el monto total, con botones "Volver" (regresa al formulario conservando todo lo cargado: cantidades, motivo, nota, checkboxes de reposición) y "Confirmar devolución" (recién ahí dispara el `POST /api/returns` existente).
**Notas:** Build, lint y typecheck OK. No se modificó `processReturn` ni `/api/returns` ni el schema de Prisma. `npm test`: 202 passed / 1 failed / 2 skipped — el único fallo es el mismo bug preexistente y no relacionado ya documentado en la Tarea 081 (`createSale` no genera `Debt` para ventas a crédito).

---

## Tarea 082 — Advertencia si el producto ya tiene stock 0 y no puede reponerse — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/returns.tsx`
**Cambios realizados:** Al seleccionar una venta en "Nueva devolución", ahora se consulta el stock actual de cada producto involucrado vía `GET /api/products/[id]` (en paralelo, sin endpoint nuevo) y se guarda en el estado `productStockById`. Si el checkbox "Reponer al inventario" (Tarea 079) está destildado para un producto y su stock actual es 0, se muestra una advertencia ámbar con ícono `AlertTriangle` junto a la línea del producto: "Este producto ya está sin stock y no se repondrá — seguirá sin stock disponible para la venta." Es puramente informativa, no bloquea el envío.
**Notas:** Build, lint y typecheck OK. No se modificó `processReturn` ni `/api/returns`.

---

## Tarea 081 — Nota de crédito de la devolución en PDF descargable — 2026-07-12
**Estado:** ✅ Completada
**Archivos modificados:** `src/app/ui/return-credit-note-pdf.tsx` (nuevo), `src/app/api/returns/[id]/pdf/route.tsx` (nuevo), `src/modules/returns/index.ts` (agregada función `getReturnById`), `src/app/ui/returns.tsx`
**Cambios realizados:** Se replicó el patrón de PDF de cotizaciones (`@react-pdf/renderer`) para devoluciones. `ReturnCreditNotePDFDocument` muestra número de devolución, fecha, venta de origen, motivo/nota (Tarea 077), detalle de productos devueltos con cantidad y precio unitario, y el total devuelto, bajo el encabezado "Nota de crédito". El endpoint `GET /api/returns/[id]/pdf` resuelve la devolución vía la nueva función puntual `getReturnById` (que cruza `ReturnItem` con `SaleItem` para obtener `unitPrice`, sin tocar `processReturn`), obtiene `businessName` de `StoreSettings` y devuelve el PDF como `application/pdf`. Se agregó el botón "Nota de crédito" (ícono `FileText`) en cada fila del historial de devoluciones, que abre el endpoint en una pestaña nueva.
**Notas:** `npm run build`, lint y typecheck OK. `npm test`: 202 passed / 1 failed / 2 skipped. El único test que falla (`src/app/api/sales/route.integration.test.ts > creates a credit sale with debt through the API flow`) es preexistente y **no está relacionado con esta tarea** — no se tocó ningún archivo de ventas/deudas. Verificado en aislamiento (falla igual corriendo solo ese archivo) y confirmado por diff de git (solo se modificaron archivos de devoluciones). Causa raíz identificada: `createSale` en `src/modules/sales/sale-data-access.ts` fuerza `customerId: null` al crear la venta y **nunca crea un registro `Debt`** para ventas con `paymentType: CREDIT` — la generación automática de deudas desde ventas a crédito, mencionada como ya funcionando en `TAREAS_081_100.md` (Tarea 086), no existe en el código actual. Esto queda fuera del alcance de la Tarea 081 y no se modificó; se recomienda que Diego lo priorice como bug de lógica de negocio, ya que puede estar afectando la generación real de deudas en producción.

---

Historial de Tareas 061–080 revisado, marcado como completado en Notion y archivado por el Ingeniero Líder — 2026-07-12.
