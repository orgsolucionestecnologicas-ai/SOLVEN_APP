# REPORTE — Rediseño total de la Landing Page de SOLVEN

## 1. Resumen de cambios

Se reescribió por completo `src/app/page.tsx` y `src/app/landing.css` para pasar de un look genérico
"SaaS-IA 2022" (degradados violetas, emojis como iconos, tarjeta de precio vertical morada) a un
sistema visual corporativo moderno: blanco/gris neutro, acento azul `#0B5FFF`, radios pequeños (4/6/10px),
tipografía Sora/DM Sans con tracking ajustado, iconografía SVG monocromática estilo Lucide y layout
denso con franjas alternas `--bg` / `--bg-alt`.

## 2. Archivos modificados

- `src/app/page.tsx` — reestructura completa del JSX (nav, hero, trust strip, plataforma bento,
  arquitectura hub & spoke, por qué SOLVEN, indicadores, testimonios, precio horizontal, CTA final, footer 4 columnas).
- `src/app/landing.css` — reescrito desde cero con la nueva paleta, tipografía, sistema de radios y responsive (1024px / 720px / 480px).

No se modificaron otros archivos.

## 3. Decisiones de microcopy / implementación

- Nav: se agregó el item "Recursos" (`#recursos`) como placeholder de navegación futura (ancla sin
  sección asociada — no produce scroll porque el id no existe).
- El menú móvil (≤720px) se implementó con la técnica "checkbox hack" (input + label + CSS), sin JS
  adicional, manteniendo `page.tsx` como componente de servidor.
- Nav pasó de `position: fixed` a `position: sticky`; `LandingScroll` sigue aplicando el box-shadow
  al hacer scroll sobre el mismo `<nav>`.
- El bloque "Arquitectura / Módulos integrados" (hub & spoke) se implementó como grilla 3×3 con
  bordes de 1px compartidos; el nodo central "Núcleo SOLVEN" tiene fondo `--bg-dark`.
- Bento de "Plataforma": 2 bloques grandes (POS con mock de ticket, Inventario con mini tabla de
  stock) + 4 bloques medianos (Clientes, Caja, Promociones, Reportes).
- Sección de precio: bloque único `--bg-dark` de ancho completo, grid 40/30/30 en desktop, apilado
  vertical en mobile.
- Iconos sociales del footer: placeholders SVG monocromos (mismo ícono genérico, distinto `aria-label`),
  listos para reemplazar por logos reales.

## 4. Vista conceptual por sección

- **Nav**: blanco, borde inferior 1px, logo cuadrado 24px `--bg-dark` + "SOLVEN" (sin badge "2.0").
- **Hero**: fondo blanco con grid de líneas 1px al 4% de opacidad; columna izquierda con eyebrow,
  H1 grande, subtítulo, dos CTAs y fila de confianza; columna derecha con mock de dashboard sobrio
  (KPIs + gráfico de barras grises con un acento azul).
- **Trust strip**: franja blanca con "Comercios que ya operan con SOLVEN" + 6 logos placeholder en mayúsculas grises.
- **Plataforma**: grid bento asimétrico (2 grandes + 4 medianos), bordes 1px, sin pastel ni emojis.
- **Arquitectura**: hub & spoke 3×3 con nodo central oscuro.
- **Por qué SOLVEN**: 2 columnas — lista de 4 puntos con iconos SVG + stack de 3 tarjetas planas (ventas, alerta de stock, caja cerrada).
- **Indicadores**: franja `--bg-alt` con 4 valores horizontales separados por bordes 1px.
- **Testimonios**: 3 tarjetas planas con comillas tipográficas grandes y avatar circular oscuro con iniciales.
- **Precio**: bloque oscuro horizontal ancho, grid 40/30/30, precio `$ 15.999 ARS / mes`.
- **CTA final**: fondo blanco, H2 centrado + dos CTAs.
- **Footer**: fondo oscuro, 4 columnas (marca, Producto, Empresa, Legal) + línea inferior con copyright e iconos sociales.

## 5. Pendientes / sugerencias futuras

- Reemplazar los placeholders de logos de la trust strip por logotipos reales de clientes.
- Reemplazar avatares con iniciales por fotos reales de testimonios cuando estén disponibles.
- Conectar el item de nav "Recursos" a una sección o página real cuando exista contenido (blog/docs).
- Reemplazar los iconos sociales placeholder del footer por los logos reales de cada red.

## 6. Validación

- `npm run lint` — sin errores.
- `npm run typecheck` — sin errores.
- `npm run build` — compila sin errores nuevos.
