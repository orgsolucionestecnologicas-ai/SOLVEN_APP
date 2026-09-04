# 5_NOTICIAS_CEO — parte del CEO técnico

> Archivo del Ingeniero Líder / CEO técnico de SOLVEN. Acá van **hallazgos, riesgos,
> opiniones y decisiones** — lo que pienso del proyecto y lo que hay que cambiar.
> No es el registro de lo ejecutado (`3_REPORTELIDER.md`), ni el backlog
> (`PENDIENTES.md`), ni una orden para el agente ejecutor (`ORDEN_AGENTE_VS.md`).
>
> Reglas de este archivo: entradas nuevas arriba; cada una con fecha y veredicto claro.
> Lo cerrado se marca `[RESUELTO]` con una línea de cómo se cerró; cuando el archivo
> pase las ~150 líneas se archiva en `TAREAS/historial/` con fecha de corte.

---

## 2026-09-04 — Auditoría de estado inicial y primeras correcciones

Leí completo `2_INGENIERO_LIDER.md`, `1_CLAUDE.md`, `PENDIENTES.md` y las 225 líneas de
`3_REPORTELIDER.md` (16-07 a 04-09-2026), y audité el repo contra git — no contra lo que
dicen los documentos. Esto es lo que veo.

### Lo que está bien, y hay que decirlo

El ciclo de auditoría proactiva (INGENIERODETESTEO → orden → agente ejecutor → verificación
contra el diff real) funciona. En cinco días encontró y cerró bugs que en producción cuestan
plata o clientes: forja de sesión OWNER trivial (`USER-FIX-01/02`), promociones de segmento
que nunca se aplicaban (`PROMO-FIX-01`), pago de deuda de otro tenant (`DEUDA-FIX-01`), doble
emisión de CAE (`REPORTE-FIX-01`). Y la regla de no confiar en el self-report ya se pagó sola:
`FIX-14` traía una recursión infinita que lint, typecheck y tests dejaron pasar y que hubiera
crasheado Reportes entero. El proceso no es burocracia — está encontrando cosas.

---

### 🔴 Hallazgo nuevo — La auditoría puede tumbar el proceso, y el fix documentado empeoraba la cosa

Esto lo encontré yendo a arreglar algo chico y es lo más importante de esta entrada.

`PENDIENTES.md` → `TEST-FLAKY-STOCK-ADJ` prescribía un fix de una línea: cambiar
`void logAudit(...)` por `await logAudit(...)` en `stock-adjustment.ts:74`. **Ese fix estaba
mal y había que no aplicarlo.** Fui a leer `logAudit` antes de tocar nada y aparecieron dos
cosas:

1. **`logAudit` no captura sus propios errores.** Es un `await prisma.auditLog.create(...)`
   pelado. Y se invoca como `void logAudit(...)` en ~20 route handlers. Un `void` sobre una
   promesa que rechaza es una **unhandled promise rejection**: en Node moderno eso puede
   terminar el proceso. O sea: si el INSERT de auditoría falla (FK, timeout de Neon, la base
   caída un segundo), el que se cae no es la auditoría — es el request, o el proceso entero,
   **después** de que la venta / el pago de deuda / la devolución ya se persistieron. Nadie
   lo había visto porque en el camino feliz nunca falla.
2. **Poner `await` como pedía el ticket lo hubiera empeorado.** La transacción de negocio ya
   commiteó cuando se llama a `logAudit`; esperarla significa que un fallo de auditoría
   devuelve 500 sobre una operación que **ya pasó**. El cajero ve error, reintenta, y ajusta
   el stock dos veces. Cambiar ruido de test por un bug de datos reales es mal negocio.

**Lo que hice en su lugar** (`src/modules/audit/audit-data-access.ts`): contener el error
dentro de `logAudit` — `try/catch` con `console.error` — en un solo lugar, en vez de en los
20 call sites. Con eso: desaparece la unhandled rejection en toda la app, los call sites
siguen siendo `void` (sin cambiar latencia de ningún endpoint), ninguna operación de negocio
ya persistida puede devolver 500 por la auditoría, y de paso el test flaky deja de fallar,
porque la violación de FK que la carrera del test provoca ahora se registra y se traga en vez
de escapar. Un cambio, tres problemas.

**Lección para el proceso, no solo para este bug:** un ítem de `PENDIENTES.md` que trae el fix
ya escrito ("es una línea, cambiar X por Y") merece la misma lectura del código que uno que no
lo trae. El diagnóstico del ticket era correcto; la cura, no.

---

### [RESUELTO] Constitución sin commitear y ruido de fin de línea

Al arrancar detecté dos riesgos: `2_INGENIERO_LIDER.md` (la reescritura del rol de CEO) existía
solo como archivo untracked en el disco, sin respaldo en ninguna rama; y 26 archivos de código
figuraban modificados con ~13.000 líneas de diff que eran **cero** cambios reales (`git diff -w`
vacío) — puro CRLF vs LF, sin `.gitattributes` en el repo.

Cerrado en el commit `6946fb7` (renombre de `TAREAS/` + `.gitattributes` con `* text=auto eol=lf`),
ya pusheado. Verificado por mí: los archivos volvieron a LF y el árbol quedó limpio.

Queda la regla, que sigue vigente: **nada de `TAREAS/` debería terminar una sesión sin commitear.**

### [RESUELTO] `main` y `design` con dos constituciones distintas

Durante esta sesión, `main` seguía con el `INGENIERO_LIDER.md` viejo de 358 líneas mientras
`design` tenía la reescritura del CEO — cualquier sesión parada en `main` leía reglas viejas.
Cerrado en `61f5ba6` ("reconciliar TAREAS/ de main con design + crear ORDEN_AGENTE_VS.md"),
todavía **sin pushear a `origin/main`**.

---

### 🟠 La "rama de diseño" ya no es una rama de diseño

`design/revision-uiux-sep-2026` nació el 02-09 para aprobar cambios visuales en un preview de
Vercel. Hoy tiene 45 archivos de diferencia con `main`, incluidas **migraciones de Prisma,
cambios de `schema.prisma`, `returns/index.ts` reescrito (926 líneas) y endpoints nuevos**
(`GET /api/sales/[id]`). Eso no es pulido visual: es un segundo `main`.

Lo que ya cuesta, verificado contra git:

- **`4_REPORTE_DE_CAMBIOS.md` en `design` tenía basura peligrosa:** el reporte completo de
  `POS-FIX-01..04` del 31-08, un ciclo que ya verifiqué y cerré. En `main` estaba vacío, como
  corresponde. Un agente que leyera la copia de `design` iba a creer que había una entrega
  esperando verificación. **Lo vacié en esta sesión.**
- **Colisión anunciada con `ARCA-NC-01`:** esa orden vive en `main` y toca `returns/index.ts` y
  `src/lib/arca`. En `design`, `returns/index.ts` está reescrito casi entero. Si se ejecuta
  mientras la rama sigue viva, el merge obliga a resolver a mano un conflicto en el archivo que
  maneja dinero **y** facturación fiscal a la vez.
- Lo mismo, más chico, con `SALE-TENANT-SCOPE`: toca `sale-data-access.ts`, que `design` ya
  modificó. La orden está escrita para `main` — correcto — pero el merge posterior va a tener
  que conciliar las dos versiones.

**Mi recomendación, y no es neutral:** cerrar la rama esta semana. Revisás el preview, aprobás o
recortás lo que no esté listo, y se mergea. Sostener dos `main` una semana más nos va a costar
más caro que apurar la aprobación visual.

### 🔴 Credenciales: lo más caro del proyecto, y no depende de código

`.env.production.example` **está trackeado en git**, y hay un commit llamado literalmente
"sanitiza credenciales de ejemplo" que lo tocó. Sanitizar un archivo no borra nada: la versión
anterior sigue viva en el historial. No abrí el archivo (regla del proyecto) y no afirmo qué
contenía — pero el nombre de ese commit y la advertencia heredada en `1_CLAUDE.md` apuntan al
mismo lado.

Conclusión operativa: **rotar la password de Neon no es opcional**, y no se arregla editando el
archivo hoy. Junto con `T3` (token de GitHub expuesto) y `T2` (`SOLVEN_SESSION_SECRET`), son
tres ítems 🔴 abiertos desde julio, en producción, con clientes reales y una base compartida
entre todos los tenants. Ningún bug del backlog técnico se le acerca en costo potencial.
**Es lo único de esta lista que no puedo hacer yo.**

### 🟠 Rebill: no estoy de acuerdo con seguir difiriéndolo

`src/app/api/webhooks/rebill/route.ts:12` hace `if (!secret) return true;` — sin la variable de
entorno, el webhook acepta **cualquier** POST sin verificar firma. La decisión del 18-07 fue
tratar Rebill al final del proyecto y la respeto como orden de prioridad; pero posponer *la
integración* terminó siendo posponer *un fail-open en producción*, que no es lo mismo.

No lo cambié por mi cuenta, y el motivo es concreto, no timidez: si `REBILL_WEBHOOK_SECRET` no
está cargada en Vercel, invertir ese `return` hace que **todos** los webhooks de Rebill empiecen
a rechazarse y las suscripciones dejen de actualizarse — clientes reales pagando sin que el
sistema se entere. Necesito una sola cosa tuya para ejecutarlo con seguridad: **confirmame que
la variable está cargada en Vercel** (Production y Preview). Con eso, es un cambio de una línea.

### 🟡 Cero tests de render en la UI donde se toca plata

`pos.tsx`, `returns.tsx` y `cash-register-close.tsx` no tienen ninguna cobertura de render — el
repo no tiene jsdom ni Testing Library. `FIX-14` ya demostró que ahí se esconden bugs que
typecheck y lint no ven. Propongo agregar jsdom + RTL y cubrir esos tres archivos, nada más: no
una campaña de tests de UI, solo donde un bug se traduce en un cobro mal hecho.

### 🟡 El cuello de botella del proyecto sos vos, no el código

De los ~32 ítems abiertos en `PENDIENTES.md`, la mayoría no espera un programador: espera una
decisión tuya. TTL de sesión (`T20`), marca de producto (`T21`), vencimiento de deuda a 30 días,
stock reservado por cotizaciones, cliente duplicado, `PromotionUsage` en devoluciones parciales,
validación del desglose de caja, una caja por tenant, anulación de venta. Diez preguntas de dos
minutos cada una.

Mientras no se resuelvan, el backlog se ve más grande de lo que es y no puedo priorizar bien: no
distingo "no está hecho" de "no está decidido". **Propongo una sesión corta de decisiones en
bloque** — yo llevo cada pregunta con la recomendación técnica y el costo, vos decidís
sí / no / después. Media hora tuya limpia un tercio del backlog.

---

### Orden de prioridad recomendado

1. Vos: rotar credenciales (`T2` / `T3` / `T5`).
2. `SALE-TENANT-SCOPE` en `main` (orden ya escrita en `ORDEN_AGENTE_VS.md`).
3. Cerrar la rama de diseño — aprobar el preview o recortar — y mergear a `main`.
4. Rebill, en cuanto me confirmes que el secreto está en Vercel.
5. `ARCA-NC-01`, con los códigos de comprobante de Nota de Crédito verificados contra la tabla
   oficial de AFIP antes de habilitar en prod — la orden misma marca ese punto como no confirmado.
6. jsdom + RTL para los tres archivos de UI donde se cobra.

### Nota de proceso — vaciado de `3_REPORTELIDER.md`

Me pediste vaciarlo y lo hice. `2_INGENIERO_LIDER.md` lo define como "log acumulativo permanente,
nunca se vacía", así que resolví el conflicto sin perder nada: el contenido está archivado íntegro
en `TAREAS/historial/3_REPORTELIDER_archivo_hasta_2026-09-04.md` y sigue en git. De paso quedó a la
vista que la regla ya estaba rota antes — la copia de `main` se había vaciado el 03-09 con una
política escrita distinta a la de `design`. Cuando me lo confirmes, unifico esa línea de la
constitución con lo que de verdad hacemos: archivar con fecha de corte y vaciar cada ~80 líneas.
