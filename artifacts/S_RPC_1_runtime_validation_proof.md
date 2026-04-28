# S-RPC-1 Runtime Validation Proof

## Repo

- HEAD before: `3dec33f08aa9c099d6883f0208b3c4ae7503a1e5`
- HEAD after: recorded in final report after commit
- Previous wave: S-DB-2B GREEN, production index migration deployed
- Worktree clean at start of S-RPC-1: YES

## Selected RPCs

1. `wh_receive_apply_ui`
- Domain: warehouse
- Caller: `src/screens/warehouse/hooks/useWarehouseReceiveApply.applyWarehouseReceive`
- Expected shape: object with numeric-like `ok`, `fail`, `left_after`; optional `client_mutation_id`, `idempotent_replay`
- Invalid response behavior: returns `RpcValidationError` through existing `{ data, error }` result path
- Tests: `tests/warehouse/useWarehouseReceiveApply.test.ts`

2. `accounting_pay_invoice_v1`
- Domain: accountant
- Caller: `src/lib/api/accountant.accountantPayInvoiceAtomic`
- Expected success shape: `ok: true`, proposal/payment identifiers, allocation summary, before/after totals, server truth
- Expected failure shape: `ok: false` with failure code or message
- Invalid response behavior: throws `RpcValidationError`; payment is not treated as success
- Tests: `src/lib/api/accountant.financial.test.ts`

3. `director_approve_pipeline_v1`
- Domain: director
- Caller: `src/screens/director/director.approve.boundary.runDirectorApprovePipelineAction`
- Expected shape: object with existing approval pipeline fields used by client
- Invalid response behavior: typed validation failure flows through existing `DirectorApproveBoundaryError`; readback/terminal success is not executed
- Tests: `src/screens/director/director.approve.boundary.test.ts`

4. `rpc_proposal_submit_v3`
- Domain: proposal
- Caller: `src/lib/catalog/catalog.proposalCreation.service.runAtomicProposalSubmitRpc`
- Expected shape: object with proposals array; each proposal has non-empty `proposal_id`; optional meta fields are typed
- Invalid response behavior: throws `RpcValidationError`; fallback direct writes are not executed
- Tests: `src/lib/catalog/catalog.proposalCreation.service.atomicBoundary.test.ts`

5. `request_sync_draft_v2`
- Domain: catalog
- Caller: `src/lib/api/requestDraftSync.service.syncRequestDraftViaRpc`
- Expected shape: v2 envelope with `document_type`, `version`, object `request_payload`, array `items_payload`, boolean flags
- Invalid response behavior: throws `RpcValidationError`; request row mapping is not called
- Tests: `src/lib/api/requestDraftSync.service.test.ts`

## Helper Proof

- Helper module: `src/lib/api/queryBoundary.ts`
- Helper tests: `src/lib/api/queryBoundary.test.ts`
- Valid object response tested: YES
- Valid array response tested: YES
- Invalid object throws `RpcValidationError`: YES
- Nullable behavior follows validator: YES
- Extra fields allowed: YES
- Error message excludes raw payload/token: YES
- Context fields attached: YES

## Gates

- Targeted tests: PASS
  - `npm test -- --runInBand --testNamePattern="rpcValidation|malformed|RpcValidationError|receive RPC|payment RPC|approve RPC|request draft sync|atomic proposal"`
- Performance budget: PASS
  - `npm test -- --runInBand tests/perf/performance-budget.test.ts`
- TypeScript: PASS
  - `npx tsc --noEmit --pretty false`
- Lint: PASS
  - `npx expo lint`
- Jest run-in-band: PASS
  - `npm test -- --runInBand`
- Jest parallel: PASS
  - `npm test`
- Git diff check: PASS
  - `git diff --check`
- Pre-commit release guard gates: PASS
  - `npm run release:verify -- --json`
  - Final readiness blocked only because worktree was dirty before commit

## Safety

- Mutation success semantics changed: NO
- Mutation payload changed: NO
- `client_mutation_id` changed: NO
- Retry/quarantine changed: NO
- SQL/RPC changed: NO
- RLS changed: NO
- UI changed: NO
- Maestro YAML changed: NO
- Package changed: NO
- Dependency added: NO
- Native dependency added: NO
- Raw response logged: NO
- PII logged: NO
- Signed URL/token logged: NO

## Release

- OTA published during code edit: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- Final release disposition: to be verified after commit on clean worktree
