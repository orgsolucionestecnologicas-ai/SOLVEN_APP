# data-integrity
Apply this skill for every operation that creates, updates, or deletes data. Incorrect data in a business system is more dangerous than a visual bug.

## Core Rules

### Atomicity
Any operation that touches more than one table must use a Prisma transaction. If any step fails, all steps must be rolled back. Never allow partial writes.

### Concurrency Safety
For operations that read then write financial or stock values, use optimistic locking or raw SQL with SELECT FOR UPDATE to prevent race conditions. This applies to: sale creation (stock), debt payment (remaining_amount).

### Traceability
Every important change must generate a record explaining why it happened. Stock changes require InventoryMovement. Cash changes require CashMovement. Debt changes require DebtPayment.

### No Silent Updates
Never update a value without recording the change. Never delete data permanently without explicit confirmation. Prefer soft deletes or status flags over hard deletes for business records.

### Referential Integrity
Always verify that referenced records exist before creating dependent records. A SaleItem must reference a real Product. A Debt must reference a real Customer. A DebtPayment must reference a real Debt.

### Validation Before Write
All business rules must be validated before any database write begins. Do not start a transaction and then discover a validation failure mid-way.

## Pre-Write Checklist
- Are all required fields present and valid?
- Do all referenced records exist?
- Do business constraints pass (stock, balance, amounts)?
- Is the operation wrapped in a transaction if it touches multiple tables?
- Is a trace record being created alongside the main record?

## Forbidden
- Updating stock without creating InventoryMovement
- Updating cash without creating CashMovement
- Multi-table writes outside a transaction
- Deleting financial records permanently
- Trusting client-provided IDs without database verification
