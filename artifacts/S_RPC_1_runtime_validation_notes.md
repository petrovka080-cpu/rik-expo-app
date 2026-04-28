# S-RPC-1 Runtime Validation Notes

Wave: S-RPC-1 RUNTIME_VALIDATION_FOR_TOP_RPC_RESPONSES

Mode: production-safe runtime-safety code wave.

## Scope

Added minimal runtime validation for five high-risk Supabase RPC response consumers. No Zod or external dependency was added; validation is implemented inside the existing RPC boundary module to avoid package churn and source-module budget growth.

Helper location:

- `src/lib/api/queryBoundary.ts`

Validated RPC consumers:

- `wh_receive_apply_ui` in `src/screens/warehouse/hooks/useWarehouseReceiveApply.ts`
- `accounting_pay_invoice_v1` in `src/lib/api/accountant.ts`
- `director_approve_pipeline_v1` in `src/screens/director/director.approve.boundary.ts`
- `rpc_proposal_submit_v3` in `src/lib/catalog/catalog.proposalCreation.service.ts`
- `request_sync_draft_v2` in `src/lib/api/requestDraftSync.service.ts`

## Validation Strategy

Schemas are intentionally minimal and validate only fields the client consumes. Extra fields remain allowed. Invalid critical mutation responses do not become success; they enter the existing error path via `RpcValidationError` or existing domain error wrapping.

## Safety Notes

- Business logic changed: NO
- Mutation payload changed: NO
- `client_mutation_id` changed: NO
- Retry/quarantine changed: NO
- SQL/RPC changed: NO
- RLS changed: NO
- UI changed: NO
- Maestro YAML changed: NO
- Package changed: NO
- Native dependency added: NO
- Raw RPC response logged: NO
- PII/token/signed URL logged: NO

## Dependency Decision

`zod`, `io-ts`, and `superstruct` were not present in the repo. To keep this wave JS-safe and avoid package/lockfile churn, S-RPC-1 used small internal type guards in the existing RPC boundary module.
