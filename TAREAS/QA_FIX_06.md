# QA-FIX-06 — Test de pagos de deuda concurrentes: a veces revienta con error crudo de Prisma en vez del error de negocio

> Origen: al verificar QA-FIX-05, `debt-payment-data-access.integration.test.ts > prevents concurrent payments from overpaying a debt` falló 3 veces seguidas en aislado (antes pasaba). El diff de QA-FIX-05 solo tocó `pos.tsx`, sin relación — esto ya venía como riesgo conocido desde el QA original ("no reprodujo en ese ciclo"). No es urgente (la plata está protegida, ver abajo) pero hay que cerrarlo prolijamente.

## Diagnóstico ya hecho (no re-investigar desde cero)

`src/modules/debts/debt-payment-data-access.ts`, función `registerDebtPayment` (líneas 18-81):

- El bloqueo real contra sobrepago es el `transaction.debt.updateMany({ where: { id, remainingAmount: { gte: paymentAmount } }, ... })` (líneas 36-42): es una actualización condicional atómica a nivel de base de datos — si otra transacción ya descontó el monto, esta `updateMany` afecta `0` filas y se lanza `DebtPaymentAmountError` (línea 44-46). **Esto es correcto y protege la plata sin importar qué pase con el manejo de errores de más abajo** — no hay riesgo de sobrepago real.
- El problema es el `catch` (líneas 68-77): solo reintenta (hasta 3 intentos) si el error es específicamente `Prisma.PrismaClientKnownRequestError` con código `P2034` (conflicto de transacción serializable). Cualquier otro código de error de Prisma se relanza tal cual (línea 76, `throw error`) — como una excepción cruda de Prisma, no como `DebtPaymentAmountError`. Contra una base real (Neon, con su propio pooler), dos transacciones verdaderamente paralelas pueden generar otros códigos de conflicto distintos a `P2034` (ej. error de conexión del pooler, timeout, u otro código de Prisma) que hoy no se manejan.
- Consecuencia: en el caso raro de que dos pagos choquen en el mismo instante contra el mismo pago, el cajero que pierde la carrera puede ver un error crudo de Prisma en la pantalla en vez de un mensaje claro tipo "el monto ya no está disponible, refrescá la deuda".

## Qué hacer

1. Reproducir el test en aislado varias veces (`npx vitest run src/modules/debts/debt-payment-data-access.integration.test.ts -t "prevents concurrent"` corrido 5 veces seguidas) y anotar en el reporte el/los código(s) de error de Prisma exactos que aparecen cuando falla (no asumir cuál es — confirmarlo con el mensaje/código real capturado).
2. Confirmar explícitamente en el reporte que, en cada corrida (pase o falle la aserción del tipo de error), las aserciones de integridad de datos siguen cumpliéndose: `payments` tiene longitud 1, `updatedDebt.remainingAmount` es `"20"`, `cashMovements` tiene longitud 1. Si alguna de estas llegara a fallar alguna vez, frenar y reportarlo como hallazgo 🔴 aparte — sería un caso real de sobrepago, no solo un error mal tipado.
3. Con el/los código(s) reales identificados en el paso 1, ampliar el `catch` de `registerDebtPayment` para que cualquier error de conflicto/transacción de Prisma que no sea el "camino feliz" (es decir, cualquier `Prisma.PrismaClientKnownRequestError` relacionado a conflictos de transacción, no solo `P2034`) se traduzca en `DebtPaymentAmountError` tras agotar los reintentos, en vez de relanzarse crudo. No convertir errores que no sean de conflicto (ej. errores de conexión reales, de validación, etc.) — esos sí deben seguir propagándose tal cual.
4. Correr el test 5 veces seguidas en aislado tras el fix para confirmar que ya no aparece el error crudo.

## Restricciones estrictas

1. No tocar el `updateMany` condicional (líneas 36-42) — ese es el mecanismo real de protección contra sobrepago, ya está bien.
2. No convertir en `DebtPaymentAmountError` ningún error que no sea genuinamente un conflicto de transacción concurrente (no ocultar errores reales de conexión/config detrás de un mensaje de negocio).
3. Si tras 5 corridas no logran reproducir la falla (podría ser timing-dependiente y no salir siempre), documentarlo así en el reporte y dejar el ensanche del `catch` igual aplicado de forma defensiva (es una mejora válida aunque no se reproduzca en el momento).

## Archivos afectados

- `src/modules/debts/debt-payment-data-access.ts` (único archivo de código esperado)

## Protocolo de reporte

1. `npm run typecheck` sin errores → `git add -A && git commit -m "fix: manejar codigos de conflicto de Prisma adicionales en registerDebtPayment (evita error crudo bajo concurrencia real)" && git push origin main`.
2. Agregar al final de `TAREAS/REPORTE_DE_CAMBIOS.md`: código(s) de error real(es) capturado(s), confirmación de integridad de datos en cada corrida, qué se cambió, resultado de 5 corridas del test tras el fix, hash del commit.
3. Agregar una entrada corta (2-4 líneas) arriba de todo en `TAREAS/REPORTELIDER.md` (formato `### 2026-07-17 — QA-FIX-06: [resumen]`) — sin borrar las entradas existentes.
4. Entregable en el chat: breve.
