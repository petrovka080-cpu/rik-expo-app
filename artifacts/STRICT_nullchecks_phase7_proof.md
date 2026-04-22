# STRICT_NULLCHECKS_PHASE_7 Proof

## Probe result

- `src/lib/pdf/pdfViewer.route.ts` was safe but had no live strict-null blockers.
- `src/screens/foreman/foreman.terminalRecovery.ts` was blocked by cross-domain dependencies in buyer/director/shared-PDF/local-draft modules.
- `src/screens/warehouse/hooks/useWarehouseScreenActions.ts` was rejected as too wide because its isolated probe also pulled shared canonical PDF transport and warehouse preview boundary blockers.
- `src/screens/warehouse/warehouse.pdf.boundary.ts` was selected because it surfaced 1 local strict-null blocker at a process/control boundary with focused regression coverage.

## Before

- Read-only strict-null probe:
  - `src/screens/warehouse/warehouse.pdf.boundary.ts(150,9): error TS2322`
- Blocker class:
  - the warehouse preview boundary encoded its no-auth preview path as `supabase: null`
  - the downstream PDF open contract requires a non-null `PdfDocumentSupabaseLike`
- State/process contract before:
  - request validation was implicit through thrown errors
  - malformed remote-source payloads were coerced with `String(value ?? "")`
  - there was no explicit `invalid` versus `ready` preview-request contract

## After

- Added `tsconfig.strict-null-phase7-warehouse-pdf-boundary.json`
- Tightened the warehouse-local preview boundary in `src/screens/warehouse/warehouse.pdf.boundary.ts`
- Added focused phase-7 boundary tests:
  - `tests/strict-null/warehouse.pdf.boundary.phase7.test.ts`
- State/process contract after:
  - `resolveWarehousePdfPreviewContract(...)` classifies preview input into `invalid` or `ready`
  - `normalizeWarehousePdfRemoteUrl(...)` rejects non-string, empty, and malformed remote payloads deterministically
  - the exact boundary now uses a stable non-null no-auth preview contract instead of `null`
- Covered:
  - valid input
  - null request
  - undefined request
  - partial payload
  - malformed payload
  - empty payload
  - loaded-empty optional `entityId`
  - ready state
  - terminal malformed-source failure
  - terminal downstream open failure

## Compile proof

- `npx tsc --project tsconfig.strict-null-phase7-warehouse-pdf-boundary.json --pretty false` PASS
- `npx tsc --noEmit --pretty false` PASS

## Regression proof

- Focused phase-7 tests:
  - `npx jest tests/strict-null/warehouse.pdf.boundary.phase7.test.ts src/screens/warehouse/warehouse.pdf.boundary.test.tsx --runInBand --no-coverage` PASS
- Full gates:
  - `npx expo lint` PASS
  - `npm test -- --runInBand` PASS
  - `npm test` PASS
  - `git diff --check` PASS

## Why runtime semantics are unchanged

- Valid warehouse PDF preview requests still enter the same `prepareAndPreviewPdfDocument(...)` flow.
- The descriptor, busy key, label, title, file name, document type, and entity id remain unchanged for valid input.
- The boundary still reports controlled terminal failures through `recordCatchDiscipline(...)` and `notifyError(...)`.
- The only behavior tightened is on malformed/null/undefined boundary input where the phase now rejects deterministically instead of allowing implicit coercion to leak through.
- No business logic, user flow, role behavior, network semantics, or valid-input success output changed.

## Release tail

- Runtime commit:
  - `6060662` `TS: strict nullchecks phase 7`
- Push:
  - runtime commit pushed to `origin/main`
- OTA:
  - `development`
    - iOS runtime version: `7ba116c416495908222b37d232a9a1ab877c4a82`
    - iOS update group: `ce4fc029-65e7-4a99-99d9-5dd4fb2a805e`
    - iOS update id: `019db58f-047e-731c-af00-5fd040431f2b`
    - Android runtime version: `06479ede57796decbd74bcf425db1d8fd63c01b1`
    - Android update group: `1bab250f-93c8-48c0-8f2c-14fbada41cd6`
    - Android update id: `019db58f-047e-7537-ab54-d0c6b27c5beb`
  - `preview`
    - iOS update group: `ab2f9ec9-bee7-4a55-9a2f-c0e18ef01b19`
    - iOS update id: `019db590-2889-7c98-82ce-bcb8563c4652`
    - Android update group: `a24d8336-62cb-4582-a143-943de01e5ddb`
    - Android update id: `019db590-2889-7810-a10d-8b24c7535494`
  - `production`
    - iOS update group: `27b2a67d-b035-4167-a01d-03c5956b182d`
    - iOS update id: `019db591-6186-7cfe-945b-87558db25e65`
    - Android update group: `724a3c2b-a2b7-40fe-baf8-95b7b97106aa`
    - Android update id: `019db591-6186-7620-94b9-1cbd33b99073`
- Status:
  - `HEAD == origin/main`: true
  - `worktree clean`: true
  - Wave status: GREEN
- Proof-tail note:
  - release metadata was finalized after the runtime publish in a non-runtime artifact update
