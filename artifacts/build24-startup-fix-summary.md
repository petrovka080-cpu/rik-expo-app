# Build 24 Startup Fix Summary

## What changed

### 1. Removed eager OTA hook from startup-critical profile mount

In [`src/features/profile/ProfileOtaDiagnosticsCard.tsx`](/c:/dev/rik-expo-app/src/features/profile/ProfileOtaDiagnosticsCard.tsx):

- removed `useUpdates()` subscription from render
- switched diagnostics read to `getOtaDiagnostics()` static snapshot

This keeps diagnostics available but takes OTA-native hook state off the first-screen startup path.

### 2. Added narrow startup observability

In:

- [`app/_layout.tsx`](/c:/dev/rik-expo-app/app/_layout.tsx)
- [`app/index.tsx`](/c:/dev/rik-expo-app/app/index.tsx)

Added startup markers for:

- app launch
- bootstrap enter
- auth restore result
- route resolution result
- first usable UI ready

## Why this is production-safe

- no business logic changed
- no route semantics changed
- no auth/access semantics changed
- no fallback hack was introduced
- no broad refactor was performed

## What this fix does not do

- does not rewrite startup architecture
- does not change PDF behavior
- does not claim device success without a real iPhone verification
