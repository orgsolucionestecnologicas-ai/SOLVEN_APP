# REPORTE — T21+T15+T22
## Estado: COMPLETADO
## Migraciones corridas:
- 20260528010000_add_multitenancy — agrega Tenant, User, UserRole; tenantId a 13 modelos

## Archivos creados:
- prisma/migrations/20260528010000_add_multitenancy/migration.sql
- src/lib/auth.ts — hashPassword, verifyPassword, createSession, verifySession (HMAC + bcryptjs)
- src/lib/tenant.ts — getTenantId(), requireTenantId()
- src/app/api/auth/register/route.ts — POST registro: crea Tenant + User, login inmediato
- src/app/register/page.tsx — formulario de registro con link a /login

## Archivos modificados:
- prisma/schema.prisma — modelos Tenant, User, UserRole; tenantId en Product, Sale, Customer, Expense, CashMovement, CashRegisterSession, Debt, DebtPayment, InventoryMovement, Category, Service, Promotion, StoreSettings
- prisma/seed.ts — crea demo tenant (demo@solven.app / demo1234), todos los datos vinculados al tenant
- src/lib/session.ts — re-exporta desde auth.ts para compatibilidad
- src/middleware.ts — verifica sesión con verifySession de auth.ts, permite /register
- src/app/api/auth/login/route.ts — autentica contra DB User (email + bcrypt), sesión incluye tenantId
- src/app/login/page.tsx — campo email en lugar de usuario, link a /register
- 20+ módulos data-access — todos los métodos aceptan tenantId como segundo parámetro
- 25+ rutas API — llaman requireTenantId() al inicio y pasan tenantId a los módulos
- 15 archivos de tests — actualizados con tenant mock o creación de tenant de prueba

## Tests: 179 pasando (37 archivos)
## Observaciones:
- Commit: 953032d feat: add multi-tenancy with user registration and per-tenant data isolation
- Lint y typecheck limpios
- Registro en /register crea Tenant + User OWNER, login inmediato al dashboard
- Login en /login usa email + contraseña contra BD (no más env vars hardcodeadas)
- Cada consulta a la BD filtra por tenantId del usuario autenticado
- Tests de integración crean tenants temporales con emails únicos y limpian después
- Tests unitarios de rutas mockean @/lib/tenant para evitar context de cookies
