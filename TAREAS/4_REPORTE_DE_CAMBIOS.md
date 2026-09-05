# REPORTE DE CAMBIOS — SOLVEN

> Detalle técnico completo de la tarea en curso, escrito por el agente ejecutor.
> El Ingeniero Líder lo verifica contra el diff real, deja su nota en `3_REPORTELIDER.md`
> y después vacía este archivo (no se borra el archivo, se limpia el contenido).
>
> Vaciado el 2026-09-04 por el Ingeniero Líder: la copia de esta rama había quedado con el
> reporte de `POS-FIX-01..04` (31-08-2026), un ciclo ya verificado y cerrado hace días —
> divergencia entre `main` y `design/revision-uiux-sep-2026`. En `main` este archivo ya
> estaba vacío. El detalle de ese ciclo vive en git y en `TAREAS/historial/`.

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

### 2026-09-05 — Rotación de contraseña de base de datos en Neon (SEGURIDAD)

**Ejecutado por:** Diego, vía agente de navegador (Claude en Chrome), guiado por su asistente personal de tareas.

**Qué se hizo:**
- `.env.production.example` había quedado trackeado en git con credenciales reales en un commit viejo (ya sanitizado en HEAD, pero la versión vieja sigue viva en el historial).
- Se confirmó que el proyecto de Neon tiene una sola rama (`main`, default) y un solo rol (`neondb_owner`).
- Se reseteó la contraseña de `neondb_owner` desde el menú de Roles en la consola de Neon.
- La base está conectada a Vercel por la integración nativa Vercel↔Neon (`solven-db`), no por un `DATABASE_URL` manual: la integración detectó el reset y reescribió automáticamente las ~20 variables de entorno dependientes (`DATABASE_URL`, `POSTGRES_URL`, `PGPASSWORD`, etc.) con timestamp coincidente. No hizo falta copiar/pegar ningún valor a mano.
- No se tocaron `CRON_SECRET`, `SOLVEN_USER`, `SOLVEN_PASSWORD` ni `SOLVEN_SESSION_SECRET` — no dependen de esta integración.
- Redeploy manual en Vercel (Deployments → Redeploy): 2m12s, status Ready, dominio `www.solvenrs.com` incluido.

**Verificación:** `www.solvenrs.com` cargó con la sesión demo; dashboard y POS mostraron datos reales (ventas del mes, inventario, cotizaciones, top productos). Consola del navegador sin errores. De 68 requests de red inspeccionadas, todas devolvieron 200 salvo un único 503 aislado en el primer render de `/dashboard` justo tras el login, resuelto solo en el siguiente intento — consistente con un cold-start del serverless en la ventana de corte, no un fallo persistente.

**No incluido en esta tarea** (quedan en `PENDIENTES_DIEGO.md`, sección Seguridad): rotar el token de GitHub expuesto, configurar SSH para `git push`, confirmar que `SOLVEN_SESSION_SECRET` es un valor random fuerte, cargar `REBILL_WEBHOOK_SECRET` / `REBILL_API_KEY` / `RESEND_API_KEY` / `ANTHROPIC_API_KEY` en Vercel.

---
