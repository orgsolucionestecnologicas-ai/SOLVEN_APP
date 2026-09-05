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

### 2026-09-05 — T31 (parcial): DATABASE_URL/migraciones — es un tema de código, no de Vercel

**Qué se pidió:** confirmar que `DATABASE_URL` usa la URL directa de Neon (sin `-pooler`) para que las migraciones no fallen.

**Investigación:** el `build` de Vercel es solo `next build` (`package.json`) — no corre `prisma migrate deploy` en el pipeline de deploy, así que el `DATABASE_URL` de Vercel no es lo que ejecuta migraciones. Lo que sí importa es de dónde se corren las migraciones manualmente: el `.env` local del repo tiene `DATABASE_URL` apuntando a la conexión **pooled** de Neon (host con `-pooler`), y `prisma/schema.prisma` no define `directUrl` — no hay ninguna separación entre la URL de runtime (donde pooled es lo correcto, por el límite de conexiones en serverless) y una URL directa para migrar (que sí lo necesita, por los locks de sesión que usa `prisma migrate`).

**Hallazgo adicional:** ese mismo `.env` local no se modificó desde el 01-06-2026 — tiene la contraseña de Neon anterior a la rotación de hoy (05-09-2026), ya inválida. Quien intente correr la app o migraciones localmente con ese archivo va a fallar por autenticación hasta que se actualice.

**Para el CEO técnico (código, no acción de Diego):**
1. Agregar `directUrl` en el datasource de `prisma/schema.prisma`, apuntando a una variable de entorno separada con la conexión directa de Neon (sin `-pooler`).
2. Definir esa variable (p. ej. `DIRECT_DATABASE_URL`) tanto en Vercel como en `.env.example`/`.env.production.example`.
3. Avisar a Diego qué valor pegar en su `.env` local (contraseña actualizada + variante directa) para que pueda volver a correr la app/migraciones localmente.

**No incluido en esta tarea** (quedan deferidos por decisión de Diego, no son de seguridad): `REBILL_WEBHOOK_SECRET`, `REBILL_API_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY` — pendientes de que defina si usa esas plataformas.

---

### 2026-09-05 — Rotar SOLVEN_SESSION_SECRET (T2) + hallazgo: sesiones no se invalidan al rotar

**Qué se pidió:** confirmar que `SOLVEN_SESSION_SECRET` en Vercel es un valor aleatorio fuerte (no una prueba/valor débil).

**Hallazgo durante la verificación (más grave que la tarea original):** el valor real en Vercel no era un session secret cualquiera — su preview visible en la UI de Vercel era `sk_live_a12...`, el formato exacto de una clave secreta live de Stripe. Se revisó el código completo (`src/`, `package.json`): SOLVEN no tiene ninguna integración con Stripe en ningún lado — la pasarela real es Rebill. No hay ninguna razón legítima para que ese valor estuviera ahí. Diego decidió no investigar el origen/vigencia de esa clave — SOLVEN no va a usar Stripe bajo ninguna circunstancia — así que no se tocó nada en Stripe, solo se reemplazó el valor en Vercel.

**Qué se hizo:** se generó un valor nuevo con `openssl rand -hex 32` (64 caracteres, aleatorio real) y se reemplazó en Vercel (entrada única, compartida entre Producción y Vista previa). Redeploy manual, status Ready en ~2 min.

**Verificación:** login funcionando con la clave nueva (usuario demo, dashboard con datos reales, sin errores de consola).

**⚠️ Hallazgo adicional para el CEO técnico (no resuelto acá, es código):** después del redeploy con el secreto nuevo, la sesión que ya estaba abierta ANTES de la rotación (cookie firmada con el secreto viejo) siguió autenticando con normalidad — no pidió login de nuevo hasta que se cerró sesión manualmente. Si `verifySession`/`getHmacKey()` leen `process.env.SOLVEN_SESSION_SECRET` en cada verificación (como sugiere `src/lib/auth.ts`), una cookie firmada con la clave vieja debería fallar la verificación HMAC contra la clave nueva. Vale la pena confirmar si hay algún camino de verificación que no revalida la firma en cada request (por ejemplo el cache de revalidación de `requireRole` de USER-FIX-01..09) — si rotar el secreto no fuerza el cierre de sesiones viejas, pierde buena parte de su valor como respuesta ante una fuga real.

---

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
