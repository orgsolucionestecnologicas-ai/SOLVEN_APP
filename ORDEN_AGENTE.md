# ORDEN AL AGENTE — Correcciones QA (4 decisiones de Diego)

## Contexto
El QA anterior identificó 4 puntos que requieren decisión de Diego.
Las decisiones están tomadas. Ejecutá exactamente lo que dice cada punto.

---

## CORRECCIÓN 1 — Sacar campos innecesarios del formulario de nuevo cliente

**Archivo:** `src/app/ui/customer-new-form.tsx`

Eliminar del formulario los siguientes campos (inputs + labels):
- Cédula / RNC
- Dirección
- Ciudad
- Código Postal

Mantener solo: Nombre (obligatorio), Teléfono, Email.

Verificar que el formulario sigue funcionando correctamente después de la eliminación.

---

## CORRECCIÓN 2 — Menú "..." en ficha de cliente

**Archivo:** `src/app/ui/customer-detail.tsx`

Hacer estos cambios en el menú de 3 puntos (menú contextual del cliente):

**Eliminar** los botones:
- "Exportar historial"
- "Enviar estado de cuenta"

**Implementar** el botón "Eliminar cliente":
- Al hacer click, mostrar un diálogo de confirmación: "¿Eliminar a [nombre del cliente]? Esta acción no se puede deshacer."
- Si confirma: llamar a DELETE `/api/customers/[id]`
- Verificar que el endpoint DELETE existe en `src/app/api/customers/[id]/route.ts`
  - Si no existe, crearlo: verificar que el cliente pertenece al tenant, eliminar con `prisma.customer.delete`
  - Si el cliente tiene deudas pendientes, retornar error 400: "No podés eliminar un cliente con deudas pendientes"
- Después de eliminar exitosamente: redirigir a `/customers`

---

## CORRECCIÓN 3 — Sacar botón "Estadísticas" de la lista de productos

**Archivo:** `src/app/ui/products-inventory.tsx`

Buscar el botón con ícono `BarChart2` (estadísticas) que aparece en cada fila de producto.
Eliminarlo completamente (botón + ícono + import si queda sin uso).

---

## CORRECCIÓN 4 — Conectar sidebar al tenant y usuario real

**Archivo:** `src/app/ui/app-shell.tsx`

El sidebar muestra "Tienda Demo" y "Propietario" hardcodeados.
Hay que leerlos desde la sesión real del usuario autenticado.

Pasos:
1. Crear endpoint GET `/api/me` que devuelva:
   ```json
   { "name": "nombre del usuario", "businessName": "nombre del negocio del tenant" }
   ```
   Leer `user.name` y `user.tenant.businessName` desde Prisma usando el tenantId de la sesión.

2. En `app-shell.tsx`, hacer fetch a `/api/me` al montar el componente.

3. Mostrar en el sidebar:
   - Nombre del negocio: `businessName` del tenant (el que configuró en Settings)
   - Nombre del usuario: `name` del User (o el email si el name está vacío)

4. Si el fetch falla o está cargando, mostrar un skeleton o los valores vacíos — nunca "Tienda Demo".

---

## AL FINAL

1. Correr `npm test` — verificar que sigue en verde
2. `git add -A`
3. `git commit -m "fix: QA corrections — remove unused fields/buttons, connect sidebar to tenant"`
4. `git push origin main`

Escribí el resultado en `REPORTE_AGENTE.md`:

```
# REPORTE — Correcciones QA
## Estado: COMPLETADO / ERROR
## Correcciones aplicadas:
## Tests: X pasando
## Commit: xxxxx
## Observaciones:
```

Luego borrá este archivo `ORDEN_AGENTE.md`.
