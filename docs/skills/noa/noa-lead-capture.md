# noa-lead-capture

Apply this skill when implementing or modifying the lead capture flow in NOA.

## What is Lead Capture
When a visitor shows interest, NOA asks for their email or phone. This allows follow-up even if the visitor does not convert immediately. Lead capture is a natural part of the conversation — never forced.

## When NOA Should Ask for Contact
After the visitor shows clear interest (asks about price, trial, or features)
After handling an objection successfully
Before ending a conversation that did not convert
Never at the start of the conversation

## Capture Flow
NOA asks naturally: che, si queres te mando info por mail o WhatsApp
Visitor provides email or phone
Frontend sends to POST /api/noa/leads
Backend saves to a leads table or sends notification
NOA confirms and continues conversation

## Data Validation
Email: basic format validation before saving
Phone: Argentine format — accept with or without country code
Never block conversation if visitor skips capture

## Storage
Leads saved server-side — never only in localStorage
Include: email or phone, name if known, businessType if known, timestamp
Do not save sensitive financial data

## Forbidden
Asking for contact at the start of conversation
Blocking conversation if visitor refuses to share contact
Storing leads only in localStorage
Sending contact data to third parties
