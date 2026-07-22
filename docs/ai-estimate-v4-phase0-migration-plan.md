# AI Estimate 11610 V4 — Phase 0 migration plan

Status boundary: this document covers contracts and the 11,610-work gap audit only. It does not authorize Phase 1, bulk passport migration, release, deployment, or a new Web/Android/PDF endurance run.

## Compatibility policy

- `ProfessionalWorkPassportV2` remains the active production contract until a consumer is deliberately migrated.
- `adaptProfessionalWorkPassportV2ToV4` is read-only and does not mutate V2 data, runtime revisions, PDFs, or buyer handoff records.
- An adapted passport is labelled `V2_COMPATIBILITY_GAPS_RECORDED`. It cannot be presented as native V4 or expert-confirmed.
- A generated V2 work-specific identifier is not accepted as proof of a reviewed V4 overlay. Native V4 promotion requires an explicit work-specific overlay, sources, dimensional proof, applicability, and expert status.
- Unknown units, formula inputs, applicability, sources, quantities, and prices stay unresolved. The adapter must not invent replacements.

## Migration sequence

1. Freeze the Phase 0 schemas and five deterministic truth-ledger manifests.
2. Use the ledgers to select a vertical slice; do not migrate all 11,610 records at once.
3. Phase 1 may implement only `asphalt_concrete_pavement` after owner authorization.
4. Compare the native V4 passport against the V2 adapter output and close every blocker for that work without weakening the ledger rules.
5. Prove parameter controls, unit conversion, dimensional formulas, WBS/resources, applicability, sources, and user-facing clarity with focused tests.
6. Add Web/Android/PDF evidence only for the authorized slice and only on its pushed SHA.
7. Promote representative works by scope class in Phase 2, then migrate bounded professional batches with separate commit/push/green gates.
8. Keep dual-read compatibility during migration. A V4 write must not silently down-convert into V2.
9. Remove V2 reads only after all consumers have explicit V4 parity evidence and rollback coverage.

## Data ownership and versioning

- Stable work IDs do not change.
- Parameter, formula, row, source, resource, and WBS IDs are versioned and owned by a work or an explicit family inheritance record.
- User facts, normative quantities, prices, commercial lines, procurement lines, and diagnostics remain separate records.
- Estimate revisions remain immutable. Any accepted edit creates a new revision and invalidates an older PDF.
- Each generated ledger row and each full ledger has a deterministic manifest hash. Runtime evidence records the exact source SHA separately.

## Bounded execution

- Process the catalog in checkpoints and clear compiler caches between bounded chunks.
- Write evidence as JSONL so it can be streamed and inspected without loading one monolithic JSON document.
- Never silently cap WBS or BOQ rows. If a later native V4 compiler reaches a technical budget, it must emit a continuation checkpoint and an incomplete status.
- Concurrency must be bounded; a failed batch is resumable from its last verified checkpoint.

## Phase gates

Phase 0 is green when all V4 contracts exist, the V2 adapter is non-destructive, the unit/formula/category/question contracts have focused tests, and each of the five ledgers contains exactly 11,610 unique stable work IDs with deterministic hashes. Non-zero gap counters are expected and must remain visible.

Full software acceptance is a later gate and requires every listed software blocker counter to be zero. Phase 0 must never claim that status.

The next permitted boundary after Phase 0 is:

`READY_TO_START_V4_PHASE1_ASPHALT_PROFESSIONAL_VERTICAL_SLICE`
