# noa-deployment

Apply this skill before pushing any NOA changes to production.

## Pre-Deploy Checklist
npm run lint: must pass
npm run typecheck: must pass
npm test: all tests must pass
ANTHROPIC_API_KEY not hardcoded anywhere in code
No console.log statements left in NOA files
No debug code or test data in production files
Working tree clean before push

## Environment Variables Required in Vercel
ANTHROPIC_API_KEY — Anthropic API key for NOA
Without this variable NOA will not function in production
Verify it exists in Vercel dashboard before pushing NOA changes

## After Push
Verify Vercel deployment completes without errors
Test NOA manually on https://solven-app-484v.vercel.app
Send one message and confirm NOA responds correctly
Confirm session persists on page reload
Confirm minimize and restore works

## Cost Monitoring
After deploy, monitor Anthropic API usage at console.anthropic.com
Alert Engineering Lead if daily cost exceeds $1 USD
If unexpected spike: disable NOA route temporarily and report

## Rollback
If NOA breaks in production: revert the last commit and push
git revert HEAD && git push origin main
Report to Engineering Lead immediately with the error details

## Forbidden
Pushing with failing tests
Pushing with hardcoded API key
Pushing without verifying Vercel has ANTHROPIC_API_KEY
Ignoring Vercel build errors
