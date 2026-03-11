## Director Parity Surface Fix v1

### Baseline issue
- Legacy baseline in parity tooling was truncated by PostgREST page cap.
- Script used a single wide range path that did not guarantee full fetch consistency for all legacy surfaces.
- This created artifact mismatches against canonical, which was reading full fact sets.

### Full-fetch strategy
- Legacy parity baseline now uses paged `warehouse_issue_items` loading with:
  - `page_size = 1000`
  - explicit loop by `range(from,to)`
  - stop when returned rows `< page_size`
- Status filter value is resolved dynamically from `warehouse_issues.status` at runtime to avoid encoding-literal drift.
- Legacy materials and works baseline both derive from the same issue-item fact set.

### Comparable metrics
- Works:
  - `total_positions`
  - `req_positions`
  - `free_positions`
  - `works_count`
- Materials:
  - `items_total`
  - `items_without_request`
  - `rows_count`

### Non-comparable metrics
- Works:
  - `total_qty` (floating precision noise tolerated)
  - `issue_cost_total`
  - `purchase_cost_total`
  - `unpriced_issue_pct`
- Materials:
  - `qty_total` (floating precision noise tolerated)
- Summary:
  - `issue_cost_total`
  - `purchase_cost_total`
  - `unevaluated_ratio`

### Updated parity results
- `all_wide` mismatches: `0`
- `medium_object` mismatches: `0`
- `complex_object` mismatches: `0`
- `period_30d_all` mismatches: `0`

### Remaining mismatches
- No comparable-metric mismatches after baseline fix.
- Summary/cost/ratio still treated as contract-limited (placeholder-compatible) and kept outside parity blocking set.

### Recommendation
- READY WITH GAPS
  - Numeric parity for comparable metrics is achieved.
  - Summary/cost/ratio semantic parity still requires separate contract completion before broader enablement.
