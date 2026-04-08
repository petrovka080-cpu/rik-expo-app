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

Not yet completed from this host:

- iOS build 24 not built in this pass
- no real iPhone verification yet

Therefore this wave remains NOT GREEN until:

1. build 24 is produced
2. first open succeeds on iPhone
3. relaunch succeeds on iPhone
4. cold relaunch succeeds on iPhone
