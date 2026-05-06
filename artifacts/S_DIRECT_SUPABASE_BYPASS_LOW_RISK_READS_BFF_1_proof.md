# S-DIRECT-SUPABASE-BYPASS-LOW-RISK-READS-BFF-1 Proof

Final status: `GREEN_DIRECT_SUPABASE_BYPASS_LOW_RISK_READS_SAFE_PATHS_ROUTED_RELEASE_INTEGRATED`

## Scope

- Extended the permanent disabled-by-default `assistant_store_read_scope_v1` BFF read contract.
- Routed safe read-side paths for current profile identity, chat read helpers, supplier showcase reads, and the submitted-at capability probe.
- Kept app runtime behavior production-safe: BFF traffic remains contract-only unless explicitly enabled by existing runtime flags.

## Routed Safe Reads

- `src/features/profile/currentProfileIdentity.ts`
  - `loadCurrentProfileIdentity` now uses `profile.current.full_name`.
- `src/lib/chat_api.ts`
  - `loadCurrentChatActor` now uses `chat.actor.context`.
  - `fetchListingChatMessages` now uses `chat.listing.messages.list` and `chat.profiles_by_user_ids`.
  - Chat write/update functions remain direct and documented for a separate mutation wave.
- `src/features/supplierShowcase/supplierShowcase.data.ts`
  - Profile/company/listing reads now use supplier showcase BFF operations through `supplierShowcase.transport.ts`.
  - Existing filters, ordering, mapping, and payload shape are preserved.
- `src/lib/api/requests.read-capabilities.ts`
  - `requestsSupportsSubmittedAt` now uses `request.submitted_at.capability` with the same fallback behavior.

## Remaining Direct Paths

- `src/lib/chat_api.ts`
  - Remaining direct calls are write/update paths only: send, mark-read, and soft-delete.
  - Reason: mutation routes need separate idempotency and route-scope proof.
- `src/lib/api/requests.read-capabilities.ts`
  - `resolveRequestsReadableColumns` still performs the existing readable-column schema probe.
  - Reason: safe BFF equivalence is not proven because the current behavior depends on row/default fallback semantics.

## Gates

- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- Focused Jest:
  - `tests/api/assistantStoreBffRouting.contract.test.ts`
  - `tests/api/assistantStoreBffHandler.contract.test.ts`
  - `tests/scale/assistantStoreBffReadonlyDbPort.test.ts`
  - `tests/scale/bffBoundary.test.ts`
  - `tests/perf/performance-budget.test.ts`
  - `tests/api/topListPaginationBatch7.contract.test.ts`
  - legacy pagination contract tests for batches 3, 4, 5A, 6, and 8
- `git diff --check`: PASS
- `npm run release:verify -- --json`: PASS after push

## Safety

- No production DB writes.
- No migrations.
- No deploy or redeploy.
- No Render env writes.
- No BFF traffic percent changes.
- No business endpoint calls.
- No raw DB rows or raw payloads printed.
