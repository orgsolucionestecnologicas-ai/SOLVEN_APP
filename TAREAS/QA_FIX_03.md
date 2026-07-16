# QA-FIX-03 — Cierre del ciclo de QA (hallazgos 🟠/🟡/🟢 restantes)

> Contexto: tras QA-FIX-01 (9 endpoints sin `requireRole`) y QA-FIX-02 (RolePermission conectado de verdad), quedan 8 hallazgos abiertos en `TAREAS/QA_REPORTE.md`. Ninguno es tan grave como los 2 🔴 ya resueltos, pero Diego pidió cerrarlos hoy mismo en un solo lote en vez de llevarlos a Notion. Las dos decisiones de producto que estaban pendientes (sección de RolePermission para `/debts`, y si SUPERVISOR debe perder lectura de Caja/Ajustes) ya las tomó Diego — están incorporadas abajo, no hay que volver a preguntar.
>
> Regla general: cada ítem es independiente — si alguno no se entiende o el código ya cambió desde que se escribió este reporte, documentalo en el entregable y seguí con el resto en vez de bloquear todo el lote.

---

## ÍTEM 1 — 🟠 SUPERVISOR puede leer Caja y Ajustes por API directa

**Decisión de Diego: restringir la lectura también, para que coincida con lo que ya sugiere el menú oculto.**

- Agregar `requireRole(["OWNER","CASHIER"], "cashMovements")` al `GET` de `src/app/api/cash-movements/route.ts` — mismo array que ya usa el `POST` de ese archivo.
- Agregar `requireRole(["OWNER"], "settings")` al `GET` de `src/app/api/settings/route.ts` — mismo array que ya usa el `PATCH` de ese archivo.
- Verificar que esto no rompe ninguna pantalla que hoy dependa de que `SUPERVISOR` pueda leer esos endpoints (revisar `app-shell.tsx` — ya los oculta del menú para `SUPERVISOR`, así que no debería haber ningún componente que los llame con ese rol).
- Test: agregar/actualizar un test que confirme que un token `SUPERVISOR` recibe `403` en ambos `GET` (siguiendo el patrón de tests ya escritos en QA-FIX-01/02 para `READONLY`/`OWNER`).

## ÍTEM 2 — 🟠 `seed-icase.mjs` y `reset-users.mjs` pueden borrar el tenant equivocado

- En `scripts/seed-icase.mjs` (~línea 118) y `scripts/reset-users.mjs` (~línea 24), reemplazar `prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } })` por una selección explícita del tenant demo — usar `businessName: "Comercio Demo"` o el id conocido `seed_tenant_demo` si existe como constante en el schema/seed; si no hay forma limpia de identificarlo por campo único, agregar una variable de entorno `SEED_TENANT_ID` con ese valor como default, y documentar en el propio script por qué ya no se puede usar "el más viejo por fecha".
- No ejecutar los scripts contra la base de desarrollo como parte de esta tarea (para no gatillar el problema real) — el cambio se valida leyendo el código, no corriendo el script.

## ÍTEM 3 — 🟡 Columna Email y buscador de Clientes usan valores sintéticos

- En `src/app/ui/customers-list.tsx`: la celda de la tabla (línea ~984) usa `getCustomerEmail(customer.name)` (línea 114-128) → cambiar para que muestre `customer.email` real, con un placeholder tipo "Sin email" cuando esté vacío (igual que ya hace la columna de teléfono con `customer.phone`).
- El filtro de búsqueda (línea ~406-413) usa `getCustomerPhone(c.id)` (línea 130-135) en vez del teléfono real → agregar `c.phone` y `c.email` reales a los campos que compara el buscador, además de `c.name` y `c.taxId` que ya usa.
- Las funciones `getCustomerEmail`/`getCustomerPhone` sintéticas pueden quedar en el archivo si se usan en otro lado (revisar con grep antes de borrarlas); si no se usan en ningún otro lugar tras este cambio, eliminarlas.

## ÍTEM 4 — 🟡 Recordatorio de cotización por vencer usa la plantilla equivocada

- En `src/app/api/cron/remind-expiring-quotes/route.ts`, reemplazar la llamada a `sendQuoteEmail` (línea ~44, importada en línea ~2) por `sendQuoteExpiringReminderEmail` (ya existe en `src/lib/email.ts:241`, solo hay que importarla).
- Confirmar que la firma de `sendQuoteExpiringReminderEmail` acepta los mismos parámetros que hoy se le pasan a `sendQuoteEmail` en ese archivo; si difiere, ajustar el call site (no la función de email).

## ÍTEM 5 — 🟡 "Subir logo" en Ajustes es 100% decorativo

- En `src/app/ui/settings.tsx`, componente `RightSidebar`, función `handleFileChange` (línea ~1262-1267): hoy solo hace `URL.createObjectURL(file)` y nunca persiste.
- Seguir el mismo patrón que ya se usa para imágenes de producto/comprobantes de gasto en el proyecto (buscar con grep cómo lo hacen esas features — probablemente conversión a base64 + `PATCH` con ese valor) para que el archivo subido se guarde de verdad en `StoreSettings.logoUrl` vía `PATCH /api/settings`.
- Una vez subido, el campo de texto "URL del logo" (línea ~502-582) debería reflejar el valor real (mismo state, no dos fuentes de verdad separadas).

## ÍTEM 6 — 🟡 Test de venta a crédito desactualizado tras la Tarea 138

- En `src/app/api/sales/route.integration.test.ts:84-116` (`creates a credit sale with debt through the API flow`): este test asume que `POST /api/sales` con `paymentType: "CREDIT"` devuelve `201`, pero la Tarea 138 bloqueó eso a propósito.
- Este caso ya está cubierto, pasando, en `sale-data-access.integration.test.ts > rejects CREDIT paymentType (only CASH accepted)` — eliminar el test viejo de `route.integration.test.ts` en vez de reescribirlo, para no duplicar cobertura.
- Confirmar con `npm test` que la suite queda sin esa falla roja y sin bajar el conteo total de tests de forma inesperada.

## ÍTEM 7 — 🟡 `/api/debts` y `/api/debt-payments` sin sección de RolePermission

**Decisión de Diego: sección `customers` para ambos endpoints.**

- En `src/app/api/debts/route.ts` (`POST`) y `src/app/api/debt-payments/route.ts` (`POST`), agregar el parámetro de sección a la llamada existente de `requireRole(...)` para que quede `requireRole([...], "customers")`, con el mismo array de roles que ya tienen hoy (no cambiar el array, solo agregar la sección).
- Confirmar que esto no reintroduce el problema documentado en QA-FIX-02 (que restringir `customers` no debía afectar el flujo de `/debts` sin que esa página esté gobernada por ningún permiso) — si `/debts` no tiene su propio ítem de nav, documentarlo como aceptado (Diego ya lo decidió así), no como bug nuevo.

## ÍTEM 8 — 🟢 Panel de pago siempre muestra "Límite de crédito: —"

- En `src/app/ui/customer-payment-form.tsx:287`, reemplazar `const creditLimit = null;` por el `creditLimit` real del cliente (mismo patrón ya usado correctamente en `debts-list.tsx:960-961`).
- Confirmar que el componente ya recibe el objeto `customer` completo como prop; si no, agregar el campo necesario sin cambiar la firma de forma que rompa otros llamadores.

---

## FUERA DE ALCANCE DE ESTA ORDEN

El hallazgo 🟢 "Gastos recurrentes y presupuestos de gasto siguen sin pantalla de gestión" **no** se incluye en este lote — ya está documentado en `QA_REPORTE.md` como aceptado fuera de alcance (Tareas 130/128), no es un bug. Si Diego lo quiere para un ciclo futuro, se arma como tarea de feature aparte, no como fix de QA.

---

## RESTRICCIONES ESTRICTAS

1. No tocar ningún endpoint, componente o script que no esté explícitamente listado en los 8 ítems de arriba.
2. No ejecutar `seed-icase.mjs` ni `reset-users.mjs` como parte de esta tarea (ítem 2) — solo corregir el código.
3. No borrar ni modificar `TAREAS/QA_REPORTE.md` — el Ingeniero Líder lo actualiza después de revisar este reporte.
4. Si alguno de los 8 ítems ya no aplica porque el código cambió desde que se escribió (números de línea desactualizados, función renombrada), documentarlo en el entregable como "N/A — ya no aplica" con la razón, y seguir con el resto. No inventar una solución para algo que ya no existe.
5. Commit solo si `npm run typecheck` pasa sin errores.

## ARCHIVOS AFECTADOS (esperados)

- `src/app/api/cash-movements/route.ts`, `src/app/api/settings/route.ts` (ítem 1 + tests)
- `scripts/seed-icase.mjs`, `scripts/reset-users.mjs` (ítem 2)
- `src/app/ui/customers-list.tsx` (ítem 3)
- `src/app/api/cron/remind-expiring-quotes/route.ts` (ítem 4)
- `src/app/ui/settings.tsx` (ítem 5)
- `src/app/api/sales/route.integration.test.ts` (ítem 6, elimina un test)
- `src/app/api/debts/route.ts`, `src/app/api/debt-payments/route.ts` (ítem 7)
- `src/app/ui/customer-payment-form.tsx` (ítem 8)

---

## PROTOCOLO DE REPORTE

Al terminar (todos los ítems que apliquen, no hace falta esperar a que los 8 estén perfectos si alguno queda documentado como N/A):

1. `npm run typecheck` sin errores → recién ahí `git add -A && git commit -m "QA-FIX-03: cierre de hallazgos abiertos del ciclo de QA" && git push origin main`.
2. Agregar al final de `TAREAS/REPORTE_DE_CAMBIOS.md` un reporte detallado: por cada ítem (1-8), qué se cambió, archivos tocados, y resultado de tests relevantes. Si algún ítem quedó N/A, decirlo explícitamente con la razón.
3. Agregar también una entrada corta (2-4 líneas) a `TAREAS/REPORTELIDER.md`, arriba de todo (formato `### 2026-07-16 — QA-FIX-03: [resumen del alcance]` + 2-4 líneas), resumiendo qué se cerró de los 8 ítems.
4. Entregable en el chat: breve — lista de los 8 ítems con ✅/N/A, archivos modificados, resultado de `npm run typecheck` y `npm test`, hash del commit.
