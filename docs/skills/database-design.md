# database-design

Apply when modifying prisma/schema.prisma or creating migrations.

## Rules
- Every table has a cuid() primary key named id
- Every table has createdAt and updatedAt timestamps
- Foreign keys must reference real records — verify before insert
- Use Decimal(10,2) for all monetary values — never Float
- Use enums for fields with fixed valid values
- Index fields used in WHERE clauses frequently

## Migration Rules
- One migration per logical change
- Migration names must describe what changed: add_customer_phone not update_schema
- Never edit existing migration files
- Run migrate deploy in production — never migrate dev
- After every migration: run full test suite

## Atomicity
Any operation touching more than one table must use prisma.$transaction()
If any step fails, all steps roll back — no partial writes ever

## Forbidden
- Float for monetary values
- Nullable fields that should always have a value
- Missing indexes on foreign key columns
- Migrations that modify existing data without a backup plan
