# PENDIENTES — SOLVEN

> Backlog vivo de cosas por decidir o hacer que no son una orden ejecutable todavía (o que están a la espera de una confirmación de Diego). A diferencia de `REPORTELIDER.md` (historial de lo ya hecho) y las órdenes de `TAREAS/*.md` (trabajo activo para el agente), este archivo es para anotar pendientes sueltos a medida que aparecen, para no perderlos. Se va a ir migrando acá lo que antes vivía en Notion.
>
> Formato: cada ítem con fecha en que se anotó, contexto breve, y qué haría falta para poder cerrarlo o convertirlo en una orden.

---

## Abiertos

### 2026-07-18 — Confirmar si `SOLVEN_PASSWORD` / `SOLVEN_USER` siguen en uso
Desde FIX-11, el endpoint de cambio de contraseña dejó de usar `SOLVEN_PASSWORD` (ahora compara contra el hash real del usuario). Verificado por grep: ninguna de las dos variables se referencia en `src/` al día de hoy. Antes de borrarlas de Vercel o de `.env`, Diego tiene que confirmar que no las usa algún script de despliegue, proceso manual, o algo fuera de este repo. Documentado también en `CLAUDE.md` sección 9.

---

## Cerrados

(vacío por ahora — cuando un pendiente de acá se resuelve, mover la entrada acá con la fecha de cierre en vez de borrarla)
