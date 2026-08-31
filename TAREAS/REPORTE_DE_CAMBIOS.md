# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

## RET-FIX-01..07 — Devoluciones: carrera de cantidad, reintegro con descuento, deuda MIXED, permisos GET, caja abierta, servicios, auditoría — 2026-08-31

7 bugs confirmados por INGENIERODETESTEO (`TAREAS/ordenestest.md`), 6 corregidos + 1 diferido por decisión de producto, todos en un solo commit por instrucción explícita de la orden.

### RET-FIX-01 — Condición de carrera en la validación de cantidad ya devuelta
- `returns/index.ts`: `processReturn` corre dentro de una transacción con `isolationLevel: "Serializable"` (antes: nivel por defecto Read Committed, sin ningún guard atómico).
- El `.catch()` mapea el conflicto de Postgres a `ReturnConcurrentConflictError` (409, "otra operación modificó la misma venta..."). Código real determinado empíricamente con un script de reproducción mínima (dos `$transaction` concurrentes, Serializable, sobre la misma fila): el conflicto llegó como `P2028` ("Transaction API error: Unable to start a transaction in the given time"), no `P2034` como se había asumido inicialmente. Se mapean ambos códigos — P2034 sigue siendo la documentada por Prisma para "write conflict or deadlock" y podría manifestarse así bajo otra latencia/carga.

### RET-FIX-02 — Reintegro a precio de lista completo, ignorando el descuento de la venta
- `returns/index.ts`: el monto reintegrado por unidad ahora se prorratea por el descuento real de la venta (`unitPrice * (1 - sale.discountAmount / sale.totalAmount)`) en vez de usar `SaleItem.unitPrice` sin descontar.

### RET-FIX-03 — Devolución sobre venta MIXED no reducía la Debt asociada
- `returns/index.ts`: la condición que descuenta `Debt.remainingAmount` pasó de `sale.paymentType === "CREDIT"` a `(sale.paymentType === "CREDIT" || sale.paymentType === "MIXED") && sale.debtId`, misma lógica de piso en 0 ya existente.

### RET-FIX-04 — GET /api/returns sin chequeo de rol
- `src/app/api/returns/route.ts`: `GET` pasó de `requireTenantId()` a `requireRole([...], "returns")`, igual que `POST`.

### RET-FIX-05 — processReturn no exigía sesión de caja abierta
- `returns/index.ts`: mismo chequeo que `createSale` — sin `CashRegisterSession` con `status: "OPEN"`, lanza `SaleNoCashRegisterOpenError` (reutilizada del módulo `sales`) antes de crear el `CashMovement` de reintegro en efectivo.

### RET-FIX-06 — Devolución de venta de Servicio (DIFERIDO — decisión de producto)
- No implementado. Falta confirmar con Diego si es un caso de uso real de negocio para SOLVEN antes de extender `ReturnItemInput`/`processReturn` para aceptar `serviceId`. Queda documentado en `ordenestest.md`, no tocado en el código.

### RET-FIX-07 — Devoluciones no quedaban registradas en AuditLog
- `src/app/api/returns/route.ts`: `POST` ahora llama `logAudit({ tenantId, userId, action: "RETURN_CREATED", entityType: "Return", entityId, metadata: { saleId, totalReturned, refundMethod } })`, mismo patrón que `/api/sales`.
- `src/modules/audit/audit-data-access.ts`: `AuditAction` extendido con `"RETURN_CREATED"`.

### Tests
- `src/app/api/returns/route.test.ts`: 5 tests nuevos — 403 en GET sin rol, listado paginado en GET, 409 sin caja abierta, 409 en conflicto concurrente, `logAudit` llamado con los argumentos esperados tras un return exitoso.
- `src/modules/returns/index.integration.test.ts`: 4 tests nuevos — reintegro prorrateado por descuento, deuda de venta MIXED reducida, rechazo de reintegro en efectivo sin caja abierta, dos devoluciones concurrentes sobre la misma venta (una gana, la otra recibe `ReturnConcurrentConflictError`; stock y `ReturnItem` reflejan una sola devolución real).

### Validación
- `npm run lint`, `npm run typecheck` y `npm test` — 360 passed / 2 skipped. Una falla puntual en `core-business-flow.integration.test.ts` ("Server has closed the connection", corte de conectividad Neon) en la corrida completa, en un archivo no tocado por esta orden; re-corrida sola, en verde — confirmado transitorio, no relacionado.
