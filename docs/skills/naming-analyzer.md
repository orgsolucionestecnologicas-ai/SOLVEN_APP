# naming-analyzer
Apply this skill when creating or reviewing variables, functions, files, models, routes, or components.

## Rules

### Names must be
- Descriptive of real business purpose
- Consistent with existing naming in the project
- In English for all code, routes, models, and functions
- In Spanish (Latin American) for all user-facing UI text

### Naming conventions
- Variables and functions: camelCase
- React components: PascalCase
- Database models and Prisma fields: camelCase
- API routes: kebab-case (e.g. /api/debt-payments)
- Files: kebab-case for routes and pages, PascalCase for components
- Constants: UPPER_SNAKE_CASE

### Business naming examples
- createSaleWithItems not processThing
- getRemainingDebtBalance not calcVal
- CashMovement not MoneyEvent
- debtPaymentId not id2

## Forbidden Names
data, item, thing, temp, x, y, z, val, res2, obj, arr, stuff, foo, bar, handler2

## Review Checklist
- Does the name describe what it represents in the business?
- Would a new developer understand it without context?
- Is it consistent with similar names already in the project?
- Does it follow the correct casing convention?
