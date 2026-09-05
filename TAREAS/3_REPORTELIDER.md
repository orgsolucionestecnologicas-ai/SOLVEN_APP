# REPORTE LÍDER — SOLVEN

> Log de lo que cada agente va ejecutando, con la nota de cierre del Ingeniero Líder debajo.
> Una entrada corta (2-4 líneas) por tarea u orden, del más reciente al más antiguo.
>
> **Vaciado el 2026-09-04 por pedido de Diego.** El contenido acumulado hasta esa fecha
> (225 líneas, desde QA-FIX-01 del 16-07-2026 hasta el fix de reintegro del 04-09-2026)
> está archivado completo en `TAREAS/historial/3_REPORTELIDER_archivo_hasta_2026-09-04.md`
> y también vive en el historial de git. No se perdió nada — dejó de ser lectura obligatoria
> de cada sesión, que es lo que se buscaba.
>
> **Criterio de acá en adelante:** este archivo se lee entero al arrancar una sesión, así que
> no debe volver a crecer sin control. Cuando pase las ~80 líneas, se archiva de nuevo en
> `TAREAS/historial/` con la fecha de corte y se vacía. Las opiniones, hallazgos y decisiones
> del Ingeniero Líder no van acá: van en `TAREAS/comentarios_ceo.md`.

---

<!-- Entradas nuevas acá debajo, del más reciente al más antiguo -->

### 2026-09-05 — Verificado el reporte de cambios del ciclo de seguridad/decisiones (7 commits, `8f009cc`..`cbfe84a`)

Verificado contra el diff real: los 7 commits tocan **solo** `TAREAS/4_REPORTE_DE_CAMBIOS.md` y
`TAREAS/PENDIENTES_DIEGO.md` (`git diff --name-only 8f009cc~1 HEAD` no devuelve nada fuera de
`TAREAS/`). Cero código, cero schema, cero migraciones — coincide con lo que el reporte afirma.
Rotación de Neon, revocación del token de GitHub y SSH de Diego: ejecutados por Diego en paneles
externos, no verificables desde acá; los tomo como reportados por él, no como verificados por mí.

**Confirmado por lectura de código:**
- T31 exacto: `package.json` → `"build": "next build"` (no corre `prisma migrate deploy`), y
  `prisma/schema.prisma` no define `directUrl`. Las dos afirmaciones son correctas.
- Sin rastro de Stripe en el proyecto: `grep -rin "stripe" src/ package.json prisma/` → 0 resultados.

**Corrijo un hallazgo del reporte — no es un bug, la reproducción estaba mal:** el reporte marca
como sospechoso que una sesión abierta antes de rotar `SOLVEN_SESSION_SECRET` siguiera funcionando.
Leí `src/lib/auth.ts`: `getHmacKey()` lee `process.env.SOLVEN_SESSION_SECRET` **en cada llamada**,
sin cache de módulo, y `verifySession` hace `crypto.subtle.verify` real contra la firma en cada
verificación. Una cookie firmada con el secreto viejo no puede pasar esa verificación con el nuevo.
El cache de `requireRole` (USER-FIX-03) es de datos del usuario, corre **después** de la
verificación de firma, no la saltea. Explicación probable de lo observado: se pegó a una página ya
renderizada/cacheada en el cliente, o se hizo login después del redeploy. Para descartarlo de
verdad hace falta una prueba limpia: rotar, y sin volver a loguearse pegarle directo a un endpoint
protegido (`/api/dashboard/summary`) con la cookie vieja — tiene que dar 401. No lo doy por
confirmado ni lo abro como bug hasta esa prueba.

**Escalado a `5_NOTICIAS_CEO.md`, no cerrado acá:** la clave con formato `sk_live_...` que estaba
guardada como `SOLVEN_SESSION_SECRET` (reemplazarla en Vercel no la revoca donde vive), y la
contradicción entre la decisión 1 de Diego (Rebill debe rechazar sin secreto) y la decisión de
pausar la carga de `REBILL_WEBHOOK_SECRET` en Vercel — implementarlas en ese orden rompe todos los
webhooks de Rebill.

`4_REPORTE_DE_CAMBIOS.md` vaciado tras esta verificación. El renombre pendiente de
`PENDIENTES_DIEGO.md` → `6_PENDIENTES_DIEGO.md` queda commiteado en el mismo commit.

### 2026-09-04 — `main` sincronizado con el estado real de `design/revision-uiux-sep-2026` (Arquitecto de Software, directo)

`main` no tenía el renombrado con prefijo numérico (commit `6946fb7`, solo en la rama de diseño) ni la reescritura de `2_INGENIERO_LIDER.md` a la doctrina de CEO técnico — reconciliado a mano vía `git worktree`, sin tocar el checkout compartido. Se sumó también lo que hizo mientras tanto, en paralelo, la sesión del CEO técnico en `design` (commit `526c480`): `3_REPORTELIDER.md` vaciado con su archivo completo en `TAREAS/historial/`, `TAREAS/5_NOTICIAS_CEO.md` nuevo (hallazgos y riesgos del CEO, separado del registro de ejecución), `4_REPORTE_DE_CAMBIOS.md` vaciado (tenía un ciclo viejo ya cerrado dando vueltas), y el fix de `logAudit` en `src/modules/audit/audit-data-access.ts` (contiene el error del INSERT de auditoría en un solo lugar en vez de dejarlo escapar como unhandled promise rejection) — cherry-pickeado a `main` porque es un fix de producción real sin relación con el rediseño de UI, y el archivo era idéntico entre ambas ramas antes del fix. Queda además la primera orden activa en `ORDEN_AGENTE_VS.md`: `SALE-TENANT-SCOPE`.

**Pendiente de Diego, no de código:** este commit en `main` y el `526c480` en `design` están hechos localmente pero **sin pushear** — este entorno (la VM Linux del bridge de escritorio) no tiene ninguna credencial de git configurada (sin credential helper, sin SSH, sin token; verificado). Coincide con `T3`/`T5` de `PENDIENTES.md`, pero ahora es un bloqueo real, no solo un pendiente de seguridad. Hace falta pushear `main` y `design/revision-uiux-sep-2026` desde una terminal con credenciales reales, o darle a esta sesión una forma de autenticarse.

