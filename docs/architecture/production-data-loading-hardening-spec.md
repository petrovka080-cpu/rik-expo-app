## Production Data Loading Hardening (All Role Screens)

### 1. Objective
Bring data loading across role screens to production-grade performance and scale, without changing business logic, metric semantics, or UI contracts.

Must eliminate:
- heavy runtime reconstruction paths
- repeated cold-fetch pipelines
- mode/tab/object desynchronized data paths
- expensive object/period/tab switches
- schema-sensitive query contracts in hot paths
- client-side heavy aggregation in first render

Target scale:
- many companies
- many objects
- large request/issue movement datasets

---

### 2. Core Production Principles

#### 2.1 Business logic invariant
Do not change formulas, metric meaning, or business interpretation.
Only change data-loading architecture and fetch/caching strategy.

#### 2.2 UI contract invariant
Do not change user-facing flow/structure/semantics.
Only loading states and data-loading internals may change.

#### 2.3 First meaningful render must be cheap
Critical payload only for first paint.
Heavy analytics/details must be secondary async stage or pre-aggregated server-side.

#### 2.4 No raw runtime reconstruction in hot path
Forbidden hot-path chain:
`raw fetch -> requests/refs/names lookup -> merge/regroup/recount`
Allowed only in background or canonical aggregate layer.

#### 2.5 Cheap filters/switches
Object/period/tab/mode switching must be cheap and should not trigger heavy reconstruction.

#### 2.6 Canonical source per feature
Each feature must have one canonical data source contract.
Avoid multiple divergent paths for the same metric.

#### 2.7 Critical vs Secondary loading split
Every screen must explicitly separate:
- Critical loading (first render)
- Secondary loading (details/cards)

---

### 3. Global Architecture Targets

#### 3.1 Canonical aggregate sources
Use RPC/view/aggregate table for analytics screens instead of runtime raw assembly.

Examples:
- Director: `director_report_fetch_works_v1`, `director_report_fetch_materials_v1`
- Warehouse: stock/issue summary aggregate source
- Accountant: finance/payment summary aggregate source

#### 3.2 Unified scope model
Unified report scope dimensions:
`company + period + object + mode + tab`

#### 3.3 Unified cache key model
Cache keys should include:
`company_id, period_from, period_to, object_name/object_id, mode, tab`

#### 3.4 Background preload contract
On scope switch:
- active tab: update immediately
- inactive tab: preload in background

---

### 4. Phase 1 (P0) — Director Reports

Status:
- D1 implemented: canonical-first path
- D2 implemented: cheap object switch
- D3 implemented: canonical/fallback availability contract
- D4 implemented: unified object-scope sync for materials + works

Target state:
- first render < 2s
- cheap object switch
- cheap materials/works switch
- no heavy runtime parsing in normal flow

---

### 5. Phase 2 — Warehouse Hardening

Audit and harden:
- stock tab
- issue tab
- reports tab
- object/period filter paths

Target:
- operational first paint decoupled from heavy report assembly
- canonical summary sources for stock/issues

---

### 6. Phase 3 — Accountant Hardening

Audit and harden:
- history
- finance summaries
- payment reporting paths

Target:
- bounded query count
- stable cache model
- no broad fallback fan-out in normal path

---

### 7. Phase 4 — Foreman Hardening

Focus:
- catalog/history/drafts loading
- remove repeated fetch and N+1-like flows
- preserve request/save semantics

---

### 8. Phase 5 — Buyer Hardening

Focus:
- proposal aggregation
- inbox aggregation
- subscription refresh coalescing

---

### 9. Phase 6 — Contractor Hardening

Focus:
- assignment and acts loading
- avoid reconstruction-heavy enrich chains in first paint

---

### 10. Shared Data Layer Hardening

#### 10.1 Query normalization
- stable select/filter contracts
- no schema-sensitive probing in hot paths

#### 10.2 Runtime instrumentation
Standard trace points:
- `[screen] load:start`
- `[screen] api:<name>:start/end`
- `[screen] transform:<name>:start/end`
- `[screen] first_render_ready`
- `[screen] total`

#### 10.3 Loading contract
All critical screens must follow:
- critical loading
- secondary loading
- background preload

#### 10.4 Fallback contract
If canonical source is unavailable:
- detect once
- cache capability
- use stable fallback
- no repeated probing per interaction

---

### 11. Scale Readiness
Architecture must remain stable under:
- 100x row growth
- 1000 objects
- 100k issue items
- multi-company load

---

### 12. Acceptance Criteria

#### Performance
- Director reports first render < 2s
- cheap object switch
- cheap mode/tab switch

#### Stability
- no repeated fallback probing
- no heavy runtime reconstruction in normal path

#### Architecture
- canonical sources defined and wired
- unified cache model
- consistent critical/secondary loading contract

---

### 13. Deliverables
1. Full data-loading audit (done)
2. Phase 1 P0 plan (done)
3. Role-by-role implementation
4. Shared data-layer hardening

---

### 14. Commit Policy
- Audit: `docs(data): audit loading architecture across role screens`
- Plan: `docs(data): define phase 1 p0 production hardening plan`
- Implementation: `perf(role): harden data loading path`
- Architecture foundation: `feat(data): introduce canonical aggregate report source`

---

### 15. Final Expected Result
- production-level data loading
- scalable data architecture
- cheap filters/switches
- minimal runtime reconstruction
- stable canonical data sources
