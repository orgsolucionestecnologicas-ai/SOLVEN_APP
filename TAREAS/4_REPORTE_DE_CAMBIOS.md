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

### 2026-09-05 — Rotar token de GitHub expuesto (T3)

**Qué se pidió:** revocar el token de GitHub personal marcado como expuesto en el incidente original de credenciales.

**Investigación previa:** no se encontró ningún uso del token en el código ni en el historial de git (ninguna GitHub Action depende de un token personal; la única workflow, `claude-orden.yml`, usa el `GITHUB_TOKEN` automático de Actions). Se pidió inventario de solo lectura antes de borrar nada.

**Hallazgo:** un único token clásico, `SOLVEN_APP`, con permisos extremadamente amplios (`admin:enterprise`, `admin:org`, `delete_repo`, `admin:repo_hook`, etc. — muchos más de los necesarios para `git push`, que solo requiere `repo`). Ya estaba vencido desde el 01-08-2026, es decir inutilizable de por sí. No había tokens de grano fino.

**Qué se hizo:** se decidió revocarlo y **no generar uno de reemplazo** — el push diario ya lo cubre SSH (T5) y no se encontró ningún otro uso activo. Si en el futuro hace falta un token para algo puntual, generarlo de tipo fine-grained, acotado al repo y con el permiso mínimo necesario, no un token clásico con alcance de administrador.

**Verificación:** Diego eliminó el token desde `github.com/settings/tokens` (confirmó el diálogo "no se puede deshacer"). Refrescó la página: "No personal access token created" — no quedan tokens clásicos ni de grano fino en la cuenta.

---

### 2026-09-05 — Configurar SSH para GitHub (T5) + aclaración sobre clave "sospechosa"

**Qué se pidió:** reemplazar el push por token (que fallaba desde el entorno puente de esta sesión) por autenticación SSH.

**Qué pasó:**
- Esta sesión generó un par de claves SSH dentro de su propio entorno puente (Cowork bridge, la VM de Linux ligada a la compu de Diego, fuera de la carpeta del proyecto) y pidió agregar la clave pública a GitHub.
- El agente CEO técnico, al no encontrar el archivo `.pub` correspondiente ni en el contenedor cloud ni en la carpeta del proyecto conectada, marcó la clave como de origen no verificable y correctamente no la agregó. No hubo intento de intrusión: la clave era legítima (generada por esta sesión en la compu de Diego), pero vivía en una tercera ubicación que esa búsqueda no cubría, y esta sesión no comunicó ese origen con suficiente claridad al pedirla. Aprendizaje para la próxima vez: aclarar explícitamente dónde vive cualquier credencial antes de pedir que se agregue a una cuenta externa.
- Diego generó una clave nueva directamente en su terminal de Windows (`C:\Users\SOLVEN\.ssh\`), la agregó a GitHub (`github.com/settings/keys`, verificada por fingerprint y por código de confirmación de identidad), cambió el remoto del repo a `git@github.com:orgsolucionestecnologicas-ai/SOLVEN_APP.git` y confirmó `ssh -T git@github.com` exitoso.

**Estado real verificado:**
- Push por SSH funciona correctamente desde la terminal nativa de Diego (Windows). El token de GitHub deja de ser necesario para su uso diario.
- Push **todavía no funciona** desde este entorno puente (esta sesión / Cowork bridge): su propia clave (fingerprint `SHA256:fb4Jpq95YSQc5LKlbuBYaBPVDvWoW2Hi1G8LzLqPNfE`, generada el mismo día, nunca agregada a GitHub) no está autorizada. Queda como decisión abierta de Diego — ver `PENDIENTES_DIEGO.md`, sección 3.

---

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
