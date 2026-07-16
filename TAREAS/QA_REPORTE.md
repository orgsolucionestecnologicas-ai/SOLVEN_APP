# QA REPORTE — SOLVEN

> Seguir el protocolo de `QA_TESTING.md` sección 7. Un hallazgo por bloque, del más reciente al más antiguo. No borrar este archivo al terminar — se actualiza en cada ciclo de QA.

> 🔴 **ALERTA CRÍTICA #1 — leer antes que el resto del reporte:** varios endpoints de escritura (`POST /api/debts`, `PUT`/`DELETE /api/customers/[id]`, `POST`/`DELETE /api/categories*`, `POST /api/services`, `POST /api/recurring-expenses`) **no verifican rol en absoluto** — solo exigen sesión válida (`requireTenantId()`), sin `requireRole()`. Confirmado en vivo: un usuario con rol `READONLY` pudo crear una deuda real de $1 contra un cliente real, editar los datos de ese cliente, y crear una categoría y un servicio. Ver hallazgo completo más abajo en HALLAZGOS.
>
> 🔴 **ALERTA CRÍTICA #2:** el sistema de permisos configurables (`RolePermission`, pantalla Ajustes → Usuarios → Permisos) **no tiene ningún efecto real en el backend** — solo oculta/muestra ítems de menú. Cualquier restricción que un `OWNER` configure ahí puede saltearse llamando la API directamente, porque `requireRole()` nunca la consulta. Ver hallazgo completo más abajo en HALLAZGOS.

---

## RESPUESTA A LAS DOS PREGUNTAS DE DIEGO (previas a este ciclo)

1. **¿Se corrió `npx prisma migrate deploy` en producción?** No verificable desde este entorno (sin acceso a `DATABASE_URL` de producción, y prohibido leer `.env.production.example`). La base de **desarrollo** (Neon `ep-nameless-grass-...`) tiene las 56 migraciones aplicadas al 100%, incluidas las 19 de Tareas 121–158. Todo este ciclo corrió contra la base de desarrollo, no producción.
2. **¿Está `CRON_SECRET` seteada en Vercel?** No verificable desde este entorno (el conector MCP de Vercel disponible no expone variables de entorno; la CLI local de `vercel` no está autenticada). A nivel de código sí se confirmó el bug: los tres endpoints de cron solo exigen `Authorization` **si `CRON_SECRET` está seteada**; si está ausente/vacía, quedan sin autenticación (ver hallazgo 🔴 abajo). No se probó en vivo contra producción a propósito — si el bug existe, el mismo request que lo "confirma" ejecutaría la mutación real. Diego debe confirmar directo en el dashboard de Vercel.

---

## PRE-VUELO

### 1. Migraciones pendientes
- `npx prisma migrate status` contra la base de desarrollo → **56/56 aplicadas, ninguna pendiente.**
- `ls prisma/migrations/` confirma las 19 migraciones nombradas en el plan, de `20260713133054_add_cash_movement_note` a `20260715125920_add_product_image_url`.
- Producción: no verificable desde este entorno. Pendiente que Diego confirme/corra `migrate deploy`.

### 2. Variables de entorno (verificación de presencia, nunca de valor)

| Variable | `.env` | `.env.local` |
|---|---|---|
| `DATABASE_URL` | ✅ seteada | — |
| `RESEND_API_KEY` | ⚠️ presente, **vacía** | — |
| `REBILL_WEBHOOK_SECRET` | ⚠️ presente, **vacía** | — |
| `CRON_SECRET` | ❌ ausente | ❌ ausente |
| `ANTHROPIC_API_KEY` | — | ⚠️ presente, **vacía** |
| `ARCA_CERT_ENCRYPTION_KEY` | — | ⚠️ presente, **vacía** |
| `ARCA_ENVIRONMENT` | — | ⚠️ presente, **vacía** |
| `NEXT_PUBLIC_APP_URL` | ❌ ausente | ❌ ausente |

Consecuencias para lo que se puede probar en este entorno: sin `RESEND_API_KEY` real, ningún email sale de verdad (se puede probar que falla en silencio, no que llega). Sin `CRON_SECRET`, se reproduce en local el bug de la sección 5.3. Sin `ANTHROPIC_API_KEY`, NOA no puede probarse end-to-end. Sin `ARCA_*`, no hay emisión real contra AFIP.

### 3. Suite automatizada como línea de base
Ver "FASE 1" más abajo.

### 4. Datos de prueba
La base de desarrollo tiene **2 tenants**:

| Tenant | id | email | plan | creado | usuarios | productos | ventas | clientes |
|---|---|---|---|---|---|---|---|---|
| Tienda Mia | `cmpvlxaom00003hxx7yeykzfk` | dgamagrajales@icloud.com | trial | 2026-06-01 | 1 | 1 | 17 | 1 |
| Comercio Demo | `seed_tenant_demo` | demo@solven.app | trial | 2026-06-03 | 0 | 313 | 0 | 0 |

El único usuario con login existente es **`demo@solven.app` (rol `OWNER`)**, y pertenece al tenant **"Tienda Mia"** (no a `seed_tenant_demo`, pese al nombre del email). **Este es el tenant usado para todo el resto de este ciclo de QA**: tiene datos orgánicos reales de los 158 tareas (17 ventas, 1 producto, 1 cliente).

No se conoce la contraseña de `demo@solven.app` (correctamente inaccesible). Para pruebas de API que requieren sesión, se generaron tokens de sesión **legítimos** con la función real `createSession()` de `src/lib/auth.ts` (firmados con el `SOLVEN_SESSION_SECRET` real del entorno, apuntando al `userId`/`tenantId` reales de `demo@solven.app`), sin exponer ni necesitar la contraseña y sin modificar ningún dato.

**No se ejecutó `seed-icase.mjs` ni `reset-users.mjs`** — ver hallazgo 🟠 "seed-icase apunta al tenant equivocado" más abajo: ambos scripts eligen el tenant "más antiguo por fecha de creación", que hoy es Tienda Mia (el único con login funcional y datos orgánicos), no `seed_tenant_demo`. Correrlos habría borrado datos de prueba reales en vez de resetear el catálogo demo.

**Metodología Fase 2/3:** no hay herramienta de automatización de navegador en este entorno. El QA manual combina inspección de código + pruebas a nivel de API (`curl`/PowerShell contra `npm run dev` local, con los tokens de sesión descritos arriba) + consultas de solo lectura a la base de datos. Se marca explícitamente cuándo algo no se pudo verificar "como usuario real en el navegador".

---

## FASE 1 — Suite automatizada existente

1. **`npm run typecheck`** → ✅ 0 errores.
2. **`npm test` (Vitest), corrido dos veces seguidas:**

| Corrida | Test files | Tests |
|---|---|---|
| 1 | 38 passed / 1 failed / 2 skipped (41) | 208 passed / 1 failed / 2 skipped (211) |
| 2 | 38 passed / 1 failed / 2 skipped (41) | 208 passed / 1 failed / 2 skipped (211) |

Falla consistente (no es timing) en ambas corridas:

`src/app/api/sales/route.integration.test.ts > sales API database integration > creates a credit sale with debt through the API flow`
```
TypeError: Cannot read properties of undefined (reading 'totalAmount')
  at route.integration.test.ts:101
```

**Causa raíz identificada** (no es bug de producto — es un test desactualizado): el test hace `POST /api/sales` con `paymentType: "CREDIT"` esperando `201`. Pero `sale-validation.ts:68-70` rechaza cualquier `paymentType` distinto de `CASH` (comentario en línea 7: *"CREDIT/MIXED solo para registros históricos en BD"*), consistente con el test hermano `sale-data-access.integration.test.ts > rejects CREDIT paymentType (only CASH accepted)` — este es el cambio de la Tarea 138 (venta a crédito bloqueada a nivel de validación, confirmando lo que pedía verificar la sección 3.3). El endpoint hoy devuelve error, no 201, por lo que `responseBody.data` es `undefined` y el test explota con `TypeError` en vez de fallar limpio. Se confirmó además que `pos.tsx` nunca envía `paymentType` distinto de `CASH` — el frontend está bien, solo el test quedó viejo.

El segundo test "conocido" del plan (`debt-payment-data-access.integration.test.ts > prevents concurrent payments from overpaying a debt`) **pasó en ambas corridas** — no reprodujo en este ciclo. No hay regresiones nuevas.

---

## FASE 3.1 / 4.1 — Aislamiento multi-tenant

**Esto es lo más crítico de todo el plan según el propio documento — se probó primero y a fondo.** Metodología: dos tokens de sesión legítimos minteados con `createSession()`, uno para Tienda Mia (`cmpvlxaom00003hxx7yeykzfk`, datos orgánicos reales) y otro para `seed_tenant_demo` (313 productos, sin ventas/clientes), contra el servidor local.

| Prueba | Resultado |
|---|---|
| `GET /api/customers` con token del tenant demo (0 clientes propios) | ✅ Lista vacía — no filtra los clientes de Tienda Mia |
| `GET /api/products/[id]` con id de un producto del tenant demo, token de Tienda Mia | ✅ `404` — no lee productos de otro tenant por id |
| `PUT /api/customers/[id]` con id de un cliente real de Tienda Mia, token del tenant demo, payload idempotente | ✅ `404 "Cliente no encontrado"` — confirma que `updateCustomer` filtra por `{ id, tenantId }` (`customer-data-access.ts`) |
| `PUT /api/products/[id]` con id de un producto real de Tienda Mia, token del tenant demo, payload idempotente | ✅ `404 "Producto no encontrado"` — mismo patrón `{ id, tenantId }` |
| `GET /api/products?limit=1` — comparación de `pagination.total` entre tenants | ✅ Tienda Mia → `total: 1`; tenant demo → `total: 313` — no hay fuga de conteo entre tenants |
| `PATCH /api/debts/[id]/write-off` cross-tenant | No probado en vivo (mutación real e irreversible sobre datos reales) — confirmado solo por lectura de código: `writeOffDebt` usa `prisma.debt.update({ where: { id, tenantId } })`, mismo patrón seguro que las pruebas de arriba |

**Conclusión de aislamiento:** no se encontró ninguna fuga de datos entre tenants en los endpoints probados — todos los que fueron testeados en vivo, y los inspeccionados por código con el mismo patrón `where: { id, tenantId }`, filtran correctamente. Esto es una buena noticia dado que es el riesgo más grave que el plan pedía descartar primero.

## FASE 3.1 / 4.2 — Matriz de permisos por rol

Se construyó comparando (a) qué esconde `app-shell.tsx` por rol (`hiddenForRoles`, solo dos casos: `cashMovements` y `settings` ocultos para `SUPERVISOR`), contra (b) qué exige realmente cada endpoint de escritura vía `requireRole(...)` (barrido completo de `src/app/api/**`), contra (c) pruebas en vivo con tokens de rol `SUPERVISOR` y `READONLY`.

| Recurso | Alta permitida a | Edición/baja permitida a | Nav oculta para |
|---|---|---|---|
| Ventas (`/api/sales`) | OWNER, CASHIER | — | — |
| Clientes (`/api/customers`) | OWNER, CASHIER, SUPERVISOR | **nadie exigido** (🔴 ver hallazgo) | — |
| Deudas (`/api/debts`) | **nadie exigido** (🔴 ver hallazgo) | write-off: OWNER · pagos: OWNER, CASHIER, SUPERVISOR | — |
| Productos (`/api/products`) | OWNER, INVENTORY | OWNER, INVENTORY | — |
| Categorías (`/api/categories`) | **nadie exigido** (🔴 ver hallazgo) | **nadie exigido** (🔴 ver hallazgo) | — |
| Servicios (`/api/services`) | **nadie exigido** (🔴 ver hallazgo) | OWNER, INVENTORY | — |
| Caja (`/api/cash-movements`) | OWNER, CASHIER | — | SUPERVISOR |
| Ajustes (`/api/settings`) | — | OWNER | SUPERVISOR |
| Cotizaciones (`/api/quotes`) | OWNER, CASHIER | OWNER, CASHIER | — |
| Promociones (`/api/promotions`) | OWNER | OWNER | — |
| Auditoría (`/api/audit-logs`) | — (solo lectura) | OWNER (lectura) | — |
| Usuarios (`/api/users`) | OWNER, CASHIER (alta) | OWNER (edición/baja) | — |

**Confirmado en vivo — nav oculta pero API accesible (lectura):** un token `SUPERVISOR` contra `GET /api/cash-movements` y `GET /api/settings` (ambos ocultos del menú para ese rol) devolvió `200` con datos reales en los dos casos; los intentos de escritura (`POST /api/cash-movements`, `PATCH /api/settings`) sí devolvieron `403` correctamente. Es decir: `SUPERVISOR` no puede escribir en Caja/Ajustes (bien), pero sí puede leer todo el historial de caja y la configuración del negocio por API directa aunque la UI le oculte el acceso — ver hallazgo 🟠 abajo.

**READONLY:** no aparece en ningún array de `requireRole([...])` del proyecto — por diseño, nunca puede pasar la verificación de rol donde esa verificación existe. El problema no es READONLY en sí, es que 9 endpoints (ver hallazgo 🔴 arriba) no tienen ninguna verificación de rol que aplicarle.

---

## HALLAZGOS

### [🔴 Crítico] Varios endpoints de escritura no verifican rol — READONLY puede crear deudas, editar/borrar clientes, crear categorías y servicios
- Módulo: Deudas / Clientes / Productos (categorías) / Servicios / Gastos recurrentes — transversal a Fase 3.1 y 4.2 del plan.
- Dónde: `src/app/api/debts/route.ts` (`POST`), `src/app/api/customers/[id]/route.ts` (`PUT` y `DELETE`), `src/app/api/categories/route.ts` (`POST`), `src/app/api/categories/[id]/route.ts` (`DELETE`), `src/app/api/categories/[id]/subcategories/route.ts` (`POST`), `src/app/api/categories/[id]/subcategories/[subId]/route.ts` (`DELETE`), `src/app/api/services/route.ts` (`POST`), `src/app/api/recurring-expenses/route.ts` (`POST`).
- Qué pasó: se hizo un barrido de todos los `route.ts` bajo `src/app/api/**` que exportan `POST`/`PATCH`/`PUT`/`DELETE`, buscando cuáles **no** llaman a `requireRole(...)` en absoluto (solo `requireTenantId()`, que únicamente exige sesión válida, sin mirar el rol). Aparecieron 9 handlers de escritura reales (fuera de rutas públicas esperadas como `/api/auth/*`, `/api/onboarding/complete`, `/api/webhooks/rebill`, `/api/noa`, que correctamente no llevan `requireRole`). Se confirmó **en vivo** contra el tenant real (Tienda Mia) con un token de sesión legítimo de rol `READONLY` (el rol pensado para "solo lectura"):
  - `POST /api/debts` → `201`, se creó una deuda real de `$1` contra el cliente real "Diego Gama" (`cmqia69ic0006nlwtewteiu3b`). Se limpió después vía script directo a la base (no hay endpoint `DELETE /api/debts/[id]`, solo `write-off`, que además es `OWNER`-only).
  - `PUT /api/customers/[id]` → `200`, editó exitosamente el registro del mismo cliente real (payload idempotente usado a propósito para no alterar datos reales).
  - `POST /api/categories` → `201`, creó una categoría real (`QA-readonly-category-test`, borrada después con token `OWNER`).
  - `POST /api/services` → `201`, creó un servicio real (`QA-readonly-service-test`, desactivado después con token `OWNER` — no existe `DELETE` para servicios, solo `PUT`/`PATCH`).
  - `DELETE /api/customers/[id]` y las rutas de subcategorías/recurring-expenses se confirmaron solo por lectura de código (mismo patrón exacto: `requireTenantId()` sin `requireRole()`), no se ejecutaron en vivo por ser irreversibles o por requerir más setup, para no arriesgar datos reales.
  - Se notó además una inconsistencia por recurso: `POST /api/customers` (alta) sí exige `["OWNER","CASHIER","SUPERVISOR"]`, pero `PUT`/`DELETE /api/customers/[id]` (edición/baja del mismo recurso) no exigen nada. Mismo patrón en Servicios (alta sin rol, pero `PUT`/`PATCH /api/services/[id]` si exigen `["OWNER","INVENTORY"]`) y en Deudas (alta sin rol, pero `write-off` exige `OWNER` y `debt-payments` exige `["OWNER","CASHIER","SUPERVISOR"]`). Todo indica que la protección se agregó ruta por ruta y se salteó por descuido en estos 9 casos, no que sea una decisión de diseño.
- Qué se esperaría: que los 9 handlers listados agreguen la misma verificación `requireRole([...])` que ya usan sus rutas hermanas del mismo recurso (ej. igualar `PUT`/`DELETE /api/customers/[id]` a `["OWNER","CASHIER","SUPERVISOR"]` como `POST /api/customers`), de forma que un rol `READONLY` no pueda escribir nada en ningún caso.
- Rol/tenant usado para probar: token de sesión legítimo minteado con `createSession()` para `demo@solven.app` (tenant Tienda Mia, `cmpvlxaom00003hxx7yeykzfk`) con `role: "READONLY"` forzado en el payload — mismo mecanismo ya usado y documentado para el resto del ciclo, sin contraseña ni mutación fuera de las descritas arriba (todas limpiadas).
- Screenshot o dato de referencia: barrido completo de `src/app/api/**/route.ts` filtrando por ausencia de `requireRole`; requests `curl` citados arriba con sus status codes reales.

### [🔴 Crítico] RolePermission (permisos configurables) no tiene ningún efecto en el backend — es 100% decorativo
- Módulo: Usuarios y permisos (Tarea 148)
- Dónde: `src/lib/tenant.ts:36-43` (`requireRole`) vs. `src/modules/role-permissions/*`, `src/app/api/role-permissions/route.ts`, `src/app/ui/role-permissions-table.tsx`, `src/app/settings/components/UsuariosPanel.tsx`.
- Qué pasó: SOLVEN tiene una pantalla real (Ajustes → Usuarios → Permisos) donde el `OWNER` puede tildar, por rol y por sección (`dashboard`, `pos`, `returns`, `products`, `customers`, `cashMovements`, `quotes`, `reports`, `promotions`, `settings`), si ese rol `canAccess` esa sección o no (`role-permission-validation.ts`). Esto se guarda en la tabla `RolePermission`. Pero `requireRole()`, la función que protege **todas** las rutas de API (`src/lib/tenant.ts`), solo recibe un array hardcodeado de roles por ruta (ej. `requireRole(["OWNER","CASHIER","SUPERVISOR"])` en `src/app/api/customers/route.ts:40`) y **nunca consulta la tabla `RolePermission`**. Se confirmó con un grep exhaustivo de `requireRole(` en `src/app/api/**`: ninguna de las ~40 rutas que la usan referencia `RolePermission`. El único lugar del código que lee `RolePermission` es `app-shell.tsx` (para decidir qué ítems del menú mostrar/ocultar). Consecuencia concreta: si un `OWNER` usa la pantalla de Permisos para **sacarle** acceso a `customers` a un `CASHIER` (algo que la UI le deja hacer y que aparenta funcionar — el ítem de menú desaparece), ese `CASHIER` sigue pudiendo leer y crear clientes llamando directamente a `POST/GET /api/customers`, porque esa ruta acepta `CASHIER` de forma incondicional. Es exactamente el escenario que la sección 4.2 del plan pide marcar como hallazgo de seguridad, no de UX: un ítem oculto en la UI pero accesible por API directa.
- Qué se esperaría: que `requireRole` (o un wrapper equivalente) consulte `RolePermission` antes de autorizar, o que como mínimo la pantalla de Permisos deje explícito que hoy solo controla la navegación visible y no el acceso real — para no generar una falsa sensación de control de acceso en el dueño del negocio.
- Rol/tenant usado para probar: inspección de código (`requireRole`, todas las rutas de `src/app/api/**`, y los tres archivos de `role-permissions`), sin necesidad de sesión — es una propiedad estática del código, reproducible en cualquier tenant/rol.
- Screenshot o dato de referencia: `src/lib/tenant.ts:36-43`; `src/app/ui/app-shell.tsx:429-434` (única lectura de `rolePermissions` en todo el árbol de `src/app`); `src/app/api/customers/route.ts:40`.

### [🟠 Alto] SUPERVISOR puede leer Caja y Ajustes por API directa aunque el menú se lo oculte
- Módulo: Usuarios y permisos / Caja / Configuración (4.2 del plan)
- Dónde: `src/app/ui/app-shell.tsx:71,75` (`hiddenForRoles: ["SUPERVISOR"]` en las secciones `cashMovements` y `settings`) vs. `src/app/api/cash-movements/route.ts` (`GET`) y `src/app/api/settings/route.ts` (`GET`), ninguno de los dos con `requireRole` — solo `requireTenantId()`.
- Qué pasó: probado en vivo con un token `SUPERVISOR` real: `GET /api/cash-movements` devolvió `200` con el historial completo de movimientos de caja (23 registros); `GET /api/settings` devolvió `200` con toda la configuración del negocio (datos fiscales, umbrales, mensajes de ticket, etc.). Los intentos de escritura (`POST /api/cash-movements`, `PATCH /api/settings`) sí devolvieron `403` correctamente, porque esos dos sí usan `requireRole(["OWNER","CASHIER"])` / `requireRole(["OWNER"])`. Es decir, el rol `SUPERVISOR` no ve "Caja" ni "Ajustes" en el menú lateral, pero si conoce (o adivina) la URL de la API puede leer ambos completos.
- Qué se esperaría: si `SUPERVISOR` no debería tener acceso a Caja/Ajustes (que es lo que sugiere ocultarlos del menú), los `GET` de ambos endpoints deberían exigir `requireRole` también; si en cambio sí es intencional que pueda consultarlos (solo no operarlos), la navegación no debería ocultarlos — hoy UI y backend cuentan historias distintas.
- Rol/tenant usado para probar: token `SUPERVISOR` minteado para Tienda Mia (`cmpvlxaom00003hxx7yeykzfk`).
- Screenshot o dato de referencia: ver tabla de matriz de permisos en "FASE 3.1 / 4.2" arriba.

### [🟠 Alto] CRON_SECRET ausente deja los 3 endpoints de cron sin autenticación — ✅ RESUELTO 2026-07-16
> Diego agregó `CRON_SECRET` en Vercel (entorno Production) vía agente de Chrome y redeployó. Vercel envía automáticamente el header `Authorization: Bearer <CRON_SECRET>` a sus propios crons, así que no hizo falta ningún cambio de código — el `if` que ya existía en los tres endpoints pasó a activarse solo. Pendiente de confirmación en la próxima corrida de los crons (3am/4am/9am) de que el header llega bien, pero el bug de configuración está cerrado.

- Módulo: Cron jobs (3.11 / 5.3 del plan)
- Dónde: `src/app/api/cron/expire-quotes/route.ts`, `src/app/api/cron/remind-expiring-quotes/route.ts`, `src/app/api/cron/generate-recurring-expenses/route.ts` — los tres con el mismo patrón: `if (cronSecret && authHeader !== \`Bearer ${cronSecret}\`) return errorResponse("Unauthorized", 401);`.
- Qué pasó: la validación solo se ejecuta **si `cronSecret` es un valor truthy**. Si `process.env.CRON_SECRET` está ausente o vacía, la condición completa es `false` y el `if` nunca corta el flujo — cualquiera puede pegarle a estos tres endpoints sin ningún header y se ejecuta la lógica real (`expireOverdueQuotes()`, envío de recordatorios, generación de gastos recurrentes). Confirmado en este entorno local: `CRON_SECRET` está ausente tanto en `.env` como en `.env.local`. No se probó en vivo contra producción por el motivo explicado al inicio del reporte (el mismo request que confirma el bug ejecutaría la mutación real).
- Qué se esperaría: que la ausencia de `CRON_SECRET` sea un error de configuración explícito (rechazar todo el tráfico, o al menos loguear una alerta), no un "modo abierto" silencioso.
- Rol/tenant usado para probar: sin sesión — son rutas públicas por diseño (cron), el problema es la falta de autenticación de servicio.
- Screenshot o dato de referencia: patrón idéntico confirmado por grep en los tres archivos citados; ver también Pre-vuelo punto 2.

### [🟡 Medio] Columna Email de la lista de clientes muestra un valor 100% inventado, y el buscador no encuentra por teléfono/email reales
- Módulo: Clientes
- Dónde: `src/app/ui/customers-list.tsx` — función `getCustomerEmail(name)` (línea 114-128, genera `nombre.apellido@email.com` a partir del *nombre*, sin relación con `customer.email`), usada en la celda de la tabla (línea 984); función `getCustomerPhone(id)` (línea 130-135, genera un teléfono determinístico a partir del *id*), usada en el filtro de búsqueda (línea 409).
- Qué pasó: se confirmó el alcance exacto pedido por la sección 5.1 del plan. Lo que **sí** se corrigió (Tareas 136/142): el link de WhatsApp usa `customer.phone` real (línea 960-970) y la exportación CSV usa `customer.phone`/`customer.email` reales (línea 207-220, `exportCustomersToCsv`). Lo que **sigue roto**: (1) la columna "Email" de la tabla muestra siempre `getCustomerEmail(customer.name)`, un email fabricado a partir del nombre — nunca el `customer.email` real, aunque exista cargado; (2) el buscador de la tabla (línea 406-413) solo compara contra `c.name`, el teléfono **sintético** `getCustomerPhone(c.id)` y `c.taxId` — nunca contra `customer.phone` ni `customer.email` reales. Un cajero que busca a un cliente por su teléfono real no lo va a encontrar salvo coincidencia de casualidad con el valor fabricado.
- Qué se esperaría: la columna Email debería mostrar `customer.email` real (con un placeholder tipo "Sin email" si no está cargado, igual que ya hace la columna de teléfono), y el buscador debería incluir `customer.phone` y `customer.email` reales además del nombre.
- Rol/tenant usado para probar: inspección de código, reproducible en cualquier tenant/rol con clientes cargados.
- Screenshot o dato de referencia: líneas citadas arriba en `customers-list.tsx`.

### [🟡 Medio] El recordatorio automático de cotizaciones por vencer usa la plantilla de email equivocada
- Módulo: Cotizaciones (3.7 / 4.5 del plan)
- Dónde: `src/app/api/cron/remind-expiring-quotes/route.ts:2,44` (importa y llama a `sendQuoteEmail`) vs. `src/lib/email.ts:241` (`sendQuoteExpiringReminderEmail`, función dedicada para este caso que existe pero nunca se importa desde ningún lugar del proyecto — confirmado por grep).
- Qué pasó: el cron de recordatorio (`3.11`) sí está conectado y sí se ejecuta (contradice el bug tal como está redactado en `CLAUDE.md` sección 5, que dice "no se llama desde ningún lugar" — la función en sí no se llama, pero el flujo de recordatorio automático sí funciona end-to-end): busca cotizaciones `DRAFT`/`SENT` que vencen en los próximos 2 días y sin `reminderSentAt`, y por cada una llama a `sendQuoteEmail(...)` (la plantilla genérica de "acá está tu cotización", la misma que se usa al enviarla manualmente por primera vez) en vez de `sendQuoteExpiringReminderEmail(...)` (la plantilla pensada específicamente para avisar que está por vencer). El cliente sí recibe un email, pero con el copy equivocado — no dice "tu cotización vence en 2 días", repite el envío original.
- Qué se esperaría: que el cron llame a `sendQuoteExpiringReminderEmail` en vez de `sendQuoteEmail`, para que el mensaje comunique urgencia de vencimiento y no se lea como un reenvío de la cotización original.
- Rol/tenant usado para probar: inspección de código — no se pudo probar el envío real porque `RESEND_API_KEY` está vacía en este entorno (ver Pre-vuelo punto 2).
- Screenshot o dato de referencia: `remind-expiring-quotes/route.ts:44`; `email.ts:122` (`sendQuoteEmail`) y `email.ts:241` (`sendQuoteExpiringReminderEmail`).

### [🟡 Medio] El "Subir logo" de Ajustes → Negocio es 100% decorativo — nunca persiste, solo muestra una preview local
- Módulo: Configuración (3.14 del plan — el propio plan pedía confirmar si este bug conocido seguía o ya se había corregido)
- Dónde: `src/app/ui/settings.tsx` — componente `RightSidebar`, función `handleFileChange` (línea 1262-1267): `const url = URL.createObjectURL(file); setLogoPreview(url);` y nada más, sin `fetch`/`FormData`/llamada a ninguna API.
- Qué pasó: sigue exactamente igual que como se documentó antes de este ciclo — el dueño de negocio puede arrastrar/seleccionar una imagen en "Logo del negocio" (sidebar derecho de Ajustes), ve una preview inmediata, y todo parece funcionar. Pero `URL.createObjectURL` genera una URL local del navegador (`blob:...`) que nunca se sube a ningún lado ni se guarda en `StoreSettings.logoUrl` — al refrescar la página el logo "subido" desaparece sin ningún aviso. El único mecanismo que sí persiste de verdad es un campo de texto separado, "URL del logo" (línea 575-582), donde hay que pegar manualmente una URL ya alojada en otro lado. Las dos UI conviven en la misma pantalla y no están conectadas entre sí.
- Qué se esperaría: que "Subir logo" realmente suba el archivo (ej. a base64 en el mismo `StoreSettings.logoUrl`, siguiendo el patrón ya usado para imágenes de producto/comprobantes de gasto) y complete el campo "URL del logo" automáticamente, o que se elimine la UI de upload si el flujo real es pegar una URL.
- Rol/tenant usado para probar: inspección de código, reproducible en cualquier tenant con rol `OWNER` (único rol con acceso de escritura a Ajustes).
- Screenshot o dato de referencia: `settings.tsx:1260-1305` (upload decorativo) vs. `settings.tsx:502-582` (campo de texto que sí persiste, confirmado porque `logoUrl` viaja en el payload de `PATCH /api/settings`, línea 543).

### [🟢 Bajo] Gastos recurrentes y presupuestos de gasto siguen sin pantalla de gestión (confirmado, ya documentado como fuera de alcance)
- Módulo: Gastos
- Dónde: `src/app/ui/expenses-list.tsx:859-1002` (checkbox "Es un gasto recurrente" que solo hace `POST /api/recurring-expenses`, sin lista/edición/baja); `src/app/api/expense-budgets/route.ts` (solo `GET` y `POST`/upsert, sin `DELETE`).
- Qué pasó: se confirma que ambos puntos de la sección 5.5 del plan siguen igual que cuando se documentaron (Tareas 130 y 128 respectivamente) — no hay regresión nueva, es el mismo alcance reducido ya conocido. No se investigó más profundo por ser un punto ya aceptado como fuera de alcance; queda a criterio de Diego si se agrega en el próximo ciclo.
- Qué se esperaría: pantalla para ver/editar/desactivar gastos recurrentes ya creados, y opción de eliminar presupuestos de gasto por categoría — si el negocio lo necesita.
- Rol/tenant usado para probar: inspección de código.
- Screenshot o dato de referencia: rutas citadas arriba.

### [🟠 Alto] seed-icase.mjs y reset-users.mjs pueden borrar el tenant equivocado
- Módulo: Infraestructura de datos de prueba / scripts
- Dónde: `scripts/seed-icase.mjs` (~línea 118) y `scripts/reset-users.mjs` (~línea 24), ambos con `prisma.tenant.findFirst({ orderBy: { createdAt: "asc" } })`.
- Qué pasó: la selección del "tenant de prueba" es simplemente el tenant más antiguo de toda la base, sin filtro por nombre/slug/flag. Hoy ese tenant es "Tienda Mia" (creado 2026-06-01), el único con login funcional (`demo@solven.app`) y 17 ventas orgánicas. El tenant que parece pensado como demo (`seed_tenant_demo`, con 313 productos del catálogo Icase) se creó dos días después, así que nunca sería el elegido por esta lógica. Correr `npm run seed:icase` o `npm run reset:users` borraría/resetearía datos reales de prueba acumulados en Tienda Mia en vez de tocar el tenant demo, y `reset-users.mjs` además reemplazaría el único login conocido por `admin@solvenrs.com`.
- Qué se esperaría: que los scripts identifiquen el tenant objetivo de forma explícita (id fijo, `businessName`/`email` conocido, o variable de entorno), no "el más viejo por fecha".
- Rol/tenant usado para probar: lectura directa vía Prisma (no se ejecutaron los scripts, para no gatillar el problema).
- Screenshot o dato de referencia: tabla de tenants en Pre-vuelo, punto 4.

### [🟡 Medio] Test de venta a crédito desactualizado tras la Tarea 138
- Módulo: Ventas / Tests
- Dónde: `src/app/api/sales/route.integration.test.ts:84-116` (`creates a credit sale with debt through the API flow`).
- Qué pasó: el test asume que `POST /api/sales` acepta `paymentType: "CREDIT"` y devuelve 201 — comportamiento removido a propósito por la Tarea 138. Falla con un `TypeError` poco claro en vez de una falla explícita, y ensucia la baseline de tests fallidos del proyecto.
- Qué se esperaría: reescribir el test para reflejar el flujo actual (crédito ya no se crea vía `POST /api/sales`, se modela por el módulo de Deudas), o eliminarlo por quedar duplicado con `sale-data-access.integration.test.ts > rejects CREDIT paymentType (only CASH accepted)`.
- Rol/tenant usado para probar: N/A — test automatizado, corrido dos veces vía `npm test`.
- Screenshot o dato de referencia: stack trace en Fase 1 arriba.

### [🟢 Bajo] El panel de registro de pago muestra "Límite de crédito: —" siempre, aunque el cliente tenga uno cargado
- Módulo: Clientes / Deudas
- Dónde: `src/app/ui/customer-payment-form.tsx:287` — `const creditLimit = null; // Sin límite definido hasta implementar por cliente`.
- Qué pasó: el campo `creditLimit` de `Customer` existe en el schema, es editable desde `customer-detail.tsx`, y sí se usa correctamente en el formulario de alta de deuda (`debts-list.tsx:960-961`, con advertencia — no bloqueo — al superarlo, comportamiento correcto según el criterio de negocio). Pero el formulario de registro de pago (`customer-payment-form.tsx`) tiene el valor hardcodeado a `null` con un comentario que confirma que quedó sin conectar, así que el sidebar de ese formulario siempre muestra "Límite de crédito: —" en vez del valor real del cliente, incluso cuando sí tiene uno cargado.
- Qué se esperaría: que `customer-payment-form.tsx` reciba y muestre el `creditLimit` real del cliente, igual que ya hace `debts-list.tsx`.
- Rol/tenant usado para probar: inspección de código.
- Screenshot o dato de referencia: línea citada arriba.

---

## FASE 2 y FASE 3 (4.3 – 4.5) — Verificaciones puntuales adicionales

Sin herramienta de navegador, el resto de Fase 2 se cubrió con inspección de código dirigida a los puntos que el propio plan marca como inciertos (no un click-through completo de los 16 módulos). Resultado — **confirmado que funciona como se espera** (sin hallazgo nuevo):

- **3.3 POS/Ventas — historial de ventas:** se confirmó que exportación CSV, folio copiable (`CopyFolioButton`), columna de ganancia bruta, reenvío por WhatsApp y por email, y filtros por fecha/vendedor/método de pago **sí existen en el código actual** (`sales-list.tsx`) — las tareas "[DUP]" archivadas no perdieron funcionalidad real, la preocupación explícita del punto 3.3 del plan queda descartada.
- **3.5 Clientes — notas internas:** `internalNotes` solo aparece en `customer-detail.tsx` (pantalla interna) y en la capa de validación — no aparece en ningún generador de PDF/ticket/email del proyecto. Confirmado que nunca se filtran a documentos externos.
- **3.5 Clientes — segmento:** `computeSegment()` en `customers-list.tsx:137-144` respeta el campo `customer.segment` de BD cuando está seteado explícitamente (`VIP`/`RECURRENTE`/`NUEVO`) y solo cae al cálculo automático por compras cuando el campo es `NINGUNO`/vacío — comportamiento correcto según la Tarea 151.
- **3.6 Deudas — límite de crédito:** confirmado que superar el límite en el alta de deuda es una advertencia (`window.confirm`) y no un bloqueo — diseño intencional, no bug. (Ver sí hallazgo 🟢 arriba sobre el sidebar de pago que no muestra el límite real.)
- **3.15 ARCA:** `Sale.cae` confirmado `String?` (nullable) en `prisma/schema.prisma:193` — la arquitectura opt-in por venta está intacta a nivel de schema.
- **3.16 Promociones:** endpoint `GET /api/promotions/expiring` existe y está conectado a un filtro "solo por vencer" en la UI (`promotions.tsx`) — la notificación de vencimiento próximo (2 días) sí está implementada como filtro in-app.
- **3.9 Gastos recurrentes (cron):** `generate-recurring-expenses` cron delega correctamente a `generateDueRecurringExpenses()` del módulo — conectado, no es un cron vacío.

### 4.3 Integridad de datos y cálculos financieros
- **IVA:** confirmado el bug ya trackeado en `CLAUDE.md` sección 5 sigue presente — `sale-data-access.ts:389` tiene `ivaRate: 0.21` hardcodeado para líneas de servicio (no se agrega hallazgo nuevo, es un bug conocido y ya priorizado como P2 en el propio `CLAUDE.md`).
- **Descuento a $0, diferencia de caja, presupuesto excedido:** no se pudieron ejercitar en vivo dentro del tiempo de este ciclo (requieren flujo completo de POS/caja vía UI, no solo API) — queda **pendiente de verificación manual en navegador** en el próximo ciclo. Se recomienda priorizarlo dado que es la categoría de mayor severidad posible según la sección 6 del plan.

### 4.4 Rendimiento con datos reales
`seed_tenant_demo` ya tiene 313 productos reales — se confirmó que `GET /api/products` pagina correctamente (`pagination.total: 313`, `limit` respetado) en vez de traer todo el catálogo de una sola vez, lo cual mitiga el riesgo conocido de imágenes base64 sin CDN al menos a nivel de listado. No se pudo medir tiempo de carga real en navegador (sin esa herramienta en este entorno) — pendiente para el próximo ciclo con acceso a navegador.

### 4.5 Emails y WhatsApp
No se pudo probar envío real de emails porque `RESEND_API_KEY` está vacía en este entorno (ver Pre-vuelo punto 2) — se confirmó por código que los tres call sites de `getResend()` devuelven `null` de forma silenciosa cuando falta la key, consistente con el comportamiento esperado ("falla en silencio, no rompe el flujo"). Los links de WhatsApp (`wa.me/...`) se confirmaron correctos en el código para clientes (usa `customer.phone` real) — ver hallazgo 🟡 arriba sobre la columna Email/buscador para el matiz de qué datos son reales y cuáles sintéticos.

---

## RESUMEN EJECUTIVO

Este ciclo de QA se ejecutó **contra la base de desarrollo, no producción** (ver Pre-vuelo), combinando inspección exhaustiva de código con pruebas reales a nivel de API usando tokens de sesión legítimos (minteados con la función real `createSession()`, sin contraseñas ni accesos no autorizados). No hubo herramienta de navegador disponible, así que las verificaciones puramente visuales/UX de Fase 2 quedan como pendiente para el próximo ciclo — el foco de este ciclo fue lo que el propio plan marca como más crítico: aislamiento multi-tenant, permisos por rol, y los 5 riesgos conocidos de la sección 5.

**Cantidad de hallazgos por severidad:**
- 🔴 Crítico: 2
- 🟠 Alto: 3
- 🟡 Medio: 5
- 🟢 Bajo: 2

**Lista priorizada — qué atacar primero en el próximo ciclo de desarrollo:**

1. **[🔴] Agregar `requireRole([...])` a los 9 endpoints de escritura sin verificación de rol** (`POST /api/debts`, `PUT`/`DELETE /api/customers/[id]`, `POST`/`DELETE /api/categories*`, `POST /api/services`, `POST /api/recurring-expenses`) — hoy cualquier usuario autenticado, incluido `READONLY`, puede escribir datos reales. Es el hallazgo más grave y más fácil de explotar de todo el ciclo.
2. **[🔴] Decidir el futuro de `RolePermission`**: o se conecta `requireRole`/un wrapper a la tabla `RolePermission` para que la pantalla de Permisos controle acceso real, o se le aclara al `OWNER` en la propia UI que hoy solo oculta navegación — no dejarlo como está, porque genera una falsa sensación de control de acceso.
3. ~~**[🟠] Configurar `CRON_SECRET` en Vercel**~~ — ✅ resuelto 2026-07-16 (ver hallazgo arriba).
4. **[🟠] Igualar el acceso de lectura de `SUPERVISOR`** a lo que sugiere la navegación oculta — hoy puede leer todo Caja y Ajustes por API directa aunque no los vea en el menú.
5. **[🟠] Corregir `seed-icase.mjs`/`reset-users.mjs`** para apuntar a un tenant identificado de forma explícita (no "el más viejo") — riesgo de borrar datos reales de Tienda Mia por accidente.
6. **[🟡] Columna Email y buscador de Clientes**: usar `customer.email`/`customer.phone` reales en vez de los valores sintéticos que aún quedan en `customers-list.tsx`.
7. **[🟡] Recordatorio de cotización por vencer**: cambiar `sendQuoteEmail` por `sendQuoteExpiringReminderEmail` en el cron correspondiente.
8. **[🟡] "Subir logo" en Ajustes**: conectarlo a una persistencia real (o eliminarlo) — hoy es puramente decorativo.
9. **[🟡] Reescribir o eliminar el test de venta a crédito desactualizado** (`sales/route.integration.test.ts`) para que la suite de tests deje de tener una falla roja permanente.
10. **[Pendiente de este ciclo, no un bug confirmado] Verificar en navegador**: descuento-a-$0, diferencia de caja, presupuesto de gastos excedido, y rendimiento real con 300+ registros (4.3/4.4) — requieren interacción visual que no fue posible automatizar en este entorno; es la principal brecha de cobertura que queda para el próximo ciclo.

**Confirmaciones positivas destacadas de este ciclo** (para que no se re-investiguen sin necesidad): aislamiento multi-tenant funciona correctamente en todos los endpoints probados; `internalNotes` de clientes nunca se filtra a PDFs/emails; el segmento de cliente respeta el campo de BD; historial de ventas conserva toda la funcionalidad de las tareas archivadas como duplicadas; `Sale.cae` sigue siendo nullable (ARCA opt-in intacto); paginación de productos no filtra entre tenants.

---

## COMENTARIOS FINALES — Ingeniero Líder

Reviso este reporte completo antes de que sigamos. Metodología sólida: tokens de sesión reales en vez de mocks, nada destructivo (todo lo creado en las pruebas de `READONLY` se limpió con un token `OWNER`), y honestidad explícita sobre lo que no se pudo probar (navegador, producción, emails reales) en vez de inventar una cobertura que no hubo. Así es como quiero que se documente un ciclo de QA.

**Lectura del resultado:** la buena noticia es que lo más grave que pedía descartar el plan — fuga de datos entre tenants — no aparece en ningún lado probado. La mala noticia es que aparece algo distinto y también grave: **SOLVEN hoy no aplica control de rol en 9 endpoints de escritura reales**, y encima el panel de "Permisos" que un dueño de negocio usaría para restringir accesos (`RolePermission`) no hace nada en el backend — es una pantalla que miente. Ninguno de los dos hallazgos es un problema de UX, son huecos de autorización reales sobre un sistema que maneja plata, deuda de clientes y datos de negocio. Antes de sumar una sola feature nueva, esto se cierra.

**Por qué agrupo los hallazgos 1 y 2:** no son dos arreglos separados, son la misma causa raíz — falta disciplina uniforme en cómo se protege cada ruta. El fix correcto no es solo agregar `requireRole([...])` a los 9 endpoints sueltos; es el momento de decidir si `RolePermission` pasa a ser la fuente de verdad real (y que `requireRole` la consulte) o si se declara explícitamente "solo controla navegación" y se lo dice en la propia UI para no generar falsa confianza. Conviene resolver ambos en la misma tanda de trabajo, no por separado.

**Antes de tocar código, necesito que confirmes dos cosas** (el reporte no pudo verificarlas desde este entorno):
1. ¿Corriste `npx prisma migrate deploy` en producción? Las 19 migraciones de las Tareas 121-158 están 100% aplicadas en desarrollo, no se sabe el estado en producción.
2. ¿Está `CRON_SECRET` seteada en Vercel? Si no, es una acción tuya en el dashboard, no un fix de código — pero es igual de urgente que el resto.

**Cómo sigo yo:** con tu OK, te armo un lote de tareas de *fix* (no de features) enfocado en los ítems 1 a 4 de la lista priorizada — la corrección de los 9 endpoints, la decisión sobre `RolePermission`, y el ajuste de `SUPERVISOR`. Los ítems 🟡/🟢 