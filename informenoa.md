# Informe NOA Operativo

## Implementado
- Endpoint local `POST /api/noa/internal` sin API externa, autenticado por sesion y con rate limit por tenant.
- Motor local de intenciones, normalizacion sin tildes, entidades basicas de fechas, folios, cliente, comprobante y estados.
- Consultas Prisma aisladas por `tenantId` para ventas, clientes, deudas, productos, caja, cotizaciones, gastos, servicios, promos, devoluciones, inventario, usuarios, suscripcion, ARCA, categorias y auditoria.
- Base de conocimiento modular en `src/lib/noa-knowledge/` con navegacion, guias, conceptos, roles, ARCA, caja, flujos y FAQ.
- `HelpChat` reemplazado por llamada JSON a NOA Operativo, con estado de carga, errores, reintento, datos renderizados, navegacion y reset por evento `cash-register-closed`.
- Timeout de Vitest ajustado para integraciones lentas con Neon.

## Archivos creados
- `src/lib/noa-intent-engine.ts`
- `src/lib/noa-intent-engine.test.ts`
- `src/lib/noa-queries.ts`
- `src/lib/noa-queries.test.ts`
- `src/lib/noa-responses.ts`
- `src/lib/noa-knowledge/types.ts`
- `src/lib/noa-knowledge/index.ts`
- `src/lib/noa-knowledge/navigation.ts`
- `src/lib/noa-knowledge/dashboard.ts`
- `src/lib/noa-knowledge/pos.ts`
- `src/lib/noa-knowledge/returns.ts`
- `src/lib/noa-knowledge/products.ts`
- `src/lib/noa-knowledge/services.ts`
- `src/lib/noa-knowledge/inventory.ts`
- `src/lib/noa-knowledge/customers.ts`
- `src/lib/noa-knowledge/cash.ts`
- `src/lib/noa-knowledge/quotes.ts`
- `src/lib/noa-knowledge/reports.ts`
- `src/lib/noa-knowledge/promotions.ts`
- `src/lib/noa-knowledge/settings.ts`
- `src/lib/noa-knowledge/users.ts`
- `src/lib/noa-knowledge/account.ts`
- `src/lib/noa-knowledge/arca.ts`
- `src/lib/noa-knowledge/glossary.ts`
- `src/lib/noa-knowledge/faq.ts`

## Archivos modificados
- `src/app/api/noa/internal/route.ts`
- `src/components/help/HelpChat.tsx`
- `src/app/ui/cash-register-close.tsx`
- `vitest.config.mts`

## Archivos removidos
- `src/lib/noa-internal-prompt.ts`
- `src/modules/noa-internal/noa-tools.ts`
- `src/modules/noa-internal/noa-tools.test.ts`

## Matriz de cobertura
| Modelo / pantalla / flujo | Intent o conocimiento |
|---|---|
| Tenant | `info_negocio`, `subscription_status` |
| User | `usuarios_roles`, `users-roles` |
| Product | `buscar_productos`, `productos_bajo_stock`, `producto_sin_movimiento` |
| Sale | `buscar_ventas`, `detalle_venta`, `resumen_negocio`, `comparar_periodos` |
| SaleItem | `detalle_venta`, `productos_mas_vendidos` |
| Expense | `ver_gastos`, `gastos_vs_ingresos` |
| Customer | `buscar_clientes`, `historial_cliente`, `ver_deuda_cliente` |
| Debt | `ver_deuda_cliente`, `clientes_con_deuda` |
| DebtPayment | `ver_deuda_cliente` |
| CashMovement | `estado_caja`, `movimientos_caja` |
| CashRegisterSession | `estado_caja`, `sesiones_caja_anteriores` |
| Promotion | `ver_promos_activas`, `promotions-create` |
| PromotionUsage | `ver_promos_activas`, POS promo knowledge |
| InventoryMovement | `movimientos_inventario` |
| Category / Subcategory | `categorias`, products/inventory knowledge |
| Service | `buscar_servicios`, services knowledge |
| Return / ReturnItem | `buscar_devoluciones`, returns knowledge |
| StoreSettings | `info_negocio`, settings knowledge |
| Subscription | `subscription_status`, account knowledge |
| HelpQuery | unknown fallback registra consulta |
| Quote / QuoteItem | `buscar_cotizaciones`, `cotizaciones_por_vencer`, quotes knowledge |
| AuditLog | `audit_logs` |
| TenantARCAConfig / ARCATokenCache / Invoice | `arca_config`, ARCA knowledge, sales invoice detection |
| Dashboard | dashboard knowledge, `resumen_negocio` |
| POS | pos knowledge, sales/product/promo intents |
| Devoluciones | returns knowledge, `buscar_devoluciones` |
| Productos | products knowledge, product intents |
| Servicios | services knowledge, `buscar_servicios` |
| Inventario | inventory knowledge, stock intents |
| Clientes | customers knowledge, customer/debt intents |
| Caja | cash knowledge, cash intents |
| Cotizaciones | quotes knowledge, quote intents |
| Reportes | reports knowledge, summary/ranking/comparison intents |
| Promociones | promotions knowledge, active promo intent |
| Settings | settings knowledge, business/ARCA intents |
| Usuarios | users knowledge, roles intent |
| Cuenta | account knowledge, subscription intent |
| ARCA | arca/glossary knowledge, `arca_config` |

## Consultas implementadas
`buscar_ventas`, `buscar_clientes`, `ver_deuda_cliente`, `buscar_productos`, `productos_bajo_stock`, `resumen_negocio`, `estado_caja`, `buscar_cotizaciones`, `ver_gastos`, `movimientos_caja`, `productos_mas_vendidos`, `clientes_con_deuda`, `buscar_servicios`, `ver_promos_activas`, `historial_cliente`, `buscar_devoluciones`, `movimientos_inventario`, `detalle_venta`, `comparar_periodos`, `cotizaciones_por_vencer`, `gastos_vs_ingresos`, `info_negocio`, `sesiones_caja_anteriores`, `producto_sin_movimiento`, `usuarios_roles`, `subscription_status`, `arca_config`, `categorias`, `audit_logs`.

## Test de barrido documentado
1. Dashboard: "Como viene el negocio hoy?" -> `resumen_negocio`.
2. Dashboard: "Que alertas tengo?" -> dashboard knowledge.
3. Dashboard: "Que me falta reponer?" -> `productos_bajo_stock`.
4. POS: "Que vendi hoy?" -> `buscar_ventas`.
5. POS: "Que llevo Garcia en la venta 0042?" -> `detalle_venta`.
6. POS: "Como hago una venta mixta?" -> POS knowledge.
7. Devoluciones: "Como hago una devolucion?" -> returns knowledge.
8. Devoluciones: "Buscame devoluciones de Garcia" -> `buscar_devoluciones`.
9. Devoluciones: "La devolucion repone stock?" -> returns stock knowledge.
10. Productos: "Buscame yerba" -> `buscar_productos`.
11. Productos: "Que producto no tiene stock?" -> `productos_bajo_stock`.
12. Productos: "Que producto no se vende hace 30 dias?" -> `producto_sin_movimiento`.
13. Servicios: "Que servicios tengo?" -> `buscar_servicios`.
14. Servicios: "Como cargo un servicio?" -> services knowledge.
15. Servicios: "Precio del servicio instalacion" -> `buscar_servicios`.
16. Inventario: "Movimientos de stock de yerba" -> `movimientos_inventario`.
17. Inventario: "Como ajusto stock?" -> inventory knowledge.
18. Inventario: "Que categorias tengo?" -> `categorias`.
19. Clientes: "Buscame Perez" -> `buscar_clientes`.
20. Clientes: "Cuanto me debe Perez?" -> `ver_deuda_cliente`.
21. Clientes: "Historial de Garcia" -> `historial_cliente`.
22. Caja: "Cuanta plata hay en caja?" -> `estado_caja`.
23. Caja: "No me deja cerrar la caja" -> cash problem knowledge.
24. Caja: "Cierres anteriores" -> `sesiones_caja_anteriores`.
25. Cotizaciones: "Presupuestos de Garcia" -> `buscar_cotizaciones`.
26. Cotizaciones: "Cotizaciones por vencer" -> `cotizaciones_por_vencer`.
27. Cotizaciones: "Que estados tienen?" -> quotes knowledge.
28. Reportes: "Como me fue este mes vs el anterior?" -> `comparar_periodos`.
29. Reportes: "Productos mas vendidos" -> `productos_mas_vendidos`.
30. Reportes: "Gastos vs ingresos" -> `gastos_vs_ingresos`.
31. Promociones: "Promos activas" -> `ver_promos_activas`.
32. Promociones: "Como creo un 2x1?" -> promotions knowledge.
33. Promociones: "Como se activa una promo?" -> promotions activation knowledge.
34. Configuracion: "Datos del negocio" -> `info_negocio`.
35. Configuracion: "Como cambio la moneda?" -> settings knowledge.
36. Configuracion: "Impresora y sonidos" -> settings preferences knowledge.
37. Usuarios: "Que hace el rol INVENTORY?" -> `usuarios_roles` / users knowledge.
38. Usuarios: "Que usuarios tengo?" -> `usuarios_roles`.
39. Usuarios: "Readonly puede vender?" -> users knowledge con aclaracion READONLY.
40. Cuenta: "Estado de mi plan" -> `subscription_status`.
41. Cuenta: "Cuando vence el trial?" -> `subscription_status`.
42. Cuenta: "Que es Rebill?" -> account knowledge.
43. ARCA: "Que es el CAE?" -> ARCA/glossary.
44. ARCA: "Tengo ARCA activa?" -> `arca_config`.
45. ARCA: "Puedo usar SOLVEN sin ARCA?" -> ARCA knowledge.

## Validacion
- `npm run lint`: OK.
- `npm run typecheck`: OK.
- `npm test`: OK, 41 files / 208 tests.

## Pendientes
- `HelpQuery` no tiene campo `resolved`; se registra la pregunta con el schema actual sin migracion.
- Parser local cubre fechas y entidades frecuentes; no reemplaza comprension semantica ilimitada.
