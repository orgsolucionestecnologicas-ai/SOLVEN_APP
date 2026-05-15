# state-management

Apply when designing component state or data flow in UI.

## State Placement Rules
- State lives as close to its usage as possible
- Lift state only when two sibling components need the same data
- Server data belongs in component state fetched on mount
- User input belongs in controlled component state
- Derived values are computed with useMemo — not stored in state

## State Patterns for SOLVEN
- List views: fetch on mount, store in state, filter/paginate in memory
- Forms: controlled inputs, validate on submit, show errors inline
- Modals: open/close boolean + selected item in parent state
- Cart (POS): persist to localStorage on every change
- Session data: fetch once on mount, pass down via props

## Async State Pattern
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
Always handle all three states in the UI.

## Forbidden
- Global state for data that only one component uses
- Storing derived values in state when they can be computed
- useEffect chains that trigger each other
- State updates inside render functions
