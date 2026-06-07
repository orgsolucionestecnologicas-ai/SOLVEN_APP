# Reporte de ejecución — ORDEN T10 + T16

## TAREA 1 — T10: Ticket de impresión en POS
- `src/app/ui/pos.tsx`: `PrintModal` ahora obtiene `businessName` real desde `GET /api/settings` (con fallback "Mi negocio") y reemplaza todas las apariciones de "Tienda Demo" en `handlePrintTicket` y `handlePrintInvoice`.
- Ticket: agregada columna "P.Unit" (`Producto | Cant. | P.Unit | Total`).
- Ticket: si hay descuento (`total < suma de ítems`), se muestra línea "Descuento: -$X" antes del total.
- Factura: agregado subtítulo "Comprobante de venta" debajo del nombre del negocio.
- No se modificó la estructura del modal ni los botones.
- Decisión: no se agregó mapeo de método de pago — `paymentMethod` ya contiene strings legibles en español ("Efectivo", "Tarjeta", "Transferencia", "VentaWeb", "Otro", "Fiado") consistentes con el resto de la UI; un mapeo para valores de enum inexistentes (CASH/CARD/etc.) habría sido código muerto.

## TAREA 2 — T16: Multi-usuario con roles
- `prisma/schema.prisma`: agregado `READONLY` al enum `UserRole` (ya existían OWNER/CASHIER/INVENTORY). Migración `add_user_roles` aplicada en Neon.
- `src/lib/auth.ts`: `SessionPayload` incluye `role`; `createSession` recibe y persiste el rol; `verifySession` retrocompatible (default `"OWNER"` para tokens antiguos sin rol).
- `src/app/api/auth/login/route.ts` y `register/route.ts`: pasan `user.role` a `createSession`.
- `src/lib/tenant.ts`: agregadas `getSession()` y `requireRole(allowedRoles)`.
- `src/modules/users/`: nuevo módulo con validaciones (`user-validation.ts`) y acceso a datos (`user-data-access.ts`): `listUsers`, `createUser`, `updateUserRole`, `deleteUser`, con protección de auto-modificación (no se puede cambiar el propio rol ni eliminarse a sí mismo).
- `src/app/api/users/route.ts` y `[id]/route.ts`: GET/POST/PATCH/DELETE protegidos con `requireRole(["OWNER"])`.
- `src/app/api/me/route.ts`: extendido para incluir `role` en la respuesta (se evitó crear un endpoint duplicado `/api/auth/me`, ya que `/api/me` cumple la misma función y ya es consumido por `SidebarUser`).
- `src/app/usuarios/page.tsx` + `src/app/ui/users-list.tsx`: nueva vista de gestión de usuarios con badges de color por rol (OWNER violeta, CASHIER azul, INVENTORY esmeralda, READONLY gris), alta de usuarios, cambio de rol y eliminación con confirmación. Ruta creada en `src/app/usuarios/` (plana), siguiendo la convención real del proyecto (`/customers`, `/settings`, `/cuenta`), no bajo `/dashboard/` como sugería la orden literal.
- `src/app/ui/app-shell.tsx`: ítem "Usuarios" visible solo para OWNER; "Configuración" oculto para CASHIER y READONLY. Rol obtenido vía `/api/me`.
- Rutas protegidas con `requireRole`:
  - `POST /api/products`, `PUT /api/products/[id]` → OWNER, INVENTORY
  - `POST /api/expenses` → OWNER, CASHIER
  - `POST /api/inventory-adjustments` → OWNER, INVENTORY
  - `PATCH /api/settings` → OWNER
- Actualizados los mocks de `@/lib/tenant` en 4 archivos de test (`products` y `expenses`, unitarios e integración) para incluir `requireRole`.

## Validación
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin errores
- `npm test`: 37 archivos / 180 tests — todos pasan
- `npm run build`: compilación exitosa, 32 rutas generadas (incluye `/usuarios`, `/api/users`, `/api/users/[id]`)

## Commits
- `064c4a3` feat(T10): ticket de impresión con nombre real del negocio
- `9d12058` feat(T16): multi-usuario con roles (OWNER/CASHIER/INVENTORY/READONLY)
