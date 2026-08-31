# ÓRDENES DE TESTEO — SOLVEN

> Archivo de trabajo de INGENIERODETESTEO (ver `TAREAS/INGENIERODETESTEO.md`
> para el protocolo completo). Acá se acumulan los hallazgos de la auditoría
> proactiva de edge cases, sección por sección, más reciente arriba. No se
> vacía entre ciclos como `REPORTE_DE_CAMBIOS.md` — es el historial completo
> de todo lo auditado, para no repetir trabajo.

---

## Devoluciones — hallazgo suelto (previo al arranque formal por secciones), 31-08-2026

> Este hallazgo salió al pensar el ejemplo que dio Diego para justificar esta
> metodología, antes de que INGENIERODETESTEO existiera como rol formal. Se
> deja acá como primer registro del formato, ya migrado también a
> `PENDIENTES.md`.

### Bugs confirmados
- **Devolución sobre venta MIXED no reduce la `Debt` asociada** — `src/modules/returns/index.ts:317`. `processReturn` solo descuenta `Debt.remainingAmount` cuando `sale.paymentType === "CREDIT"`. Desde `FEATURE-01` una venta `MIXED` también tiene `Sale.debtId` por su porción fiada, pero la condición no la contempla — al devolver un producto de una venta mixta, la deuda del cliente no baja aunque devolvió mercadería. Fix: `(sale.paymentType === "CREDIT" || sale.paymentType === "MIXED") && sale.debtId`, misma lógica de "no bajar de 0" que ya existe en las líneas siguientes.

### Inconcluso (necesita reproducción en vivo o decisión de producto)
- **Reintegro no se valida contra el desglose original de pago dividido** — `processReturn` exige un único `refundMethod` para toda la devolución, sin mostrar ni validar contra `Sale.paymentDetails`. Puede ser una decisión de negocio válida (el comercio decide cómo reintegra) — confirmar con Diego si necesita cambiar.

---
