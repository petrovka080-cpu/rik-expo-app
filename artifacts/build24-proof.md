# Build 24 Proof

## Typecheck

`npx tsc --noEmit --pretty false`  
Result: PASS

## Targeted lint

`npx eslint app/_layout.tsx app/index.tsx src/features/profile/ProfileOtaDiagnosticsCard.tsx src/features/profile/ProfileOtaDiagnosticsCard.test.tsx src/lib/entry/index.recovery.test.tsx src/lib/entry/rootLayout.recovery.test.tsx`  
Result: PASS

## Focused tests

`node node_modules/jest/bin/jest.js src/features/profile/ProfileOtaDiagnosticsCard.test.tsx src/lib/entry/index.recovery.test.tsx src/lib/entry/rootLayout.recovery.test.tsx --runInBand`  
Result: PASS

`node node_modules/jest/bin/jest.js src/lib/entryBootstrap.contract.test.ts src/screens/profile/ProfileContent.composition.test.tsx src/screens/profile/components/ProfileComposition.test.tsx --runInBand`  
Result: PASS

## Touched files in the recovery patch

- [`app/_layout.tsx`](/c:/dev/rik-expo-app/app/_layout.tsx)
- [`app/index.tsx`](/c:/dev/rik-expo-app/app/index.tsx)
- [`src/features/profile/ProfileOtaDiagnosticsCard.tsx`](/c:/dev/rik-expo-app/src/features/profile/ProfileOtaDiagnosticsCard.tsx)
- [`src/features/profile/ProfileOtaDiagnosticsCard.test.tsx`](/c:/dev/rik-expo-app/src/features/profile/ProfileOtaDiagnosticsCard.test.tsx)
- [`src/lib/entry/index.recovery.test.tsx`](/c:/dev/rik-expo-app/src/lib/entry/index.recovery.test.tsx)
- [`src/lib/entry/rootLayout.recovery.test.tsx`](/c:/dev/rik-expo-app/src/lib/entry/rootLayout.recovery.test.tsx)

## Native build / device status

## Clean release scope

- Clean worktree: `c:\dev\rik-expo-app-build24-recovery`
- Clean branch: `fix/ios-build24-startup-recovery`
- Clean commit: `359cbe9` (`fix(ios): isolate startup recovery for build 24`)

## Native build

- Build command:
  `npx eas build --platform ios --profile production --non-interactive`
- EAS build id:
  `a4d95b59-b766-4b84-aa7e-d896e15797c9`
- iOS build number:
  `24`
- Build artifact:
  `https://expo.dev/artifacts/eas/mmEthum4WLwwojsMyHgvuV.ipa`

## Device verification

Not yet completed from this host:

- no real iPhone verification yet

Therefore this wave remains NOT GREEN until:

1. first open succeeds on iPhone
2. relaunch succeeds on iPhone
3. cold relaunch succeeds on iPhone
