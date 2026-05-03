# debugging-strategies
Apply this skill when systematic-debugging does not immediately identify the root cause. These are pattern-based techniques for harder problems.

## Strategy 1 — Isolate the boundary
Identify exactly where correct behavior ends and incorrect behavior begins. Add a temporary log or assertion at the boundary to confirm the exact failure point. Remove all logs after the fix is confirmed.

## Strategy 2 — Minimal reproduction
Reproduce the bug with the smallest possible input. Remove all unrelated code, data, and dependencies from the reproduction. A minimal reproduction almost always reveals the cause.

## Strategy 3 — Compare with working equivalent
Find a feature or module in the project that works correctly and follows the same pattern. Compare structure, data flow, and validation step by step. The difference between working and broken usually contains the root cause.

## Strategy 4 — Follow the data
Trace the data from input to output through every transformation. Check what enters a function, what it returns, and what the caller does with it. Financial data bugs almost always come from a silent transformation or missing field.

## Strategy 5 — Check recent changes
Run git log and git diff to see what changed before the bug appeared. Most bugs are caused by the most recent change.

## Strategy 6 — Test in isolation
If a unit test is failing, run only that test file. If an API is behaving incorrectly, test it directly without the UI. Eliminate layers until the problem is isolated.

## Rules
- Apply one strategy at a time
- Document the hypothesis before changing anything
- Verify the fix with the full test suite before closing
- Never apply two strategies simultaneously
