
# ORDEN AL AGENTE DE TESTING — SOLVEN

## Tu rol
Sos el agente de QA de SOLVEN. Tu único trabajo es encontrar problemas.
No escribas features. No mejores código. No sugieras refactors.
Solo buscá, reportá y clasificá por severidad.

---

## Fase 1 — Verificación automática

Ejecutá estos comandos en orden y anotá cada resultado:

1. `npm test` — todos los tests deben pasar. Si alguno falla, reportalo con el nombre exacto del test y el error.
2. `npx tsc --noEmit` — no debe haber errores de TypeScript.
3. `npx eslint . --ext .ts,.tsx` — no debe haber errores de lint (warnings son aceptables).
4. `npx prisma validate` — el schema debe ser válido.

---

## Fase 2 — Revisión de flujos críticos

Revisá el código de cada flujo y buscá inconsistencias, errores de lógica o casos no manejados:

### Flujo 1 — Caja y ventas
- `src/modules/cash-register/` — ¿qué pasa si se intenta abrir una caja ya abierta?
- `src/app/api/sales/route.ts` — ¿verifica que la caja esté abierta antes de registrar una venta?
- ¿Qué pasa si se registra una venta en efectivo y no hay caja abierta?

### Flujo 2 — Stock e inventario
- ¿Las ventas descuentan stock correctamente?
- ¿Las devoluciones reponen stock correctamente?
- ¿Los ajustes de inventario validan que el stock no quede negativo?
- `src/modules/inventory/stock-adjustment.ts` — revisar lógica de validación

### Flujo 3 — Deudas y pagos
- `src/modules/debts/` — ¿se puede pagar más de lo que se debe?
- ¿Al registrar una venta a crédito se crea la deuda correctamente?
- ¿El pago de deuda actualiza el saldo del cliente?

### Flujo 4 — Devoluciones
- `src/modules/returns/index.ts` — ¿se puede devolver más cantidad de la que se vendió?
- ¿Si la venta fue a crédito, la devolución maneja la deuda?
- ¿Qué pasa si se intenta devolver un producto de una venta cancelada?

### Flujo 5 — Autenticación y sesión
- `src/middleware.ts` — ¿protege todas las rutas que deben estar protegidas?
- ¿Las rutas de API verifican sesión en todos los endpoints?
- ¿Existe alguna ruta de API sin protección que debería tenerla?

### Flujo 6 — Promociones
- `src/modules/promotions/promotion-engine.ts` — ¿el motor aplica correctamente cada tipo de promoción?
- ¿Qué pasa si se aplica una promoción expirada?
- ¿Qué pasa si se aplica un código de promoción inválido?

---

## Fase 3 — Revisión de API

Para cada ruta en `src/app/api/`, verificar:
- ¿Usa los helpers de `_shared/responses.ts` de forma consistente?
- ¿Maneja el caso de body inválido o vacío?
- ¿Tiene `export const dynamic = 'force-dynamic'` donde corresponde?
- ¿Alguna ruta devuelve datos sensibles que no debería?

---

## Fase 4 — Revisión de UI

Revisá los componentes principales en `src/app/ui/`:
- ¿Hay componentes que no manejan el estado de error (solo happy path)?
- ¿Hay llamadas a fetch sin manejo de error?
- ¿Hay componentes que podrían crashear con datos vacíos o null?
- ¿El POS (`pos.tsx`) maneja correctamente el caso de caja cerrada?

---

## Fase 5 — Seguridad básica

- ¿Las credenciales de producción siguen siendo `admin/solven2024`? (CRÍTICO si es así)
- ¿Hay variables de entorno hardcodeadas en el código fuente?
- ¿El `SOLVEN_SESSION_SECRET` tiene un valor seguro en `.env`?
- ¿Hay tokens o API keys expuestos en el código?

---

## Formato del reporte

Escribí el resultado completo en `REPORTE_TESTING.md` con esta estructura:

```
# REPORTE DE TESTING — SOLVEN
## Fecha: [fecha]

## Fase 1 — Resultados automáticos
- npm test: [PASS/FAIL] — [N tests, N pasando, N fallando]
- TypeScript: [PASS/FAIL]
- ESLint: [PASS/FAIL]
- Prisma validate: [PASS/FAIL]

## Bugs encontrados

### 🔴 CRÍTICO — [título]
**Archivo:** ...
**Descripción:** ...
**Reproducción:** ...

### 🟠 IMPORTANTE — [título]
**Archivo:** ...
**Descripción:** ...

### 🟡 MENOR — [título]
**Archivo:** ...
**Descripción:** ...

## Flujos sin problemas
- ...

## Resumen
- Críticos: N
- Importantes: N
- Menores: N
```

No borrés este archivo `ORDEN_TESTING.md` cuando termines.
El archivo de reporte debe llamarse `REPORTE_TESTING.md`.
