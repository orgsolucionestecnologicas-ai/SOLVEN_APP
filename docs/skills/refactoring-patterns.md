# refactoring-patterns

Apply when improving existing code without changing behavior.

## When to Refactor
- Same logic exists in more than one place
- A function does more than one thing
- A file has grown beyond 500 lines with mixed responsibilities
- A component renders more than 3 levels of nested conditionals
- The same data transformation happens in multiple components

## How to Refactor Safely
1. Identify the exact behavior to preserve
2. Write or verify tests cover that behavior
3. Make one change at a time
4. Run tests after each change
5. Commit each logical refactor separately

## Extract Patterns
- Repeated API call logic → shared fetch helper
- Repeated formatting → utility in src/lib/
- Repeated UI pattern → shared component
- Repeated validation → shared validator function
- Repeated Prisma query → data access function in module

## Forbidden
- Refactoring and adding features in the same commit
- Refactoring without test coverage
- Renaming everything at once
- Changing behavior while refactoring
