# QA-CHROME-01 — Simular un cliente real operando SOLVEN de punta a punta

> Para quién es esta orden: un agente con acceso al navegador (Claude en Chrome) o Diego siguiéndola manualmente. No es una tarea de código — no toca el repo, no requiere VS Code. Es una pasada única y a fondo (no recurrente), decidido con Diego el 23-07-2026.

## 0 — Objetivo

Operar SOLVEN en producción **como si fuera un comerciante real abriendo su local por primera vez**, recorriendo el día a día completo: cargar catálogo, vender, cobrar, facturar, hacer una devolución, cerrar caja, mirar reportes. El objetivo es que aparezcan errores, fricciones o comportamientos raros que un uso manual superficial no encuentra — no es un test de una sola pantalla, es un flujo de negocio real de punta a punta.

## 1 — Cuenta y entorno (LEER ANTES DE EMPEZAR)

- **URL:** https://solven-app-484v.vercel.app (producción real — por eso todo lo demás de esta sección importa).
- **Cuenta:** tenant demo ya existente en el código, `seed_tenant_demo` ("SOLVEN Test"), pensado exactamente para este uso — no es un tenant de un cliente real.
- **Login:** `admin@solvenrs.com` / `admin` (credenciales de prueba ya usadas en ciclos de QA anteriores, no son de un cliente).
- **Chequeo de seguridad obligatorio antes de tocar nada:** confirmar que este tenant tiene `arcaEnabled = false`. Si por algún motivo apareciera en `true`, **parar y avisar a Diego antes de continuar** — no debe emitirse ningún comprobante fiscal real ante AFIP durante esta prueba. Todo el flujo de "facturación" se prueba con el **ticket de venta interno de SOLVEN**, no con ARCA real (decisión explícita de Diego, 23-07-2026).
- **No tocar ningún otro tenant.** Si en algún momento la sesión no está claramente dentro de "SOLVEN Test", parar.

## 2 — Recorrido a simular (en este orden, como lo haría un dueño de local real)

1. **Login y primer vistazo** — entrar, revisar el dashboard tal cual lo vería un usuario nuevo.
2. **Ajustes del negocio** — completar/revisar datos del comercio (nombre, alícuota de IVA por defecto, mensaje de agradecimiento del ticket, etc.).
3. **Alta de catálogo** — cargar al menos 5-8 productos variados (con distintas alícuotas de IVA si aplica), y 1-2 servicios. Cargar stock inicial de cada producto.
4. **Apertura de caja** — abrir caja con un monto inicial.
5. **Ventas variadas:**
   - Una venta de contado con un solo producto.
   - Una venta con varios productos/servicios mezclados.
   - Una venta a crédito (fiado) a un cliente nuevo, cargando sus datos de contacto reales (no placeholders vacíos).
6. **Gestión de clientes y deuda** — ver el cliente cargado en el paso anterior, registrar un cobro parcial de su deuda.
7. **Cotización** — generar un presupuesto para un cliente, no convertirlo todavía.
8. **Devolución** — sobre una de las ventas del paso 5, hacer una devolución parcial. Probar el selector de método de reintegro (FIX-07) y confirmar que el stock del producto sube correctamente.
9. **Promociones** — crear una promoción simple y usarla en una venta nueva.
10. **Cierre de caja** — cerrar la caja del día, revisar que el resumen (ventas, cobros, egresos si los hay) coincida con lo hecho en la sesión.
11. **Reportes** — recorrer la sección de reportes, confirmar que los números coinciden con lo operado (ventas totales, productos más vendidos, etc.).
12. **Permisos** (si el tiempo lo permite) — crear un segundo usuario con un rol no-OWNER (ej. CASHIER) y confirmar que no puede acceder a secciones que no le corresponden.

## 3 — Qué registrar

Por cada cosa que no se comporte como debería (error visible, dato que no cuadra, texto roto, pantalla que no responde, confirmación que no confirma nada, número que no suma), anotar en `TAREAS/QA_REPORTE.md` (crear si no existe) con este formato por hallazgo:

```
### [Severidad: Crítico/Alto/Medio/Bajo] Título corto
- Pantalla: dónde pasó
- Pasos: qué hiciste exactamente antes de que pasara
- Esperado: qué debería haber pasado
- Real: qué pasó en cambio
- Screenshot si es posible
```

No hace falta que sea solo "errores rojos" — también anotar fricciones de UX (algo confuso, un paso que se siente innecesario, un texto que no se entiende) aunque no sea técnicamente un bug.

## 4 — Qué NO hacer

- No intentar arreglar nada en código — esto es solo observación y registro, no una tarea de VS Code.
- No habilitar ARCA real en este tenant bajo ninguna circunstancia sin confirmar con Diego primero.
- No tocar otros tenants ni otras cuentas.
- No usar datos de clientes reales inventados de forma que se confundan con datos reales (usar nombres claramente ficticios, ej. "Cliente Prueba QA").

## 5 — Al terminar

Dejar `TAREAS/QA_REPORTE.md` con todos los hallazgos (aunque sea "ninguno" si no apareció nada). Avisar a Diego en el chat con un resumen de 2-3 líneas: cuántos hallazgos, de qué severidad, y si algo bloqueó continuar el recorrido. El Ingeniero Líder revisa `QA_REPORTE.md` después y prioriza qué se convierte en orden de fix.
