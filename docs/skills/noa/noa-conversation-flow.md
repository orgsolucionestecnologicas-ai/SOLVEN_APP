# noa-conversation-flow

Apply this skill when modifying how NOA handles conversation logic, context, or flow.

## Conversation States
greeting: NOA opens, asks name and business type
discovery: NOA identifies main pain point
pitch: NOA connects pain to SOLVEN solution
objection: NOA handles resistance
closing: NOA drives toward 14-day free trial
capture: NOA requests email or contact for follow-up

## Context Extraction Rules
When user mentions their name: save to session context immediately
When user mentions business type: save to session context immediately
Use saved context in every subsequent NOA message naturally
Never ask for information already provided in the conversation

## Message History Rules
Send full message history to API on every request
Maximum 20 messages in history — trim oldest if exceeded
Always include system prompt — never omit it
Context object (name, businessType) sent alongside messages

## Session Persistence Rules
Save session to localStorage after every NOA response
On mount: load session and restore full conversation
If session exists: NOA does not repeat the greeting
If session is empty: NOA sends opening message automatically
Minimized state also persists in localStorage

## Error Recovery
If API call fails: show human message in Spanish, offer to retry
If session is corrupted: clear and restart gracefully
Never show technical error messages to the visitor

## Forbidden
Asking for name or business type if already in session
Resetting conversation on page reload
Showing API errors or stack traces to visitor
