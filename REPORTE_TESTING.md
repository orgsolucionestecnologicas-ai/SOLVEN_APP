# REPORTE DE TESTING — SOLVEN
## Fecha: 2026-05-27

## Fase 1 — Resultados automáticos
- npm test: PASS — 176 tests, 37 archivos, 0 fallando
- TypeScript: PASS — sin errores
- ESLint: PASS — sin errores
- Prisma validate: PASS — schema válido

---

## Bugs encontrados

### 🔴 CRÍTICO — Contraseña de producción débil en .env
**Archivo:** `.env` línea 3  
**Descripción:** `SOLVEN_PASSWORD="solven2024"` — contraseña trivialmente adivinable. El mismo valor figura en `CLAUDE.md` como la credencial activa de la URL de producción `https://solven-app-484v.vercel.app`. Si este valor está cargado en Vercel, cualquier persona que lo sepa puede acceder al sistema.  
**Reproducción:** Ir a `/login` y autenticarse con `admin` / `solven2024`.  
**Nota:** El archivo `.env` está correctamente en `.gitignore` y no fue commiteado. El riesgo es si este valor está cargado tal cual en las variables de entorno de Vercel.

---

### 🟠 IMPORTANTE — Devoluciones dobles posibles (stock sobre-repuesto)
**Archivo:** `src/modules/returns/index.ts` líneas 41–55  
**Descripción:** `processReturn` valida que `returnItem.quantity` no supere `saleItem.quantity` (cantidad original vendida), pero no existe ningún registro de devoluciones previas. Si se devuelven 3 unidades de un producto vendido en 5 y luego se llama `processReturn` nuevamente con 4 unidades del mismo producto y la misma venta, la segunda devolución pasa la validación (4 ≤ 5) y el stock se incrementa en exceso. No hay modelo `Return` en el schema que permita rastrear cantidades ya devueltas.  
**Reproducción:**
1. Crear venta con producto X, cantidad 5.
2. Procesar `POST /api/returns` con `{ saleId, items: [{ productId, quantity: 3 }] }`.
3. Procesar el mismo request de nuevo.
4. El stock del producto aumentó 6 unidades en total para una venta de 5.

---

### 🟠 IMPORTANTE — Devoluciones de ventas a crédito no reducen la deuda
**Archivo:** `src/modules/returns/index.ts` líneas 84–93  
**Descripción:** Cuando `sale.paymentType === "CREDIT"`, `processReturn` restaura el stock y registra el movimiento de inventario, pero no toca el registro `Debt` asociado. El `remainingAmount` de la deuda del cliente nunca se reduce. El cliente queda debiendo el monto original aunque los productos fueron devueltos físicamente.  
**Reproducción:**
1. Crear venta a crédito por $1000 para el cliente X. Se crea `Debt.remainingAmount = 1000`.
2. Devolver todos los ítems de esa venta vía `POST /api/returns`.
3. Consultar la deuda del cliente — sigue mostrando $1000 pendientes.

---

### 🟠 IMPORTANTE — Ventas en efectivo sin caja abierta no son rechazadas por la API
**Archivo:** `src/modules/sales/sale-data-access.ts` líneas 159–181 / `src/app/api/sales/route.ts`  
**Descripción:** `createSale` crea un `CashMovement` de tipo IN cuando el pago es CASH, pero nunca verifica que exista una `CashRegisterSession` con `status = "OPEN"`. La validación solo existe en el frontend: el POS deshabilita botones y muestra un banner, pero el API acepta la operación sin sesión. Un POST directo a `/api/sales` con `paymentType: "CASH"` crea movimientos de caja flotantes (sin sesión) que rompen el cuadre de caja.  
**Reproducción:**
1. Cerrar la caja (o no abrirla nunca).
2. Hacer `POST /api/sales` con `{ paymentType: "CASH", items: [...] }`.
3. La venta se registra y crea un `CashMovement` sin sesión activa.

---

### 🟡 MENOR — JSON inválido en apertura de caja devuelve 500 en lugar de 400
**Archivo:** `src/app/api/cash-register/route.ts` líneas 14–28  
**Descripción:** El handler `POST` de apertura de caja llama `request.json()` dentro de un try/catch genérico. Si el body es JSON inválido, el error cae en el catch final y retorna 500 con "No se pudo abrir la sesión de caja." en lugar de 400 con un mensaje de validación. Todos los demás endpoints usan el helper `invalidJsonResponse()` para este caso.  
**Reproducción:** `POST /api/cash-register` con body `{invalid json}`.

---

### 🟡 MENOR — Falla de carga de servicios en POS es silenciosa
**Archivo:** `src/app/ui/pos.tsx` líneas 401–418  
**Descripción:** El fetch de servicios tiene un catch vacío con comentario `// services panel shows empty on error`. Si la API falla, la sección de servicios simplemente no aparece y el usuario no recibe ningún mensaje. Contrasta con el fetch de productos, que sí tiene un estado de error visible.

---

## Flujos sin problemas
- Stock nunca queda negativo: la query `UPDATE ... WHERE stock >= quantity` es atómica y lanza `SaleInsufficientStockError` si falla.
- Pago de deuda no puede exceder el saldo: doble protección (check explícito + `updateMany` condicional).
- Ventas concurrentes no generan overselling: test de concurrencia pasando.
- Motor de promociones maneja correctamente los 7 tipos de promociones, expiración, límites de uso y límites por cliente.
- Middleware protege todas las rutas (incluyendo todas las rutas de API) excepto `/`, `/login` y `/api/auth/*`.
- Ajustes de inventario validan que `newStock >= 0`.
- Caja no puede abrirse si ya hay una sesión abierta (`CashRegisterAlreadyOpenError`).
- No hay variables de entorno hardcodeadas en el código fuente (ANTHROPIC_API_KEY se lee de `process.env`).
- `.env` no está en el historial de git.

---

## Resumen
- 🔴 Críticos: 1
- 🟠 Importantes: 3
- 🟡 Menores: 2
