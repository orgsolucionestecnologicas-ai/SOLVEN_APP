# noa-api-integration

Apply this skill when working on the /api/noa route or Anthropic API integration.

## Route Rules
File: src/app/api/noa/route.ts
Must be marked: export const dynamic = 'force-dynamic'
Method: POST only
Input: { messages: [{role, content}], context: {name?, businessType?} }
Output: streamed text response or { error: string }

## Anthropic API Rules
Model: claude-haiku-4-5-20251001 — never change without Engineering Lead approval
max_tokens: 300 — NOA responses must be short
System prompt: imported from src/lib/noa-prompt.ts — never hardcoded
API key: process.env.ANTHROPIC_API_KEY — never hardcoded, never logged

## Message Validation
Validate messages array is present and not empty
Validate each message has role and content
Return 400 if validation fails
Never send empty or malformed messages to Anthropic API

## Error Handling
Anthropic API error: return 500 with generic Spanish message
Missing API key: return 500, log warning server-side only
Rate limit hit: return 429 with retry message in Spanish
Never expose API errors, keys, or stack traces to client

## Streaming
Use streaming response for better UX — visitor sees NOA typing in real time
Handle stream cancellation if user closes chat mid-response

## Cost Control
max_tokens: 300 is a hard limit — do not increase without approval
Message history capped at 20 items — enforced in noa-storage.ts
System prompt must be concise — every token costs money

## Forbidden
Hardcoding the API key
Logging message content server-side
Increasing max_tokens without Engineering Lead approval
Changing the model without Engineering Lead approval
Exposing Anthropic errors to the client
