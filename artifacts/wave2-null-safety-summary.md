# Wave 2 Null-Safety Summary

## `useRole` boundary

### Before
- implicit role fetch shape
- invalid role payload could flow through a cast
- no explicit invalid-role state

### After
- `resolveCurrentSessionRole(...)` is the only boundary input
- `normalizeAppRole(...)` accepts only:
  - `foreman`
  - `director`
  - `viewer`
- any other resolved role becomes explicit `null`
- invalid role payload records `use_role_invalid_role`
- resolver failure records `use_role_resolve_failed`

Result: null/invalid role state is explicit and observable instead of hidden behind a cast.

## `pdfDocumentSessions` filesystem boundary

### Before
- filesystem compatibility layer was hidden behind a broad `as any`
- file info shape was treated as if `size` always existed

### After
- typed `FileSystemCompatBoundary` wraps only:
  - `getInfoAsync`
  - `downloadAsync`
  - `copyAsync`
- `FileInfoBoundary` explicitly models degraded/nonexistent info
- `getFileSize(...)` prevents accidental `size` access on invalid shapes

Result: filesystem materialization path now has an explicit typed gate for valid vs degraded file info.
