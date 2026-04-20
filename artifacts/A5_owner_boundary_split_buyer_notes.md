# A5 OWNER BOUNDARY SPLIT BUYER NOTES

## Status

GREEN candidate. Full gates passed before commit/push.

## Preflight

- Base started clean.
- `main == origin/main` at `12eecc9b6fe20490d0e30eaabd96516028b33d77`.
- `git diff --stat` was empty before A5 edits.
- No repo-context node/eas/adb tails were present before opening A5.

## Root Cause

`src/screens/buyer/BuyerScreen.tsx` owned too many responsibilities at once:

- screen layout and role-tab composition
- FIO modal mounting
- sheet shell/body routing
- inbox footer button composition
- accounting sheet-local state
- proposal details sheet-local state
- RFQ sheet prop mapping
- rework sheet prop expansion

That made the screen composition owner also responsible for modal/sheet internals and sheet-local state.

## Change

- Added `src/screens/buyer/components/BuyerScreenSheets.tsx` as the sheet/dialog composition owner.
- Added `src/screens/buyer/hooks/useBuyerAccountingSheetState.ts` for accounting sheet-local state.
- Added `src/screens/buyer/hooks/useBuyerProposalDetailsState.ts` for proposal-details sheet-local state.
- Reduced `BuyerScreen.tsx` to wire existing data, mutation, and navigation owners into the new sheet boundary.
- Kept the existing buyer data/mutation hooks and service boundaries intact.
- Updated `tests/perf/performance-budget.test.ts` only to account for the three new permanent buyer owner-boundary modules.

## Explicitly Unchanged

- Buyer status semantics.
- Proposal creation/submission semantics.
- RFQ publish/rework semantics.
- Attachment upload/open semantics.
- Accounting send semantics.
- PDF/open paths.
- Supabase/RPC/service contracts.
- UI navigation semantics and visible sheet behavior.
- Adjacent roles and screens.

## Production Safety

- No temporary hooks, adapters, VM shims, sleeps, retries, skips, ignores, or suppressions were introduced.
- No assertions were weakened.
- No business logic moved into tests.
- The split is a permanent owner-boundary extraction: `BuyerScreen` composes; `BuyerScreenSheets` owns sheet rendering; sheet-local hooks own sheet-local state.
