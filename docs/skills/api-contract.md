# api-contract

Apply when creating or modifying any API route.

## Contract Rules
Every API route must have:
- Defined input shape (validated before processing)
- Defined success response shape
- Defined error response shape
- HTTP status codes that match the outcome
- No business logic — only: validate, call module, respond

## Response Shapes
Success: { data: <result> }
Error: { error: "Human readable message in Spanish" }
Validation error: 400 + { error: "Campo requerido" }
Not found: 404 + { error: "Recurso no encontrado" }
Server error: 500 + { error: "Error interno del servidor" }

## Validation Order
1. Check required fields present
2. Check types and ranges
3. Check business constraints (stock, balance, etc.)
4. Execute operation
5. Return result

## Forbidden
- Returning 200 for errors
- Exposing raw Prisma errors to client
- Performing database operations before validation completes
- Different response shapes in different routes
