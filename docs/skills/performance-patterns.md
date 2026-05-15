# performance-patterns

Apply when a feature involves data fetching, rendering, or database queries.

## Data Fetching
- Fetch only the fields you need — use Prisma select
- Batch independent fetches with Promise.allSettled
- Never fetch inside a loop — fetch all, then process in memory
- Paginate all list endpoints — never return unbounded arrays
- Cache static or slow-changing data in component state

## Database Queries
- Use indexes for all fields in WHERE clauses
- Avoid N+1 queries — use Prisma include for relations
- Count with Prisma count() not array.length on full fetch
- Use Prisma findMany with take and skip for pagination
- Aggregate with Prisma groupBy not JavaScript reduce on full dataset

## React Performance
- Memoize expensive calculations with useMemo
- Avoid re-renders: move state as close to usage as possible
- Debounce API calls triggered by user input (300-500ms)
- Use loading states — never block entire UI for one slow fetch
- Each panel handles its own error — one failure must not break others

## Forbidden
- SELECT * on large tables
- Fetching all records to count them
- Synchronous operations that block the UI thread
- useEffect with missing or incorrect dependencies
