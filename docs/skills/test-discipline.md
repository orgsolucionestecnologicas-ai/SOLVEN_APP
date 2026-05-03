# test-discipline
Apply this skill when creating or reviewing tests for any SOLVEN module.

## Test Types in SOLVEN

### Unit tests
Test a single function in isolation. Mock all external dependencies (database, other modules). Focus on: input validation, business rule enforcement, return values, error cases.
Location: same folder as the file being tested, named *.test.ts

### Integration tests
Test the full flow against the real PostgreSQL development database. No mocks. Real data. Real transactions. Focus on: create and retrieve operations, atomic behavior, constraint enforcement.
Location: *.integration.test.ts
Always clean up test data after each test using a unique test prefix.

### API handler tests
Test route handlers using mocked module functions. Focus on: correct HTTP status codes, correct response shape, validation error responses. Do not test business logic here — that belongs in unit tests.

## What Must Always Be Tested
- Happy path: valid input produces correct result
- Validation errors: invalid input returns 400 with clear message
- Business constraints: stock limit, payment limit, required fields
- Atomicity: if one step fails, no partial writes remain
- Edge cases: zero values, missing optional fields, boundary amounts

## Test Structure
describe block per module or route
it block per specific behavior
Arrange: set up data
Act: call the function or endpoint
Assert: verify result

## Validation After Every Task
npm run lint
npm run typecheck
npx prisma validate
npm test
All must pass before committing.

## Forbidden
- Skipping tests because the feature seems simple
- Testing implementation details instead of behavior
- Leaving test data in the database after integration tests
- Writing tests after discovering a bug without first writing a failing test that reproduces it
- Committing with failing tests
