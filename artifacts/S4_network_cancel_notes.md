## S4.NETWORK_CANCEL_HARDENING Notes

Date: 2026-04-21

### Exact audited files

- `src/screens/accountant/useAccountantPaymentForm.ts`
- `src/screens/warehouse/warehouse.incoming.ts`
- `src/screens/warehouse/warehouse.incoming.repo.ts`
- `src/screens/buyer/hooks/useBuyerAccountingModal.ts`
- `src/screens/buyer/buyer.repo.ts`
- `src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx`
- `src/screens/foreman/hooks/useForemanItemsState.ts`

### Selected high-risk async owners

- `accountant.payment_form`
  - Risk: stale-ignore only, no real transport cancel, previous request kept running after owner switched/unmounted.
  - Fix: `AbortController` + request slot + revision/current-owner guard.

- `warehouse.incoming_items`
  - Risk: same-head duplicate loads and stale overwrite window on force refresh.
  - Fix: per-head in-flight slot registered before await, duplicate join for same non-force owner, force-refresh abort-and-replace, late/stale commits dropped.

- `buyer.accounting_modal`
  - Risk: rapid reopen could let old attachment/prefill async branches overwrite latest modal state.
  - Fix: modal request slot with latest-owner discipline, abortable reads for prefill path, stale commit drops for attachment and prefill branches.

### Audited but intentionally not changed

- `src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx`
  - Reason: already had cleanup-scoped stale drop for effect lifecycle.
  - Not selected as top S4 owner because the stronger stale-overwrite risk was in `useBuyerAccountingModal`.

- `src/screens/foreman/hooks/useForemanItemsState.ts`
  - Reason: already used deterministic request sequence guard.
  - No confirmed stale-owner bug exceeded selected S4 paths.

- `warehouse fetchToReceive`
  - Reason: existing inflight join/mutex already removes duplicate reload storm for that owner.
  - Exact stale-owner bug was confirmed in `loadItemsForHead`, so S4 stayed narrow there.

### Business-logic parity constraints kept intact

- No RPC names changed.
- No payload semantics changed.
- No UI layout/visual behavior changed.
- No draft/auth/PDF backend logic changed.
- No `@ts-ignore`, no `as any`, no silent `catch {}` added.

