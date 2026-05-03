# commit-work
Apply this skill before every git commit.

## Rules
- One logical change per commit
- If the commit message needs the word 'and' it must be split into two commits
- Commit message format: type: short description
- Allowed types: feat fix docs refactor test chore
- Message must describe what changed, not what you did

## Pre-commit Checklist
Run in order before every commit:
1. npm run lint
2. npm run typecheck
3. npx prisma validate (if schema was touched)
4. npm test
5. git status (working tree must be clean after commit)

## Commit Examples
feat: add customer name to debts API response
fix: prevent overselling during concurrent sale creation
test: add integration tests for debt payment flow
refactor: extract shared API error helper
docs: update engineering guide with current project state

## Forbidden
- Committing with failing tests
- Committing unrelated changes together
- Vague messages like update, fix bug, changes, wip
