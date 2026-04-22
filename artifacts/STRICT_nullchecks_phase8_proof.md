# STRICT_NULLCHECKS_PHASE_8 Proof

## Probe result

- `src/lib/pdf/pdfViewer.route.ts` was safe but had no live strict-null blockers.
- `src/screens/foreman/foreman.terminalRecovery.ts` was blocked by cross-domain dependencies in buyer/director/shared-PDF/local-draft modules.
- `src/screens/warehouse/hooks/useWarehouseScreenActions.ts` was rejected as too wide because its isolated probe also pulled shared canonical PDF transport blockers.
- `src/lib/api/canonicalPdfBackendInvoker.ts` was selected because it surfaced 1 local strict-null blocker at a transport/process boundary with focused regression coverage.

## Before

- Read-only strict-null probe:
  - `src/lib/api/canonicalPdfBackendInvoker.ts(168,5): Type 'TPayload' is not assignable to Supabase invoke body contract`
- Blocker class:
  - the transport boundary accepted an unconstrained generic payload even though both native fetch and Supabase invoke paths expect a JSON-object-style request body
- State/process contract before:
  - there was no explicit `missing` / `invalid` / `ready` payload contract
  - empty-object payloads were not distinguished from missing payloads
  - malformed payloads could reach transport preparation implicitly
  - the chosen slice still had `catch {}` fallback branches with no explicit diagnostic context

## After

- Added `tsconfig.strict-null-phase8-canonical-pdf-backend-invoker.json`
- Tightened the chosen slice in `src/lib/api/canonicalPdfBackendInvoker.ts`
- Added focused phase-8 contract tests:
  - `tests/strict-null/canonicalPdfBackendInvoker.phase8.test.ts`
- Strengthened existing transport regression coverage in:
  - `src/lib/api/canonicalPdfBackendInvoker.test.ts`
- State/process contract after:
  - `resolveCanonicalPdfInvokePayloadContract(...)` classifies payloads into `missing`, `invalid`, or `ready`
  - `ready` explicitly distinguishes `payloadState: "empty"` from `payloadState: "non_empty"`
  - `normalizeCanonicalPdfInvokePayload(...)` rejects malformed payloads before transport dispatch
  - `normalizeCanonicalPdfInvokeArgs(...)` keeps the exported invoker on an explicit object-body contract
  - legacy `catch {}` branches in the chosen slice now emit explicit diagnostics while preserving the same fallback results

## Before/after blocker list

- Before:
  - `src/lib/api/canonicalPdfBackendInvoker.ts(168,5)` strict-null transport body mismatch
- After:
  - `npx tsc --project tsconfig.strict-null-phase8-canonical-pdf-backend-invoker.json --pretty false` PASS

## Compile proof

- `npx tsc --project tsconfig.strict-null-phase8-canonical-pdf-backend-invoker.json --pretty false` PASS
- `npx tsc --noEmit --pretty false` PASS

## Regression proof

- Focused phase-8 tests:
  - `npx jest tests/strict-null/canonicalPdfBackendInvoker.phase8.test.ts src/lib/api/canonicalPdfBackendInvoker.test.ts --runInBand --no-coverage` PASS
- Full gates:
  - `npx expo lint` PASS
  - `npm test -- --runInBand` PASS
  - `npm test` PASS
  - `git diff --check` PASS

## Exact contract coverage

- Valid input:
  - ready non-empty object payload remains accepted
- Null:
  - classified as `missing`
- Undefined:
  - classified as `missing`
- Partial payload:
  - classified as `ready` with `payloadState: "non_empty"`
- Malformed payload:
  - primitive payload classified as `invalid`
- Invalid payload:
  - array payload classified as `invalid`
- Empty payload:
  - classified as `ready` with `payloadState: "empty"`
- Ready state:
  - valid object payload normalized unchanged
- Terminal rejection:
  - missing or invalid payload throws deterministically before transport dispatch

## Why runtime semantics are unchanged

- Existing foreman and warehouse callers already pass normalized object payloads, so the success path remains on the same native fetch and Supabase invoke flows.
- The wave added regression assertions that valid web/native calls preserve the same request body shapes:
  - web keeps `{ body: { ...payload } }`
  - native keeps `body: JSON.stringify(payload)`
- Auth-refresh retry behavior stayed unchanged on both web and native paths.
- Only malformed/nullish/non-object payloads now fail earlier and more deterministically at the exact transport boundary.
- No business logic, role behavior, network orchestration, or valid-input success output changed.

## Governance note

- A temporary helper-module shape was intentionally folded back into the chosen slice because the repo performance budget failed when source-module count increased by 1.
- The final green implementation preserves the same boundary hardening without increasing source-module surface or widening blast radius.

## Release tail

- Runtime commit:
  - `18d7c56` `TS: strict nullchecks phase 8`
- Push:
  - runtime commit pushed to `origin/main`
- OTA:
  - `development`
    - iOS runtime version: `7ba116c416495908222b37d232a9a1ab877c4a82`
    - iOS update group: `b1031b7b-afd4-45a0-8fae-a26af37e8c82`
    - iOS update id: `019db5a2-9173-7c0a-a4e0-28c67a63896e`
    - Android runtime version: `06479ede57796decbd74bcf425db1d8fd63c01b1`
    - Android update group: `b46ebf7e-3f61-404a-8aec-f0e8ccd985b6`
    - Android update id: `019db5a2-9173-79bb-b44e-9f75b4020d53`
  - `preview`
    - iOS update group: `f7079ce0-986a-470b-9f6d-7c1e24e6c641`
    - iOS update id: `019db5a3-a77b-7ddf-8476-215d8d742b38`
    - Android update group: `9cecba67-9e9e-4fe1-b89d-7d87f0ec2109`
    - Android update id: `019db5a3-a77b-7d21-96b7-8e0001538e38`
  - `production`
    - iOS update group: `b898854e-7579-4886-9cdf-3d0417030a58`
    - iOS update id: `019db5a4-adf3-7df8-b244-2e2020acf2c7`
    - Android update group: `8c0a8c9a-62bc-47a2-8b75-b57aa5a2e2b3`
    - Android update id: `019db5a4-adf3-7e16-bd1d-025abd4eb818`
- Status:
  - `HEAD == origin/main`: true
  - `worktree clean`: true
  - Wave status: GREEN
- Proof-tail note:
  - EAS update required explicit `--message` in non-interactive mode; release metadata was finalized after the runtime publish in a non-runtime artifact update
