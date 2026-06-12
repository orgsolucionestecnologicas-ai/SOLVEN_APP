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

---

## Iteración v2 — 2026-06-12

### 1. Eliminaciones efectuadas

- Strip de logos "Comercios que ya operan con SOLVEN" (JSX y CSS `.trust-strip*`).
- Eyebrow superior del hero (`PLATAFORMA DE GESTIÓN COMERCIAL`).
- H1 del hero reemplazado por: `Software de gestión empresarial para comercios.`

### 2. Secciones nuevas (orden de aparición)

1. **Top bar** oscura fina sobre el nav (`SOLVEN para empresas — ... · Hablar con ventas →`).
2. **Nav**: SOLVEN + separador vertical + etiqueta `EMPRESA`; nuevos links `Industrias` y `Seguridad`.
3. **Hero**: sin eyebrow, H1 nuevo, resto igual.
4. **Producto** (reemplaza la strip de logos): eyebrow `EN PRODUCCIÓN`, H2 `Así se ve SOLVEN por dentro.`,
   mock grande con topbar de navegador, sidebar de módulos, 4 KPIs, gráfico de 12 barras y tabla
   "Últimas ventas" (ticket/cliente/monto/estado). Fila de micro-claims debajo.
5. Divider `· Plataforma ·`.
6. **Plataforma** (bento, sin cambios de contenido respecto a v1).
7. Divider `· Industrias ·`.
8. **Industrias**: grid de 6 verticales (Retail, Farmacia, Ferretería, Indumentaria, Gastronomía, Servicios)
   con icono SVG monocromo + descripción corta.
9. **Arquitectura** (hub & spoke, sin cambios) + banda **Infraestructura** debajo (`id="infraestructura"`):
   eyebrow `INFRAESTRUCTURA`, H2 `Construido sobre infraestructura de clase empresarial.`, 4 columnas
   separadas por línea vertical (Disponibilidad 99.9%, Cifrado extremo a extremo, Cumplimiento normativo, Backups continuos).
10. **Presencia / Alcance**: banda oscura con 4 indicadores (`+12` provincias, `24/7`, `99.9%`, `< 5 min`).
11. **Por qué SOLVEN**, **Indicadores**, **Testimonios** — sin cambios.
12. **Precio** — sin cambios (tarjeta horizontal intacta, tal como exige la orden).
13. Divider `· Compañía ·`.
14. **Compañía**: 3 bloques planos (Sobre SOLVEN, Seguridad y confianza, Programa de partners) con link `→`.
15. **CTA final** — sin cambios.
16. **Footer** ampliado a 5 columnas (Marca, Plataforma, Industrias, Compañía, Legal) + línea de versión
    `Versión de plataforma 2.0 · Última actualización: 06/2026` centrada en la línea inferior.

### 3. Cambios a nav, top bar y footer

- Top bar: 32px, fondo `--bg-dark`, mensaje centrado y link `Hablar con ventas →` alineado a la derecha
  (oculto en mobile ≤720px para evitar solapamiento).
- Nav: logo + separador 1px + `EMPRESA` en eyebrow style (no es link); se ocultan junto con `nav-links` en mobile.
- Footer: grid `1.3fr 1fr 1fr 1fr 1fr` en desktop, colapsa a 3/2/1 columnas en 1024/720/480px.
  `footer-bottom` ahora es un grid de 3 columnas (copyright | versión | iconos sociales), centrado en mobile.

### 4. Vista conceptual de los bloques nuevos

- **Producto**: tarjeta con marco de navegador (3 dots + URL), sidebar oscura con 8 módulos
  (item activo con borde izquierdo azul), header de saludo, 4 KPI cards, gráfico de barras grises
  con la última barra en azul, y tabla de 4 ventas recientes con badges de estado (Cobrado/Pendiente).
- **Industrias**: grid 3×2 de tarjetas planas con borde 1px compartido, icono 40px, título y descripción.
- **Infraestructura**: encabezado centrado + 4 columnas de texto separadas por líneas verticales finas.
- **Presencia / Alcance**: franja `--bg-dark`, 4 números grandes blancos con label eyebrow translúcido.
- **Compañía**: 3 tarjetas planas con eyebrow de color acento, título en Sora 600, párrafo y link con flecha.

### 5. Desvíos respecto a la orden

- El divider `.section-divider` se usó en 3 puntos (`Plataforma`, `Industrias`, `Compañía`) como pide el
  ejemplo de la orden; no se agregó en más lugares para no sobrecargar el ritmo visual.
- La banda de Infraestructura se mantuvo dentro de la misma `<section>` que el diagrama Arquitectura
  (comparten fondo `--bg-alt`) en lugar de ser una sección independiente, ya que la orden la describe
  como "banda complementaria debajo del diagrama".
- Sin más desvíos: tarjeta de precio horizontal sin modificar, sin violetas/morados introducidos, sin emojis.

### 6. Validación

- `npm run lint` — sin errores.
- `npm run typecheck` — sin errores.
- `npm run build` — compila sin errores nuevos.
