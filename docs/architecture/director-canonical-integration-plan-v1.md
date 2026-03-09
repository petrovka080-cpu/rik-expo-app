## Director Canonical Integration Plan v1

### Entry points

#### Runtime loading entry points
- Materials report:
  - `src/lib/api/director_reports.ts` -> `fetchDirectorWarehouseReport(...)`
  - Called from `src/screens/director/director.reports.ts`:
    - initial/report refresh/object-scope sync paths.
- Works report:
  - `src/lib/api/director_reports.ts` -> `fetchDirectorWarehouseReportDiscipline(...)`
  - Called from `src/screens/director/director.reports.ts`:
    - first-stage (skipPrices), second-stage (with prices), object-scope sync.
- Summary report:
  - currently embedded into works payload (`summary`) in discipline path.
  - Canonical SQL has dedicated `director_report_fetch_summary_v1`, but runtime does not yet call it directly.

#### Current canonical touchpoints (already present)
- `canUseCanonicalRpc("materials" | "works")`
- `canonicalRpcStatus` cache (`unknown | available | missing`)
- `markCanonicalRpcStatus(...)`
- missing-RPC detection via `isMissingCanonicalRpcError(...)`

---

### Capability / fallback model

#### Canonical-first design
1. Attempt canonical RPC path first (materials or works).
2. If canonical returns valid payload -> use it.
3. If canonical is missing or fails contract -> fallback to existing runtime legacy path.
4. Do not block UI on canonical probe failure.

#### Capability detection (one-time + cached)
- Capability states (target model):
  - `unknown`
  - `available`
  - `missing` (e.g. PostgREST function-not-found)
  - `failed` (transient runtime failure, malformed payload, timeout)
- Policy:
  - `missing`: stop probing until app restart or manual reset.
  - `failed`: apply cool-down (e.g. 5-15 min) before retry; avoid per-render probing.
  - `available`: keep canonical-first.

#### Fallback behavior
- Preserve existing legacy path in `director_reports.ts`:
  - fast RPC (`wh_report_*`) where possible,
  - then view/rpc/table reconstruction chain.
- No removal of any legacy branch in this phase.

---

### Feature flag / safe switch

#### Required gate model
- Global gate (already exists):
  - `EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL` (`"1"` default, `"0"` hard disable)
- Proposed fine-grained gates (plan, no cutover here):
  - `EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_MATERIALS`
  - `EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_WORKS`
  - `EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_SUMMARY`

#### Enablement policy
- Default rollout mode:
  - canonical enabled only where capability is `available`.
  - per-report disable switch remains possible without app rebuild (env/config driven).

---

### Payload adaptation

#### Runtime expected types
- Materials expects `RepPayload`-compatible shape:
  - `meta`, `kpi`, `rows`, `report_options` (+ optional discipline).
- Works expects `RepDisciplinePayload`:
  - `summary`, `works[]`, nested `levels[]`, nested `materials[]`.

#### Adapter strategy (thin only)
- Adapter is allowed only for shape normalization:
  - unwrap `table(payload jsonb)` -> payload object
  - key renaming if strictly needed
  - null/undefined normalization
- Adapter must not:
  - recalculate metrics
  - change formulas
  - reinterpret requested/free/cost semantics

#### Summary adaptation
- Short-term:
  - keep summary from works payload (current runtime contract).
- Planned:
  - optional direct use of `director_report_fetch_summary_v1` behind feature gate, merged into existing summary slot only if parity-confirmed.

---

### Divergence logging

#### Purpose
- During rollout, compare canonical vs legacy outputs on sampled requests and detect semantic drift.

#### Where to log
- `src/lib/api/director_reports.ts` in canonical-first branches (materials/works), behind debug gate.

#### What to compare
- Works:
  - `total_positions`
  - `req_positions`
  - `free_positions`
  - `issue_cost_total`
  - `purchase_cost_total`
  - `unpriced_issue_pct/unevaluated_ratio`
- Materials:
  - `items_total`
  - `items_without_request`
  - row count
  - qty totals
- Scope consistency:
  - object/all mode totals stability

#### Noise control
- sample rate (e.g. 5-10%)
- debounce by cache key (`company|from|to|object|mode`)
- log only if delta exceeds thresholds
- single consolidated warning/event per key

---

### Rollout phases

1. Hidden integration
- Keep legacy as default behavior in practice.
- Canonical path behind flag+capability only.
- No visible behavior changes.

2. Internal verification
- Enable canonical for internal/dev accounts.
- Collect divergence logs and latency stats.
- Fix payload/semantics mismatches only.

3. Selective enablement
- Enable per-report mode:
  - materials first, then works, then summary.
- Keep instant rollback by env gate.

4. Wider enablement
- Expand to broader audience after parity pass.
- Continue divergence monitoring with lower sample rate.

5. Legacy retirement criteria (future, not this task)
- sustained parity (counts/costs/ratio) over agreed window
- no capability instability
- no severe regressions in object/mode switches
- only then evaluate removal of heavy legacy branches

---

### Risks
- Contract drift:
  - canonical SQL payload differs from TS DTO expectations.
- Semantic drift:
  - `unevaluated_ratio` / cost interpretation mismatch.
- Scope drift:
  - object filter inconsistency across works/materials/summary.
- Capability churn:
  - repeated canonical failures without proper `failed` cool-down.
- Logging noise:
  - excessive diagnostics without sampling/threshold controls.

---

### Affected runtime files list
- `src/lib/api/director_reports.ts` (primary integration gateway)
- `src/screens/director/director.reports.ts` (report loading orchestration)
- `src/screens/director/director.types.ts` (DTO contract validation reference)
- SQL blueprint docs/artifacts:
  - `docs/architecture/director-canonical-reports-sql-blueprint-v1.md`
  - `docs/architecture/director-canonical-sql-blueprint-remediation-v1.md`
  - `db/20260309_director_canonical_reports_sql_blueprint_v2_draft.sql`

---

### Verdict
- READY FOR SAFE INTEGRATION

