# Build 24 Startup Boundary Proof

## Exact startup boundary

Chosen active recovery boundary:

`POST_AUTH_ENTRY_ROUTE -> /(tabs)/profile -> ProfileMainSections -> ProfileOtaDiagnosticsCard -> eager useUpdates()`

## Why this boundary, not a broader refactor

- The reported failure pattern is tied to OTA relaunch, not to business actions.
- The first authenticated usable route is the profile screen.
- The profile screen eagerly mounted OTA diagnostics on every startup.
- [`src/features/profile/ProfileOtaDiagnosticsCard.tsx`](/c:/dev/rik-expo-app/src/features/profile/ProfileOtaDiagnosticsCard.tsx) was the only first-screen component in this path that directly subscribes to `expo-updates` hook state.
- That makes it the narrowest startup-critical OTA-native boundary available without changing business semantics.

## Code proof used

1. [`src/lib/authRouting.ts`](/c:/dev/rik-expo-app/src/lib/authRouting.ts) fixes post-auth entry to `/(tabs)/profile`.
2. [`src/screens/profile/components/ProfileMainSections.tsx`](/c:/dev/rik-expo-app/src/screens/profile/components/ProfileMainSections.tsx) always renders `ProfileOtaDiagnosticsCard` in the normal profile composition.
3. Before the fix, `ProfileOtaDiagnosticsCard` eagerly called `useUpdates()` during render.
4. The same card is not required for core business startup semantics; it is diagnostics UI only.

## Why the fix is aimed exactly there

The recovery patch removes eager `useUpdates()` from the startup path while preserving OTA diagnostics functionality through a static snapshot. This is a narrow containment fix for the startup boundary, not a product-flow rewrite.

## Startup observability added

Added startup markers in the existing platform observability channel:

- `app_launch_start`
- `bootstrap_enter`
- `auth_restore_result`
- `route_resolution_result`
- `first_usable_ui_ready`

These markers now cover the startup chain without introducing a second logging system.
