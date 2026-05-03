# api-design
Apply this skill when creating or modifying any API route in SOLVEN.

## Response Structure
All API responses must follow this structure:
Success: { "data": <payload> }
Error: { "error": "Human-readable message in Spanish" }
Use the shared API response helper. Never create custom response shapes.

## HTTP Status Codes
200 — successful GET or update
201 — successful POST (resource created)
400 — validation error or business rule violation
404 — resource not found
500 — unexpected server error

## Route Design Rules
- Routes must use kebab-case: /api/debt-payments not /api/debtPayments
- Routes must be resource-oriented: nouns not verbs
- GET must never modify data
- POST must create exactly one logical resource or trigger one business action
- Validation must happen before any database operation
- Business logic must live in the module, not in the route handler
- Route handlers must only: validate input, call module function, return response

## Validation Rules
- Required fields must be checked first
- Numeric fields must be positive numbers
- String fields must not be empty or whitespace-only
- IDs must reference existing records before processing
- Return 400 with a clear message for every validation failure

## Error Message Examples
Nombre del producto es requerido
La cantidad debe ser mayor a cero
Stock insuficiente para completar la venta
El pago no puede superar el saldo pendiente
El cliente no existe

## Forbidden
- Duplicating validation logic between route and module
- Returning 200 for errors
- Returning raw Prisma errors to the client
- Performing business logic inside the route handler
- Using verbs in route names
