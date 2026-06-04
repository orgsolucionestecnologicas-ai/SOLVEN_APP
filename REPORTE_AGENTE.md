# REPORTE — Correcciones QA
## Estado: COMPLETADO
## Correcciones aplicadas:
1. `customer-new-form.tsx` — eliminados campos Cédula/RNC, Dirección, Ciudad, Código Postal; quedan solo Nombre, Teléfono, Email
2. `customer-detail.tsx` — eliminados botones "Exportar historial" y "Enviar estado de cuenta"; implementado "Eliminar cliente" con diálogo de confirmación y llamada a DELETE /api/customers/[id]
3. `customers/[id]/route.ts` — agregado handler DELETE con validación de tenant, verificación de deudas pendientes y eliminación con Prisma
4. `products-inventory.tsx` — eliminado botón "Estadísticas" (BarChart2) sin handler
5. `app-shell.tsx` — sidebar inferior ahora llama a GET /api/me y muestra businessName y name del usuario real; eliminados "Tienda Demo" / "Propietario" hardcodeados
6. `api/me/route.ts` — nuevo endpoint GET que devuelve { name, businessName } desde la sesión

## Tests: 179 pasando
## Commit: a5d63e1 fix: QA corrections — remove unused fields/buttons, connect sidebar to tenant
## Observaciones:
- Lint y typecheck limpios
- El sidebar muestra "·" como inicial mientras carga, nunca "Tienda Demo"
- DELETE /api/customers/[id] retorna 400 si el cliente tiene deudas pendientes
