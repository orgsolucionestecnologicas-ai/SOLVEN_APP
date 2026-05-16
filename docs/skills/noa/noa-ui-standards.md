# noa-ui-standards

Apply this skill when building or modifying any NOA UI component.

## Layout
NOA is a visible chat panel — not a floating bubble
Position: fixed, bottom-right corner of the landing page
Width: 380px — Height: 520px
Always visible on desktop — responsive behavior on mobile
Z-index must not cover critical landing page navigation

## Visual Design
Header: dark background, NOA name, green online dot, minimize button
Messages area: scrollable, white/light background
User messages: right-aligned, blue background, white text
NOA messages: left-aligned, dark background, white text
Input area: text field full width + send button
Typing indicator: animated dots while waiting for API response
Font: same as SOLVEN system — Tailwind defaults

## Interaction Rules
Send on Enter key or click send button
Disable input while waiting for API response
Auto-scroll to latest message after each response
Minimize: collapses to header bar only — click to expand
Minimized state shows unread indicator if NOA sent a message while minimized

## States to Handle
Empty: show opening message from NOA
Loading: show typing indicator
Error: show retry message in Spanish
Minimized: show only header bar
Restored session: show previous messages, no new greeting

## Mobile Behavior
On screens under 640px: full width, anchored to bottom
Height reduces to 420px on mobile
Font size minimum 14px for readability

## Forbidden
Covering the landing page CTA buttons with the chat panel
Showing scrollbar on messages area unless content overflows
Flashing or animation on initial load
Any style that conflicts with the SOLVEN landing page design
