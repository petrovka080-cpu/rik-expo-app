# Wave 2 Unsafe Cast Summary

## Eliminated production unsafe casts

1. `src/lib/useRole.ts`
   - Removed: `(data?.role ?? null) as any`
   - Replaced with: explicit role normalizer + typed `AppRole`

2. `src/lib/documents/pdfDocumentSessions.ts`
   - Removed: `FileSystemModule as any`
   - Replaced with: narrow `FileSystemCompatBoundary`

## Remaining intentionally untouched unsafe areas

These were outside the exact Wave 2 write scope and were not changed in this pass:

- `src/lib/infra/queueLatencyMetrics.ts`
- `src/lib/infra/jobQueue.ts`
- `src/lib/api/*` compatibility casts
- profile/navigation/test-only cast sites

Reason they remain:
- not part of the selected critical runtime boundary slice for this wave
- changing them now would broaden the diff beyond production-safe scope

## Safety statement

No remaining unsafe cast in the touched Wave 2 files is used to hide domain uncertainty.
The only boundary adaptation kept is the explicit typed wrapper over `expo-file-system`.
