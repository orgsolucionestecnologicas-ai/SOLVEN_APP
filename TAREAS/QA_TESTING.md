# QA & TESTING — SOLVEN
## Plan Maestro de Pruebas — Cierre del ciclo de desarrollo (Tareas 001–158)

> Este documento reemplaza al ciclo de `TAREAS_XXX_YYY.md`. Ya no se construyen features nuevas: SOLVEN completó 158 tareas de desarrollo y ahora entra en **fase de verificación**. El objetivo de este documento no es "hacer que pase una tarea", es **encontrar todo lo que no funciona, todo lo que funciona distinto de lo esperado, y todo lo que quedó a medias**, para que Diego sepa exactamente hacia dónde dirigir el próximo ciclo de trabajo.

---

## 0. Por qué este documento existe

Después de 158 tareas de desarrollo iterativo (muchas resueltas por agentes distintos, en sesiones distintas, con criterio "menos es más" y alcance acotado tarea por tarea), es esperable que existan:

- Funcionalidades que se implementaron con un alcance reducido respecto de lo que un dueño de negocio esperaría.
- Inconsistencias entre pantallas que tocan el mismo dato (ej. dos formas distintas de calcular el segmento de un cliente).
- Datos de prueba o de UI que quedaron sintéticos/hardcodeados en vez de reales (esto ya se detectó al menos una vez — ver sección 5.1).
- Migraciones de base de datos corridas en desarrollo pero no necesariamente aplicadas en producción.
- Tests automatizados con fallas conocidas "no relacionadas" que nunca se investigaron a fondo.
- Roles y permisos superpuestos (hay dos sistemas de control de acceso conviviendo: `hiddenForRoles` hardcodeado y `RolePermission` configurable — Tarea 148).

Ninguno de estos puntos es necesariamente grave, pero **nadie los verificó todos juntos, de punta a punta, actuando como un usuario real**. Ese es el trabajo de este ciclo.

---

## Regla de oro de esta fase

**No arregles nada todavía a menos que sea un bug trivial y aislado (un typo, un console.log olvidado, un import roto).** Si encontrás un problema de comportamiento, de datos o de alcance: **documentalo en `QA_REPORTE.md` con detalle suficiente para que se pueda accionar después**, y seguí probando. Mezclar "encontrar bugs" con "arreglar bugs" en la misma pasada hace que se pierda cobertura de pruebas y que el reporte final sea menos confiable como diagnóstico completo.

Excepción: si encontrás algo que **rompe la integridad de datos** (ej. algo que puede generar ventas duplicadas, perder plata, o filtrar datos de un tenant a otro), marcalo como 🔴 CRÍTICO en el reporte de inmediato y notificalo en la primera línea del reporte, aunque no lo arregles todavía — Diego puede querer priorizar el fix antes de que termines el resto del plan.

---

## 1. Pre-vuelo — antes de arrancar a probar

Verificar y documentar en `QA_REPORTE.md` (sección "Pre-vuelo") el estado de cada uno de estos puntos. Si alguno falla, no invalida el resto del plan, pero condiciona qué se puede probar de forma realista:

1. **Migraciones pendientes en producción.** Correr `npx prisma migrate status` contra la base de datos que se vaya a usar para las pruebas. Hay al menos 19 migraciones generadas entre el 2026-07-13 y el 2026-07-15 (desde `add_cash_movement_note` hasta `add_product_image_url`) que en varios reportes quedaron marcadas como "Diego debe correr `npx prisma migrate deploy` en producción". Documentar cuáles están aplicadas y cuáles no en el entorno de prueba.
2. **Variables de entorno.** Confirmar que están seteadas (aunque sea en `.env` local): `DATABASE_URL`, `RESEND_API_KEY` (si no está, los emails no se envían — `getResend()` devuelve `null` silenciosamente, ver `src/lib/email.ts`), `CRON_SECRET` (si no está seteada, los endpoints `/api/cron/*` quedan sin autenticación — bug ya documentado, ver sección 5.3).
3. **Suite automatizada corre limpia como punto de partida.** Correr `npm run typecheck` y `npm test` antes de tocar nada manual, y registrar el resultado tal cual (cuántos tests pasan, cuáles fallan, mensaje de error). Esto da la línea de base contra la que se compara todo lo demás.
4. **Datos de prueba.** Confirmar si existe un tenant/usuario de prueba ya cargado (`scripts/seed-icase.mjs` sugiere que sí existe un seed) o si hay que crear uno nuevo vía `/onboarding`. Documentar qué tenant se usó para todo el resto del plan, para que los hallazgos sean reproducibles.

---

## 2. Fase 1 — Suite automatizada existente

1. Correr `npm run typecheck` (debe dar 0 errores — si no, es 🔴 CRÍTICO, bloquea todo lo demás).
2. Correr `npm test` (Vitest) completo, dos veces seguidas (para distinguir fallas reales de fallas intermitentes por timing/concurrencia contra Neon, patrón que ya se vio varias veces en los reportes de desarrollo).
3. Para cada test que falle en ambas corridas: documentar el nombre exacto del test, el archivo, el mensaje de error, y si aparece en los reportes de desarrollo previos como "preexistente/no relacionado" (hay dos casos ya documentados y aceptados como conocidos — buscarlos en el historial de commits o preguntarle a Diego si hace falta más contexto — no asumir que "ya se sabía" es lo mismo que "está bien"):
   - `sales/route.integration.test.ts > creates a credit sale with debt through the API flow`
   - `debt-payment-data-access.integration.test.ts > prevents concurrent payments from overpaying a debt`
4. Si aparece **algún test nuevo fallando** que no sea uno de esos dos, es una regresión real — marcarlo 🔴 o 🟠 según el módulo que afecte.

---

## 3. Fase 2 — QA manual por módulo

Para cada módulo de la lista, probar como usuario real (no solo "que no tire error"): cargar datos con valores límite (montos en $0, montos altísimos, texto vacío, texto muy largo, caracteres especiales, fechas pasadas/futuras), y verificar que el resultado visible sea el esperado, no solo que la request no falle.

Se recomienda probar cada módulo primero como `OWNER` (acceso total) para validar la funcionalidad en sí, y después repetir los flujos clave con los otros 4 roles (`CASHIER`, `INVENTORY`, `READONLY`, `SUPERVISOR`) para validar accesos — ver Fase 3.1 para la matriz de permisos completa.

### 3.1 Autenticación y sesión
- Login, logout, registro de tenant nuevo (`/onboarding`, wizard de 5 pasos).
- Cambio de cajero con PIN de 4 dígitos (`switch-cashier-modal.tsx`) sin cerrar la sesión del usuario original — confirmar que el rol/permisos de quien iba logueado no se pierden y que `activeCashierId` se refleja donde corresponda.
- Último acceso (`lastLoginAt`) se actualiza correctamente en cada login.

### 3.2 Dashboard
- Resumen general, gráfico de 7 días, ranking de vendedores, alertas (caja no cerrada, cotizaciones por vencer), accesos rápidos.
- Estado vacío (tenant sin ventas) no debe mostrar ceros feos ni gráficos rotos.

### 3.3 POS / Ventas
- Carrito completo: agregar/quitar ítems, cantidad fraccionada, descuento por ítem, descuento global, métodos de pago (efectivo, tarjeta, transferencia, venta web, otro, y combinaciones), venta a crédito (verificar que efectivamente está bloqueada a nivel de validación, como quedó documentado en la Tarea 138).
- Folio de venta, recibo, compartir por WhatsApp.
- Indicador de caja abierta/cerrada en el sidebar coincide con el estado real.
- Selector de vendedor (`SaleGateModal`) con PIN.
- **Historial de ventas** (`sales-list.tsx`): filtros (fecha, vendedor, método de pago), exportación CSV, folio copiable, badge de devolución, columna de ganancia bruta, reenvío de comprobante. Varias de estas funcionalidades aparecen mencionadas en tareas antiguas marcadas como "[DUP]" y archivadas por duplicadas — **confirmar que la funcionalidad real sí existe en el código actual y no que se archivó la tarea sin haberse implementado nunca**. Esto es importante: los duplicados se archivaron asumiendo que el original ya estaba resuelto, pero no se re-verificó uno por uno al momento de archivar.

### 3.4 Productos e Inventario
- CRUD de productos, imagen (drag-and-drop, cámara en mobile, límite de 2MB), margen, alerta costo vs. venta, indicador de margen %, historial de cambios de precio, exportar catálogo, importación masiva CSV, unidad de medida, proveedor asociado, toggle activo/inactivo.
- Movimientos de inventario, ajustes (positivos y negativos, motivo obligatorio en negativos), conteo físico, dashboard de inventario, stock mínimo/máximo, valorización.

### 3.5 Clientes
- CRUD completo, segmento (verificar que el badge de la lista respeta el campo de BD cuando está seteado explícitamente, y cae al cálculo automático por compras cuando no — Tarea 151), deuda destacada en el perfil, cumpleaños próximo, límite de crédito con advertencia al cargar deuda, notas internas (nunca deben aparecer en PDFs/tickets/emails — verificar explícitamente), dirección, CUIT/DNI, exportar CSV, link de WhatsApp desde el teléfono.
- **Prioridad alta de verificación** (ver 5.1): confirmar en qué columnas/pantallas el teléfono y el email mostrados son los reales del cliente y en cuáles siguen siendo el valor sintético heredado (`getCustomerPhone`/`getCustomerEmail`). Probar puntualmente: ¿el buscador de la tabla encuentra un cliente si escribo su teléfono real?

### 3.6 Deudas
- Alta de deuda (con y sin superar el límite de crédito del cliente), registrar pago (desde el menú "..." y desde el botón directo de la fila), condonar (solo OWNER), badge de vencida.

### 3.7 Cotizaciones
- Crear, duplicar como plantilla, condiciones de pago separadas de notas, número secuencial, descuento global, columna "días restantes", badge de "por vencer" (umbral de 3 días), vista previa de PDF sin descargar, envío por WhatsApp, recordatorio automático a 2 días del vencimiento (requiere que el cron esté corriendo — ver 3.11), expiración automática de cotizaciones vencidas.

### 3.8 Devoluciones
- Devolución total y parcial, nota de crédito en PDF, reposición (o no) de inventario, filtro de historial por fecha/vendedor.

### 3.9 Gastos
- CRUD, categorías de texto libre con ícono automático por palabra clave, presupuesto mensual por categoría con semáforo, proveedor asociado, comprobante adjunto (foto/PDF, límite 2MB), gastos recurrentes (alta + que el cron los genere efectivamente el día configurado), umbral de gasto de alto monto con confirmación de dos pasos.
- Confirmar visualmente que "Gastos del mes" es lo primero que se ve al entrar a la sección, sin scroll.

### 3.10 Caja
- Apertura, cierre con diferencia teórica vs. real (nota obligatoria si hay diferencia), movimientos con nota, indicador de estado en el sidebar con balance aproximado correcto.

### 3.11 Cron jobs
Estos requieren el proyecto desplegado (Vercel) para probarse de forma realista; si no es posible, documentar como "pendiente de verificar en producción" en vez de omitirlo:
- `expire-quotes` (diario 3am), `remind-expiring-quotes` (diario 9am), `generate-recurring-expenses` (diario 4am).
- Confirmar que `CRON_SECRET` está seteado en Vercel — si no lo está, cualquiera puede pegarle a estos endpoints sin autenticación (bug conocido, documentado desde hace varias tareas y nunca confirmado como resuelto).

### 3.12 Usuarios y permisos
- Roles: `OWNER`, `CASHIER`, `INVENTORY`, `READONLY`, `SUPERVISOR`. Alta, edición de rol, activar/desactivar, avatar, PIN, eliminar usuario (con y sin ventas asociadas — debe pedir doble confirmación si tiene ventas).
- Permisos granulares (`RolePermission`, Tarea 148) vs. el fallback hardcodeado (`hiddenForRoles`) — confirmar que no generan estados contradictorios entre sí (ej. un rol con acceso "permitido" en `RolePermission` pero oculto igual por `hiddenForRoles`, o viceversa).
- Audit log: que se registren de verdad las acciones esperadas y que la pantalla de auditoría (solo OWNER) las muestre con filtros funcionando.

### 3.13 Reportes
- Resumen general con gráficos y tooltips, comparación de período actual vs. anterior, comparación de dos rangos custom, atajos de rango rápido (Ayer, Esta semana, Mes pasado, Este trimestre, Este año), exportación.

### 3.14 Configuración
- Todas las secciones: Negocio, Fiscal/ARCA, Sistema, Notificaciones (incluye umbral de gasto alto, alertas de stock crítico y diferencia de caja), Usuarios, Auditoría, Documentos (personalización de ticket).
- Confirmar que el logo del negocio efectivamente persiste (hay código documentado como preview-only con `URL.createObjectURL` sin persistencia real — confirmar si sigue así o si ya se corrigió en alguna tarea posterior).

### 3.15 Facturación electrónica (ARCA)
- Confirmar el comportamiento opt-in por tenant y por venta (decisión de arquitectura ya tomada: el ticket de venta debe estar siempre disponible sin depender de ARCA). Probar con ARCA activado y desactivado.

### 3.16 Promociones y Servicios
- Promociones: alta, duplicar, notificación de vencimiento próximo (2 días).
- Servicios: CRUD básico, si aplica a la instancia de prueba.

---

## 4. Fase 3 — Pruebas transversales (cross-cutting)

### 4.1 Aislamiento multi-tenant
Con dos tenants distintos (crear un segundo tenant de prueba si no existe), confirmar que **ningún dato de un tenant es visible ni editable desde el otro**, endpoint por endpoint si hace falta. Esto es lo más crítico de todo el plan: cualquier fuga de datos entre tenants es 🔴 CRÍTICO sin excepción.

### 4.2 Matriz de permisos por rol
Armar una tabla real (roles × secciones de navegación × endpoints de escritura) y marcar qué puede ver/hacer cada rol, comparando lo que dice la UI (nav oculta) contra lo que realmente permite el backend (`requireRole`). Un ítem oculto en la UI pero accesible por API directa es un hallazgo de seguridad, no solo de UX.

### 4.3 Integridad de datos y cálculos financieros
Verificar montos con casos límite: descuentos que llevan el total a $0, ventas con IVA, diferencia de caja negativa y positiva, presupuestos de gastos superados, límite de crédito superado. Ningún cálculo debe redondear de forma que pierda o gane centavos de forma sistemática.

### 4.4 Rendimiento con datos reales
Cargar (o usar si ya existen) al menos 200–300 registros en Productos, Ventas y Clientes, y confirmar que los listados con imágenes en base64 (producto, avatar, logo, comprobante de gasto) no degradan visiblemente el tiempo de carga. Este es un riesgo conocido de la decisión de arquitectura (base64 en la misma fila de BD, sin CDN).

### 4.5 Emails y WhatsApp
Confirmar que los links de `wa.me` abren con el número y el texto correctos, y que los emails (recordatorio de cotización, alertas) efectivamente se envían cuando `RESEND_API_KEY` está configurada — y que fallan de forma silenciosa y prolija (no rompen el flujo) cuando no lo está.

---

## 5. Riesgos conocidos a confirmar primero (alta prioridad de verificación)

Estos puntos ya se detectaron como observaciones durante el desarrollo, pero **nunca se confirmó si siguen siendo un problema real en uso ni cuál es su impacto** — arrancar el QA por acá antes de seguir el resto del plan en orden:

### 5.1 Teléfono/email sintéticos en la tabla de clientes
`customers-list.tsx` generaba teléfono y email de forma determinística a partir del `id`/`name` del cliente (`getCustomerPhone`/`getCustomerEmail`), sin relación con los datos reales. Se corrigió parcialmente para la exportación CSV y para el link de WhatsApp (Tareas 136 y 142), pero **el buscador de la tabla todavía filtra por el valor sintético**, no por el teléfono real. Confirmar el alcance exacto de dónde quedó cada versión (sintética vs. real) y si esto generó confusión operativa real (ej. un cajero buscando a un cliente por su teléfono real y no encontrándolo).

### 5.2 Migraciones sin desplegar
Ver sección 1, punto 1.

### 5.3 CRON_SECRET
Ver sección 3.11.

### 5.4 Doble sistema de permisos
Ver sección 4.2 — `hiddenForRoles` (hardcodeado) y `RolePermission` (configurable) conviven desde la Tarea 148. Confirmar que no haya combinaciones contradictorias.

### 5.5 Funcionalidades sin pantalla de gestión
- Gastos recurrentes: se pueden crear pero no hay pantalla para ver/editar/desactivar los ya creados (documentado como fuera de alcance en la Tarea 130).
- Presupuestos de gasto por categoría: se pueden crear/modificar pero no eliminar (documentado como fuera de alcance en la Tarea 128).

Confirmar si esto es aceptable para el uso real del negocio o si debería agregarse en el próximo ciclo.

---

## 6. Clasificación de severidad para el reporte

- 🔴 **Crítico**: pérdida o fuga de datos entre tenants, cálculo de dinero incorrecto, algo que impide vender/cobrar, o un agujero de seguridad (acceso sin autorización a datos o acciones).
- 🟠 **Alto**: una funcionalidad documentada como terminada no funciona como se espera, o un rol tiene más o menos acceso del que debería.
- 🟡 **Medio**: inconsistencia de UX/datos que no bloquea el uso pero puede confundir al usuario (ej. el caso de teléfonos sintéticos).
- 🟢 **Bajo**: detalle visual, copy, o mejora menor que no afecta la operación.

---

## 7. Protocolo de reporte

Todo hallazgo va a `TAREAS/QA_REPORTE.md`, con este formato por cada uno:

```
### [SEVERIDAD] Título corto del hallazgo
- Módulo: (ej. Clientes)
- Dónde: archivo(s) y/o pantalla exacta
- Qué pasó: descripción concreta de lo observado, con pasos para reproducir
- Qué se esperaría: comportamiento correcto según el criterio de negocio
- Rol/tenant usado para probar:
- Screenshot o dato de referencia (si aplica):
```

Al final del reporte, agregar una sección `## RESUMEN EJECUTIVO` con: cantidad de hallazgos por severidad, y una lista priorizada (no más de 10 ítems) de qué convendría atacar primero en el próximo ciclo de desarrollo — esta lista es el insumo principal que Diego va a usar para decidir cómo seguir.

---

## Reglas del ciclo

1. No arreglar bugs de comportamiento/alcance sobre la marcha (ver "Regla de oro" al principio) — documentar y seguir.
2. Si hace falta correr algo que modifique datos (crear tenant de prueba, cargar productos de prueba), usar datos claramente identificables como de prueba (ej. prefijo "QA-" o "TEST-"), nunca tocar datos reales de un tenant productivo.
3. Commit y push al final, igual que en el ciclo anterior: `git add TAREAS/` (solo esta carpeta, nunca mezclar con código que se esté tocando en paralelo), commit descriptivo, y `git push origin main` (se espera que falle en este entorno por falta de credenciales — Diego lo sube manualmente).
4. Cuando termines de recorrer todo el plan, escribí el `RESUMEN EJECUTIVO` y avisá que está listo — no borres ni archives este documento como se hacía con los `TAREAS_XXX_YYY.md`: este plan se reutiliza en cada ciclo de QA futuro, así que se actualiza pero no se elimina.
