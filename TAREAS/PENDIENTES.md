# PENDIENTES — SOLVEN

> Backlog vivo de cosas por decidir o hacer que no son una orden ejecutable todavía (o que están a la espera de una confirmación de Diego). A diferencia de `REPORTELIDER.md` (historial de lo ya hecho) y las órdenes de `TAREAS/*.md` (trabajo activo para el agente), este archivo es para anotar pendientes sueltos a medida que aparecen, para no perderlos. Se va a ir migrando acá lo que antes vivía en Notion.
>
> Formato: cada ítem con fecha en que se anotó, contexto breve, y qué haría falta para poder cerrarlo o convertirlo en una orden.

---

## Abiertos

### 2026-07-18 — QA: smoke test manual completo en producción (migrado de Notion, "T18")
Flujo completo de venta (contado, crédito), inventario y promociones, probado a mano en producción (https://solven-app-484v.vercel.app). Anotar cualquier error encontrado. No es una orden para el agente de código — es una sesión manual de Diego clickeando la app real. Estimado original: 55 min.
**Por qué importa:** los tests automatizados (TESTS-01, FIX-10/11/12) cubren lógica unitaria, pero nadie recorrió el flujo end-to-end en producción real esta ronda.

### 2026-07-18 — QA: probar devoluciones completas en producción (migrado de Notion, "T8")
Venta → devolución parcial → verificar que el stock sube y la caja refleja la diferencia correctamente. Sesión manual en producción, no orden de código. Estimado original: 55 min.
**Por qué importa:** con FIX-07 (selector de método de reintegro) ya en producción, conviene verificar también que el método elegido en la devolución se refleje bien en caja — no solo que el monto sea correcto.

### 2026-07-18 — QA: documentar casos de prueba de facturación ARCA con evidencia de CAE en producción (migrado y reformulado de Notion, "ARCA-11")
La tarjeta original pedía testear en ambiente de homologación *antes* de habilitar producción — esa condición ya no aplica porque ARCA (WSAA+WSFE) está en producción desde antes de esta revisión. Se reformula: documentar casos de prueba reales (distintos tipos de comprobante, montos, escenarios de error) con el CAE obtenido como evidencia, directamente en producción.
**Por qué importa:** en este mismo ciclo encontramos y corregimos FIX-08 (una vulnerabilidad real de confianza-de-cliente en la emisión de facturas ARCA) — eso sugiere que la superficie de ARCA no ha tenido una pasada de QA rigurosa y documentada todavía.

---

## Cerrados

### 2026-07-18 — Borrar `SOLVEN_PASSWORD` / `SOLVEN_USER` de Vercel (CERRADO)
Confirmado por dos vías independientes que ninguna se usaba: grep en el código (sin referencias en `src/` desde FIX-11) y revisión en Vercel vía agente de Chrome (BROWSER-01, sin uso detectable en Build Logs). Borradas de Production y Preview por el agente de Chrome — Vercel confirmó "Removed Environment Variable successfully". Falta un próximo deploy normal para que el cambio tome efecto (no se forzó redeploy).

### 2026-07-18 — `requireTenantId()` sin try/catch en subscription y dashboard/summary (CERRADO)
Hallazgo de TESTS-01. Resuelto en FIX-12 (commit `a8ee593`): ambos endpoints ahora envuelven `requireTenantId()` en try/catch y devuelven 401 en vez de propagar la excepción. Verificado por el Ingeniero Líder contra el diff, typecheck limpio. Ver `CLAUDE.md` sección 5.
