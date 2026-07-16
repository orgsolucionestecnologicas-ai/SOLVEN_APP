# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → Claude marca en Notion + borra este archivo.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

---

QA-FIX-01 y QA-FIX-02 revisados, incorporados a `TAREAS/QA_REPORTE.md` y archivados por el Ingeniero Líder — 2026-07-16.

---

## QA-FIX-03 — Cierre del ciclo de QA (hallazgos 🟠/🟡/🟢 restantes) — 2026-07-16

Los 8 ítems del lote se resolvieron sin N/A. `npm run typecheck` (0 errores), `npm run lint` (0 errores) y `npm test` (228 passed, 2 skipped preexistentes no relacionados, 0 fallas) corridos una vez al final, sin regresiones.

### Ítem 1 — SUPERVISOR podía leer Caja y Ajustes por API directa
- `src/app/api/cash-movements/route.ts`: `GET` pasó de `requireTenantId()` a `requireRole(["OWNER","CASHIER"], "cashMovements")` — mismo array que ya usaba el `POST`.
- `src/app/api/settings/route.ts`: `GET` pasó de `requireTenantId()` a `requireRole(["OWNER"], "settings")` — mismo array que ya usaba el `PATCH`.
- Tests nuevos: `src/app/api/cash-movements/route.test.ts` (caso "returns 403 when the role is not authorized to list cash movements") y `src/app/api/settings/route.test.ts` (archivo nuevo, cubre `GET`/`PATCH` felices + 403 + validación + error 500), siguiendo el patrón `mockedRequireRole.mockRejectedValueOnce(new ForbiddenError())` ya usado en `services/route.test.ts`.
- **Hallazgo durante la verificación de `app-shell.tsx`**: el supuesto del ítem ("no debería haber ningún componente que llame estos endpoints con ese rol") no se cumple del todo. `CashRegisterIndicator` (`src/app/ui/app-shell.tsx:359-403`) se renderiza en el sidebar para **todos los roles sin distinción** (no está gateado por rol) y llama a `GET /api/cash-movements` para calcular el saldo de caja mostrado ahí. Con la restricción nueva, `SUPERVISOR`, `INVENTORY` y `READONLY` reciben `403` en esa llamada; el componente no crashea (el `fetch` no lanza en 403, y el `.catch` solo cubre errores de red), pero el saldo que muestra para esos tres roles queda **incorrecto** (cae al monto de apertura de caja, sin sumar/restar movimientos) en vez de mostrar el saldo real. No estaba en el alcance de los 8 ítems corregir `app-shell.tsx`, así que se deja documentado para que Diego decida: (a) ocultar `CashRegisterIndicator` para esos roles, o (b) exponer un endpoint de solo-saldo sin restricción de rol.

### Ítem 2 — `seed-icase.mjs` y `reset-users.mjs` podían borrar el tenant equivocado
- `scripts/seed-icase.mjs` y `scripts/reset-users.mjs`: reemplazado `prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } })` por `prisma.tenant.findUnique({ where: { id: SEED_TENANT_ID } })`, con `SEED_TENANT_ID = process.env.SEED_TENANT_ID || "seed_tenant_demo"` (mismo id que ya usa `prisma/seed.ts`). No se ejecutaron los scripts (restricción explícita del ítem) — validado solo por lectura de código.

### Ítem 3 — Columna Email y buscador de Clientes usaban valores sintéticos
- `src/app/ui/customers-list.tsx`: la celda de la tabla ahora muestra `customer.email ?? "Sin email"` en vez de `getCustomerEmail(customer.name)`. El buscador ahora compara `c.phone`/`c.email` reales además de `c.name`/`c.taxId`. Las funciones sintéticas `getCustomerEmail`/`getCustomerPhone` se eliminaron (confirmado por grep que no se usaban en ningún otro lugar).

### Ítem 4 — Recordatorio de cotización por vencer usaba la plantilla equivocada
- `src/app/api/cron/remind-expiring-quotes/route.ts`: reemplazado `sendQuoteEmail(quote.customerEmail, quote, quote.items, businessName)` por `sendQuoteExpiringReminderEmail(quote.customerEmail, quote, businessName)` (firma de 3 parámetros, ya existente en `src/lib/email.ts:241`). No se tocó la función de email, solo el call site.

### Ítem 5 — "Subir logo" en Ajustes era decorativo
- `src/app/ui/settings.tsx`: `RightSidebar.handleFileChange` ahora valida tipo de imagen y tamaño (2 MB máx.), convierte a base64 con `FileReader.readAsDataURL` y persiste al instante vía `PATCH /api/settings` (mismo patrón que `FacturacionARCASection.handleToggle`), siguiendo la validación ya usada en `ProductImageDropzone`.
- `logoUrl` se levantó como estado único en `Settings()` (con su propio `useEffect` de carga inicial vía `GET /api/settings`) y se pasa como prop (`logoUrl`/`onLogoUrlChange`) tanto a `RightSidebar` como a `DocumentosSection`, eliminando la doble fuente de verdad que tenía antes (cada uno con su propio `logoUrl` local). El input de texto "URL del logo" en `DocumentosSection` ahora escribe al mismo estado compartido. Se aplicó el patrón `useRef` ya usado en `GeneralSection` (`onLogoUrlChangeRef`) para llamar al callback del prop dentro del `useEffect([])` de `DocumentosSection` sin violar `react-hooks/exhaustive-deps`.

### Ítem 6 — Test de venta a crédito desactualizado tras la Tarea 138
- `src/app/api/sales/route.integration.test.ts`: eliminado el test `creates a credit sale with debt through the API flow` (asumía `201` para `paymentType: "CREDIT"`, bloqueado a propósito desde la Tarea 138) y su helper huérfano `createIntegrationCustomer`. La cobertura equivalente ya existe y pasa en `src/modules/sales/sale-data-access.integration.test.ts` (`rejects CREDIT paymentType (only CASH accepted)`).

### Ítem 7 — `/api/debts` y `/api/debt-payments` sin sección de RolePermission
- `src/app/api/debts/route.ts` y `src/app/api/debt-payments/route.ts`: se agregó `"customers"` como segundo parámetro al `requireRole([...])` existente en el `POST` de ambos, sin tocar los arrays de roles. `/debts` sigue sin ítem de nav propio — es la decisión ya tomada por Diego (no un bug nuevo), documentada también en el hallazgo 🟡 correspondiente de `QA_REPORTE.md`.

### Ítem 8 — Panel de pago mostraba siempre "Límite de crédito: —"
- `src/app/ui/customer-payment-form.tsx`: se agregó `creditLimit?: string | null` a `CustomerRecord` y se reemplazó `const creditLimit = null;` por `customer.creditLimit != null ? Number(customer.creditLimit) : null`, siguiendo el mismo patrón que `debts-list.tsx:960-961`.

