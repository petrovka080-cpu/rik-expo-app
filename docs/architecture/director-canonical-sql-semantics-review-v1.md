## Director Canonical SQL Semantics Review v1

### Coverage
- fields mapped: 31/31
- unresolved mappings: 4 (`zone_code/zone_name`, `material_id`, exact `work_type_code` lineage in all legacy rows, approved stock source for `stock_qty`)

### Parity status
- object filter: FAIL
- requested/free semantics: PASS
- issue cost semantics: PASS WITH GAPS
- purchase cost semantics: PASS WITH GAPS
- unevaluated ratio semantics: FAIL
- nullable object/material handling: PASS WITH GAPS
- stock_qty status clarity: PASS
- date semantics: PASS WITH GAPS
- aggregation grain: FAIL
- performance sanity: PASS WITH GAPS

### 1) Source Mapping Completeness

| Canonical field | Runtime source now | Blueprint SQL source | Semantics parity |
|---|---|---|---|
| `company_id` | Implicit via role/project scope; table path does not apply explicit company filter in `fetchDisciplineFactRowsFromTables` | `requests.company_id` | FAIL (possible drop of free/unlinked issue rows, plus runtime/table path lacks explicit company predicate) |
| `fact_date` | `warehouse_issues.iss_date` | `coalesce(wi.iss_date, req.created_at, current_date)` | PASS WITH GAPS (fallback may shift date bucket) |
| `object_id` | Mostly from report options map / requests lookup, often null in row grain | `requests.object_id` | PASS WITH GAPS |
| `object_name` | `warehouse_issues.object_name` + free-note normalization | `coalesce(req.object_name, wi.object_name, req.object, 'Без объекта')` | PASS WITH GAPS |
| `system_code/system_name` | `requests.system_code` + `ref_systems`; free-note parser fallback | `requests.system_code` + `ref_systems` | PASS WITH GAPS |
| `level_code/level_name` | `requests.level_code`; free-note parser fallback; optional `ref_levels` resolve | `requests.level_code` + `ref_levels` | PASS WITH GAPS |
| `zone_code/zone_name` | Not used in active runtime discipline path | `requests.zone_code` + `ref_zones` | FAIL (runtime parity not verifiable) |
| `work_type_code/work_type_name` | Runtime uses `work_name/system_name` discipline labels, not strict work_type code | `request_items.work_type_code / requests.work_type_code / wi.work_name` | FAIL (lineage differs for legacy/free rows) |
| `discipline_key/discipline_name` | Derived from `work_name`/`system_name` (+free-note context) | Derived from `work_type/work_name/system` fallback | PASS WITH GAPS |
| `request_id/request_item_id/issue_item_id` | `warehouse_issues`, `warehouse_issue_items`, `request_items` links | Same chain | PASS |
| `material_id/material_name/material_code` | Code-first (`rik_code`) + name resolve from lookup views | Code-first + name lookup; `material_id` nullable | PASS WITH GAPS |
| `qty/uom` | `warehouse_issue_items.qty/uom_id` | Same | PASS |
| `is_requested/is_free` | `request_item_id` presence (`is_without_request` inverse) | Same | PASS |
| `issue_cost/purchase_cost` | `issue_cost`: proposal-derived price map (`proposal_items`); `purchase_cost`: kept 0 in works path | `issue_cost` proposal-derived in view; `purchase_cost` 0 | PASS WITH GAPS |

### 2) Critical Semantics Checks

#### A. Object scope
- `p_object_id` priority over `p_object_name` — YES
- одинаковое поведение в works/materials/summary — YES (in blueprint functions)
- нет второй архитектуры “all vs object” — YES (one source + filter), BUT runtime currently still uses separate fallback pipelines

#### B. Requested/free
- `is_requested` эквивалент runtime — YES
- `is_free` эквивалент runtime — YES
- `requested_count/free_count` считаются в той же логике — YES

#### C. Costs
- `issue_cost_total` совпадает по смыслу — YES (proposal-weighted pricing), with caveat on lookup completeness
- `purchase_cost_total` совпадает по смыслу — YES (currently conservative 0 branch in works), materials remains provisional
- нет скрытой смены basis/источника — YES (explicitly proposal-based), but needs final sign-off

#### D. Unevaluated ratio
- формула совпадает с production-семантикой — NO
- база вычисления (позиции/суммы/строки) совпадает — NO  
Runtime: `unpricedIssuePositions / issuePositions` where issue position requires `(code && qty>0)` and price missing.  
Blueprint: `count(issue_cost = 0) / count(*)` on grouped set.

#### E. Nullable handling
- `object_id` nullable: grouping/filter deterministic — YES (name fallback), with risk of mixed-name duplicates
- `material_id` nullable: grouping deterministic — YES (code/name fallback), with collision risk across aliases

#### F. `stock_qty`
- явно помечен как provisional/placeholder — YES
- не используется как финальная прод-метрика молча — YES

#### G. Date semantics
- `fact_date` соответствует runtime-дате — YES (primary path)
- период `p_from/p_to` применяется одинаково — YES (inclusive in both paths)
- нет смещения дат из-за COALESCE fallback — NO (possible when `wi.iss_date` is null)

#### H. Aggregation grain
- runtime aggregation grain задокументирован — YES (`issue_item` fact row)
- canonical grain совпадает — NO (blueprint RPC returns grouped table rows vs runtime nested work->level->materials payload)
- нет row explosion из-за join expansion — NO (risk on non-unique code joins in catalog/name sources)

### 3) Parity Test Cases (must run)

Status: **NOT RUN in this review** (no runtime cutover and no DB-side side-by-side execution in this task).  
Required as follow-up gate before cutover:
1. all objects + works
2. single object + works
3. all objects + materials
4. single object + materials
5. summary (same scopes)

Metrics to compare:
- `positions_count`
- `requested_count`
- `free_count`
- `issue_cost_total`
- `purchase_cost_total`
- `unevaluated_ratio`
- object-scoped totals consistency

### 4) Performance sanity check
- RPC фильтрует по company/date до агрегации — YES (at RPC filtered CTE), but base views still heavy
- нет broad full scan без фильтров — NO (base views compute across full confirmed issues; RPC filters later)
- join depth разумный — YES/NO (moderate depth, but code-based lookup joins may amplify cardinality)

### Detected divergences

#### P0
- `director_report_fetch_works_v1` contract mismatch
  - Runtime behavior: frontend currently expects JSON payload (`summary`, `works[]`, nested levels/materials).
  - Blueprint behavior: SQL draft returns tabular rows.
  - Required correction: keep runtime contract-compatible RPC facade (JSON) or add explicit adapter RPC without changing metric semantics.

- `unevaluated_ratio` formula mismatch
  - Runtime behavior: based on unpriced issue positions (`qty>0 && code present` with missing price).
  - Blueprint behavior: based on zero `issue_cost` row count ratio.
  - Required correction: implement runtime-equivalent predicate in SQL.

#### P1
- `company_id` derivation dependency on `requests`
  - Runtime behavior: table path can include free issue rows without reliable request linkage.
  - Blueprint behavior: `company_id` from `requests`, rows with missing `req` drop out.
  - Required correction: source company directly from issue header if available, else controlled fallback.

- Aggregation grain mismatch for works mode
  - Runtime behavior: nested `work -> level -> materials`.
  - Blueprint behavior: grouped flat rows.
  - Required correction: provide parity RPC/facade shape or document strict non-cutover compatibility layer.

- Potential row explosion on code-name joins
  - Runtime behavior: code name resolve done as controlled map overlays.
  - Blueprint behavior: direct joins to multiple code sources may duplicate rows if source not unique.
  - Required correction: deduplicate name sources before join (e.g., one-row-per-code CTE).

#### P2
- `fact_date` COALESCE fallback may move row to request/create date.
  - Required correction: pin to `iss_date` for issue facts; keep fallback explicit only for null issue rows by policy.

- `zone_*` parity is undefined in current runtime path.
  - Required correction: mark as informational/non-blocking until runtime uses these fields.

### Verdict
- PASS WITH GAPS

