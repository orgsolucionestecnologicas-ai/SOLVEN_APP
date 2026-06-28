# financial-logic
Apply this skill for every operation involving money, balances, debts, payments, or cash. Financial errors are silent, cumulative, and destructive to business trust.

## Core Rules

### Precision
All monetary values are stored and calculated as integers in cents or as Decimal in Prisma. Never use JavaScript floating point arithmetic for financial calculations. Never do: 0.1 + 0.2 — use integer cents or Prisma Decimal throughout.

### Direction
Every financial operation has a direction: IN or OUT. CashMovement type must always reflect the correct direction. Sale CASH = IN. Expense = OUT. DebtPayment = IN.

### Balance Consistency
After any financial operation, verify the resulting balance is logically correct. Cash balance must never be negative unless explicitly designed to allow it. Debt remaining_amount must never be negative. remaining_amount must never exceed total_amount.

### Payment Validation
Before processing a debt payment:
1. Fetch current remaining_amount from database (not from client)
2. Validate payment amount is greater than zero
3. Validate payment amount does not exceed remaining_amount
4. Process payment and update remaining_amount atomically

### Sale Total Validation
Total sale amount must equal the sum of all SaleItem totals. Each SaleItem total equals quantity multiplied by unit_price. Calculate totals in the backend. Never trust client-calculated totals.

### Immutability of Historical Records
Completed sales, paid expenses, and processed payments must not be modified. Corrections must be done through new compensating records, not edits.

## Calculation Checklist
- Is the monetary value stored as integer cents or Prisma Decimal?
- Is the CashMovement direction correct (IN or OUT)?
- Is the total calculated in the backend, not on the client?
- Is the payment validated against the current database value?
- Is the operation atomic?

## Forbidden
- Floating point arithmetic for money
- Trusting client-provided totals or balances
- Allowing remaining_amount to go below zero
- Creating CashMovement with wrong direction
- Modifying completed financial records
