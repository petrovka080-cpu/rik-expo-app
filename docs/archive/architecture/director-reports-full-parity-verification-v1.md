## Director Reports Full Parity Verification v1

### Covered surfaces
- Works reports:
  - runtime discipline load path (`fetchDirectorWarehouseReportDiscipline`)
  - summary fields inside works payload
  - grouped works/positions metrics
- Materials reports:
  - runtime materials load path (`fetchDirectorWarehouseReport`)
  - KPI + rows totals
- Summary surfaces:
  - canonical summary RPC contract availability check
  - works summary compatibility checks
- Filters/scopes:
  - all objects (wide period)
  - medium object
  - complex object
  - period-sensitive (last 30 days)

Note:
- Requested extra cases (`small object`, explicit `free/unlinked object`) were probed from available data.
- In this dataset/run they did not produce additional stable scopes beyond those listed.

---

### Comparison matrix

Machine-readable artifact:
- [diagnostics/director_parity_v1.json](c:/dev/rik-expo-app/diagnostics/director_parity_v1.json)

Checker script:
- [scripts/director_parity_check_v1.js](c:/dev/rik-expo-app/scripts/director_parity_check_v1.js)

Run command:
```bash
node scripts/director_parity_check_v1.js
```

Observed scope results:
- `all_wide`:
  - canonical materials: FAIL (`director_report_fetch_materials_v1` missing)
  - canonical works: FAIL (`director_report_fetch_works_v1` missing)
  - canonical summary: FAIL (`director_report_fetch_summary_v1` missing)
- `medium_object`:
  - canonical materials: FAIL (missing function)
  - canonical works: FAIL (missing function)
  - canonical summary: FAIL (missing function)
- `complex_object`:
  - canonical materials: FAIL (missing function)
  - canonical works: FAIL (missing function)
  - canonical summary: FAIL (missing function)
- `period_30d_all`:
  - canonical materials: FAIL (missing function)
  - canonical works: FAIL (missing function)
  - canonical summary: FAIL (missing function)

---

### Mismatches found

#### P0
- Canonical RPC layer unavailable in target DB runtime:
  - `public.director_report_fetch_materials_v1(...)` not found
  - `public.director_report_fetch_works_v1(...)` not found
  - `public.director_report_fetch_summary_v1(...)` not found
- Impact:
  - Full numeric parity (legacy vs canonical) cannot be proven on live runtime because canonical side is non-executable.
- Classification:
  - rollout blocker for canonical enablement phases.

#### P1
- None confirmed (canonical side unavailable, so numeric deltas cannot be validated).

#### P2
- None confirmed.

#### Notes
- Legacy values are computed and stored in artifact for covered scopes.
- Canonical contract errors are deterministic and repeatable across scopes.

---

### Safe remediations applied
- Added read-only parity helper:
  - `scripts/director_parity_check_v1.js`
- Added machine-readable output:
  - `diagnostics/director_parity_v1.json`

No business/runtime logic was changed.
No cutover behavior changed.

---

### Remaining blockers/gaps
1. **Blocker:** canonical SQL functions are not deployed in the active DB schema.
2. **Gap:** full parity on costs (`issue/purchase`) and `unevaluated_ratio` cannot be validated until canonical functions exist and return payloads.
3. **Gap:** UI-facing canonical-vs-legacy value comparison remains pending deployment of canonical RPCs.

---

### Rollout readiness
- **NOT READY**

Reason:
- Canonical runtime endpoints are missing in DB; parity pass cannot complete beyond availability checks.

---

### Files changed
- `scripts/director_parity_check_v1.js`
- `diagnostics/director_parity_v1.json` (generated artifact)
- `docs/architecture/director-reports-full-parity-verification-v1.md`

---

### Validation
- `node scripts/director_parity_check_v1.js` — PASS (artifact generated, canonical availability failures captured)
- `npx tsc --noEmit --pretty false` — PASS

