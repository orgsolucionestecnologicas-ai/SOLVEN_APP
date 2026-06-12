# ARCA QA — Resultados de Testing en Homologación

**Fecha:** _______________  
**Ambiente:** Homologación (homo)  
**CUIT emisor:** _______________  
**Punto de venta:** _______________  

---

## Criterio de aceptación
Todos los 10 casos deben pasar antes del pase a producción.

Estado general: ⬜ PENDIENTE / ✅ APROBADO / ❌ RECHAZADO

---

## Caso 1 — Factura B a Consumidor Final (IVA 21% puro)

- **Estado:** ⬜ / ✅ / ❌
- **CAE obtenido:** _______________
- **Número de comprobante:** _______________
- **ImpTotal:** $ _____ | **ImpNeto:** $ _____ | **ImpIVA:** $ _____
- **Verificación aritmética:** ImpNeto = ImpTotal / 1.21 → ✅ / ❌
- **Notas:** 

---

## Caso 2 — Factura B con alícuotas mixtas (21% + 10.5%)

- **Estado:** ⬜ / ✅ / ❌
- **CAE obtenido:** _______________
- **Iva[] recibido:** `[{id:5, baseImp:..., importe:...}, {id:4, baseImp:..., importe:...}]`
- **Verificación:** suma(ImpNeto + ImpIVA) = ImpTotal → ✅ / ❌
- **Notas:**

---

## Caso 3 — Factura B con producto exento (IVA 0%)

- **Estado:** ⬜ / ✅ / ❌
- **CAE obtenido:** _______________
- **ImpOpEx:** $ _____ (debe = suma de ítems exentos)
- **Iva[]:** los exentos NO aparecen en Iva[], van en ImpOpEx → ✅ / ❌
- **Notas:**

---

## Caso 4 — Factura C (Monotributista)

- **Estado:** ⬜ / ✅ / ❌
- **CAE obtenido:** _______________
- **ImpNeto = ImpTotal:** ✅ / ❌  
- **ImpIVA = 0:** ✅ / ❌  
- **Iva[] vacío:** ✅ / ❌
- **Notas:**

---

## Caso 5 — Factura A a Responsable Inscripto (CUIT receptor)

- **Estado:** ⬜ / ✅ / ❌
- **CAE obtenido:** _______________
- **voucherType = 1:** ✅ / ❌
- **CUIT receptor utilizado:** _______________
- **Notas:**

---

## Caso 6 — Verificación del QR ARCA

- **Estado:** ⬜ / ✅ / ❌
- **URL QR generada:** `https://www.arca.gob.ar/fe/qr/?p=...`
- **QR escaneado correctamente:** ✅ / ❌
- **Portal ARCA muestra datos correctos:** ✅ / ❌
- **Screenshot:** [adjuntar imagen]
- **Notas:**

---

## Caso 7 — Rechazo por datos incorrectos (CUIT inválido)

- **Estado:** ⬜ / ✅ / ❌
- **Error devuelto por ARCA:** _______________
- **UI muestra mensaje amigable:** ✅ / ❌
- **Invoice NO guardada en DB:** ✅ / ❌
- **Notas:**

---

## Caso 8 — Renovación automática de token WSAA expirado

- **Estado:** ⬜ / ✅ / ❌
- **Procedimiento:** actualizar `expiresAt` en ARCATokenCache a fecha pasada → intentar factura
- **Sistema renovó token automáticamente:** ✅ / ❌
- **Factura emitida sin error al usuario:** ✅ / ❌
- **Notas:**

---

## Caso 9 — Protección contra doble emisión

- **Estado:** ⬜ / ✅ / ❌
- **Error devuelto:** "Esta venta ya tiene una factura emitida (CAE: ...)"
- **HTTP status recibido:** 422 → ✅ / ❌
- **Invoice duplicada en DB:** NO ✅ / SÍ ❌
- **Notas:**

---

## Caso 10 — Comportamiento ante desconexión ARCA

- **Estado:** ⬜ / ✅ / ❌
- **Procedimiento:** apuntar a URL WSFE inválida temporalmente
- **UI muestra error amigable:** ✅ / ❌
- **CAE guardado en DB:** NO ✅ / SÍ ❌
- **Notas:**

---

## Resumen de casos

| Caso | Descripción | Estado |
|------|-------------|--------|
| 1 | Factura B — IVA 21% puro | ⬜ |
| 2 | Factura B — alícuotas mixtas | ⬜ |
| 3 | Factura B — producto exento | ⬜ |
| 4 | Factura C — Monotributista | ⬜ |
| 5 | Factura A — RI con CUIT | ⬜ |
| 6 | QR ARCA verificado | ⬜ |
| 7 | Rechazo datos incorrectos | ⬜ |
| 8 | Renovación token expirado | ⬜ |
| 9 | Doble emisión bloqueada | ⬜ |
| 10 | Desconexión ARCA | ⬜ |

**Casos aprobados: __ / 10**

---

## npm test al finalizar QA

```
npm run lint && npm run typecheck && npm test
```

Resultado: todos los tests pasando → ✅ APROBADO PARA PRODUCCIÓN

---

*Completar este documento y adjuntar al commit de pase a producción.*
