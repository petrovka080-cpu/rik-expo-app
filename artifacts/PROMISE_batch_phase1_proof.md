# PROMISE_BATCH_BOUNDARY_HARDENING_PHASE_1 Proof

## Probe result

- Inventory found `137` `Promise.all` sites across the repo.
- Shortlist outcome:
  - Candidate A `app/product/[id].tsx` -> safe, but lower value
  - Candidate B `src/screens/office/officeAccess.services.ts` -> blocked by critical bootstrap semantics
  - Candidate C `src/features/ai/assistantScopeContext.ts` -> too wide
  - Candidate D `src/features/profile/ProfileOtaDiagnosticsCard.tsx` -> chosen

## Before

- Chosen file: `src/features/profile/ProfileOtaDiagnosticsCard.tsx`
- Batch boundary before:

```ts
const [pdfBreadcrumbs, warehouseBackBreadcrumbs, officeReentryBreadcrumbs] = await Promise.all([
  getPdfCrashBreadcrumbs(),
  getWarehouseBackBreadcrumbs(),
  getOfficeReentryBreadcrumbs(),
]);
```

- Failure mode before:
  - one rejected breadcrumb read aborted the entire copy action
  - no partial success path
  - no per-section error preservation
  - user could lose all diagnostics enrichment because of one failing source

## After

- Replaced the batch with `Promise.allSettled(...)`
- Added an explicit local result contract:

```ts
type BatchResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: unknown };
```

- Added normalization layer:
  - `normalizeBatch(...)`
  - `normalizeBreadcrumbBatchResults(...)`
- Added explicit process control:
  - `classifyBreadcrumbBatchState(...)`
  - `buildDiagnosticsCopyPayload(...)`
  - `logBreadcrumbBatchOutcome(...)`
- New controlled states:
  - `complete`
  - `partial`
  - `diagnostics_only`

## Semantics proof

- Success path unchanged:
  - when all three breadcrumb reads succeed, the copy action still writes the same diagnostics payload sections in the same order
  - the success alert/message remains `Диагностика скопирована.`
- Partial success is now explicit instead of silent failure:
  - successful sections are kept
  - failed sections are represented as `- error: ...`
  - the copied payload is never falsely empty when diagnostics base text exists
- All-failed behavior is deterministic:
  - base diagnostics are still copied
  - each failed section is surfaced explicitly
  - no section error is swallowed
- Business logic unchanged:
  - no auth, money, approval, submit, queue, or offline semantics changed
  - no route behavior changed
  - only the chosen diagnostics copy boundary was hardened

## Regression proof

- Focused tests:
  - `npx jest src/features/profile/ProfileOtaDiagnosticsCard.test.tsx --runInBand --no-coverage` PASS
- Covered scenarios:
  - all successful
  - one failed
  - multiple failed
  - all failed
- Assertions prove:
  - no silent failure
  - errors are preserved
  - payload order is preserved
  - success-path behavior is unchanged
  - no empty result without cause

## Gate proof

- `npx tsc --noEmit` PASS
- `npx expo lint` PASS
- `npm test -- --runInBand` PASS
- `npm test` PASS
- `git diff --check` PASS

## Release tail status

- Runtime TS changed: `true`
- OTA required when green: `true`
- Release tail after gates:
  - commit -> pending until final publish step
  - push -> pending until final publish step
  - EAS update `development` -> pending until final publish step
  - EAS update `preview` -> pending until final publish step
  - EAS update `production` -> pending until final publish step
