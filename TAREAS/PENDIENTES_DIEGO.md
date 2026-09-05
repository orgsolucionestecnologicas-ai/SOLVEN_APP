# PENDIENTES DE DIEGO — lo que nadie más puede resolver por vos

> Lista personal, no técnica. Junta lo que el CEO técnico marcó como "esto depende
> de vos" en `TAREAS/5_NOTICIAS_CEO.md`, lo que el Arquitecto de Software encontró
> en esta sesión, y lo que ya estaba etiquetado 🛠️ **ACCIÓN MANUAL** / 🤔 **DECISIÓN**
> en `TAREAS/PENDIENTES.md`. No repite el backlog técnico completo — para eso está
> `PENDIENTES.md`. Esto es solo lo que te toca a vos, ordenado para ir tachando de
> arriba hacia abajo.
>
> Cada ítem dice de dónde salió: **[CEO]** = `5_NOTICIAS_CEO.md`, **[Arquitecto]** =
> esta sesión, **[Backlog]** = `PENDIENTES.md`.

---

## 1. Seguridad — esto es lo más urgente y lo más caro si se pospone

- [x] **Rotar la contraseña de la base de datos en Neon.** [CEO] `.env.production.example`
      está trackeado en git y hay un commit viejo llamado "sanitiza credenciales de
      ejemplo" — sanitizar no borra el historial, la versión anterior sigue viva en
      git. No es "por las dudas": el CEO lo marca como el riesgo más caro de todo el
      proyecto ahora mismo.
      ✅ **Resuelto 05-09-2026** — contraseña rotada en Neon (rol `neondb_owner`), propagada
      automáticamente a Vercel por la integración nativa, redeploy y verificación en
      producción sin errores. Detalle completo en `4_REPORTE_DE_CAMBIOS.md`.
- [x] **Rotar el token de GitHub expuesto.** [Backlog: T3] `github.com/settings/tokens`
      → revocar el actual → generar uno nuevo con permisos `repo` → actualizarlo donde
      se use. ~30 min.
      ✅ **Resuelto 05-09-2026** — token clásico `SOLVEN_APP` eliminado (ya estaba vencido
      desde el 01-08-2026 y tenía permisos de administrador muy por encima de lo necesario).
      No se generó reemplazo: el push diario ya lo cubre SSH (T5). Cuenta verificada sin
      tokens clásicos ni de grano fino. Detalle en `4_REPORTE_DE_CAMBIOS.md`.
- [x] **Configurar SSH en vez de token para hacer `git push`.** [Backlog: T5] Esto
      además destraba que las sesiones de Claude puedan pushear solas sin que tengas
      que copiar comandos vos — hoy ninguna sesión en la nube puede hacer `git push`
      porque no hay ninguna credencial configurada ahí. `ssh-keygen -t ed25519` →
      agregar la clave pública en GitHub → `git remote set-url origin git@github.com:...`
      → probar con `git push`. ~45 min.
      ✅ **Resuelto 05-09-2026** — SSH configurado y probado (`ssh -T git@github.com` OK) con
      una clave generada en tu propia terminal de Windows. Push diario desde tu compu ya no
      depende del token. Nota: el entorno puente de este asistente (esta sesión) todavía no
      tiene su propia clave autorizada — ver decisión pendiente en la sección 3. Detalle
      completo, incluida la aclaración sobre la clave que el CEO técnico marcó como
      sospechosa, en `4_REPORTE_DE_CAMBIOS.md`.
- [x] **Confirmar que `SOLVEN_SESSION_SECRET` en Vercel es un valor random de 32+
      caracteres**, y no algo débil o de prueba. [Backlog: T2]
      ✅ **Resuelto 05-09-2026** — el valor real resultó sospechoso (formato de clave live
      de Stripe, sin ningún uso legítimo en el código de SOLVEN). Se reemplazó por un valor
      random real (`openssl rand -hex 32`) y se verificó login en producción. Queda un
      hallazgo abierto para el CEO técnico: las sesiones que ya estaban abiertas no se
      cerraron solas al rotar el secreto — detalle en `4_REPORTE_DE_CAMBIOS.md`.
- [ ] **Cargar en Vercel las variables de entorno que faltan:** `REBILL_WEBHOOK_SECRET`,
      `REBILL_API_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`. [Backlog: T31]
      ⏸️ **En pausa (05-09-2026)** — decisión de Diego: todavía no define si usa Rebill
      (cobros), Resend (mails) y un chatbot de Claude; espera unos días antes de decidir.
      No es un tema de seguridad, es de negocio.
      ✅ **Sub-ítem de `DATABASE_URL`/migraciones investigado (05-09-2026)** — no es una
      variable de Vercel para tocar: el build de Vercel no corre migraciones, y el
      problema real es que falta un `directUrl` en `prisma/schema.prisma` (código) y que
      el `.env` local tiene la contraseña vieja de Neon. Flageado para el CEO técnico en
      `4_REPORTE_DE_CAMBIOS.md` — no requiere acción tuya.

## 2. La rama de diseño — decisión de esta semana

- [ ] **Revisar el preview de Vercel de `design/revision-uiux-sep-2026` y decidir:
      aprobar y mergear a `main`, o decir puntualmente qué falta.** [CEO] Ya no es
      solo un rediseño visual — tiene migraciones de Prisma, `schema.prisma` tocado
      y `returns/index.ts` reescrito casi entero. Mientras siga separada de `main`,
      cada orden nueva que toque esos mismos archivos (`SALE-TENANT-SCOPE`,
      `ARCA-NC-01`) corre el riesgo de un conflicto feo de mergear más adelante. El
      CEO recomienda cerrarla esta semana, no lo digo yo solo.

## 3. Decisiones rápidas — 5 a 10 minutos cada una, no requieren que hagas nada vos mismo

- [ ] **Rebill "fail-open":** ¿autorizás que el webhook rechace (en vez de aceptar
      cualquier firma) cuando falta el secreto configurado? Es una línea de código,
      nada de alcance nuevo. [CEO] — decís que sí y el CEO lo hace.
- [ ] **¿Agregamos tests de render (jsdom + Testing Library) para `pos.tsx`,
      `returns.tsx` y `cash-register-close.tsx`?** Son las tres pantallas que tocan
      plata y hoy no tienen ninguna cobertura de ese tipo — ya hubo un bug ahí que
      typecheck/lint no vieron (`FIX-14`). [CEO]
- [ ] **¿Confirmás la nueva regla de `3_REPORTELIDER.md`?** Se archiva en
      `TAREAS/historial/` y se vacía cada vez que supera ~80 líneas, en vez de
      crecer para siempre. [CEO]
- [ ] **¿Autorizamos también la clave SSH de este asistente (entorno puente) en GitHub,
      para que pueda pushear cambios como este sin que vos tengas que hacerlo desde tu
      compu?** Es la misma clave que el CEO técnico marcó como sospechosa el 05-09-2026
      — resultó legítima (generada por esta sesión en tu compu), pero de una ubicación
      que su búsqueda no alcanzó. Fingerprint: `SHA256:fb4Jpq95YSQc5LKlbuBYaBPVDvWoW2Hi1G8LzLqPNfE`.
      Si preferís no agregarla, no hace falta nada de tu parte: este asistente sigue
      dejando los cambios committeados localmente y vos los pusheás cuando quieras
      desde tu terminal o GitHub Desktop. [Arquitecto]
- [ ] **T20 — ¿2 minutos está bien** como el tiempo que tarda en aplicarse que
      desactivaste a un empleado? Hoy puede seguir operando hasta 2 min más con la
      sesión que ya tenía abierta. [Backlog]
- [ ] **T21 — ¿"Marca" merece ser un campo real y guardado** en la ficha de
      producto? Hoy se escribe en el formulario y se descarta en silencio al
      guardar. [Backlog]
- [ ] **Vencimiento de deuda a crédito, fijo en 30 días — ¿lo dejamos así o lo
      hacemos configurable** (por tenant o por venta)? [Backlog]
- [ ] **Cliente duplicado (mismo teléfono/email/CUIT) — ¿bloqueamos la carga,
      avisamos, o lo dejamos como está?** Hoy se puede crear dos veces la misma
      persona y su historial de deuda queda partido en dos. [Backlog]
- [ ] **Stock reservado por una cotización pendiente — ¿reserva de verdad, o
      sigue siendo solo informativo** (dos cotizaciones pueden "prometer" la misma
      última unidad)? [Backlog]
- [ ] **Desglose de billetes/monedas al abrir o cerrar caja — ¿lo validamos contra
      el monto declarado, o lo dejamos libre** a propósito? [Backlog]
- [ ] **¿Una sola caja abierta por comercio está bien,** o alguno va a operar con
      más de una caja física al mismo tiempo? [Backlog]
- [ ] **¿Hace falta una función para anular una venta ya cobrada** (hoy la única
      forma de revertir algo es Devoluciones)? [Backlog]
- [ ] **`PromotionUsage` en una devolución parcial (no total) — ¿libera cupo
      proporcional o no toca nada?** [Backlog]

## 4. Integraciones externas — para ir armando cuando tengas tiempo

> Tu asistente personal (ver más abajo) te puede acompañar paso a paso en cada una
> de estas — son casi todas configuración en paneles web, no código.

- [ ] **Resend:** verificar el dominio `solvenrs.com` (registros DNS) y actualizar
      `NEXT_PUBLIC_APP_URL=https://www.solvenrs.com` en Vercel — si queda con la URL
      vieja de Vercel, los links de los emails transaccionales rompen.
- [ ] **Cloudflare:** crear cuenta, agregar `solvenrs.com`, cambiar nameservers,
      esperar propagación (24-48hs), activar Always HTTPS + HSTS.
- [ ] **ARCA — ambiente de homologación:** acceso con Clave Fiscal nivel 3, para
      poder probar cambios de facturación sin tocar producción.
- [ ] **POSNET/datáfono automático:** definir con qué proveedor arrancar (Mercado
      Pago Point es el candidato más viable técnicamente, tiene SDK/API pública).
- [ ] **Cajón de efectivo automático:** definir qué impresora térmica/hardware usan
      o van a usar los comercios (la apertura depende de eso).
- [ ] **Rebill:** confirmar si la integración se probó alguna vez en sandbox antes
      de estar en producción. Si nunca se probó, vale la pena una sesión de QA ahí.

## 5. Pruebas manuales en producción — QA que no se puede hacer leyendo código

- [ ] **T18 — Smoke test completo:** venta contado, venta a crédito, inventario,
      promociones, de punta a punta en producción. ~55 min.
- [ ] **T8 — Devolución completa:** venta → devolución parcial → confirmar que el
      stock sube y la caja refleja la diferencia. ~55 min.
- [ ] **T19 — Promoción de segmento:** cliente VIP/Recurrente/Nuevo, promoción
      restringida a ese segmento, y devolución total confirmando que el cupo se
      libera. ~20 min.
- [ ] **ARCA-11 — Documentar casos de prueba de facturación reales**, con el CAE
      obtenido como evidencia (distintos tipos de comprobante, montos, errores).

## Ya resuelto — no es tuyo, es solo para que lo sepas

- El renombrado de `TAREAS/` y la reconciliación entre `main` y la rama de diseño
  ya están hechos y pusheados.
- El bug de `logAudit` que rompía la suite de tests completa quedó arreglado.
- La orden `SALE-TENANT-SCOPE` (el hallazgo 🔴 más grave de código pendiente) ya
  está escrita y esperando al agente ejecutor en `TAREAS/ORDEN_AGENTE_VS.md`,
  rama `main` — no depende de vos, depende de que el agente la ejecute.
