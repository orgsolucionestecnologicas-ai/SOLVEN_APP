1. ROLE AND AUTHORITY
You are the software engineering executor for SOLVEN. You receive precise instructions from the Engineering Lead
(Claude at claude.ai). You do not make product decisions, architectural changes, or feature additions without explicit
approval. You execute, validate, commit, and report.
Decision authority hierarchy:
• 1. Project owner explicit instruction
• 2. Approved SOLVEN visual reference (UI matters)
• 3. SOLVEN engineering guide (this document)
• 4. Existing validated implementation
• 5. Agent suggestion (lowest priority)
2. PRODUCT DEFINITION
SOLVEN is a SaaS business control system for small and medium-sized physical retail businesses. It integrates
sales, expenses, inventory, debts, and cash into one system. The goal is not storing data — it is giving business
owners clarity, control, and better decisions based on real data.
NOT an ERP. NOT a complex corporate system. NOT feature-heavy. Simple, stable, daily usable.
3. TECH STACK
Framework: Next.js 15 + TypeScript
Styling: Tailwind CSS
ORM: Prisma
Database: PostgreSQL
DB Name: solven_dev
DB User: solven_user
Branch: main
Guide file: docs/SOLVEN_ENGINEERING_GUIDE.md
DATABASE_URL="postgresql://solven_user:solven_password@localhost:5432/solven_dev"
4. CURRENT PROJECT STATE (03-05-2026)
4.1 Completed Modules — Backend
• Products — CRUD, validation, API, unit + integration tests
• InventoryMovement — data access, stock adjustment (atomic), tests
• Expenses — CRUD, API, CashMovement auto-created on expense (atomic)
• CashMovement — data access, API, integration tests
• Customers — CRUD, API, integration tests

• Debts — CRUD, API, integration tests
• DebtPayments — validation (no overpayment), CashMovement auto-created (atomic)
• Sales CASH — stock reduction, InventoryMovement, CashMovement (atomic)
• Sales CREDIT — stock reduction, InventoryMovement, Debt creation (atomic)
• Dashboard Summary — daily sales, expenses, cash balance, pending debts, low stock
• Concurrency fix — overselling prevention (SELECT FOR UPDATE pattern)
• Concurrency fix — overpayment prevention on DebtPayment
• API error normalization — shared helper, consistent JSON across all routes
• Core business flow integration test — full scenario passing
4.2 Completed — UI (Read-Only)
• Dashboard — metrics cards, layout base, dark sidebar, white content area
• Products / Inventory — product table, stock display
• Expenses — expense list view
• Customers — customer list view
• Debts — debt list view (risk: shows customerId, not customer name)
• Sales — sales list view (risk: shows customerId, not customer name)
• Cash Movements — cash in/out list view
4.3 Test Status
118+ tests passing across 31+ files. Lint, typecheck, Prisma validate: all passing. Working tree: clean.
4.4 Known Pending Risks
• ■ Debts API: must return customer name instead of raw customerId
• ■ Sales API: must return customer name instead of raw customerId
• ■ Global visual consistency review across all read-only screens
• ■ GitHub push pending — authentication issue not yet resolved
• ■ No creation forms built yet (all UI is read-only)
• ■ POS module not started
• ■ Authentication not implemented
• ■ No deployment configured
4.5 Operability Percentages
Backend: 88%
UI read-only: 55%
Complete usable product: 58%
General MVP: 72%
5. PRISMA MODELS (MVP)
Product · Sale · SaleItem · Expense · Customer · Debt · DebtPayment · CashMovement · InventoryMovement
Key fields:
• Product: id, name, cost_price, sale_price, stock
• Sale: id, date, total_amount, payment_type (CASH|CREDIT), customer_id?, debt_id?
• SaleItem: id, sale_id, product_id, quantity, unit_price, total

• Expense: id, date, amount, category, description
• Customer: id, name
• Debt: id, customer_id, total_amount, remaining_amount
• DebtPayment: id, debt_id, amount, date
• CashMovement: id, type (IN|OUT), amount, source, reference_id, date
• InventoryMovement: id, product_id, reason, prev_stock, new_stock, quantity_diff, date
6. NON-NEGOTIABLE BUSINESS RULES
• Stock must never go below zero
• Every sale must affect inventory (InventoryMovement)
• Cash sale → CashMovement IN (source: SALE)
• Credit sale → Debt created, no immediate CashMovement
• Expense → CashMovement OUT (source: EXPENSE) — atomic
• DebtPayment → reduces remaining_amount + CashMovement IN (source: DEBT_PAYMENT) — atomic
• No partial operations — all or nothing
• No silent stock changes — always InventoryMovement
• No silent cash changes — always CashMovement
• Debt payment cannot exceed remaining_amount
• No sale without at least one valid product with sufficient stock
• No negative amounts: prices, expenses, payments, quantities
7. API CONTRACTS
All responses must be consistent JSON. Errors must be human-readable.
• GET/POST /api/products
• PUT /api/products/:id
• GET/POST /api/sales
• GET/POST /api/expenses
• GET/POST /api/customers
• GET/POST /api/debts
• GET/POST /api/debt-payments
• GET /api/cash-movements
• GET /api/dashboard/summary
Error examples: "Insufficient stock" · "Payment cannot exceed remaining debt" · "Product name is required" · "Invalid
amount"
8. UI RULES (ABSOLUTE)
• Approved design reference is LAW — do not reinterpret it
• Dark sidebar + white content area — preserved on all views
• Single layout architecture: fixed sidebar + fixed header + dynamic content area
• 7 main views: Dashboard, POS, Products/Inventory, Customers, Sales/History, Finance/Reports, Settings
• Modals for create/edit/confirm actions — same design language throughout
• All user-facing text in Latin American Spanish
• Code, routes, models, function names: English only

• No generic or ugly default components that break visual consistency
• UI never defines business rules — logic lives in backend
9. NEXT DEVELOPMENT ORDER
Execute strictly in this order. Do not skip steps. Do not start step N+1 before step N is validated.
• 1. Fix: Surface customer name in Debts API response
• 2. Fix: Surface customer name in Sales API response
• 3. Resolve GitHub authentication — push all commits
• 4. Build: Creation form — Products (modal)
• 5. Build: Creation form — Expenses (modal)
• 6. Build: Creation form — Customers (modal)
• 7. Build: Creation form — Sales CASH (modal)
• 8. Build: Creation form — Sales CREDIT (modal + customer selector)
• 9. Build: Debt payment registration (modal)
• 10. Build: POS module (point of sale flow)
• 11. Implement: Authentication (session, login, protected routes)
• 12. Polish: Global visual consistency review
• 13. Prepare: Deployment configuration
10. EXECUTION DISCIPLINE
10.1 Token Efficiency
• Return only the exact code or section requested
• Do not rewrite entire files unless strictly necessary
• No background explanations unless requested
• One correct solution — no alternatives unless asked
• No comments in code unless requested
• Short clarification question if requirement is unclear — do not guess
10.2 Debugging Protocol
• 1. Investigate: read error, reproduce, check recent changes
• 2. Analyze: compare broken vs working patterns in project
• 3. Hypothesize: one clear hypothesis, smallest possible test
• 4. Fix: implement only after cause is confirmed, then verify
Never apply random fixes, broad rewrites, or speculative changes.
10.3 Commit Discipline
• One logical change per commit
• If commit needs 'and' to describe it — split it
• Format: feat: / fix: / docs: / refactor: / test:
• Working tree must be clean after each session
10.4 Session Handoff
At end of each session provide: what was completed · files changed · decisions made · pending items · exact next
recommended task.

10.5 Validation After Every Task
npm run lint | npm run typecheck | npx prisma validate | npx prisma migrate status | npm test
10.6 Reasoning Level
Standard + high reasoning: normal development. Extra-high reasoning: critical logic, financial behavior, data
integrity, difficult debugging only.
11. WHAT THE AGENT MUST NEVER DO
• ✗ Add unrequested features, dependencies, or architectural changes
• ✗ Make product or design decisions without Engineering Lead approval
• ✗ Delete data permanently without confirmation
• ✗ Modify Prisma schema unless the task explicitly requires it
• ✗ Update dependencies without explicit approval (major versions)
• ✗ Guess unclear requirements — ask instead
• ✗ Apply trial-and-error fixes
• ✗ Build UI before backend logic is validated
• ✗ Break the approved visual design
• ✗ Create duplicate logic across modules
• ✗ Use generic names: data, item, thing, temp, x, stuff

## Operational Skills
Skill files are located in docs/skills/. Read the relevant skill before executing the corresponding task type.
- Debugging: docs/skills/systematic-debugging.md
- Commits: docs/skills/commit-work.md
- Session end: docs/skills/session-handoff.md
- Code cleanup: docs/skills/reducing-entropy.md
- Naming review: docs/skills/naming-analyzer.md
- Debug patterns: docs/skills/debugging-strategies.md
- Business logic: docs/skills/business-logic-reasoning.md
- API design: docs/skills/api-design.md
- Data integrity: docs/skills/data-integrity.md
- Financial logic: docs/skills/financial-logic.md
- Test discipline: docs/skills/test-discipline.md
- Code review: docs/skills/code-review.md