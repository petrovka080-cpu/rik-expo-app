# S_LAYOUT_TYPECHECK_HOTFIX

Status: GREEN_LAYOUT_TYPECHECK_HOTFIX_READY

Scope:
- src/components/layout/AppChatComposerBar.tsx
- src/components/layout/AppStickyActionBar.tsx
- tests/architecture/layoutTypecheckNoBehaviorRewrite.contract.test.ts
- artifacts/S_LAYOUT_TYPECHECK_HOTFIX

Verification:
- `npx tsc --noEmit --pretty false` passed.
- `npx expo lint` passed.
- `git diff --check` passed.
- `npm test -- --runInBand tests/architecture/layoutTypecheckNoBehaviorRewrite.contract.test.ts` passed.
- `npm run release:verify -- --json` is verified on the clean committed branch because the verifier intentionally blocks dirty source files before commit.

Safety:
- UI behavior is unchanged: web keeps `position: "fixed"`, native keeps `position: "absolute"`.
- No UI redesign.
- No product logic change.
- No estimate engine, BOQ compiler, or PDF renderer change.
- No `as any`, `@ts-ignore`, or `eslint-disable` was added.
- fake_green_claimed=false
