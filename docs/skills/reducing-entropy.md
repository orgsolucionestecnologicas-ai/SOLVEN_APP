# reducing-entropy
Apply this skill when reviewing, refactoring, or adding code. Goal: keep the codebase simple, clear, and maintainable.

## Rules

### Before adding code
- Check if existing code already does this
- Check if existing code can be extended instead of duplicated
- If a helper already exists, use it

### While writing code
- Write the simplest version that correctly solves the problem
- Avoid abstractions that are not immediately necessary
- Avoid deeply nested logic — extract to named functions
- One function, one responsibility

### After writing code
- Remove unused imports, variables, and functions
- Remove commented-out code
- Remove console.log statements left from debugging
- Verify no logic is duplicated across files

## Warning Signs
- Same logic exists in more than one file
- A function does more than one thing
- A file has more than one clear responsibility
- Code is hard to read without a comment explaining it

## Forbidden
- Duplicating validation logic across routes
- Creating abstractions for single-use cases
- Leaving dead code in the repository
