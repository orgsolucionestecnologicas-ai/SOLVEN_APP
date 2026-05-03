# systematic-debugging
Apply this skill when an error, failed test, broken behavior, or unexpected result appears. Never fix by trial and error. Never apply broad rewrites.

## Protocol

### Step 1 — Investigate
- Read the full error message carefully
- Reproduce the problem with the smallest possible input
- Check what changed recently (git log, git diff)
- Identify the exact file, function, and line where the failure originates

### Step 2 — Analyze
- Find a working example in the project that follows the same pattern
- Compare the broken code with the working code
- Identify the structural or logical difference

### Step 3 — Hypothesize
- Form one clear hypothesis about the root cause
- Design the smallest possible change that would confirm or reject it
- Do not implement anything yet

### Step 4 — Fix
- Implement only after the cause is confirmed
- Change only what is necessary
- Verify the fix resolves the issue without breaking anything else
- Run: npm run lint && npm run typecheck && npm test

## Forbidden
- Random fixes
- Rewriting unrelated code
- Phrases like try this and see if it works
- Applying multiple changes at once without knowing which one fixed it
