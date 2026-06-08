# Reporte de agente — 6 cambios de UI/UX (limpieza general)

## Cambio 1 — POS: categorías reales en lugar de hardcodeadas
**Archivo:** `src/app/ui/pos.tsx`
- Eliminados `CATEGORIES`, `CATEGORY_KEYWORDS` y `getProductCategory()`.
- Agregado memo `categories` que deriva las categorías únicas desde `products[].categoryName`.
- El filtro y el render de pills ahora usan `categories` y `p.categoryName` directamente.
Resultado: OK.

## Cambio 2 — Botón de ayuda reposicionado
**Archivo:** `src/components/help/HelpChat.tsx`
- Botón flotante: `fixed bottom-6 right-6 z-50` → `fixed bottom-24 right-4 z-40`.
- Panel del chat: `fixed bottom-24 right-6 z-50` → `fixed bottom-40 right-4 z-40`.
Resultado: OK.

## Cambio 3 — Eliminar producto con verificación de contraseña
**Archivos:** `src/app/api/auth/verify-password/route.ts` (nuevo), `src/app/api/products/[id]/route.ts`, `src/app/ui/products-inventory.tsx`
- Nuevo endpoint `POST /api/auth/verify-password`: valida sesión, compara contraseña con `verifyPassword` de `@/lib/auth` (campo real `user.password`, no `passwordHash`).
- Agregado `DELETE` a `/api/products/[id]` (verifica pertenencia al tenant antes de borrar).
- Quitado el botón "Editar" duplicado del menú "..." (quedó solo "Ver detalles" y "Ajustar stock").
- Agregado botón "Eliminar producto" (rojo) y modal `DeleteProductModal` que pide contraseña, llama a `verify-password` y luego al `DELETE`.
- El estado del modal se maneja en el componente padre (`deletingProduct`, igual que `editingProduct`/`adjustingProduct`), no dentro de `ProductRow`, para mantener el patrón existente y evitar anidar un modal `fixed` dentro de un `<tr>`.
Resultado: OK.

## Cambio 4 — Placeholder de proveedor
**Archivo:** `src/app/ui/inventory-entry-form.tsx`
- `placeholder="Agroinsumos del Cibao, SRL"` → `placeholder="Nombre del proveedor"`.
Resultado: OK.

## Cambio 5 — Quitar selector de Impuestos del total
**Archivo:** `src/app/ui/inventory-entry-form.tsx`
- Eliminado `globalTaxRate`, el selector "Impuestos" de "Totales y ajustes adicionales", la línea "Impuestos" del resumen lateral, y `impuestosTotal` del cálculo (`totalFinal = subtotal - descuento + transporte + otros`).
- `TAX_OPTIONS` **no** se eliminó: lo sigue usando el selector de impuesto por ítem en la tabla de productos cargados (funcionalidad distinta, no mencionada en el cambio).
Resultado: OK (con nota — ver arriba).

## Cambio 6 — Solo Peso argentino
**Archivo:** `src/app/ui/inventory-entry-form.tsx`
- Eliminada la constante `MONEDAS` y el selector de Moneda.
- `moneda` ahora es estado fijo no editable: `const [moneda] = useState("ARS - Peso argentino")`, se sigue enviando en el submit.
Resultado: OK.

## Validación
- `npx tsc --noEmit`: sin errores
- `npm run lint`: sin errores
- `npm test`: 180/180 tests pasan
- `npm run build`: compila sin errores

## Commit
`fix(ui): limpieza general — categorías dinámicas en POS, botón ayuda reposicionado, eliminar producto con contraseña, remover moneda RD e impuestos dominicanos`
