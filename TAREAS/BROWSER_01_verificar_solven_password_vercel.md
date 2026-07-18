# BROWSER-01 — Confirmar si SOLVEN_PASSWORD / SOLVEN_USER siguen en uso (tarea de navegador, no de código)

## Para quién es esta orden
Esta NO es una tarea de VS Code — no requiere tocar el repo de SOLVEN_APP. Es para un agente con acceso al navegador (Claude en Chrome) o para que Diego la siga manualmente paso a paso.

## Contexto
Desde FIX-11 (2026-07-18), el endpoint de cambio de contraseña de SOLVEN dejó de usar la variable de entorno `SOLVEN_PASSWORD` — ahora compara contra el hash real de cada usuario en la base de datos. Verificado por búsqueda en el código: ni `SOLVEN_PASSWORD` ni `SOLVEN_USER` se referencian en ningún archivo bajo `src/` del proyecto al día de hoy. Antes de borrar estas dos variables de Vercel (o de dejar de mantenerlas), hay que confirmar que no las usa nada fuera del código fuente del repo: un script de despliegue, una automatización externa, documentación de un proceso manual, etc.

## Qué hacer

1. Entrar a Vercel (vercel.com), al proyecto **SOLVEN_APP** (o `solven-app-484v`, la URL de producción es https://solven-app-484v.vercel.app).
2. Ir a **Settings → Environment Variables**.
3. Confirmar si `SOLVEN_PASSWORD` y `SOLVEN_USER` existen ahí como variables configuradas (para qué entornos: Production / Preview / Development).
4. Si existen, revisar si Vercel muestra alguna nota, descripción o fecha de última modificación que dé pista de para qué se usan o cuándo se agregaron.
5. Revisar también, si es accesible desde el dashboard, los **Deployment logs** o **Build logs** más recientes por si alguno de los dos nombres aparece mencionado en el proceso de build/deploy (esto confirmaría si Vercel mismo los usa para algo interno del pipeline, no solo la app).
6. Si Diego tiene alguna documentación externa de despliegue (fuera del repo — por ejemplo notas propias, un doc de onboarding, algo en su Drive/Notion) que mencione estas dos variables, anotarlo también.

## Qué reportar al final
Un resumen corto y directo con una de estas dos conclusiones:
- **"Confirmado: no se usan en ningún lado fuera del repo — se pueden borrar de Vercel con seguridad."**, o
- **"Encontrado uso en: [dónde exactamente]. No borrar todavía."**

## Restricciones
- No borrar ni modificar ninguna variable de entorno en Vercel durante esta tarea — es solo de investigación/confirmación. Borrar es una acción aparte, a decidir después con el resultado de esta revisión.
- No entrar credenciales ni tocar nada que no sea leer configuración existente.

## Al terminar
Dejar un comentario del resultado en el chat con Diego. Si quien ejecuta esta tarea tiene acceso al repo de SOLVEN_APP, mover este ítem de `TAREAS/PENDIENTES.md` (sección "Abiertos" → "Cerrados") con la fecha y la conclusión encontrada — si no tiene acceso al repo, Diego o el Ingeniero Líder lo actualiza después con el resultado que se reporte en el chat.
