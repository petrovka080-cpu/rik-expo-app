# POST-R6-01 Asphalt V3 completion audit

Baseline: `9b39f3e9c7b8d24d6f86b288c8ff3f0e21082f22`
Rejected candidate: `4a8669df5e85f3f9197292cd241b6c897bfab998`

## Original Full Jest terminal ledger

- Terminal class: `VALID_RED`; exit code `1`.
- Suites: 5,169 passed, 1 failed, 0 skipped.
- Tests: 11,137 passed, 1 failed, 0 skipped/todo.
- Root-cause cluster: `ARCHITECTURE_OR_PERFORMANCE`.
- Assertion: `tests/perf/performance-budget.test.ts:2196`, source modules expected `<=508`, received `509`.
- `result.json`: `5558C618E0289697683F1AC8FBD08B580105D7CDD05988AE1A017CD4D74B2CE6`.
- `summary.json`: `964F9F6D2BB57D0E3EEFB9EED3E18BF7A8F0765022E1348C8A1A8EFF4D4A47C2`.
- `stderr.log`: `4CAAFAB9F85D38329F0C0B97E54297C7259BCDBEBF796E7583926B5299CE9563`.

## Catalog truth, 35/35

The denominator is derived from the exact catalog, not hardcoded. Every entry retains its
catalog work key, Russian source label and `m2` unit. All 35 records have a terminal decision:
15 are executable class-B profiles (`install`, `lay`, `compact`, `repair`, `level` across
standard/small/large), while 20 are class-C conditional records with no Asphalt BOQ.
Standard/small/large are explicit execution overlays; wet-zone and technical-room records
remain `DOMAIN_REVIEW_REQUIRED`.

`prepare`, `drain` and `finish` are labels that do not establish a complete estimate scope and
are not promoted to executable asphalt-layer estimates. Every class-C record emits one visible
applicability document, zero procurement rows and no certified quantity or total. No prefix-only
binding, generic fallback or successful ambiguous compilation is permitted.

Every executable record has an individual deterministic reference fixture, P0/P1/P2 project
inputs, formula and resource graphs, explicit inclusions/exclusions and unpriced-state handling.
Applicable compositions expose work, labor, machinery, laboratory control and documentation;
material and logistics rows are required for install/lay/repair/level and explicitly not
applicable to compaction-only estimates. Standard/small/large projections differ materially
through their execution constraints while retaining one operation owner.

## Platform reuse decision

The earlier candidate added a parallel flat foundation module despite existing V4 owners.
The repair consolidates resolution into `roadworksWaveASemanticTruth.ts` and reuses:

- `roadScopeTruthV4` for surfacing, pavement, full-road and rehabilitation scope truth;
- the existing Roadworks Wave A parameter, formula/resource and production-binding owners;
- existing composite ownership, immutable revision and runtime projection validators.

Road and parking use profiles are materially distinct by load, drainage, edge and equipment
policy. Area size never automatically implies parking.

Numeric quantities are transparent functions of visible project inputs. Hardcoded tack-coat,
truck-capacity, waste-haul, acceptance-lot and joint-sealant coefficients were replaced with
typed project parameters. Normative metadata establishes applicability or technical context;
it is not misrepresented as a hidden quantity coefficient. Product prices remain explicitly
missing until a dated, regional price source or user override is supplied, so no zero-price or
false full-total fallback exists.

The KR/international registry records source status and role. KRER 27 is scoped to its stated
road/site applicability; SP KR 32-107:2024 remains a public-discussion draft. ASTM D6927 is a
quality test-method crosswalk only, ISO 12006-2 a classification framework, and IFC 4.3 a data
exchange schema. None is used as quantity authority from metadata or a licensed abstract.

## Current verified gates

- Cohorts 5 x 7: 35 records terminal, 15 executable B, 20 blocked C.
- All Roadworks Wave A suites: 8/8 suites, 22/22 tests.
- Affected UI/runtime/parity/performance: 16/16 suites, 54/54 tests.
- TypeScript and lint: GREEN (lint has only pre-existing warnings outside this diff).
- Web/Android shared visible projection: 35/35, no truncation, false total or raw ID in the
  public projection; separate professional sections are retained.
- Performance module budget: 508/508 without threshold or assertion changes.

These are pre-admission results. Actual browser and Android API 34 emulator evidence, global
corpus, admissions, remote CI and final Full Jest remain mandatory before the final token.

## Performance impact

The only new production module caused `509 > 508` and duplicated an existing semantic owner.
It is removed; its governed contract is consolidated into the existing roadworks semantic seam.
The threshold, scanner, timeout, heap and assertions remain unchanged. No second engine,
catalog, resolver, revision stack, hidden source or god-file workaround is introduced.
