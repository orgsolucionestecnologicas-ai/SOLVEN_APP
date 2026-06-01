# ORDEN AL AGENTE — T21 + T15 + T22
## Multi-tenancy + Registro de clientes + Protección por tenant

---

## Contexto
SOLVEN hoy es single-tenant: un solo usuario, credenciales hardcodeadas en variables de entorno.
Para soportar 50 clientes independientes necesitamos:
1. Multi-tenancy: cada cliente tiene su propio espacio de datos aislado
2. Página de registro: el cliente se crea su propia cuenta
3. Protección: cada API query filtra por el tenant del usuario autenticado

---

## Lo que tenés que hacer

### PASO 1 — Modelo Tenant y User en Prisma

Agregar en `prisma/schema.prisma`:

```prisma
model Tenant {
  id           String    @id @default(cuid())
  businessName String
  email        String    @unique
  plan         String    @default("trial")
  trialEndsAt  DateTime?
  active       Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  users        User[]
  products     Product[]
  sales        Sale[]
  customers    Customer[]
  expenses     Expense[]
  cashRegisters CashRegister[]
  debts        Debt[]
  categories   Category[]
  services     Service[]
  promotions   Promotion[]
  storeSettings StoreSettings?
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  password     String
  name         String    @default("")
  role         UserRole  @default(OWNER)
  tenantId     String
  tenant       Tenant    @relation(fields: [tenantId], references: [id])
  createdAt    DateTime  @default(now())
}

enum UserRole {
  OWNER
  CASHIER
  INVENTORY
}
```

Agregar `tenantId String` a los modelos: Product, Sale, Customer, Expense, CashRegister, CashMovement, Debt, DebtPayment, Category, Service, Promotion, StoreSettings, InventoryMovement.

Agregar la relación `tenant Tenant @relation(fields: [tenantId], references: [id])` en cada uno.

Agregar `@@index([tenantId])` en cada modelo modificado.

Correr: `npx prisma migrate dev --name add-multitenancy`

---

### PASO 2 — Sistema de sesión basado en JWT con tenantId

Reemplazar el sistema de autenticación actual (variables de entorno hardcodeadas) por uno basado en base de datos:

1. Crear `src/lib/auth.ts` con funciones:
   - `hashPassword(password: string): Promise<string>` — usar bcryptjs
   - `verifyPassword(password: string, hash: string): Promise<boolean>`
   - `createSession(userId: string, tenantId: string): Promise<string>` — JWT firmado con SOLVEN_SESSION_SECRET
   - `verifySession(token: string): Promise<{ userId: string, tenantId: string } | null>`

2. Reescribir `src/app/api/auth/login/route.ts`:
   - Buscar el User por email en la BD
   - Verificar password con bcrypt
   - Crear JWT con { userId, tenantId }
   - Guardar en cookie httpOnly

3. Actualizar `src/middleware.ts`:
   - Leer el JWT de la cookie
   - Verificar y decodificar → obtener tenantId
   - Pasar tenantId en el header `x-tenant-id` para que las rutas API lo lean

---

### PASO 3 — Helper getTenantId() para las rutas API

Crear `src/lib/tenant.ts`:

```typescript
import { cookies } from 'next/headers';
import { verifySession } from './auth';

export async function getTenantId(): Promise<string | null> {
  const cookieStore = cookies();
  const token = cookieStore.get('solven_session')?.value;
  if (!token) return null;
  const session = await verifySession(token);
  return session?.tenantId ?? null;
}

export async function requireTenantId(): Promise<string> {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Unauthorized');
  return tenantId;
}
```

---

### PASO 4 — Actualizar TODOS los data-access para filtrar por tenantId

En cada archivo `src/modules/*/[nombre]-data-access.ts`, agregar `tenantId` a:
- Todos los `findMany` → agregar `where: { tenantId }`
- Todos los `create` → agregar `data: { tenantId, ...rest }`
- Todos los `findUnique` que necesiten validar pertenencia → verificar que el registro pertenece al tenant

Módulos a actualizar:
- products/product-data-access.ts
- sales/sale-data-access.ts
- customers/customer-data-access.ts
- expenses/expense-data-access.ts
- cash/cash-movement-data-access.ts
- cash-register/cash-register-data-access.ts
- debts/debt-data-access.ts + debt-payment-data-access.ts
- categories/category-data-access.ts
- services/service-data-access.ts
- promotions/promotion-data-access.ts
- inventory/inventory-movement-data-access.ts + stock-adjustment.ts
- settings/settings-data-access.ts

---

### PASO 5 — Actualizar las rutas API para pasar tenantId

En cada `src/app/api/*/route.ts`, al inicio de cada handler:

```typescript
import { requireTenantId } from '@/lib/tenant';

export async function GET() {
  const tenantId = await requireTenantId();
  // pasar tenantId a las funciones del módulo
}
```

---

### PASO 6 — Página de registro (/register)

Crear `src/app/register/page.tsx` con formulario:
- Nombre del negocio (businessName)
- Email
- Contraseña (mínimo 8 caracteres)
- Confirmar contraseña

Crear `src/app/api/auth/register/route.ts` (POST):
1. Validar los campos
2. Verificar que el email no esté ya registrado
3. Crear el Tenant con businessName y email
4. Crear el User con password hasheada, rol OWNER, vinculado al Tenant
5. Crear sesión automáticamente (login inmediato post-registro)
6. Redirigir a /onboarding o /dashboard

El formulario de registro debe tener link a /login ("¿Ya tenés cuenta? Iniciá sesión").
El formulario de login debe tener link a /register ("¿No tenés cuenta? Registrate gratis").

---

### PASO 7 — Seed actualizado

Actualizar `prisma/seed.ts` para crear:
1. Un Tenant de prueba (nombre: "Comercio Demo", email: "demo@solven.app")
2. Un User asociado (email: "demo@solven.app", password: "demo1234", rol: OWNER)
3. Todos los datos de prueba existentes vinculados a ese tenant

---

## Criterio de éxito

- Un usuario puede registrarse en /register con email y contraseña
- Después de registrarse entra directo al dashboard
- Puede crear productos, ventas, clientes — todo queda en su propio espacio
- Si se registra un segundo usuario con otro email, NO ve los datos del primero
- `npm test` pasa sin errores (actualizar los tests que rompan por el tenantId)
- El login en /login sigue funcionando con las nuevas credenciales de BD

---

## Cuando termines

Escribí el resultado en `REPORTE_AGENTE.md`:

```
# REPORTE — T21+T15+T22
## Estado: COMPLETADO / ERROR
## Migraciones corridas:
## Archivos creados:
## Archivos modificados:
## Tests: X pasando
## Observaciones:
```

Luego borrá este archivo `ORDEN_AGENTE.md`.
