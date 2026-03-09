## Phase 1 P0 Production Hardening Plan

### 1. Objective
Close pre-production P0 data-loading risks that currently threaten UX and scale:
- Director reports/analytics critical-path latency and raw runtime reconstruction.
- Warehouse heavy stock/report paths mixed into screen load lifecycle.
- Accountant broad summaries/history fallback fan-out under load.
- Shared loading architecture gaps (duplicate fetch, weak cache keys, schema-sensitive query paths, combined loading locks).

Why P0:
- These flows are top-level operational screens.
- Current behavior can degrade to multi-second blocking loads on normal growth.
- Risks are architectural, not cosmetic; without Phase 1 hardening, local optimizations will regress.

Critical roles/screens in Phase 1:
- Director reports stack
- Warehouse operations + reports stack
- Accountant inbox/history stack

---

### 2. P0 Priority List

#### P0-1 Director reports / analytics
- problem:
  - Heavy report reconstruction and expensive rows path in Director reports flow.
  - Works/materials paths still rely on broad source assembly logic.
- impact:
  - Slow first meaningful render for reports.
  - High variance by company/object/period cardinality.
- current risk:
  - `HIGH` latency and scale risk in `director_reports` path.
- target state:
  - Aggregate-first report source; minimal first-stage payload.
  - Secondary cards async and non-blocking.

#### P0-2 Warehouse heavy stock/report paths
- problem:
  - Stock/report/name-resolution chains are broad and can execute in expensive combinations.
  - Reports/PDF preparation logic has overlapping heavy reads.
- impact:
  - Slow tab changes and report opens.
  - Risk of repeated heavy queries in operational context.
- current risk:
  - `HIGH` on medium/large datasets.
- target state:
  - Operational first paint isolated from report-heavy paths.
  - Snapshot/aggregate source for reporting metrics.

#### P0-3 Accountant broad summaries/history
- problem:
  - Inbox fallback path fans out to additional queries and client-side aggregation.
  - History and inbox can produce frequent reload pressure on filters/tabs.
- impact:
  - Load instability and delayed list readiness.
- current risk:
  - `MEDIUM/HIGH` under scale and noisy refresh conditions.
- target state:
  - Canonical server contract for inbox/history summaries.
  - Bounded query count with stable cache/invalidation.

#### P0-4 Shared loading architecture issues
- problem:
  - Duplicate fetch triggers (focus + refresh + subscription).
  - Schema-sensitive select probing in hot paths.
  - Combined loading locks for independent branches.
  - Non-unified cache keys and invalidation.
- impact:
  - Hidden regressions and inconsistent performance behavior.
- current risk:
  - `HIGH` cross-role maintenance and runtime drift risk.
- target state:
  - Shared orchestration/caching/critical-vs-secondary contract across P0 screens.

---

### 3. Per-Role Implementation Tasks

#### Role: Director

##### Task D1 — Canonical aggregate-first reports source
- files:
  - `src/lib/api/director_reports.ts`
  - `db/20260309_director_reports_canonical_foundation.sql`
- issue:
  - First-stage discipline/report data still depends on costly runtime assembly paths.
- required fix:
  - Promote canonical RPC/view payload to primary path for reports.
  - Keep fallback only behind explicit compatibility gate.
- do not touch:
  - metric semantics, business formulas, UI contract.
- acceptance:
  - Works/materials first render from aggregate payload.
  - No blocking on secondary price/ratio branch.

##### Task D2 — Director reports critical/secondary split hardening
- files:
  - `src/screens/director/director.reports.ts`
  - `src/screens/director/DirectorReportsModal.tsx`
- issue:
  - Heavy branches can still influence perceived readiness.
- required fix:
  - Enforce explicit `critical_ready` vs `secondary_ready` states.
  - Secondary cards remain async without blocking list/cards visibility.
- do not touch:
  - tab semantics, filter semantics, analytics meaning.
- acceptance:
  - First meaningful render independent from secondary enrichment.
  - No combined loading lock from secondary failures.

##### Task D3 — Director request/report fetch orchestration
- files:
  - `src/screens/director/useDirectorScreenController.ts`
  - `src/screens/director/director.lifecycle.ts`
- issue:
  - Multi-trigger refresh patterns can re-fire expensive paths.
- required fix:
  - Coalesce focus/resume/realtime refresh triggers by key.
  - Avoid duplicate refresh bursts for same key window.
- do not touch:
  - approval/send flows, request/proposal business logic.
- acceptance:
  - No duplicate heavy refetch on single lifecycle event.

#### Role: Warehouse

##### Task W1 — Operational first paint isolation
- files:
  - `src/screens/warehouse/hooks/useWarehouseScreenData.ts`
  - `src/screens/warehouse/hooks/useWarehouseTabEffects.ts`
- issue:
  - Operational screen lifecycle can intersect with heavy report paths.
- required fix:
  - Separate operational datasets from report datasets by explicit load phases.
  - Ensure default operational tab does not trigger report-heavy loaders.
- do not touch:
  - issue/receive business behavior.
- acceptance:
  - Opening warehouse operations path avoids report-heavy blocking fetch.

##### Task W2 — Stock/report query path narrowing
- files:
  - `src/screens/warehouse/warehouse.api.ts`
  - `src/screens/warehouse/hooks/useWarehouseStockData.ts`
  - `src/screens/warehouse/hooks/useWarehouseReportsData.ts`
- issue:
  - Broad name-resolution and multi-source fallback chains in hot paths.
- required fix:
  - Introduce narrow projection for first-stage stock/report summaries.
  - Defer non-critical enrich/name layers or cache them aggressively by key.
- do not touch:
  - stock quantity semantics, document generation semantics.
- acceptance:
  - Reduced first-stage stock/report fetch time and fewer repeated broad calls.

##### Task W3 — Reports/PDF non-critical decoupling
- files:
  - `src/screens/warehouse/warehouse.reports.ts`
  - `src/screens/warehouse/warehouse.pdfs.ts`
- issue:
  - Report export preparation can overlap with active screen loading.
- required fix:
  - Ensure export data preparation is on-demand and not in first render path.
- do not touch:
  - PDF content rules.
- acceptance:
  - Reports tab open is independent from export precomputation.

#### Role: Accountant

##### Task A1 — Inbox canonical source and fallback containment
- files:
  - `src/screens/accountant/accountant.inbox.service.ts`
  - `src/screens/accountant/useAccountantScreenController.ts`
- issue:
  - Fallback path fans out to multiple tables with client-side aggregation.
- required fix:
  - Keep canonical inbox source primary; isolate fallback path and coalesce fallback calls.
  - Prevent repeated fallback fan-out for same cache key.
- do not touch:
  - payment actions/posting logic.
- acceptance:
  - Stable bounded query count for inbox load per tab.

##### Task A2 — History load hardening
- files:
  - `src/screens/accountant/accountant.history.service.ts`
  - `src/screens/accountant/useAccountantScreenController.ts`
- issue:
  - Filter/tab transitions can increase reload pressure.
- required fix:
  - Strict keyed debounce/coalescing for history parameters.
  - Preserve request sequencing and stale-result drop.
- do not touch:
  - history semantics/sorting policy.
- acceptance:
  - No repeated history heavy reload for same filter key window.

#### Role: Buyer
- no P0 in Phase 1
- moved to Phase 2 / P1

#### Role: Foreman
- no P0 in Phase 1
- moved to Phase 2 / P1

#### Role: Contractor
- no P0 in Phase 1
- moved to Phase 2 / P1

---

### 4. Shared Foundation Tasks

#### Shared Task S1 — Loading instrumentation standard
- files:
  - `src/lib/perf/*` (new shared helper)
  - targeted role controllers/hooks in Director/Warehouse/Accountant
- standard log keys:
  - `[screen] load:start`
  - `[screen] api:<name>:start`
  - `[screen] api:<name>:end`
  - `[screen] transform:<name>:start`
  - `[screen] transform:<name>:end`
  - `[screen] first_render_ready`
  - `[screen] total`
- usage rules:
  - dev-only by default, no noisy prod logs unless sampled telemetry enabled.

#### Shared Task S2 — Query normalization rules
- files:
  - `src/lib/api/_core.ts`
  - role API adapters in Director/Warehouse/Accountant
- rules:
  - One canonical query contract per feature path.
  - No silent schema probing in hot path unless explicitly guarded.
  - Fallback policy must be explicit, bounded, observable.

#### Shared Task S3 — Cache key model
- files:
  - `src/lib/cacheKeys.ts` (new)
  - role controllers using ad-hoc keys
- key dimensions:
  - `company`
  - `role`
  - `screen`
  - `object`
  - `period`
  - `mode`
  - `tab`
- rule:
  - Same key => coalesced in-flight + reuse cache entry.

#### Shared Task S4 — Critical vs secondary loading contract
- files:
  - role screen controllers (Director/Warehouse/Accountant)
- contract:
  - only critical branch may block first render;
  - secondary branch must be async and independently error-tolerant;
  - partial failures must not lock full screen when critical branch succeeded.

---

### 5. Acceptance Matrix
- `D1`:
  - success metric: Director reports first meaningful render from aggregate-first path.
  - runtime validation: works/materials open under target window with no heavy fallback blocking.
  - tech validation: `npx tsc --noEmit --pretty false`.

- `D2`:
  - success metric: secondary ratio/prices branch never blocks first render.
  - runtime validation: list/cards appear before secondary card readiness.
  - tech validation: no combined loading lock regressions.

- `D3`:
  - success metric: lifecycle events do not create duplicate heavy refetch.
  - runtime validation: focus/resume/realtime triggers coalesced per key.
  - tech validation: request-seq guards preserved.

- `W1`:
  - success metric: operational warehouse open not blocked by report loads.
  - runtime validation: default operational tab ready without report-heavy waits.
  - tech validation: no behavior regression in issue/receive.

- `W2`:
  - success metric: stock/report first-stage fetch cost reduced.
  - runtime validation: fewer heavy calls and lower open latency on stock/reports.
  - tech validation: quantity/name correctness preserved.

- `W3`:
  - success metric: PDF/export prep not in first render path.
  - runtime validation: opening reports independent from export precompute.
  - tech validation: export outputs unchanged.

- `A1`:
  - success metric: accountant inbox load with bounded query count.
  - runtime validation: tab switch avoids fallback fan-out storms.
  - tech validation: payment flow unaffected.

- `A2`:
  - success metric: history filters do not trigger repeated heavy reload for same key.
  - runtime validation: stable refresh behavior on period/search changes.
  - tech validation: result order/filter semantics unchanged.

- `S1-S4`:
  - success metric: unified instrumentation, key model, and load contract active on P0 roles.
  - runtime validation: timing traces comparable across roles; no duplicated in-flight paths.
  - tech validation: no type regressions and clean build.

---

### 6. Rollout Order
1. Director P0 (`D1 -> D2 -> D3`)
2. Warehouse P0 (`W1 -> W2 -> W3`)
3. Accountant P0 (`A1 -> A2`)
4. Shared foundation hardening (`S1 -> S2 -> S3 -> S4`)
5. Cross-role regression pass (runtime + type checks)

---

### 7. Guardrails
- Do not change business logic/metric meaning.
- Do not change UI contract unless separate approved task.
- Do not hide latency with cosmetic loaders.
- Do not suppress errors instead of fixing root cause.
- Do not mark tasks complete without runtime validation.
- Keep rollout reversible (feature flags/explicit fallbacks where needed).

---

### Execution note
Phase 1 is implementation-focused. Audit is complete; this document is the execution map for P0 delivery before broader P1/P2 hardening.
