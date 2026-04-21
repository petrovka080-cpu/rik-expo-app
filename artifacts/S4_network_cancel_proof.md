## S4.NETWORK_CANCEL_HARDENING Proof

### Exact code changes

- `src/lib/api/integrity.guards.ts`
  - Added optional `signal` plumbing to proposal existence lookup used by accountant financial-state load.

- `src/lib/api/accountant.ts`
  - Added optional `signal` support to `accountantLoadProposalFinancialState(...)`.

- `src/screens/accountant/useAccountantPaymentForm.ts`
  - Added request slot ownership with `AbortController`.
  - Previous in-flight load is aborted before next owner starts.
  - State commits now require active request slot + active revision.
  - Abort is treated as controlled non-error.

- `src/screens/warehouse/warehouse.incoming.repo.ts`
  - Added optional `signal` support for incoming-items RPC transport.

- `src/screens/warehouse/warehouse.incoming.ts`
  - Added per-head request slot map and revision map.
  - Duplicate non-force loads join existing in-flight work.
  - Force refresh aborts and replaces stale owner.
  - Replaced requests resolve to latest owner result instead of surfacing a hard failure.
  - Unmount aborts pending item-load requests.

- `src/screens/buyer/buyer.repo.ts`
  - Added optional `signal` support for accounting-prefill reads.

- `src/screens/buyer/hooks/useBuyerAccountingModal.ts`
  - Added modal request slot ownership.
  - Active owner required for all state commits.
  - Prefill reads are abortable.
  - Attachment/prefill stale commits are dropped with observability instead of overwriting latest modal state.

### Focused regression coverage

- `src/screens/accountant/components/ActivePaymentForm.test.tsx`
  - immediate-close abort does not become hard failure
  - newer proposal aborts obsolete transport
  - stale response still cannot overwrite fresh state

- `tests/warehouse/warehouse.incoming.test.tsx`
  - duplicate same-head load joins one in-flight request
  - force refresh aborts previous owner and keeps only latest rows
  - unmount aborts pending item request without hard failure

- `tests/buyer/useBuyerAccountingModal.test.tsx`
  - rapid reopen keeps only latest modal owner
  - unmount aborts active reads and drops late commits

### Gate results

- `npx tsc --noEmit --pretty false` — PASS
- `npx expo lint` — PASS
- `npm test -- --runInBand` — PASS
- `npm test` — PASS
- `git diff --check` — PASS

### Runtime statement

- This wave was proved through targeted async-ownership regression tests plus full serial/parallel test suites.
- No separate manual web/android launch was performed in this wave.
- Because the touched code stayed inside hook/repo ownership boundaries and full UI/test suites passed, release proceeded on automated proof for S4.

