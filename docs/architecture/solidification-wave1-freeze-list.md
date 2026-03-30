# Wave 1A - Freeze List

The following changes are frozen until the first solidification implementation wave is complete.

## Frozen Domains

1. Buyer proposal business mutation path
   - Do not add new direct writes to `public.proposals`, `public.proposal_items`, or `public.request_items`
   - Do not add new client-side proposal orchestration stages
   - Do not add new fallback insert or update branches

2. Foreman request submit and reopen path
   - Do not add new direct writes around `request_submit_atomic_v1`
   - Do not widen local draft ownership into more server lifecycle stages
   - Do not add ad hoc reconciliation around head and item statuses

3. Director fact loaders
   - Do not add new client-owned grouping or aggregation logic to report loaders
   - Do not add new fallback sources into `directorReportsTransport.service.ts` or report service families
   - Do not merge finance and report truths into one improvised contract

4. Object identity handling
   - Do not add more string-based grouping or prefix parsing as primary truth
   - Do not introduce new UI glue that reconstructs missing object identity

## Explicitly Frozen Change Classes

- UI beautification in affected domains
- FlashList or Zustand migration in affected domains
- new fallback loaders or compat writes
- new direct table writes bypassing canonical boundaries
- broad refactor of buyer, foreman, director, or accountant domains
- “quick fixes” that strengthen client orchestration
- new SQL, RPC, trigger, policy, or view introduced as a fix during Wave 1A

## Allowed While Freeze Is Active

- inventory
- proof artifacts
- exact contract documentation
- narrow verifier adjustments required only to observe existing contracts

## Out Of Scope Until Later Waves

- object shadow UUID rollout
- new immutable director ledger
- full request draft lifecycle rewrite
- director UI/report redesign
- attachment UX redesign

## Exit Condition For Freeze

This freeze should remain active until the next implementation phase closes:

- `Proposal Atomic Boundary`

Reason:

- it is the highest-risk mixed write contract
- it still controls downstream commercial visibility
- it is upstream of director and accountant truths
