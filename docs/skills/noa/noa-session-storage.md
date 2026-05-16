# noa-session-storage

Apply this skill when working on conversation persistence or localStorage logic.

## Storage Key
Single key: noa_session
Never use multiple keys for NOA data

## Session Object Structure
{
  name: string | undefined,
  businessType: string | undefined,
  messages: Array<{role: string, content: string}>,
  minimized: boolean,
  lastUpdated: string (ISO date)
}

## Rules
Save after every NOA response — not on every user keystroke
Load on component mount — before rendering anything
If session exists and has messages: restore without new greeting
If session is empty or missing: start fresh with NOA opening message
Messages array maximum 20 items — remove oldest when limit reached
Minimized state saves immediately on toggle

## Context Extraction
When NOA or user mentions a name: extract and save to session.name
When business type is mentioned: save to session.businessType
Use these values in the context object sent to /api/noa

## Error Handling
Wrap all localStorage calls in try/catch
If localStorage is unavailable: run without persistence, no crash
If stored data is corrupted: clear and start fresh silently

## Privacy
Never store sensitive data beyond name and business type
Never store email or phone in localStorage — only send to backend
Session data is local only — never sent to any analytics service

## Forbidden
Multiple localStorage keys for NOA
Storing email or payment data in localStorage
Crashing if localStorage is unavailable
Saving on every keystroke
