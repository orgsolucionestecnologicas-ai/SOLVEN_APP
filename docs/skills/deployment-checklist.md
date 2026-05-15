# deployment-checklist

Apply before every production deployment.

## Pre-Deploy Checks
- npm run lint — must pass with zero errors
- npm run typecheck — must pass with zero errors
- npm test — all tests must pass
- npm run build — must complete with zero errors
- git status — working tree must be clean
- git log — verify only intended commits are included

## Environment Variables (Vercel)
Required in production:
DATABASE_URL — Neon PostgreSQL connection string
SOLVEN_USER — admin username
SOLVEN_PASSWORD — secure password (not solven2024 in production)
SOLVEN_SESSION_SECRET — random 32+ char string (not the dev default)

## Database
- npx prisma migrate deploy — run migrations against production
- Verify migration status after deploy
- Never run prisma migrate dev in production
- Never run prisma db push in production

## Post-Deploy Verification
1. Open production URL — landing page loads
2. Login with production credentials
3. Create a test product
4. Register a test sale
5. Verify cash movement was created
6. Check reports show the test data
7. Delete test data manually if needed

## Rollback Plan
- Revert commit: git revert [hash] && git push origin main
- Vercel redeploys automatically on push
- Database rollback: contact Neon support or restore backup

## Forbidden
- Deploying with failing tests
- Deploying without running npm run build locally first
- Using development secrets in production
- Running migrate dev against production database
