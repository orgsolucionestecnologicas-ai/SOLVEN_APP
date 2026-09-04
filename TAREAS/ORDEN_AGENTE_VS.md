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

Sin orden activa en esta rama (`design/revision-uiux-sep-2026`). La orden en
curso ahora mismo (`SALE-TENANT-SCOPE`) vive en la rama `main` — ver
`TAREAS/ORDEN_AGENTE_VS.md` de esa rama. Cuando haya una orden nueva para
`design/revision-uiux-sep-2026`, va a aparecer acá.
