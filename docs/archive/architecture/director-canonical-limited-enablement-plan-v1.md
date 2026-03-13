## Director Canonical Limited Enablement Plan v1

### Goal
Безопасно включать canonical-first path для Director reports поэтапно, сохраняя legacy path как обязательный fallback.

### Constraints
- No business-logic changes
- No hard cutover
- No legacy path removal
- Phased rollout only
- No global default-on rollout
- Priority: controllability + simple rollback

---

## Rollout order

### Recommended order
1. `materials`
2. `works`
3. `summary` overlay

### Why this order
- `materials` path проще по payload и метрикам, меньше риск nested grain drift.
- `works` path сложнее (nested structure + staged loading).
- `summary` лучше включать последним как overlay после подтверждённой стабильности по works/materials.

---

## Flag model

### Available flags
- Global:
  - `EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL`
- Per report:
  - `EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_MATERIALS`
  - `EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_WORKS`
  - `EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_SUMMARY`
- Diagnostics:
  - `EXPO_PUBLIC_DIRECTOR_REPORTS_CANONICAL_DIVERGENCE_LOG`

---

## Phase plan

### Phase 0 — Baseline (no enablement)
- Purpose: keep current stable behavior.
- Flags:
  - `CANONICAL=0`
  - `MATERIALS=0`
  - `WORKS=0`
  - `SUMMARY=0`
  - `DIVERGENCE_LOG=0`
- Exit condition:
  - baseline runtime healthy, no open regressions.

### Phase 1 — Materials only (limited internal enablement)
- Flags:
  - `CANONICAL=1`
  - `MATERIALS=1`
  - `WORKS=0`
  - `SUMMARY=0`
  - `DIVERGENCE_LOG=1` (internal only)
- Checkpoints:
  - object/all switches stable
  - no fallback-loop behavior
  - no payload-contract warnings
  - divergence stays within tolerance (see below)

### Phase 2 — Works enablement (internal + selected cohort)
- Flags:
  - `CANONICAL=1`
  - `MATERIALS=1`
  - `WORKS=1`
  - `SUMMARY=0`
  - `DIVERGENCE_LOG=1`
- Checkpoints:
  - works first/second stage loading remains stable
  - no hidden double-load regressions
  - positions/req/free parity acceptable
  - issue/purchase totals parity acceptable

### Phase 3 — Summary overlay enablement
- Flags:
  - `CANONICAL=1`
  - `MATERIALS=1`
  - `WORKS=1`
  - `SUMMARY=1`
  - `DIVERGENCE_LOG=1` (then optional `0` after stabilization)
- Checkpoints:
  - summary values stable vs legacy semantics
  - no new dependency regressions in works path
  - no critical mismatch growth

### Phase 4 — Wider limited enablement
- Same flags as phase 3 for broader cohort.
- `DIVERGENCE_LOG` can be lowered to `0` after stable window.

---

## Mismatch policy per checkpoint

### Acceptable (temporary, non-blocking)
- Small count deltas attributable to timing windows (data changed between comparisons).
- Rare single-key divergence with no UI regression and no repetition.
- Non-critical summary rounding differences where formula semantics match.

### Stop condition (phase stop, no further expansion)
- Repeating divergence for same scope key in stable data windows.
- Contract-shape mismatches requiring adapter fallbacks frequently.
- Consistent object-scope inconsistencies (all vs object totals drifting unexpectedly).

### Immediate rollback condition (to legacy for affected mode)
- Missing/failed canonical path causes user-visible report failure or empty state.
- Critical semantic mismatch in core metrics:
  - works: `positions/req/free`
  - materials: `items_total/items_without_request`
  - summary: cost totals or unevaluated ratio materially wrong
- Capability instability causing repeated failed probes despite cooldown.

---

## Rollback matrix

### Rollback by mode (preferred)
- Materials issue:
  - `MATERIALS=0` (keep others unchanged)
- Works issue:
  - `WORKS=0`
- Summary issue:
  - `SUMMARY=0`

### Global rollback (emergency)
- `CANONICAL=0` (all canonical paths disabled instantly).

---

## Optional minimal hardening fixes (low risk)

### Fix 1 (recommended): dev-only payload assertions
- Add dev-only guard after canonical adapter:
  - materials: require `kpi` and `rows` shape
  - works: require `summary` and `works[]`
- Behavior:
  - log warning + fallback (no throw in production path)
- Risk:
  - low, no logic change.

### Fix 2 (recommended): optional `source_ts` in divergence context
- Include `source_ts`/`captured_at` in snapshot comparison logs.
- Purpose:
  - reduce false interpretation of timing-based mismatches.
- Risk:
  - low, diagnostics-only.

---

## Exact flag matrix

| Phase | CANONICAL | MATERIALS | WORKS | SUMMARY | DIVERGENCE_LOG |
|---|---:|---:|---:|---:|---:|
| 0 Baseline | 0 | 0 | 0 | 0 | 0 |
| 1 Materials | 1 | 1 | 0 | 0 | 1 |
| 2 Works | 1 | 1 | 1 | 0 | 1 |
| 3 Summary | 1 | 1 | 1 | 1 | 1 |
| 4 Wider rollout | 1 | 1 | 1 | 1 | 0/1 |

---

## Verdict
- READY FOR LIMITED ENABLEMENT

