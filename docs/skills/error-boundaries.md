# error-boundaries

Apply when implementing any user-facing feature or API route.

## Error Handling Layers

### API Layer
- Wrap every route handler in try/catch
- Log the real error server-side
- Return a safe, generic message to the client
- Never expose stack traces, Prisma internals, or database details

### Module Layer
- Validate inputs before any database operation
- Throw typed errors with clear messages
- Never swallow errors silently — always propagate or handle

### UI Layer
- Every data fetch has a loading state and an error state
- Error messages are shown to the user in plain Spanish
- One failed fetch must not crash the entire page
- Show retry option when appropriate

## Error Message Standards (Spanish)
Validation: "El [campo] es requerido" / "El monto debe ser mayor a cero"
Business: "Stock insuficiente" / "El pago supera el saldo pendiente"
Generic: "Ocurrió un error. Intenta de nuevo."
Not found: "No se encontró el recurso solicitado"

## Forbidden
- Empty catch blocks
- Showing raw error objects to users
- Crashing the entire page on a single component error
- Silent failures that leave data in inconsistent state
