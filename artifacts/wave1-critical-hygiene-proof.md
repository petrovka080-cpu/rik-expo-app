# Wave 1 Critical Hygiene + Protection Proof

## What changed
- Deleted dead backup files from `app/(tabs)`.
- No runtime change was needed for `Profile`, because it is already wrapped by the canonical `withScreenErrorBoundary` contract.

## Profile boundary parity
- Wrapper present in `app/(tabs)/profile.tsx`:
  - `withScreenErrorBoundary(ProfileScreen, { screen: "profile", route: "/profile" })`
- Shared observability/retry path lives in `src/shared/ui/ScreenErrorBoundary.tsx`:
  - crash event: `screen_error`
  - retry event: `screen_error_retry`
  - surface: `screen_boundary`
  - category: `ui`

## Deleted backup files
- `app/(tabs)/accountant.tsx.bak`
- `app/(tabs)/buyer.tsx.bak`
- `app/(tabs)/foreman.tsx.bak`
- `app/(tabs)/foreman.tsx.bak.2`
- `app/(tabs)/security.tsx.bak`

## Remaining backup outside scope
- `diagnostics/root-legacy/app.json.bak`
  - Not part of the production routing/code tree for this wave.

## Smoke status
- Local app/tabs smoke was not fully provable in this environment.
- Exact blocker:
  - Expo web bootstrap failed before app start because `expo-router` config-plugin resolution could not find `@expo/schema-utils`.
- Test-harness blocker:
  - local Jest bootstrap failed because `@jest/core` is missing in the current environment.

## Verdict
- Cleanup proof: complete
- Profile boundary parity proof: complete
- Live smoke proof: blocked by pre-existing local environment issue
- Final status: `NOT_GREEN`
