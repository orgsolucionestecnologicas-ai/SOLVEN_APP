# security-patterns

Apply when handling authentication, user input, or sensitive data.

## Authentication
- All routes except /login and /api/auth/* require valid session cookie
- Session token: HMAC-SHA256 signed with SOLVEN_SESSION_SECRET
- Cookie: httpOnly, secure in production, sameSite strict
- Never store passwords in plain text
- Validate session on every protected request via middleware

## Input Sanitization
- Never trust client-provided data — validate server-side always
- Sanitize string inputs: trim whitespace, check length limits
- Validate numeric inputs: positive, within valid range, not NaN
- Validate IDs: verify record exists in database before using
- Never concatenate user input into SQL strings — use Prisma always

## Sensitive Data
- Never log passwords, tokens, or session secrets
- Never return passwords or secrets in API responses
- Environment variables for all secrets — never hardcode
- Never expose database connection strings to the client

## Forbidden
- Client-side only validation without server-side validation
- Trusting client-provided totals or calculated amounts
- Storing session data in localStorage
- Using Math.random() for security-sensitive tokens
