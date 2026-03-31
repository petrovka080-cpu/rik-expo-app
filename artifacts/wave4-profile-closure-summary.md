# Wave 4 Profile Closure Summary

- Static proof: GREEN
- Web: GREEN
- Android: GREEN
- iOS: HOST_BLOCKED
- Final status: PARTIAL: WEB_ANDROID_GREEN_IOS_HOST_BLOCKED

## Commands
- tsc: node node_modules/typescript/bin/tsc --noEmit --pretty false
- jest: node node_modules/jest/bin/jest.js src/screens/profile/profile.services.test.ts src/screens/profile/hooks/useProfileDerivedState.test.tsx src/screens/profile/components/ProfilePrimitives.test.tsx --runInBand --json --outputFile artifacts/wave4-profile-jest.json
- runtime: node node_modules/tsx/dist/cli.mjs scripts/profile_stabilization_verify.ts

## iOS
- blocker: xcrun runtime/simulator unavailable on current Windows host