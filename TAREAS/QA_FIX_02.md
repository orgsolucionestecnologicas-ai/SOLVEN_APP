# QA FIX 02 — Conectar RolePermission a la autorización real (dejó de ser decorativo)

> Origen: `TAREAS/QA_REPORTE.md`, hallazgo 🔴 "RolePermission (permisos configurables) no tiene ningún efecto en el backend — es 100% decorativo".
>
> Decisión de producto ya tomada por Diego (2026-07-16): **conectarlo de verdad**, no solo aclarar en la UI que es decorativo. El panel de Ajustes → Usuarios → Permisos debe pasar a controlar acceso real en la API, no solo qué se ve en el menú.
>
> **Depende de `TAREAS/QA_FIX_01.md` — ejecutar esa tarea primero (o en paralelo si no pisa los mismos archivos) y confirmar que pasa typecheck/tests antes de arrancar esta.**

---

## TAREA QA-FIX-02 · 🔴 `requireRole` debe consultar `RolePermission` antes de autorizar

### Descripción y diseño (leer completo antes de tocar código)

Hoy `requireRole(allowedRoles)` en `src/lib/tenant.ts` solo verifica si el rol del usuario está en un array hardcodeado por ruta. Hay que sumarle una segunda capa: si la ruta pertenece a una de las "secciones" que ya existen en `RolePermission` (`dashboard`, `pos`, `returns`, `products`, `customers`, `cashMovements`, `quotes`, `reports`, `promotions`, `settings` — confirmá la lista exacta contra `src/modules/role-permissions/role-permission-validation.ts`, es la fuente de verdad), y hay una fila de `RolePermission` para `{tenantId, role, section}` con `canAccess: false`, la request debe rechazarse aunque el rol esté en el array hardcodeado.

**Reglas de diseño no negociables:**

1. **`RolePermission` solo puede restringir, nunca ampliar.** El array hardcodeado de cada ruta sigue siendo el techo máximo de acceso. Si un rol no está en el array hardcodeado, sigue rechazado sin importar lo que diga `RolePermission` (eso no cambia con esta tarea).
2. **`OWNER` nunca puede quedar bloqueado por `RolePermission`**, en ningún endpoint, bajo ninguna circunstancia — ya es una regla que la UI de permisos respeta (`role-permission-validation.ts` ya impide sacarle a OWNER el acceso a `settings`), pero la nueva verificación en `requireRole` tiene que reforzarlo también a nivel de código, no confiar solo en que la UI no deje guardar esa combinación. Si por algún motivo llegara a existir una fila `{OWNER, cualquier sección, canAccess: false}` en la base, igual debe ignorarse para el rol OWNER.
3. **Si no existe ninguna fila configurada para `{tenantId, role, section}`, el comportamiento debe ser idéntico al de hoy** (permitir, según el array hardcodeado) — no asumir un default restrictivo. Esto es clave para no romper ningún tenant que nunca tocó la pantalla de Permisos.
4. **Rutas que no pertenecen a ninguna de las secciones conocidas no se tocan** — siguen funcionando exactamente igual que hoy, solo con el array hardcodeado. No hace falta (ni se pide en esta tarea) inventarles una sección nueva.
5. Reusá la función de data-access que ya existe en `src/modules/role-permissions/` para leer permisos (la que ya usa `GET /api/role-permissions` y/o `app-shell.tsx`) — no dupliques la lógica de lectura de la tabla.

### Prompt para el agente
```
Leé el archivo CLAUDE.md para contexto del proyecto.

1. Mirá cómo app-shell.tsx usa hoy RolePermission para decidir qué ítems de navegación mostrar/ocultar
   (es la única lectura de RolePermission que existe hoy en el código) y qué función de
   src/modules/role-permissions/ consulta. Confirmá la lista exacta de "section" válidas contra
   role-permission-validation.ts.

2. Extendé requireRole en src/lib/tenant.ts para aceptar un segundo parámetro opcional, section?: string
   (o el tipo que ya use RolePermission para section). Si se pasa section:
   - Si el rol es OWNER, no se aplica ninguna restricción adicional de RolePermission (bypass explícito,
     no solo "porque hoy no se puede configurar así" — hacelo explícito en el código).
   - Si no es OWNER, buscá la fila {tenantId, role, section}. Si existe y canAccess === false, lanzá
     ForbiddenError (mismo tipo de error que ya se usa cuando el array hardcodeado rechaza el rol).
   - Si no existe fila, o canAccess === true, seguí exactamente el comportamiento actual (evaluado solo
     por el array hardcodeado de roles).

3. Mapeá cada sección de RolePermission a sus endpoints de API reales, siguiendo el mismo criterio que ya
   usa app-shell.tsx para decidir qué esconder (mismo mapeo sección-a-funcionalidad, para que UI y backend
   cuenten la misma historia). Agregá el segundo parámetro section a los requireRole(...) de esos endpoints
   de escritura. Si una sección cubre varios recursos de API (ej. "customers" cubre tanto /api/customers
   como /api/debts si así lo trata la navegación), aplicá el mismo section a todos los que correspondan
   según ese mapeo — documentá en el reporte final la tabla completa de qué endpoint quedó con qué section,
   para que quede trazable.

4. No toques los 9 endpoints de QA_FIX_01 más allá de sumarles el parámetro section si les corresponde uno
   según el mapeo del punto 3 — no cambies los arrays de roles que ya quedaron ahí.

5. Tests obligatorios antes de terminar:
   - Un test que confirme que OWNER nunca es bloqueado por RolePermission aunque exista una fila
     {OWNER, x, canAccess:false} en la base (simulá esa fila directo, no solo por la UI).
   - Un test que confirme que un rol no-OWNER con canAccess:false en una sección recibe 403 en al menos
     un endpoint real de esa sección.
   - Un test que confirme que si no hay ninguna fila de RolePermission para esa combinación, el
     comportamiento es idéntico al actual (permitido si el rol está en el array hardcodeado).
   - Corré npm run typecheck y npm test dos veces — cero regresiones nuevas más allá de la única falla
     ya conocida y aceptada (sales/route.integration.test.ts, documentada desde antes).

6. Si en algún momento el mapeo sección-a-endpoint no es obvio o ambiguo, no inventes una decisión de
   producto — documentalo en el reporte como "pendiente de confirmar con Diego" y seguí con el resto,
   en vez de adivinar y arriesgar dejar un endpoint mal cerrado (falso positivo de seguridad) o
   accidentalmente bloqueado (falso negativo que rompe el uso normal).
```

### RESTRICCIONES ESTRICTAS
- No cambies ningún array de roles hardcodeado existente — `RolePermission` solo agrega una restricción adicional posible, nunca reemplaza el array.
- No permitas, bajo ninguna circunstancia, que `OWNER` quede bloqueado por esta nueva capa.
- No inventes secciones nuevas de `RolePermission` que no existan ya en `role-permission-validation.ts`.
- No toques la pantalla de Permisos (`role-permissions-table.tsx`) ni el endpoint `PATCH /api/role-permissions` — su comportamiento de guardado no cambia, solo cambia que ahora sus datos se usan de verdad.
- No toques `TAREAS/QA_FIX_01.md` ni revietas nada de esa tarea.

### Archivos afectados
- `src/lib/tenant.ts` (extender `requireRole`)
- Endpoints de API que correspondan según el mapeo del punto 3 del prompt (documentar la lista final en el reporte)
- Tests nuevos según el punto 5 del prompt

---

## PROTOCOLO DE REPORTE

Mismo formato que `QA_FIX_01`: bloque en `TAREAS/REPORTE_DE_CAMBIOS.md` con `### TAREA QA-FIX-02 — ✅ Completada`, incluyendo la tabla final de qué endpoint quedó mapeado a qué `section`, y cualquier ambigüedad que haya quedado pendiente de confirmar con Diego.

**Además, agregá una entrada corta (2-4 líneas) al principio de `TAREAS/REPORTELIDER.md`**, mismo formato que en `QA_FIX_01`:

```
### YYYY-MM-DD — QA-FIX-02: [título corto]
[2-4 líneas: qué se tocó, resultado, algo crítico a destacar si lo hay]
```

### Reglas del ciclo
- Regla de oro: no modifiques lógica de negocio, BD ni archivos fuera de los indicados. Ante la duda, menos es más — y ante la duda de una decisión de 