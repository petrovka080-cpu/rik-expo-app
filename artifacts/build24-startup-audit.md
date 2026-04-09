# Build 24 Startup Audit

## Startup chain

1. Native host launches Expo Router root.
2. [`app/_layout.tsx`](/c:/dev/rik-expo-app/app/_layout.tsx) runs top-level imports and mounts `RootLayout`.
3. `RootLayout`:
   - installs web-only `console.warn` patch on web only
   - starts `clearAppCache()` fire-and-forget
   - calls `getSessionSafe({ caller: "root_layout" })`
   - subscribes to `supabase.auth.onAuthStateChange`
   - may redirect to `/auth/login` or `POST_AUTH_ENTRY_ROUTE`
   - mounts `PlatformOfflineStatusHost`
4. Initial route [`app/index.tsx`](/c:/dev/rik-expo-app/app/index.tsx) also calls `getSessionSafe({ caller: "index_bootstrap" })` and performs its own `router.replace(...)`.
5. Authenticated post-auth route resolves to `POST_AUTH_ENTRY_ROUTE = "/(tabs)/profile"`.
6. [`app/(tabs)/profile.tsx`](/c:/dev/rik-expo-app/app/(tabs)/profile.tsx) mounts `ProfileScreen` inside `ScreenErrorBoundary`.
7. [`src/screens/profile/ProfileContent.tsx`](/c:/dev/rik-expo-app/src/screens/profile/ProfileContent.tsx) loads profile data and renders [`src/screens/profile/components/ProfileMainSections.tsx`](/c:/dev/rik-expo-app/src/screens/profile/components/ProfileMainSections.tsx).
8. `ProfileMainSections` eagerly renders [`src/features/profile/ProfileOtaDiagnosticsCard.tsx`](/c:/dev/rik-expo-app/src/features/profile/ProfileOtaDiagnosticsCard.tsx).

## Suspect boundaries considered

- duplicate session/bootstrap ownership between `app/index.tsx` and `app/_layout.tsx`
- early route redirects before first usable UI
- `PlatformOfflineStatusHost` mounting durable stores/network service during startup
- eager OTA runtime access on the first profile screen mount

## Chosen exact scope for recovery fix

Only:

- [`src/features/profile/ProfileOtaDiagnosticsCard.tsx`](/c:/dev/rik-expo-app/src/features/profile/ProfileOtaDiagnosticsCard.tsx)
- [`app/_layout.tsx`](/c:/dev/rik-expo-app/app/_layout.tsx)
- [`app/index.tsx`](/c:/dev/rik-expo-app/app/index.tsx)
- focused startup/profile tests

## Not touched

- backend / Supabase functions
- PDF flow
- auth/access/business semantics
- realtime
- broad screen/controller refactors

## Root cause hypothesis before patch

The most likely startup-regressed boundary is the first post-auth profile mount, where `ProfileOtaDiagnosticsCard` eagerly subscribes to `expo-updates` state via `useUpdates()` during cold relaunch into a downloaded OTA state. This places OTA-native runtime access on the startup-critical path before first usable UI.

The duplicate bootstrap in `app/index.tsx` + `app/_layout.tsx` remains a structural risk, but it was not the narrowest recovery-first boundary for build 24.
