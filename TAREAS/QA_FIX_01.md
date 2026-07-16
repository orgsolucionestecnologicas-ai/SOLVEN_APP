# QA FIX 01 — Cerrar hallazgo crítico: endpoints de escritura sin verificación de rol

> Origen: `TAREAS/QA_REPORTE.md`, hallazgo 🔴 "Varios endpoints de escritura no verifican rol — READONLY puede crear deudas, editar/borrar clientes, crear categorías y servicios".
>
> **Regla de oro: esta es una tarea de seguridad, no de features. No toques nada que no esté explícitamente listado abajo. No refactorices `requireRole`, `requireTenantId` ni el módulo `src/lib/tenant.ts` — solo agregá la llamada a `requireRole([...])` que falta en cada handler, calcada del patrón exacto que ya usan sus rutas hermanas.**

---

## TAREA QA-FIX-01 · 🔴 Agregar `requireRole` a los 9 endpoints de escritura que hoy solo exigen sesión

### Descripción
El QA confirmó en vivo que un usuario con rol `READONLY` puede escribir datos reales en 9 endpoints porque solo llaman a `requireTenantId()` (exige sesión válida, sin mirar el rol) en vez de `requireRole([...])`. Hay que agregar la verificación de rol correcta a cada uno, usando exactamente el mismo patrón que ya usan las rutas hermanas del mismo recurso (mismo import, mismo try/catch de `ForbiddenError`/`UnauthorizedError`, misma forma de devolver `forbiddenResponse()`/`unauthorizedResponse()`).

Los arrays de roles a usar **ya están confirmados por code review contra las rutas hermanas** — no hay que inventarlos ni pedirle nada a Diego, son estos:

| Endpoint | Handler | Array de roles a usar | Por qué (ruta hermana) |
|---|---|---|---|
| `src/app/api/debts/route.ts` | `POST` | `["OWNER", "CASHIER", "SUPERVISOR"]` | Igual que `POST /api/debt-payments` (mismo dominio: gestión de deudas de cliente) |
| `src/app/api/customers/[id]/route.ts` | `PUT` | `["OWNER", "CASHIER", "SUPERVISOR"]` | Igual que `POST /api/customers` (alta del mismo recurso) |
| `src/app/api/customers/[id]/route.ts` | `DELETE` | `["OWNER", "CASHIER", "SUPERVISOR"]` | Igual que `POST /api/customers` |
| `src/app/api/categories/route.ts` | `POST` | `["OWNER", "INVENTORY"]` | Igual que `POST /api/products` (categorías son parte del dominio de Productos) |
| `src/app/api/categories/[id]/route.ts` | `DELETE` | `["OWNER", "INVENTORY"]` | Igual que arriba |
| `src/app/api/categories/[id]/subcategories/route.ts` | `POST` | `["OWNER", "INVENTORY"]` | Igual que arriba |
| `src/app/api/categories/[id]/subcategories/[subId]/route.ts` | `DELETE` | `["OWNER", "INVENTORY"]` | Igual que arriba |
| `src/app/api/services/route.ts` | `POST` | `["OWNER", "INVENTORY"]` | Igual que `PUT`/`PATCH /api/services/[id]` (ya protegidos con este mismo array) |
| `src/app/api/recurring-expenses/route.ts` | `POST` | `["OWNER", "CASHIER"]` | Igual que `POST /api/expenses` (gasto recurrente es un gasto) |

### Prompt para el agente
```
Leé el archivo CLAUDE.md para contexto del proyecto.

En cada uno de estos 9 handlers, agregá una verificación de rol con requireRole(...) usando exactamente
el array de roles indicado en la tabla de TAREAS/QA_FIX_01.md. Calcá el patrón línea por línea de una ruta
hermana ya protegida del mismo recurso (por ejemplo, para customers/[id] mirá cómo POST /api/customers/route.ts
usa requireRole, y aplicá el mismo import, el mismo try/catch de ForbiddenError/UnauthorizedError, y el mismo
forbiddenResponse()/unauthorizedResponse() en customers/[id]/route.ts). No cambies ninguna otra lógica de
negocio de estos handlers, solo agregá la verificación de rol donde falta.

Endpoints y roles exactos:
1. src/app/api/debts/route.ts (POST) -> ["OWNER", "CASHIER", "SUPERVISOR"]
2. src/app/api/customers/[id]/route.ts (PUT) -> ["OWNER", "CASHIER", "SUPERVISOR"]
3. src/app/api/customers/[id]/route.ts (DELETE) -> ["OWNER", "CASHIER", "SUPERVISOR"]
4. src/app/api/categories/route.ts (POST) -> ["OWNER", "INVENTORY"]
5. src/app/api/categories/[id]/route.ts (DELETE) -> ["OWNER", "INVENTORY"]
6. src/app/api/categories/[id]/subcategories/route.ts (POST) -> ["OWNER", "INVENTORY"]
7. src/app/api/categories/[id]/subcategories/[subId]/route.ts (DELETE) -> ["OWNER", "INVENTORY"]
8. src/app/api/services/route.ts (POST) -> ["OWNER", "INVENTORY"]
9. src/app/api/recurring-expenses/route.ts (POST) -> ["OWNER", "CASHIER"]

Después de aplicar los 9 cambios:
1. Corré npm run typecheck y npm test — no debe haber regresiones nuevas (la única falla ya conocida y
   aceptada es sales/route.integration.test.ts > creates a credit sale with debt through the API flow).
2. Si es posible en este entorno, replicá la prueba que hizo QA: mintear un token de sesión con rol READONLY
   vía createSession() (mismo mecanismo ya documentado en QA_REPORTE.md, sin contraseña, sin tocar datos
   reales fuera de un valor idempotente/de prueba que limpies después) y confirmar que los 9 endpoints ahora
   devuelven 403 en vez de 200/201. Si no se puede replicar en este entorno, decilo explícitamente en el
   reporte en vez de omitirlo.
3. Agregá (si no existen ya) casos de test unitarios/de integración cortos que confirmen el 403 para rol no
   autorizado en al menos 2 o 3 de estos endpoints (los más críticos: debts POST, customers/[id] DELETE),
   siguiendo el patrón de tests de rol ya existente en el proyecto (ver ejemplos en otros route.test.ts que
   ya prueban requireRole). No hace falta cubrir los 9 con test si el patrón ya quedó demostrado en 2 o 3.
```

### RESTRICCIONES ESTRICTAS
- No toques `src/lib/tenant.ts`, `requireRole`, `requireTenantId` ni ninguna función compartida — el fix es agregar la llamada correcta en cada handler, no modificar cómo funciona la verificación en sí.
- No toques el hallazgo 🔴 de `RolePermission` (está pendiente de una decisión de Diego sobre su diseño, es una tarea aparte).
- No toques ningún otro endpoint fuera de los 9 listados, aunque encuentres otros casos sospechosos al mirar el código — si encontrás uno, **documentalo en el reporte, no lo arregles en esta misma tarea** (mantener el fix acotado y verificable).
- No cambies ningún array de roles ya existente en otra ruta — solo agregás lo que falta.

### Archivos afectados
- `src/app/api/debts/route.ts`
- `src/app/api/customers/[id]/route.ts`
- `src/app/api/categories/route.ts`
- `src/app/api/categories/[id]/route.ts`
- `src/app/api/categories/[id]/subcategories/route.ts`
- `src/app/api/categories/[id]/subcategories/[subId]/route.ts`
- `src/app/api/services/route.ts`
- `src/app/api/recurring-expenses/route.ts`
- Archivos de test nuevos/editados según corresponda (ver punto 3 del prompt).

---

## PROTOCOLO DE REPORTE

Igual que el ciclo de features: escribí el resultado en `TAREAS/REPORTE_DE_CAMBIOS.md` (creá el archivo si no existe, con el mismo formato usado en los lotes anteriores — un bloque `### TAREA QA-FIX-01 — ✅ Completada` con Qué se hizo / Archivos modificados / Migraciones / Algo pendiente / typecheck).

### Reglas del ciclo
- Regla de oro: no modifiques lógica de negocio, BD ni archivos fuera de los indicados. Ante la duda, menos es más.
- Commit y push al final: `git add -A` (en este caso sí podés incluir los archivos de `src/app/api/**` tocados, no solo `TAREAS/`, porque es el propósito de esta tarea), commit descriptivo mencionando "QA-FIX-01", y `git push origin main`.
- Cuando termines, avisá que `TAREAS/QA_FIX_01.md` está listo para que el Ingeniero Líder lo revise contra `TAREAS/QA_REPORTE.md` — no lo borres vos, lo borra/archiva el Ingeniero Líder después de revisarlo.
