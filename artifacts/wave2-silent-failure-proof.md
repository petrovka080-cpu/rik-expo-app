# Wave 2: Silent Failure Elimination

## Scope executed
- `src/screens/foreman/hooks/useForemanDraftBoundary.ts`
- `src/screens/foreman/foreman.draftBoundary.helpers.ts`
- focused proof file `src/screens/foreman/foreman.draftBoundary.silentCatch.test.ts`

## Critical silent paths fixed
- Background restore triggers in `useForemanDraftBoundary` no longer disappear through anonymous `.catch(() => undefined)`.
- Terminal cleanup on `server_terminal_conflict` no longer disappears silently.
- Network bootstrap failure no longer disappears silently and now falls back to `networkOnline = null`.
- Request header meta sync now records degraded fallback instead of production-only swallow.
- Request details load failure now records degraded fallback and clears `requestDetails` instead of risking stale truth.

## Inventory parity
- Proposal/detail scope already had explicit observability in `src/lib/api/proposals.ts` and `src/screens/director/director.proposal.detail.ts`; no new critical silent swallow was confirmed there.
- Auth/session critical path in `src/lib/sessionRole.ts` already uses `beginPlatformObservability(...).error(...)`; no additional fix was needed there.
- `src/screens/accountant/accountant.attachments.ts` keeps two benign owner-chain enrichment fallbacks (`header -> null`, `paymentCount -> 0`) because they do not affect canonical attachment truth.

## Exact proof collected
- Static grep confirms named replacement events exist:
  - `request_header_meta_sync_failed`
  - `request_details_load_failed`
  - `terminal_local_cleanup_failed`
  - `restore_draft_on_focus_failed`
  - `restore_draft_on_app_active_failed`
  - `network_service_bootstrap_failed`
  - `restore_draft_on_network_back_failed`
- Static grep confirms the anonymous `\.catch(() => undefined)` pattern is gone from `useForemanDraftBoundary.ts`.

## Commands run
```powershell
node node_modules/jest/bin/jest.js src/screens/foreman/foreman.draftBoundary.silentCatch.test.ts src/screens/foreman/foreman.localDraft.lifecycle.test.ts src/lib/api/requestDraftSync.service.test.ts src/lib/api/proposals.silentCatch.test.ts --runInBand --json --outputFile artifacts/wave2-silent-failure-jest.json
```
- Result: failed before tests started because local environment is missing `@jest/core`.

```powershell
node node_modules/typescript/bin/tsc --noEmit --pretty false --skipLibCheck --moduleResolution node --module commonjs --target es2020 src/screens/foreman/foreman.draftBoundary.helpers.ts src/screens/foreman/hooks/useForemanDraftBoundary.ts src/screens/foreman/foreman.draftBoundary.silentCatch.test.ts
```
- Result: failed on pre-existing environment/type blockers outside this wave's semantic scope:
  - `TS5097` in `src/lib/api/pdf_director.data.ts`
  - `TS5097` in `src/lib/pdf/pdf.director.templates.ts`
  - missing module declarations for `@react-native-async-storage/async-storage` through existing imports

## Honest status
- `NOT_GREEN`
- Exact blocker: full focused smoke/test proof is not fully runnable in this local environment because the repo's Jest installation is incomplete and focused typecheck is blocked by pre-existing unrelated compile issues.
