# code-review
Apply this skill before delivering any code change. Self-review catches problems before they become bugs or technical debt.

## Review Checklist

### Correctness
- Does the code do exactly what was requested and nothing more?
- Are all business rules from docs/SOLVEN_ENGINEERING_GUIDE.md respected?
- Are all edge cases handled (empty input, zero values, missing fields)?
- Are all financial calculations done with correct precision?

### Data Safety
- Are multi-table operations wrapped in a Prisma transaction?
- Is a trace record created for every stock or cash change?
- Is all input validated before any database write?
- Are referenced records verified to exist before being used?

### Code Quality
- Are names descriptive and consistent with the rest of the project?
- Is there any duplicated logic that should use an existing helper?
- Are there any unused imports, variables, or functions?
- Are there any console.log statements left from debugging?
- Is the code readable without needing a comment to explain it?

### API Quality (if modifying a route)
- Does the route use the shared API response helper?
- Are HTTP status codes correct?
- Are error messages in Spanish and human-readable?
- Is business logic in the module, not in the route handler?

### Tests
- Is there a test for the happy path?
- Is there a test for the main validation failure?
- Do all existing tests still pass?

### Final Check
- npm run lint: passes
- npm run typecheck: passes
- npm test: all tests pass
- git status: only the expected files are modified

## Delivery Standard
Code is ready to deliver only when every item on this checklist passes. If any item fails, fix it before delivering.

## Forbidden
- Delivering code that fails lint or typecheck
- Delivering code with failing tests
- Skipping review because the change seems small
- Leaving debug code, dead code, or TODO comments without a linked task
