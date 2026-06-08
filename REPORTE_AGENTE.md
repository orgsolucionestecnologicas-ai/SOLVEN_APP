# Reporte de agente — Panel de caja actual en POS

## Tarea
Ampliar el panel derecho ("Venta actual / caja actual") del POS para mejorar la
legibilidad de nombres de productos largos en monitores pequeños.

## Cambio realizado
**Archivo:** `src/app/ui/pos.tsx` (línea 1280)

```tsx
// ANTES:
<div className="flex h-full w-80 flex-shrink-0 flex-col bg-white lg:w-96">

// DESPUÉS:
<div className="flex h-full w-96 flex-shrink-0 flex-col bg-white lg:w-[480px]">
```

- Pantallas pequeñas: `w-80` (320px) → `w-96` (384px)
- Pantallas grandes: `lg:w-96` (384px) → `lg:w-[480px]` (480px)

El panel izquierdo usa `flex-1 min-w-0`, por lo que absorbe el ajuste de ancho
sin romper el layout.

## Validación
- `npx tsc --noEmit`: sin errores

## Commit
`fix(pos): ampliar panel de caja actual para mejor legibilidad en monitores pequeños`
