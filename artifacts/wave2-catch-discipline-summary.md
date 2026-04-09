# Wave 2 Catch Discipline Summary

## Tier-2 silent catches removed

### `src/lib/localCache.ts`

- `read(...)`
  - Before: fallback returned silently
  - After: records `local_cache_read_failed`
  - Semantics: degraded fallback, UI can continue with empty cache state

- `write(...)`
  - Before: swallowed silently
  - After: records `local_cache_write_failed`
  - Semantics: degraded fallback, user action continues but persistence failure is observable

### `src/lib/filePick.ts`

- error payload stringify fallback
  - Before: silent
  - After: records `file_pick_error_stringify_failed`
  - Semantics: cleanup-only, still returns fallback message

- web input cleanup
  - Before: silent
  - After: records `file_pick_input_cleanup_failed`
  - Semantics: cleanup-only, file selection still succeeds when possible

- top-level picker failure
  - Before: alert only
  - After: records `file_pick_failed` and shows controlled alert
  - Semantics: user-facing failure, no silent loss of action outcome

## Consistency

All touched catches now end in one of:
- degraded fallback with structured observability
- cleanup-only structured observability
- controlled user-facing failure with structured observability
