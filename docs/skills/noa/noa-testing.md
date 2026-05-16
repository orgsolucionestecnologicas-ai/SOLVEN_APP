# noa-testing

Apply this skill when writing or reviewing tests for NOA components or API.

## What to Test

### API Route Tests
Valid request returns streamed response
Missing messages array returns 400
Empty messages array returns 400
Missing API key returns 500 with Spanish message
Anthropic API error returns 500 with Spanish message

### Storage Tests
saveNoaSession stores correct structure
loadNoaSession returns null when nothing stored
loadNoaSession returns stored session correctly
Messages trimmed to 20 when limit exceeded
clearNoaSession removes all data
Corrupted data handled gracefully

### Component Tests
NoaChat renders correctly on mount
Opening message appears when no session exists
Previous messages restored when session exists
Typing indicator shows while waiting for response
Error message shows when API fails
Minimize and expand work correctly

## Mock Rules
Mock fetch for API route tests
Mock localStorage for storage tests
Mock Anthropic API response — never call real API in tests

## Validation After Changes
npm run lint && npm run typecheck && npm test
All existing SOLVEN tests must still pass
NOA tests must not affect SOLVEN core test suite

## Forbidden
Calling real Anthropic API in tests
Tests that depend on localStorage state from previous tests
Skipping tests because the change seems small
