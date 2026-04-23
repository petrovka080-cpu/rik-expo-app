# STRICT_NULLCHECKS_PHASE_13 Notes

## Read-only Shortlist Probe

| Candidate | Domain | Entry / owner path | Real strict-null blockers | Boundary type | Blast radius | Cross-domain deps | Focused tests | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Candidate A | Contractor progress submit | `src/screens/contractor/contractor.workProgressSubmitFlow.ts` | `workModalRow` possibly null after validation at submit call | process / submit state | 1 runtime file, but no active callers found | contractor progress service only | none existing | Safe, but lower live process value because the current caller graph does not use this flow |
| Candidate B | Office hub | `src/screens/office/OfficeHubScreen.tsx` | promise result can be `undefined` where `null` contract is expected | state / process | shared promise loader contract | office access services and screen state | existing broader office tests | Blocked by shared deps; not a narrow Phase 13 slice |
| Candidate C | Foreman draft lifecycle | `src/screens/foreman/foreman.draftLifecycle.model.ts` | nullable snapshot plus imported foreman/API/pdf blockers | recovery / draft state | multiple files via imports | foreman local draft, buyer/director/pdf shared surfaces | existing foreman tests | Too wide for one strict-null slice |
| Candidate D | Contractor material search | `src/screens/contractor/contractor.search.ts` | `available` is optional on `WorkMaterialRow` during sort | RPC output / transport normalization / render input | 1 runtime file + focused tests in an existing contractor test file | called from contractor screen through work search controller only | added in this wave | Chosen for Phase 13 |

## Why Candidate D Was Chosen

`contractor.search` is an active RPC-output boundary: `catalog_search` rows are converted into `WorkMaterialRow` render/input rows used by the contractor work material search UI. The strict blockers were real and isolated to the sort contract: the mapper always writes `available`, but the public `WorkMaterialRow` type makes it optional. This made the boundary rely on an implicit invariant.

The fix keeps valid success-path behavior unchanged while making the transport contract deterministic for `null`, `undefined`, partial, and malformed payloads.

## Out Of Scope

- No global `strictNullChecks` flip.
- No changes to SQL/RPC semantics or `catalog_search`.
- No contractor screen/UI redesign.
- No changes to office, foreman, director, auth, offline, or neighboring strict candidates.
- No broad nullable cleanup across contractor files.

## Real Nullable Blockers Closed

- `src/screens/contractor/contractor.search.ts(32,18)` — `a.available` possibly `undefined`.
- `src/screens/contractor/contractor.search.ts(33,18)` — `b.available` possibly `undefined`.
- `src/screens/contractor/contractor.search.ts(35,45)` — `b.available` possibly `undefined`.
- `src/screens/contractor/contractor.search.ts(35,59)` — `a.available` possibly `undefined`.

## Process / Control Value

- The RPC-output boundary now explicitly accepts `null` / `undefined` / partial / malformed payload rows.
- Malformed `qty_available` no longer leaks `NaN` into sorting.
- The mapper still returns deterministic rows instead of creating a false empty state.
- Sort behavior for valid rows remains `available desc` first, then Russian name ordering.
