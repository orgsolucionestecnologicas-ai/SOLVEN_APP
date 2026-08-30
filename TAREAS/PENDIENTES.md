# PENDIENTES — SOLVEN

> Backlog vivo de cosas por decidir o hacer que no son una orden ejecutable todavía (o que están a la espera de una confirmación de Diego). A diferencia de `REPORTELIDER.md` (historial de lo ya hecho) y las órdenes de `TAREAS/*.md` (trabajo activo para el agente), este archivo es para anotar pendientes sueltos a medida que aparecen, para no perderlos.
>
> **2026-07-18: migración completa desde Notion.** Se revisaron las ~50 tareas de la base "SOLVEN — Gestión de Tareas" en Notion. Varias que figuraban como "⏳ Pendiente" ya estaban resueltas en el código (verificado línea por línea, no solo por el texto de Notion) — esas se archivaron como cerradas más abajo. Las genuinamente abiertas quedaron acá, ordenadas por urgencia. Las que dependen de una app o integración externa (Rebill, ARCA, Resend, Cloudflare) van en su propia sección al final, porque no son algo que el agente de código pueda resolver solo. **De acá en adelante este archivo es la única fuente de pendientes — ya no se usa Notion para esto.**
>
> Formato: cada ítem con fecha en que se anotó, contexto breve, y qué haría falta para poder cerrarlo o convertirlo en una orden.

---

## Abiertos (ordenados por urgencia)

### 🔴 Crítico

#### QA-CHROME-01-a — Venta a crédito/fiado real — YA ORDENADA (`FEATURE-01`)
Confirmado por el Ingeniero Líder contra código (29-07-2026): el schema soporta `SalePaymentType.CREDIT/MIXED` y `Sale.debtId`, pero `sale-validation.ts` fuerza siempre `CASH`. Diego decidió (29-07-2026) implementarla lo más completa posible: CREDIT + MIXED, stock descontado igual que en una venta de contado. Orden completa en `TAREAS/FEATURE-01_venta_a_credito.md`, con mapa de código investigado archivo:línea. Mover a Cerrados cuando se ejecute y verifique.

#### T3 — Rotar token de GitHub expuesto
Manual, no verificable desde este entorno (sandbox sin credenciales de git). `github.com/settings/tokens` → revocar el token actual → generar uno nuevo con permisos `repo` → actualizar donde se use. ~30 min.

#### T5 — Configurar GitHub SSH (eliminar dependencia de token manual)
Manual, no verificable desde acá. `ssh-keygen -t ed25519` → agregar clave pública en GitHub → `git remote set-url origin git@github.com:...` → verificar con `git push`. ~45 min. Relacionado con T3: una vez con SSH, el token deja de ser necesario para push diario.

#### T2 (reformulado) — Confirmar rotación de `SOLVEN_SESSION_SECRET` y password de Neon
La tarea original de Notion pedía rotar `SOLVEN_PASSWORD` y `SOLVEN_SESSION_SECRET`. La parte de `SOLVEN_PASSWORD` ya se resolvió — no por rotación, sino porque se confirmó que era una variable vestigial sin uso y se borró de Vercel (ver sección Cerrados). Queda sin verificar: si `SOLVEN_SESSION_SECRET` en Vercel es un valor aleatorio seguro (mínimo 32 caracteres) y si la password de la base en Neon fue rotada después de la exposición original documentada en la tarjeta "🔐 Rotar credenciales expuestas en producción" (Notion la marcaba "Completada" pero sus propias notas listaban 4 pasos manuales pendientes para Diego, incluyendo este). No se puede verificar desde el código — requiere confirmación manual.

### 🟠 Alto

#### QA-CHROME-01-b — Promoción automática: necesita reproducción en vivo, no solo lectura de código
Verificado por el Ingeniero Líder (30-08-2026): el `useEffect` de `pos.tsx` (con debounce de 400ms) aplica promos automáticas sin depender del panel de Promociones — el código parece correcto. No se puede confirmar ni descartar el bug solo leyendo código. Antes de ordenar un fix, reproducir en vivo (agregar producto con promo automática activa, cronometrar si el descuento aparece solo). El otro hallazgo "Alto" (Cotización no limpia email/teléfono) sí se confirmó y pasó a `FIX-16`.

#### T18 — Smoke test manual completo en producción
Flujo completo de venta (contado, crédito), inventario y promociones, probado a mano en producción (https://solven-app-484v.vercel.app). Anotar cualquier error encontrado. Sesión manual de Diego, no orden de código. ~55 min.
**Por qué importa:** los tests automatizados (TESTS-01, FIX-10/11/12) cubren lógica unitaria, pero nadie recorrió el flujo end-to-end en producción real todavía.

#### T8 — Probar devoluciones completas en producción
Venta → devolución parcial → verificar que el stock sube y la caja refleja la diferencia. Sesión manual, no orden de código. ~55 min.
**Por qué importa:** con FIX-07 (selector de método de reintegro) ya en producción, conviene verificar también que el método elegido se refleje bien en caja.

### 🟡 Medio

#### [Devoluciones · UX] Mostrar detalle completo de la venta original antes de confirmar
Mejora de UX en el flujo de devoluciones. Sin archivos específicos anotados en Notion.

#### [POS · UX] Botón "Cobrar" mostrando el monto en el mismo botón (ej: "Cobrar $4.250")
Mejora de UX en POS.

#### [Productos] Generación e impresión de etiqueta con código de barras desde SOLVEN
Feature nueva, sin archivos específicos anotados.

#### [Productos · UX] Subir foto de producto con drag-and-drop o captura desde cámara
Notion la marca "🚫 Bloqueada" sin especificar por qué. Confirmar con Diego cuál era el bloqueo antes de retomarla.

#### [Cotizaciones · UX] Indicador urgente (rojo) si la cotización vence en menos de 3 días
Notion la marca "🚫 Bloqueada" sin especificar por qué. Confirmar con Diego cuál era el bloqueo antes de retomarla.

---

## Integraciones Externas

> Todo lo que depende de una app, servicio o panel de terceros (Rebill, ARCA/AFIP, Resend, Cloudflare) o de acceso manual de Diego a esos paneles. No son algo que el agente de código pueda resolver solo — quedan al final a propósito.

#### T31 — Variables de entorno completas en Vercel (Rebill, Resend, Anthropic) — 🔴 Crítico
Faltan en Vercel: `REBILL_WEBHOOK_SECRET`, `REBILL_API_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`. También confirmar que `DATABASE_URL` usa la URL directa de Neon (sin `-pooler`) para migraciones, y que `SOLVEN_SESSION_SECRET` tiene un valor seguro en producción (ver ítem T2 arriba).

#### QA-05 — Rebill acepta firma inválida si falta `REBILL_WEBHOOK_SECRET` — 🔴 Crítico
Ya documentado como bug activo conocido en `CLAUDE.md`, **diferido intencionalmente por Diego a fin de proyecto**. Sin la variable configurada, el webhook acepta cualquier firma → riesgo de fraude en pagos. Fix: fallar cerrado (400) si la variable no está configurada.

#### 📧 Configurar Resend — verificar dominio + `NEXT_PUBLIC_APP_URL` — 🟠 Alto
1) Verificar dominio `solvenrs.com` en Resend (registros DNS). 2) Actualizar `NEXT_PUBLIC_APP_URL=https://www.solvenrs.com` en Vercel (si tiene la URL vieja de Vercel, rompe los links en emails transaccionales). 3) Test de email real desde producción.

#### 💳 "Integrar Rebill" (tarjeta de Notion, probablemente duplicada) — 🟡 Medio
Esta tarjeta describía crear cuenta Rebill, API keys, webhook y flujo de cobro — pero **T14 ("Integración completa con Rebill") ya está completada** en Notion y coincide con lo que hay en el código (`prisma/schema.prisma` modelo `Subscription`, `src/app/api/webhooks/rebill/route.ts`, middleware que bloquea acceso si `CANCELLED`/`EXPIRED`). Lo único potencialmente real de esta tarjeta es "probar en sandbox antes de activar en producción" — no hay evidencia de que se haya hecho. Si Diego confirma que nunca se probó en sandbox, vale la pena una sesión de QA ahí; si no, esta tarjeta es redundante y se puede descartar.

#### ☁️ Configurar Cloudflare — CDN + DDoS + nameservers — 🟡 Medio
Manual: crear cuenta Cloudflare (Free), agregar dominio `solvenrs.com`, cambiar nameservers en el registrar, esperar propagación (24-48hs), verificar que Vercel siga funcionando con los DNS de Cloudflare, activar Always HTTPS + HSTS.

#### ARCA-02 — Setup ambiente de homologación (testing ARCA) — 🟡 Medio
Requiere acceso manual de Diego al portal ARCA con Clave Fiscal nivel 3 — no se puede automatizar. **Nota:** ARCA ya está en producción (WSAA+WSFE implementado), así que esto ya no es un gate previo al lanzamiento; su valor ahora es tener un ambiente seguro para probar cambios futuros al código de ARCA sin tocar producción.

#### ARCA-11 — Documentar casos de prueba de facturación ARCA con evidencia de CAE en producción — 🟠 Alto
*(Reformulada respecto a la tarjeta original de Notion, que pedía testear en homologación antes de habilitar producción — esa condición ya no aplica porque producción está live desde antes.)* Documentar casos de prueba reales (distintos tipos de comprobante, montos, escenarios de error) con el CAE obtenido como evidencia, directamente en producción.
**Por qué importa:** en este mismo ciclo encontramos y corregimos FIX-08 (vulnerabilidad de confianza-de-cliente en la emisión de facturas ARCA) — sugiere que la superficie de ARCA no tuvo todavía una pasada de QA rigurosa y documentada.

---

## Cerrados

### 2026-08-30 — FIX-15 + FIX-16: 11 bugs menores/medianos de QA-CHROME-01 (CERRADO — 11 commits, `8677d2a`..`9200aa7`)
Los 11 hallazgos confirmados y no críticos de QA-CHROME-01 (QA-CHROME-01-c) quedaron resueltos: **FIX-15** — categoría real de producto en Reportes (`categoryName` en vez de heurístico por nombre), "Mi Negocio" muestra mensaje de acceso en vez de 0/8 para no-Owner, placeholder de agradecimiento ya no se confunde con texto real, SKU deja de ser obligatorio en el form (el backend siempre lo autogenera), papelera del carrito del POS pide confirmación igual que "Limpiar venta", "Devoluciones" en Cierre de Caja muestra el monto real de la sesión (sin doble descuento — el "Total esperado" seguía usando `totalCashOut`, que ya las incluía), indicador de caja del sidebar se refresca con eventos `cash-register-closed`/`cash-register-opened`. **FIX-16** — cotización limpia Email/Teléfono al cambiar de cliente, selector de IVA agregado al formulario de producto (`IVA_RATES`, ya soportado por el backend) y el resumen del carrito del POS calcula el IVA real (mismo criterio que `handlePrintInvoice`, verificado línea por línea que es la fórmula idéntica), botón "Imprimir factura" se renombra a "Imprimir comprobante (no fiscal)" cuando no hay CAE real, y se unificaron los dos mecanismos de "Suspender venta" en uno solo persistido en `localStorage` (con migración automática del formato viejo de borrador único al nuevo formato de lista). Verificado por el Ingeniero Líder commit por commit contra el diff real — sin hallazgos, `typecheck`/`lint` reverificados limpios de forma independiente. Detalle completo en `TAREAS/REPORTELIDER.md`.

### 2026-08-30 — FIX-14: monto neto en caja/reportes + Ajustes oculto por defecto (CERRADO — commits `50eddaa`, `30eecc9`, `62abb5a`)
El agente de VS Code ejecutó los 2 bugs críticos de QA-CHROME-01: (1) `CashMovement`/reportes/cierre de caja ahora usan el monto neto (`totalAmount - discountAmount`) en vez del bruto cuando hay promoción aplicada; (2) `DEFAULT_HIDDEN` en `role-permissions-table.tsx` ahora oculta "Ajustes" por defecto también para CASHIER/INVENTORY/READONLY, no solo SUPERVISOR. **Verificación del Ingeniero Líder contra el diff real encontró un bug crítico no reportado por el agente:** el helper `saleNet` agregado en `src/app/ui/reports.tsx` se llamaba a sí mismo en vez de leer `sale.totalAmount` — recursión infinita que crasheaba cualquier tab de Reportes en runtime (no lo detectaban typecheck/lint/tests porque es válido en tipos y no hay test de render para esa pantalla). Corregido por el Ingeniero Líder en `62abb5a`, typecheck y lint reverificados limpios. Detalle completo en `TAREAS/REPORTELIDER.md`.

### 2026-07-23 — DESIGN-01 + DESIGN-02: pulido visual de estilo en toda la app (CERRADO — merge `b0d9b0d`)
Pasada única de estilo (Fable) sobre las ~34 pantallas de `src/app/ui/` con lenguaje unificado (`docs/estilo-ui.md`: radios en 4 niveles, tarjeta estándar `rounded-2xl border-slate-100 bg-white shadow-sm p-5`, KPIs `font-semibold tracking-tight`). Cero cambios de lógica/datos/rutas — verificado por el Ingeniero Líder contra el diff completo (`src/modules`, `src/app/api`, `prisma`, `middleware.ts`, `tenant.ts`, `auth.ts` sin tocar; sidebar oscuro intacto). DESIGN-02 corrigió 2 hallazgos de esa verificación: `role-permissions-table.tsx` (una de las pantallas que había quedado sin tocar) y una corrupción de encoding real (mojibake UTF-8→CP1252) en `settings.tsx`/`sales-list.tsx`, restaurada y verificada a nivel de bytes. Diego revisó el preview de Vercel y aprobó el resultado visual. Mergeado a `main` en `b0d9b0d`. Falta el push/deploy desde la máquina de Diego para que tome efecto en producción.

### 2026-07-22 — QA-01, QA-02, QA-04 (CERRADO — FIX-13, commit `551ac74`)
Los 3 fixes críticos que quedaban del backlog general (no de integraciones externas) se resolvieron en una sola orden: `scripts/seed-icase.mjs` ahora usa `prisma.product.upsert()` por `productCode` (ya no falla `P2002` al re-correr); `src/middleware.ts` devuelve JSON 401/402 en vez de redirect cuando `pathname` empieza con `/api/` (páginas sin cambios); los 3 cron jobs (`expire-quotes`, `generate-recurring-expenses`, `remind-expiring-quotes`) ahora rechazan si falta `CRON_SECRET` fuera de `NODE_ENV==='development'`. Verificado por el Ingeniero Líder contra el diff completo (`git show 551ac74`) y `typecheck` reverificado independientemente, limpio. Detalle en `TAREAS/REPORTELIDER.md`.

### 2026-07-18 — Auditoría completa de Notion: 6 tarjetas "Pendiente" ya estaban resueltas en el código
Al migrar todo Notion a este archivo, se verificó cada tarjeta contra el código real (no solo se confió en el texto de Notion). Estas 6 figuraban como "⏳ Pendiente" pero ya estaban resueltas:
- **🖥️ T16 — requireRole en endpoints de escritura**: verificado en `sales`, `returns`, `debt-payments`, `cash-register`, `customers`, `promotions` — los 6 ya usan `requireRole(...)` envuelto en try/catch con `ForbiddenError`/`UnauthorizedError` manejados correctamente. No se sabe cuándo se resolvió (no fue en las órdenes de esta sesión).
- **QA-03 — invoice no valida saleId por tenantId**: es el mismo bug que **FIX-08** (ya documentado), resuelto y verificado ese mismo commit.
- **QA-06 — /api/noa devuelve 500 sin ANTHROPIC_API_KEY**: el endpoint ya valida la key y devuelve un JSON de error controlado — la única diferencia con lo pedido es el status code (500 en vez del 503 sugerido), un detalle menor, no un crash sin control.
- **QA-07 — pagos concurrentes de deuda filtran error Prisma crudo**: `debt-payment-data-access.ts` ya captura `PrismaClientKnownRequestError` (P2034/P2028), reintenta una vez, y si persiste lanza `DebtPaymentAmountError` en vez del error crudo.
- **QA-08 — Service.ivaRate hardcodeado**: resuelto por **FIX-10** (ya documentado en este archivo y en `CLAUDE.md`).
- **QA-09 — sendQuoteExpiringReminderEmail sin conectar**: verificado que `src/app/api/cron/remind-expiring-quotes/route.ts` ya la invoca. Ya documentado como resuelto en `CLAUDE.md`.

También se encontró que **ARCA-01** (doc de arquitectura técnica, marcada bloqueante para el resto de ARCA) nunca se escribió como archivo (`docs/arca-architecture.md` no existe), pero todo el trabajo downstream que dependía de ella (ARCA-03 a ARCA-10) ya está completado en Notion y coincide con el código. Es deuda de documentación, no un bloqueante real — no se migra como pendiente activo, solo se deja esta nota.

### 2026-07-18 — Borrar `SOLVEN_PASSWORD` / `SOLVEN_USER` de Vercel (CERRADO)
Confirmado por dos vías independientes que ninguna se usaba: grep en el código (sin referencias en `src/` desde FIX-11) y revisión en Vercel vía agente de Chrome (BROWSER-01, sin uso detectable en Build Logs). Borradas de Production y Preview por el agente de Chrome — Vercel confirmó "Removed Environment Variable successfully". Falta un próximo deploy normal para que el cambio tome efecto (no se forzó redeploy).

### 2026-07-18 — `requireTenantId()` sin try/catch en subscription y dashboard/summary (CERRADO)
Hallazgo de TESTS-01. Resuelto en FIX-12 (commit `a8ee593`): ambos endpoints ahora envuelven `requireTenantId()` en try/catch y devuelven 401 en vez de propagar la excepción. Verificado por el Ingeniero Líder contra el diff, typecheck limpio. Ver `CLAUDE.md` sección 5.
