# ORDEN AL AGENTE — Asistente de ayuda interno SOLVEN (sin API externa)

## Concepto
Construir un asistente conversacional de ayuda dentro de SOLVEN que responde
preguntas sobre cómo usar el sistema. Es 100% autocontenido — sin llamadas a
Claude ni a ninguna API externa. Toda la información está en una base de
conocimiento local en TypeScript.

El usuario abre el chat, escribe su pregunta en lenguaje natural, y el sistema
encuentra la mejor respuesta en milisegundos.

---

## PASO 1 — Base de conocimiento

Crear `src/lib/help-knowledge-base.ts` con la siguiente estructura:

```typescript
export type HelpEntry = {
  id: string;
  module: string;         // módulo al que pertenece
  keywords: string[];     // palabras clave para matching
  question: string;       // pregunta representativa
  answer: string;         // respuesta completa en español
  steps?: string[];       // pasos opcionales si aplica
  tip?: string;           // consejo extra opcional
};

export const HELP_KNOWLEDGE_BASE: HelpEntry[] = [ ... ];
```

Poblar con al menos 40 entradas cubriendo TODOS los módulos de SOLVEN:

**Caja (5 entradas mínimo):**
- Cómo abrir la caja al inicio del turno
- Cómo cerrar la caja y hacer el cuadre
- Cómo registrar un movimiento manual (entrada/salida de dinero)
- Qué hacer si la caja no cierra porque ya hay una sesión abierta
- Cómo ver el historial de movimientos de caja

**Ventas / POS (5 entradas):**
- Cómo registrar una venta al contado
- Cómo registrar una venta a crédito (fiado)
- Cómo aplicar un descuento en una venta
- Cómo buscar un producto en el punto de venta
- Cómo ver el historial de ventas del día

**Productos (5 entradas):**
- Cómo agregar un producto nuevo
- Cómo editar el precio de un producto
- Cómo agregar una categoría
- Cómo asignar un código de barras a un producto
- Cómo desactivar un producto sin eliminarlo

**Inventario (5 entradas):**
- Cómo hacer una entrada de mercadería
- Cómo ajustar el stock manualmente
- Cómo ver qué productos tienen stock bajo
- Cómo ver el historial de movimientos de un producto
- Qué significa cada tipo de movimiento (entrada, ajuste, venta, devolución)

**Clientes (5 entradas):**
- Cómo agregar un cliente nuevo
- Cómo ver la deuda de un cliente
- Cómo registrar un pago parcial de deuda
- Cómo ver el historial de compras de un cliente
- Cómo eliminar un cliente

**Devoluciones (3 entradas):**
- Cómo procesar una devolución
- Qué pasa con el stock cuando hago una devolución
- Qué pasa con la caja cuando devuelvo una venta en efectivo

**Promociones (3 entradas):**
- Cómo crear una promoción 2x1
- Cómo crear un descuento por porcentaje
- Cómo activar o desactivar una promoción

**Reportes (3 entradas):**
- Cómo ver las ventas del mes
- Cómo comparar ventas entre períodos
- Qué muestra el reporte de productos más vendidos

**Configuración (3 entradas):**
- Cómo cambiar el nombre del negocio
- Cómo cambiar la moneda
- Cómo cambiar la contraseña

**General / Suscripción (3 entradas):**
- Qué pasa cuando vence el período de prueba
- Cómo renovar la suscripción
- Cómo contactar soporte

---

## PASO 2 — Motor de búsqueda local

Crear `src/lib/help-search.ts`:

```typescript
import { HELP_KNOWLEDGE_BASE, HelpEntry } from './help-knowledge-base';

export function searchHelp(query: string): HelpEntry[] {
  // 1. Normalizar query: minúsculas, quitar acentos, split en palabras
  // 2. Para cada entrada de la KB, calcular un score:
  //    - +3 puntos por cada keyword que matchea exactamente
  //    - +2 puntos si la query contiene alguna palabra del campo question
  //    - +1 punto si el module matchea alguna palabra de la query
  // 3. Ordenar por score descendente
  // 4. Retornar las 3 mejores entradas con score > 0
  // 5. Si no hay matches, retornar [] (el UI mostrará respuesta por defecto)
}
```

Incluir una función `normalizeText(text: string): string` que:
- Convierte a minúsculas
- Elimina acentos (á→a, é→e, í→i, ó→o, ú→u, ñ→n)
- Elimina caracteres especiales

---

## PASO 3 — Componente del chat de ayuda

Crear `src/components/help/HelpChat.tsx`:

**Comportamiento:**
- Botón flotante fijo en la esquina inferior derecha de la app (círculo violeta con ícono de interrogación "?")
- Al hacer click, se abre un panel de chat (340px de ancho, posición fixed)
- El panel tiene: header "Ayuda SOLVEN", botón de cerrar (X), área de mensajes, input de texto

**Flujo de conversación:**
1. Al abrir, mostrar mensaje de bienvenida:
   > "¡Hola! Soy tu asistente de ayuda. Preguntame sobre cualquier función de SOLVEN — ventas, caja, inventario, clientes y más."
2. El usuario escribe su pregunta
3. Mostrar "Buscando..." por 400ms (para que no parezca instantáneo/robot)
4. Si hay resultados: mostrar la respuesta de la entrada más relevante con sus steps
5. Si no hay resultados: mostrar:
   > "No encontré una respuesta exacta para eso. Podés escribirnos a orgsolucionestecnologicas@gmail.com y te ayudamos."

**Sugerencias rápidas** (chips clickeables debajo del input):
- "¿Cómo cierro la caja?"
- "¿Cómo cargo un producto?"
- "¿Cómo registro una venta?"
- "¿Cómo veo los reportes?"

Al hacer click en una sugerencia, se envía esa pregunta automáticamente.

**Diseño:**
- Colors: fondo blanco, header violeta #7c3aed, texto gris oscuro
- Mensajes del usuario: burbuja violeta claro a la derecha
- Respuestas del asistente: burbuja gris claro a la izquierda
- No usar ninguna librería externa de chat — implementar con CSS puro
- El panel es scrollable si hay muchos mensajes

---

## PASO 4 — Integrar en la app

En `src/app/ui/app-shell.tsx`:
- Importar y renderizar `<HelpChat />` al final del layout, visible en todas las páginas del dashboard
- NO mostrar en /login, /register, /suscripcion-vencida

---

## PASO 5 — Página de ayuda completa (opcional pero recomendado)

Crear `src/app/ayuda/page.tsx`:
- Lista de todos los módulos como acordeón expandible
- Cada módulo muestra todas sus entradas de la KB
- Búsqueda en tiempo real que filtra las entradas
- Accessible desde el menú lateral (ícono de interrogación "?" en el footer del sidebar)

---

## AL FINAL

1. `npm test` — verificar que pasa
2. `git add -A`
3. `git commit -m "feat: add in-app help assistant with local knowledge base"`
4. `git push origin main`

Escribí el resultado en `REPORTE_AGENTE.md`:

```
# REPORTE — Asistente de ayuda interno
## Estado: COMPLETADO / ERROR
## Archivos creados:
## Entradas en la KB: X
## Tests: X pasando
## Commit: xxxxx
## Observaciones:
```

Luego borrá este archivo `ORDEN_AGENTE.md`.
