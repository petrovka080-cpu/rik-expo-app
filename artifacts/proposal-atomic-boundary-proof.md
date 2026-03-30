# Proposal Atomic Boundary Proof

## Canonical path
- Before: buyer submit used client-orchestrated `proposal_create -> proposal_add_items -> proposal_items_snapshot -> proposal_submit_text_v1`.
- Now: `createProposalsBySupplier()` delegates the primary production path to `rpc_proposal_submit_v3` and only consumes the committed result.

## Files changed
- `supabase/migrations/20260330200000_proposal_creation_boundary_v3.sql`
- `supabase/migrations/20260330201500_proposal_creation_boundary_v3_uuid_cast_fix.sql`
- `supabase/migrations/20260330203000_proposal_creation_boundary_v3_enum_cast_fix.sql`
- `supabase/migrations/20260330204500_proposal_creation_boundary_v3_price_regex_fix.sql`
- `supabase/migrations/20260330205500_proposal_creation_boundary_v3_proposal_id_cast_fix.sql`
- `supabase/migrations/20260330210000_proposal_creation_boundary_v3_request_id_cast_fix.sql`
- `supabase/migrations/20260330211500_proposal_creation_boundary_v3_proposal_item_uuid_fix.sql`
- `supabase/migrations/20260330213000_proposal_creation_boundary_v3_request_item_uuid_fix.sql`
- `supabase/migrations/20260330214500_proposal_creation_boundary_v3_total_qty_generated_fix.sql`
- `src/lib/catalog/catalog.proposalCreation.service.ts`
- `src/screens/buyer/buyer.submit.mutation.ts`
- `src/workers/processBuyerSubmitJob.ts`
- `src/lib/catalog/catalog.proposalCreation.service.atomicBoundary.test.ts`
- `src/screens/buyer/buyer.submit.mutation.test.ts`
- `scripts/proposal_atomic_boundary_verify.ts`

## Why orphan/partial proposal risk is closed
- Head/items/status commit now happen inside one DB transaction owned by `rpc_proposal_submit_v3`.
- The client no longer writes proposal head/items/status by separate primary steps.
- Invalid payload proof checks that a rejected submit leaves `0` proposals for the seeded request.

## Idempotency proof
- Replay used client mutation id: `proposal-atomic-mnde6mbc`.
- First proposal id: `39228e13-8b65-44f7-bf7e-00077f2e6620`. Replay proposal id: `39228e13-8b65-44f7-bf7e-00077f2e6620`.
- Replay flag from RPC meta: `true`.

## Attachment compatibility
- Attachment continuation remains post-commit only.
- Buyer mutation test proves attachment upload does not start when canonical proposal commit fails.
- Success meta confirms attachment continuation readiness after commit.

## Intentionally unchanged
- UI and buyer screen flow
- Request lifecycle semantics
- Director reports
- Object identity / material identity contracts

Final runtime gate status: **GREEN**
