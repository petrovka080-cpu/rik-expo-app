## Full Data Loading Audit

### Scope and method
This audit covers runtime data-loading architecture for role screens: Director, Foreman, Buyer, Accountant, Warehouse, Contractor.
Assessment is based on current screen controllers/hooks/services in `src/screens/*` and shared API loaders in `src/lib/api/*`.

Legend:
- `PASS`: stable path with acceptable structure and guardrails
- `RISK`: works now but has scaling/degradation risk
- `FAIL`: current architecture likely to produce unacceptable UX under realistic growth

---

### Screen: Director
- initial load quality — `FAIL`
- tab switch quality — `RISK`
- filter quality — `RISK`
- scaling risk — `HIGH`
- main bottlenecks:
  - Heavy report assembly path still centered in `src/lib/api/director_reports.ts` with multi-source reconstruction logic and fallback ladders.
  - Works/materials mode uses separate expensive branches; critical-path split exists but first-stage rows path remains heavy.
  - Object/period filtering still tied to wide data paths; cache improves repeats but does not eliminate base heavy query cost.
  - Multiple legacy-safe select plans and compatibility probing increase query/branch complexity.
- proposed production fix:
  - Move reports to canonical aggregate source (RPC/view/hybrid), one contract for both materials/works.
  - Keep first render on ultra-light aggregate payload; price/ratio/details async in secondary branch.
  - Limit runtime reconstruction in screen code to formatting only.

### Screen: Foreman
- initial load quality — `RISK`
- tab switch quality — `RISK`
- filter quality — `PASS`
- scaling risk — `MEDIUM`
- main bottlenecks:
  - Mixed catalog/request flows in one screen (`app/(tabs)/foreman.tsx`) with many live hooks and modal loaders.
  - Request item updates and item reloads can trigger repeated request-item list fetches under active editing.
  - History load and dictionary loads rely on per-open fetching without a shared cache key model.
- proposed production fix:
  - Split critical load (draft/request/items) from secondary load (history/dicts) with explicit readiness states.
  - Add request-level cache for dict/reference lookups and stable invalidation by request version.
  - Keep calc/profile layers canonical (already improved), avoid extra runtime probing in first paint.

### Screen: Buyer
- initial load quality — `RISK`
- tab switch quality — `RISK`
- filter quality — `RISK`
- scaling risk — `MEDIUM/HIGH`
- main bottlenecks:
  - Focus lifecycle launches multiple parallel loads (`inbox`, `buckets`, `subcontract count`) plus realtime subscription refresh cascades.
  - Buckets path in `src/screens/buyer/buyer.fetchers.ts` performs multiple broad queries (`v_proposals_summary`, `proposals`, `proposal_items`, attachments).
  - Realtime callbacks can trigger paired refetches (`fetchBuckets + fetchInbox`) without centralized coalescing.
- proposed production fix:
  - Introduce buyer aggregate inbox/buckets RPC contract with server-side grouped counts.
  - Add request coalescer per cache key (`company + tab + period + filter`) and stale-while-revalidate behavior.
  - Keep subscription-driven updates incremental (delta refresh), not full twin refetch.

### Screen: Accountant
- initial load quality — `RISK`
- tab switch quality — `PASS/RISK`
- filter quality — `RISK`
- scaling risk — `MEDIUM`
- main bottlenecks:
  - Good controller guardrails exist (`loadSeqRef`, cacheByTab), but fallback path (`mapAccountantFallbackPropsToInboxRows`) performs extra queries per load.
  - History path depends on RPC with sorting/filtering in client after load; fixed limit can hide scaling pain until threshold reached.
  - Mixed tab/historical triggers can still produce frequent reload pressure when filters change rapidly.
- proposed production fix:
  - Promote fallback logic into canonical server endpoint and reduce client-side aggregation passes.
  - Add strict cache keying for inbox/history dimensions and partial invalidation on payment updates.
  - Preserve current controller sequencing; reduce fallback query fan-out.

### Screen: Warehouse
- initial load quality — `RISK`
- tab switch quality — `RISK`
- filter quality — `RISK`
- scaling risk — `HIGH`
- main bottlenecks:
  - `useWarehouseScreenData` composes many hooks and concerns; first open may front-load stock/req/reports depending on tab and effects.
  - Stock/report APIs rely on broad multi-source resolution chains (`warehouse.api.ts`) and expensive name enrichment tiers.
  - Reports and document generation paths pull large row sets; day/object/material reports can duplicate heavy reads.
  - Tab effects can trigger costly report/req reloads on switch without role-wide request orchestration.
- proposed production fix:
  - Build warehouse analytics aggregate layer and separate operational tab data from report/export data.
  - Introduce cache policy per dataset (stock snapshot, req heads, issue lines, report summaries) with TTL + invalidation events.
  - Keep PDF/report generation off critical screen-load path.

### Screen: Contractor
- initial load quality — `RISK`
- tab switch quality — `PASS/RISK`
- filter quality — `RISK`
- scaling risk — `MEDIUM/HIGH`
- main bottlenecks:
  - Works load bundle (`contractor.loadWorksService.ts`) enriches via chained lookups (`work_progress`, `purchase_items`, `request_items`, `requests`, `subcontracts`) and merges client-side.
  - Potential N+1-like expansion avoided partially, but still heavy reconstruction from raw sources.
  - Refresh/reload lifecycle can re-run the full bundle path.
- proposed production fix:
  - Provide contractor canonical work snapshot endpoint with required joins pre-modeled.
  - Keep enrich chains only for optional details, not base list visibility.
  - Add stable cache keys by contractor profile + status mode + period.

---

## Cross-cutting issues
- duplicate fetch patterns:
  - Focus-based reload + explicit refresh + subscription callbacks without shared coalescer in several roles.
- unstable effect dependencies:
  - Some controllers depend on multi-state tuples causing repeated load triggers when unrelated state changes.
- heavy runtime aggregation:
  - Director/Warehouse/Contractor reconstruct report views from raw rows in client/service layer.
- weak cache strategy:
  - Cache exists per feature but no unified key model/TTL contracts across roles.
- invalid query contracts:
  - Legacy-compatible select fallback ladders indicate schema-sensitive request contracts.
- schema-sensitive select paths:
  - Multiple select-plan probing patterns increase complexity and runtime variability.
- missing critical/secondary split:
  - Improved in Director Works, still inconsistent across other heavy surfaces.

---

## Priority ranking

### P0 — must fix before production
- Director reports/analytics canonical aggregate source + unified materials/works contract.
- Warehouse heavy stock/report paths split from operational first paint.
- Cross-role request orchestration/coalescing to stop duplicate fetch cascades on focus/subscription.

### P1 — should fix before scale
- Buyer inbox/buckets aggregate endpoint and delta subscription refresh.
- Contractor work bundle canonical snapshot path (reduce enrich chain in critical path).
- Accountant fallback fan-out reduction and stricter inbox/history cache key model.
- Foreman critical/secondary data split and request-item reload throttling.

### P2 — cleanup / architecture improvement
- Remove legacy runtime select probing once canonical contracts are rolled out.
- Normalize instrumentation naming and telemetry sinks across all roles.
- Consolidate duplicated query helpers and fallback adapters.

---

## Recommended architecture direction
- canonical aggregate sources:
  - Director reports aggregate (materials + works)
  - Warehouse analytics aggregate
  - Buyer inbox/buckets aggregate
  - Contractor works snapshot aggregate
- cache key model:
  - `{company_id}:{role}:{screen}:{mode}:{tab}:{object_id|null}:{period_from}:{period_to}:{version}`
- loading state model:
  - Explicit split: `critical_ready`, `secondary_ready`, `error_partial`, `error_blocking`
- query normalization rules:
  - One canonical request contract per feature; no silent schema probing in hot paths
- runtime instrumentation policy:
  - Unified log points: `load:start`, `api:*:start/end`, `transform:*:start/end`, `first_render_ready`, `total`
  - Keep dev-only timing with optional sampled production telemetry

---

## Delivery roadmap

### Phase 1 — P0 fixes
- Director canonical aggregate endpoint + screen switch to aggregate-first payload.
- Warehouse first-paint isolation and report path decoupling.
- Shared request coalescer for focus/refresh/subscription overlap.

### Phase 2 — shared data-layer hardening
- Unified cache-key library + TTL policy + invalidation hooks.
- Critical/secondary loading split enforcement helpers.
- Standard runtime instrumentation package for role screens.

### Phase 3 — canonical aggregate/report sources
- Buyer aggregate inbox/buckets.
- Accountant normalized inbox/history source.
- Contractor works aggregate snapshot.

### Phase 4 — legacy path cleanup
- Remove raw runtime reconstruction paths after rollout validation.
- Remove deprecated fallback select plans and compatibility-only branches.

---

## Per-screen implementation tasks

### Director
- Fix target:
  - Replace raw discipline assembly with aggregate contract for first-stage cards.
- Where:
  - `src/lib/api/director_reports.ts`, `src/screens/director/director.reports.ts`.
- Do not touch:
  - Metric semantics and ratio formulas.
- Acceptance:
  - fast first render, async secondary cards, no heavy reconstruction in critical path.

### Foreman
- Fix target:
  - Split draft/item critical path from dict/history secondary path.
- Where:
  - `app/(tabs)/foreman.tsx`, `src/screens/foreman/hooks/*`.
- Do not touch:
  - request save/submit flow.
- Acceptance:
  - stable first render, no repeated item list reload under normal editing.

### Buyer
- Fix target:
  - Replace multi-query bucket assembly with aggregate endpoint + coalesced refresh.
- Where:
  - `src/screens/buyer/buyer.fetchers.ts`, `hooks/useBuyerLoadingController.ts`.
- Do not touch:
  - approval/accounting workflow semantics.
- Acceptance:
  - no duplicate full refetch on subscription bursts; predictable tab switch latency.

### Accountant
- Fix target:
  - Reduce fallback query fan-out and normalize inbox/history contracts.
- Where:
  - `src/screens/accountant/useAccountantScreenController.ts`, `accountant.inbox.service.ts`, `accountant.history.service.ts`.
- Do not touch:
  - payment posting logic.
- Acceptance:
  - stable load per tab/history filter with bounded query count.

### Warehouse
- Fix target:
  - Decouple operations first paint from heavy reports and broad name-resolution chains.
- Where:
  - `src/screens/warehouse/hooks/useWarehouseScreenData.ts`, `warehouse.api.ts`, `warehouse.reports.ts`.
- Do not touch:
  - issue/receive business flow.
- Acceptance:
  - tab switch does not trigger unnecessary heavy report assembly.

### Contractor
- Fix target:
  - Replace chained enrichment critical path with canonical snapshot source.
- Where:
  - `src/screens/contractor/contractor.loadWorksService.ts`, `hooks/useContractorScreenData.ts`.
- Do not touch:
  - act builder semantics.
- Acceptance:
  - work list opens from prejoined payload, enrich only for optional details.

---

## Verdict
- Current overall state: `PASS WITH GAPS` for stability, `FAIL` for production-scale loading architecture.
- Next mandatory step: implement Phase 1 P0 with canonical aggregate sources and shared request orchestration.
