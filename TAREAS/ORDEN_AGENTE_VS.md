# ORDEN_AGENTE_VS — orden activa para el agente ejecutor (VS Code)

> Archivo único y reutilizable: acá va **una sola orden a la vez**. El encabezado
> de abajo es permanente, no se borra nunca — lo único que cambia es la sección
> "## Orden activa".

## Protocolo (leelo antes de tocar código)

1. Confirmá en qué rama estás (`git branch --show-current`) y que coincide con
   la que dice la orden — **no asumas que es la misma que la última vez.**
2. Ejecutá la orden. No agregues nada que no esté pedido (alcance acotado).
3. Antes de commitear: `npm run lint && npm run typecheck && npm test`. Si algo
   falla, no commiteás — corregís primero.
4. Commit scoped (`fix:`/`feat:`/`docs:`/etc.) + push a la rama indicada en la
   orden.
5. Llená `TAREAS/4_REPORTE_DE_CAMBIOS.md` con el detalle técnico completo:
   archivos tocados, qué cambiaste y por qué, tests nuevos/modificados,
   resultado real de lint/typecheck/test. Ese archivo es el que después se lee
   para verificar contra el diff real — cuanto más preciso, más rápido se
   verifica.
6. **Nunca te autocalifiques como "verificado"** ni escribas que el Ingeniero
   Líder/Arquitecto ya revisó tu trabajo — ese veredicto lo agrega él después,
   no vos (DA-15 en `1_CLAUDE.md`).
7. Una vez que hiciste 3-6: **vaciá este archivo** — dejá solo desde el título
   hasta acá (este protocolo), borrá todo lo que sigue en "## Orden activa".
   Así queda listo para la próxima orden.

No se sigue a la orden siguiente vos solo: esperá a que el Arquitecto/Ingeniero
Líder verifique el reporte y deje una orden nueva acá.

---

## Orden activa

### SALE-TENANT-SCOPE — `createSale` no filtra productos/servicios por tenant y permite descontar stock ajeno

**Rama: `main`** — NO `design/revision-uiux-sep-2026`. Confirmá con
`git branch --show-current` antes de tocar nada; si tenés cambios sin commitear
de otra cosa en el directorio, avisá antes de seguir.

**Prioridad: 🔴 Crítico** (ver `PENDIENTES.md` → sección "🔴 Crítico" para el
contexto completo, este resumen es el mismo hallazgo).

**Problema:** en `src/modules/sales/sale-data-access.ts`, dentro de `createSale`:
- El `findMany` que trae los productos y servicios del carrito (alrededor de la
  línea 133-138) no filtra por `tenantId`:
  ```ts
  transaction.product.findMany({ where: { id: { in: productIds } } }),
  transaction.service.findMany({ where: { id: { in: serviceIds } } })
  ```
- `reduceProductStock` (alrededor de la línea 589-599) descuenta stock con un
  `UPDATE` crudo sin `tenantId`:
  ```sql
  UPDATE "Product" SET "stock" = "stock" - $1, "updatedAt" = NOW()
  WHERE "id" = $2 AND "stock" >= $1
  ```

Un usuario autenticado del tenant A que conozca (o adivine) el `id` de un
producto o servicio del tenant B puede leer su precio/`ivaRate` en la
respuesta de la venta y **descontarle stock real**, sin pertenecer a ese
tenant. Confirmalo vos mismo antes de arreglar: es la misma pregunta de
atacante que ya encontró `INV-FIX-01`/`DEUDA-FIX-01` ("si yo fuera un usuario
del tenant A, ¿qué le puedo hacer al tenant B conociendo un id?").

**Qué corregir:**

1. Agregar `tenantId` al `where` de los dos `findMany` (productos y servicios)
   en `createSale`.
2. Agregar `AND "tenantId" = $tenantId` al `UPDATE` crudo de
   `reduceProductStock` (mismo criterio que ya usa `adjustProductStock` en
   `src/modules/inventory/`, que ya está scopeado por tenant desde
   `INV-FIX-01` — usalo de referencia).
3. Un producto/servicio que exista pero sea de otro tenant tiene que
   comportarse exactamente igual que si no existiera (mismo error tipado que
   ya se usa hoy cuando el id no aparece en el `findMany` — buscá cuál es esa
   clase de error en `sale-data-access.ts`/`sale-validation.ts` y reusala, no
   inventes una nueva).
4. Aplicar el mismo `tenantId` también al `UPDATE` crudo de stock en
   `confirmQuote` (`src/modules/quotes/quote-data-access.ts`) por
   consistencia/defensa en profundidad — hoy es seguro por construcción
   (los ítems de la cotización ya son del tenant), pero PENDIENTES.md ya pide
   este ajuste al tocar el patrón.
5. Test de integración de aislamiento nuevo (junto a los tests existentes de
   `sale-data-access.integration.test.ts`): una venta del tenant A que
   referencia un `productId` real pero del tenant B debe rechazarse con el
   error tipado del punto 3, y el stock del producto del tenant B tiene que
   quedar exactamente igual que antes del intento (no descontado ni parcial).

**No hagas nada más que esto** — no es una orden para tocar otra cosa de
`sale-data-access.ts` ni para refactorizar. Si al leer el código encontrás
algo relacionado que te parece que también hay que arreglar, anotalo en tu
entrada de `4_REPORTE_DE_CAMBIOS.md` como hallazgo aparte, no lo toques sin
que se convierta en su propia orden.
