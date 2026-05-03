# business-logic-reasoning
Apply this skill before implementing any feature that affects sales, inventory, cash, debts, or customers. Code must reflect real business behavior — not assumptions.

## Core Principle
Every action has a cause, a process, and a result. Before writing code, define all three for the task at hand.

## Reasoning Protocol

### Step 1 — Identify the business action
What is the user doing? What real-world event does this represent?
Example: registering a credit sale means the business gave goods and expects payment later.

### Step 2 — Identify all consequences
What must change in the system as a result of this action? List every entity that must be created, updated, or connected.
Example: credit sale consequences:
- Stock decreases for each product sold
- InventoryMovement created for each product
- Sale record created with paymentType CREDIT
- SaleItems created for each product
- Debt created linked to customer
- No CashMovement created at this point

### Step 3 — Identify constraints and edge cases
What must be validated before processing? What must never happen?
Example: stock must not go below zero, customer must exist, quantity must be positive.

### Step 4 — Define atomicity
Which consequences must happen together or not at all? Wrap those in a single Prisma transaction.

### Step 5 — Confirm before coding
If any consequence or constraint is unclear, stop and ask. Do not guess business behavior.

## SOLVEN Business Action Map
Cash sale: Stock down + InventoryMovement + Sale + SaleItems + CashMovement IN
Credit sale: Stock down + InventoryMovement + Sale + SaleItems + Debt created
Expense: Expense record + CashMovement OUT
Debt payment: DebtPayment + remaining_amount down + CashMovement IN
Stock adjustment: Stock updated + InventoryMovement with reason

## Forbidden
- Implementing a feature without mapping all its consequences first
- Allowing partial operations that leave the system in an inconsistent state
- Guessing business rules that were not explicitly defined
