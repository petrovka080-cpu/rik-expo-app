# A8.SCALABILITY_RISK_AUDIT_WITH_IMMEDIATE_FIX

## Status

Wave status: GREEN.

Clean-base preflight before A8:

- `main == origin/main`: yes, both refs at `5bbcb13662c22ae0b333b21042d6fdc5adcde75b`
- `git status --short`: empty
- `git diff --stat`: empty
- repo-context `node` / `eas` / `adb` tails: none found

## P0 Risks

No new open P0 scalability risk was proven during A8.

Previously confirmed P0 classes were re-checked and remain closed by earlier waves:

- S1 Director production report parallel Jest/cache nondeterminism: closed by A2; regression shield at `src/lib/api/directorRolePdfBackends.test.ts:325`.
- S2 profile dual-write divergence: closed by A6.1; `user_profiles` is the editable-field owner.
- S3 buyer status fallback write: closed by A3; RPC-only fail-closed contract at `src/screens/buyer/buyer.actions.repo.ts:7` and blocked fallback at `src/screens/buyer/buyer.actions.repo.ts:20`.
- S3 submit job queue fallback writes: closed by A3; transition failures now fail closed through RPC-required errors at `src/lib/infra/jobQueue.ts:258`.
- S8 signed URL leakage: closed by A4; central redaction at `src/lib/security/redaction.ts` and platform observability redaction at `src/lib/observability/platformObservability.ts:199`.

## P1 Risks

### A8-S7-1 - Foreman terminal reconciliation network failures were silent

Location:

- `src/screens/foreman/hooks/useForemanDraftBoundary.ts:714`
- `src/screens/foreman/hooks/useForemanDraftBoundary.ts:1391`
- `src/screens/foreman/hooks/useForemanBootstrapCoordinator.ts:290`

Why this is a scaling risk:

When many devices carry durable Foreman drafts and network quality is poor, terminal-state reconciliation can fail repeatedly. The business behavior should stay non-fatal, but silent catches make those repeated recovery deferrals invisible in production diagnostics.

Failure scenario:

1. A foreman submits a draft on one device.
2. Another device wakes with stale durable state.
3. Remote terminal-state check fails because the network is down.
4. Without observability, support sees stale recovery banners or deferred replay but no signal that reconciliation is being postponed.

Fix in this wave:

- Preserved the non-fatal retry-next-time behavior.
- Replaced anonymous `catch {}` with typed catch reporting.
- Added `degraded_fallback` events:
  - `terminal_recovery_remote_check_failed`
  - `restore_remote_terminal_check_failed`
  - `bootstrap_reconciliation_remote_check_failed`
- Kept business logic, queue semantics, and durable state mutation order unchanged.

Regression shield:

- `src/screens/foreman/foreman.draftBoundary.silentCatch.test.ts:121`
- `src/screens/foreman/foreman.draftBoundary.silentCatch.test.ts:129`

### A8-S2-1 - Accountant payment form still has a sensitive amount/allocation truth surface

Location:

- `src/screens/accountant/useAccountantPaymentForm.ts:102`
- `src/screens/accountant/accountant.paymentForm.helpers.ts:191`
- `src/screens/accountant/components/ActivePaymentForm.test.tsx:457`

Current evidence:

- Server `outstanding_amount` is already the proposal payment truth at `src/screens/accountant/accountant.paymentForm.helpers.ts:191`.
- Stale responses are guarded by `mountedRef` and `requestSeqRef`.
- Targeted tests pass for canonical outstanding and stale reopen behavior.

Residual risk:

This is not an open P0 in A8, but it remains a P1 owner-boundary hardening target for A6.2 because `amount`, allocation rows, and server financial state still cross component/hook boundaries.

### A8-S2-2 - Foreman draft ownership remains a large multi-owner surface

Location:

- `src/screens/foreman/hooks/useForemanDraftBoundary.ts` (`1584` lines after A8)
- `src/lib/offline/mutationQueue.ts`
- `src/screens/foreman/foreman.localDraft.ts`

Current evidence:

- Queue persistence is serialized through `createSerializedQueuePersistence`.
- Existing model tests cover stale terminal cleanup, queue re-enqueue ordering, and mutation mutex behavior.

Residual risk:

The surface is still large and should be split through A6.3, but A8 did not find a new unguarded P0 race after the focused checks.

### A8-S4-1 - Some network paths rely on stale guards rather than hard cancellation

Location examples:

- `src/screens/accountant/useAccountantPaymentForm.ts:238`
- `app/pdf-viewer.tsx`
- `app/auth/login.tsx`

Current evidence:

- Accountant payment form ignores stale responses and reports stale events.
- PDF viewer and auth have timeout/fallback behavior, but deeper AbortController coverage is not universal.

Residual risk:

This is P1/P2 platform hardening, not a safe A8 quick fix, because changing cancellation semantics broadly can alter user flows.

## P2 Risks

### A8-S5-1 - Large files remain team-scale and render-risk hotspots

Top large production files by line count:

- `app/pdf-viewer.tsx`: 1724
- `src/screens/foreman/hooks/useForemanDraftBoundary.ts`: 1584
- `src/lib/documents/pdfDocumentActions.ts`: 1299
- `src/components/foreman/CalcModal.tsx`: 1130
- `src/screens/foreman/useForemanScreenController.ts`: 1144
- `src/lib/navigation/officeReentryBreadcrumbs.ts`: 1334
- `src/lib/offline/mutationWorker.ts`: 999

Risk:

These are not proof of broken runtime by themselves, but they increase regression probability and slow ownership.

### A8-S7-2 - Anonymous catches still exist outside the exact A8 fix slice

Scan result:

- `catch {` count in `src` + `app`: 106 after the focused Foreman fix.

Risk:

Not all anonymous catches are critical; several are in low-level environment probes, optional UI affordances, or dev helpers. They should be burned down by criticality, not mass-edited.

## Fixed In This Wave

- A8-S7-1: Foreman terminal reconciliation silent network catches now emit typed observability without changing business behavior.

## Remaining Risks

Priority order after A8:

1. A6.2 - Accountant payment truth hardening.
2. A6.3 - Foreman draft ownership hardening.
3. A7 - Navigation/lifecycle hardening, including global warning suppression hygiene and office back contract.
4. S5 large-file owner splits, one exact surface at a time.
5. S7 catch burn-down by critical path, not broad replacement.

## Verdict

A8 did not find a new open P0 after checking S1-S8. One proven production observability risk was fixed immediately with a focused regression shield. Full gates passed; the base is release-green after A8.
