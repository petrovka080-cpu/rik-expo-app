# Wave 2 Boundary Inventory

## Critical runtime boundaries in scope

1. `src/lib/useRole.ts`
   - Why in scope: role resolution is a product-critical auth/context boundary and previously accepted an unchecked role payload through `as any`.
2. `src/lib/documents/pdfDocumentSessions.ts`
   - Why in scope: PDF session/materialization is a critical runtime boundary for mobile preview flow and previously relied on a broad `expo-file-system` `as any` cast.
3. `src/lib/localCache.ts`
   - Why in scope: durable foreman recents/favorites restore path could silently degrade on AsyncStorage read/write failure.
4. `src/lib/filePick.ts`
   - Why in scope: file picker is a critical input boundary for document attachment flows and had silent cleanup catches plus broken fallback copy.

## Production unsafe casts in scope

- `src/lib/useRole.ts`
  - Before: `(data?.role ?? null) as any`
- `src/lib/documents/pdfDocumentSessions.ts`
  - Before: `const FileSystemCompat = FileSystemModule as any`

## Tier-2 silent catches in scope

- `src/lib/localCache.ts`
  - `read(...)` catch returned fallback with no observability
  - `write(...)` catch swallowed with no observability
- `src/lib/filePick.ts`
  - `JSON.stringify(error)` failure catch was silent
  - web input cleanup catch was silent
  - picker failure only alerted, with no structured observability

## Important files intentionally not changed

- `src/lib/sessionRole.ts`
- `src/lib/pdf/*`
- `src/lib/supabaseClient.ts`
- `src/screens/foreman/*`
- `src/screens/warehouse/*`
- server / Supabase function code

Reason: Wave 2 stayed limited to typed runtime boundaries and Tier-2 catch discipline without business-logic drift or broad refactor.
