# testing-architecture

Apply when creating or reviewing tests for any module or route.

## Test Pyramid for SOLVEN
Unit tests (fastest, most): test one function with mocks
Integration tests (medium): test real DB with Neon or local Postgres
API handler tests (medium): test HTTP layer with mocked modules
E2E tests (future): not implemented yet

## What Every Module Needs
1. Unit tests for all validation functions
2. Unit tests for business logic edge cases
3. Integration test for happy path against real DB
4. Integration test for constraint violations

## What Every API Route Needs
1. Test for successful response shape
2. Test for validation error (400)
3. Test for not found (404) where applicable
4. Test for server error handling

## Test Data Rules
- Use unique prefixes for integration test data: test_[timestamp]_
- Clean up test data after each integration test
- Never depend on order of test execution
- Never share state between tests

## Coverage Priorities
High priority: financial calculations, stock operations, debt payments
Medium priority: CRUD operations, validation logic
Low priority: pure UI rendering, static content

## Forbidden
- Tests that depend on other tests running first
- Integration tests that leave data in the database
- Testing implementation details instead of behavior
- Skipping tests because the feature seems simple
