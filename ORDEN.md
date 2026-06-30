# ORDEN — Referencia de trabajo SOLVEN

## Cómo trabajamos

Diego da órdenes desde su iPhone a través de **Claude (sección Código / Code)**.
Claude ejecuta los cambios directamente en los archivos del proyecto,
commitea, y Diego hace `git push` cuando vuelve a la PC.

## Para ejecutar una tarea
Solo decile a Claude:
> "ejecuta la tarea 7"

Claude lee `TAREAS/TAREAS_001_020.md`, ejecuta el prompt de esa tarea,
hace los cambios en el código, y actualiza `TAREAS/REPORTE_DE_CAMBIOS.md`.

## Para revisar al final del día
Solo decile a Claude:
> "revisá el reporte"

Claude lee REPORTE_DE_CAMBIOS.md, marca las tareas en Notion,
borra el reporte y pregunta si cargamos el siguiente lote.

## Tareas disponibles
- Lote 1 (001–020): `TAREAS/TAREAS_001_020.md` ← activo ahora
