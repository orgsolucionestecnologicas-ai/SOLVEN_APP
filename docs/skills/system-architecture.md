# system-architecture

Apply before designing any new module, feature, or integration.

## Principles
- Design for the current scale, not hypothetical future scale
- Separate concerns: data layer, business logic, API layer, UI layer
- Every module has one clear responsibility
- Dependencies flow inward — UI depends on API, API depends on modules, modules depend on data access
- No circular dependencies between modules

## Decision Framework
Before adding a new module ask:
1. Does this belong in an existing module?
2. What are the inputs and outputs?
3. What existing modules does it touch?
4. What database tables does it affect?
5. What API routes does it expose?

## SOLVEN Architecture
src/modules/ — business logic and data access (no HTTP)
src/app/api/ — thin HTTP handlers, call modules, return JSON
src/app/ui/ — React components, call APIs, render data
src/lib/ — shared utilities (formatters, helpers)
prisma/ — schema and migrations

## Forbidden
- Business logic in API route handlers
- Direct Prisma calls from UI components
- Shared mutable state between modules
- God modules that do everything
