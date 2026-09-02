# REPORTE DE CAMBIOS — SOLVEN

> Actualizado automáticamente por Claude (Código) después de cada tarea.
> Al final del día Diego dice "revisá el reporte" → el Ingeniero Líder verifica contra el diff real, deja su nota en REPORTELIDER.md, y vacía este archivo (no se borra el archivo en sí, se limpia el contenido para el próximo ciclo).

---

<!-- El agente irá agregando reportes aquí debajo, del más reciente al más antiguo -->

### 2026-09-02 — PROMO-FIX-01..07 (Promociones)

**Orden ejecutada:** sección "Promociones — auditado 02-09-2026" / "Bugs confirmados" de `ordenestest.md`, hallazgos PROMO-FIX-01 a PROMO-FIX-07 de INGENIERODETESTEO.

**PROMO-FIX-01 (CRÍTICO) — segmento de cliente nunca llegaba al motor.**
`applyPromotionsToCart(cartItems, promotions, customerId?, customerSegment?)` acepta un 4º parámetro `customerSegment`, pero ninguno de los dos call sites en producción se lo pasaba — resultado: cualquier promoción restringida a segmento (VIP/Recurrente/Nuevo) nunca se aplicaba, sin importar el cliente. Fix en ambos call sites:
- `src/app/api/promotions/apply/route.ts`: antes de llamar al motor, si viene `customerId` se busca `prisma.customer.findFirst({ where: { id, tenantId }, select: { segment: true } })` y se pasa el `segment` real.
- `src/modules/sales/sale-data-access.ts`: mismo patrón dentro de la transacción (`transaction.customer.findFirst(...)`), como fetch nuevo y separado del fetch de cliente que ya existe más abajo para límite de crédito (no se tocó ese código existente).

**PROMO-FIX-02 (ALTO) — dos sub-fixes.**
1. *Política de combinación.* Antes, el motor bloqueaba reaplicación por `Set<PromotionType>` (por tipo), permitiendo que promociones de tipos distintos se combinaran sin control sobre el mismo producto. Diego definió la política explícitamente: **"quiero que solo se aplique la mejor oferta, las promociones no deben ser acumulables en el mismo producto"** — por producto, gana únicamente la promoción que da el mayor descuento, nunca se combinan, sin importar el tipo. Implementado como reescritura completa de la lógica de combinación en `src/modules/promotions/promotion-engine.ts`:
   - Cada promoción vigente y aplicable (fecha, uso, segmento) se corre en aislamiento (`runPromotionInIsolation`) contra una copia de los ítems con precio original — reusa sin cambios todas las funciones `apply*Promotion` existentes (PERCENTAGE, FIXED_AMOUNT, SPECIAL_PRICE, TWO_FOR_ONE/THREE_FOR_TWO, MINIMUM_PURCHASE, BUNDLED_PRODUCTS), minimizando riesgo de bugs nuevos en el cálculo.
   - Cada corrida produce `ItemProposal[]` (una propuesta de descuento por ítem afectado).
   - Se recolectan todas las propuestas de todas las promociones y, por `itemIndex`, se queda solo la de mayor `itemDiscountTotal` (`greaterThan` estricto — en empate exacto gana la promoción procesada primero).
   - Los precios finales y el detalle de `appliedPromotions` se arman a partir de los ganadores, no de mutación acumulativa.
2. *Detección de solapamiento incompleta.* `findOverlappingPromotions` (`src/modules/promotions/promotion-data-access.ts`) solo detectaba solapamiento entre promociones con el mismo `application` exacto. Reescrita para: ALL_PRODUCTS se marca como solapada con cualquier promoción vigente CATEGORY o SPECIFIC_PRODUCT (y viceversa); CATEGORY se marca solapada con SPECIFIC_PRODUCT cuando el producto de esta última pertenece a esa categoría (consulta extra a `prisma.product` solo cuando aplica). Usada tanto por el aviso en vivo del formulario de alta/edición como por `POST /api/promotions/check-overlap` (esta ruta no se tocó, se beneficia automáticamente).

**PROMO-FIX-03 (ALTO) — validaciones de coherencia tipo/aplicación ausentes.**
`src/modules/promotions/promotion-validation.ts`: `validateCreatePromotion` y `validateUpdatePromotion` ahora rechazan:
- `type === "SPECIAL_PRICE"` combinado con cualquier `application` distinto de `"SPECIFIC_PRODUCT"`.
- `application === "SPECIFIC_PRODUCT"` (de cualquier tipo) sin `productAId` no vacío.
`validateUpdatePromotion` cambió de firma — ahora recibe un segundo parámetro `existing: { type, application }`, porque `type`/`application` son inmutables post-creación y la validación de edición necesita conocer los valores vigentes para poder exigir coherencia también al actualizar (ej. no permitir vaciar `productAId` en una promoción que ya es SPECIFIC_PRODUCT). `updatePromotion` en `promotion-data-access.ts` se reordenó: ahora hace `findFirst` del registro existente antes de validar, y pasa `{type: existing.type, application: existing.application}` a la validación. Confirmado por grep que `validateCreatePromotion`/`validateUpdatePromotion` solo se llaman desde `promotion-data-access.ts` — no hay otro caller que haya requerido actualización por el cambio de firma.

**PROMO-FIX-04 (MEDIO) — desfasaje UTC en fechas de vigencia.**
Mismo patrón raíz que REPORTE-FIX-03 (ya cerrado en otro módulo): `src/app/ui/promotions.tsx` construía `startsAt`/`endsAt` con `new Date(form.endsAt).toISOString()` sin offset explícito — al venir de un `<input type="date">` (string `YYYY-MM-DD` puro), `Date` lo interpreta en UTC, no en la hora de Argentina, corriendo la fecha de vigencia un día. Corregido en los dos puntos donde se construye (payload de alta/edición y el `fetch` del aviso de solapamiento en vivo): `T00:00:00-03:00` para `startsAt`, `T23:59:59.999-03:00` para `endsAt` (fin de día inclusivo).

**PROMO-FIX-05 (MEDIO) — devolución total no liberaba el cupo de uso de la promoción.**
`processReturn` (`src/modules/returns/index.ts`) nunca tocaba `PromotionUsage`, así que una devolución completa de una venta que había usado una promoción con tope de uso quemaba esa cuota para siempre, aunque la venta ya no exista como tal. Fix: dentro de la misma transacción, después de crear el `Return`, se calcula si la devolución es total (todos los `SaleItem` de producto —se excluyen ítems de servicio, que no tienen `productId`— quedan completamente cubiertos entre lo ya devuelto antes y lo que se devuelve ahora) y, si es así, se borran las filas `PromotionUsage` de ese `saleId` (`tx.promotionUsage.deleteMany({ where: { saleId } })`). Las devoluciones parciales quedan explícitamente fuera de alcance — es una decisión de producto pendiente, documentada en la sección "Inconcluso" de la propia orden, no un olvido de esta ejecución.

**PROMO-FIX-06 (BAJO-MEDIO) — 5 rutas GET con permiso más débil que el resto del módulo.**
El módulo de promociones es OWNER-only en el resto de sus rutas, pero 5 GET seguían con `requireTenantId()` (cualquier rol autenticado del tenant). Cambiadas a `requireRole(["OWNER"])`, con manejo de `ForbiddenError`→403: `src/app/api/promotions/route.ts` (GET), `src/app/api/promotions/[id]/route.ts` (GET), `src/app/api/promotions/[id]/usages/route.ts` (GET), `src/app/api/promotions/ranking/route.ts` (GET), `src/app/api/promotions/expiring/route.ts` (GET). Explícitamente **no** se tocó `POST /api/promotions/apply` (debe seguir siendo accesible a cualquier cajero para el preview en vivo del carrito de POS) ni `POST /api/promotions/check-overlap` (ya era `requireRole(["OWNER"])`).

**PROMO-FIX-07 (BAJO) — sin auditoría en mutaciones de promociones.**
Se agregó `AuditAction` `PROMOTION_CREATED` / `PROMOTION_UPDATED` / `PROMOTION_DELETED` / `PROMOTION_DUPLICATED` en `src/modules/audit/audit-data-access.ts`, y `void logAudit({...})` (patrón fire-and-forget, después de que la operación de negocio resolvió) en las 4 rutas mutantes: `POST /api/promotions` (create), `PUT /api/promotions/[id]` (update), `DELETE /api/promotions/[id]` (delete, `entityId` es el `id` recibido porque el registro ya no existe al momento de auditar), `POST /api/promotions/[id]/duplicate` (duplicate, metadata incluye `sourcePromotionId`).

**Tests.** `src/modules/promotions/promotion-engine.test.ts`: reemplazado el test viejo de "no acumula el mismo tipo dos veces" por uno que confirma que solo gana el mejor descuento entre dos promociones del mismo tipo; agregados 3 tests nuevos: no-acumulación cruzando tipos distintos (FIXED_AMOUNT $30 le gana a PERCENTAGE 10% sobre un ítem de $100), desempate por orden de procesamiento ante empate exacto de descuento, y dos promociones en productos distintos aplicando cada una su propia mejor oferta de forma independiente. El resto de la suite (`promotion-engine.test.ts` completo, `promotions/route.test.ts`, `sale-data-access.integration.test.ts`, `returns/index.integration.test.ts`, `sale-validation.test.ts`) corrió sin cambios y pasó verde contra el código nuevo — no fue necesario tocar ningún otro archivo de test.

**Validación:** `npm run lint` limpio. `npm run typecheck` limpio (dos errores TS surgieron durante la implementación y se corrigieron antes del commit: TS18004 por `userId` no desestructurado en `duplicate/route.ts`, TS2345 por `saleItem.productId` nullable sin narrow en `returns/index.ts` — ver detalle abajo). `npm test`: 454 passed / 2 skipped (0 failed), incluyendo las 27 pruebas de `promotion-engine.test.ts` y las integraciones reales contra Neon de `sale-data-access` y `returns`.

**Errores encontrados y corregidos durante la implementación:**
- TS18004 en `src/app/api/promotions/[id]/duplicate/route.ts`: se referenció `userId` en `logAudit({...})` sin haberlo desestructurado de `role` (solo se sacaba `tenantId`). Corregido agregando `userId` a la declaración `let` y a la desestructuración.
- TS2345 en `src/modules/returns/index.ts`: `saleItem.productId` es `String | null` (los ítems de servicio no tienen `productId`), y se pasaba sin narrow a `Map.get()`. Corregido con `if (!saleItem.productId) return true;` como primera línea del callback — además de resolver el tipo, trata correctamente los ítems de servicio como no bloqueantes para la detección de devolución total.

**Commit:** `3f17900` — `fix(promotions): aplicar segmento de cliente, evitar acumulacion de descuentos y reforzar validaciones y auditoria`.

**No autocertificado como verificado por este agente** — corresponde al Ingeniero Líder revisar el diff real. Recomendado en particular: probar PROMO-FIX-01 en vivo contra Neon con un cliente real de segmento VIP/Recurrente/Nuevo y una promoción restringida a ese segmento, ya que los tests cubren la lógica del motor pero no un flujo end-to-end de POS con datos reales.
