# F3.2.1 Exec Summary

## Scope Decision

Exact scope is confirmed:

```text
director_finance_panel_scope_v4 spend section only
```

The target chain is:

```text
spend_base
-> proposal_spend_rows
-> kind_supplier_rows
-> kind_rows
-> spend_header
-> spend_overpay_suppliers
-> supplier/object overpay rows
```

## Chosen Safe Cut

Use a prepared spend projection:

```text
finance_panel_spend_projection_v1
```

Preserve old runtime source as:

```text
finance_panel_spend_runtime_source_v1()
```

Expose a projection-or-runtime selector:

```text
finance_panel_spend_scope_v1(p_object_id, p_date_from, p_date_to)
```

Then connect only the panel spend section to this helper.

## Why This Is Safe

- Money values are copied from the old runtime source.
- Aggregate formulas remain identical.
- Runtime source remains available as fallback/proof.
- Supplier/object finance rollups are not touched.
- Supplier detail is not touched.
- PDF/export is not touched.
- Write-path is not touched.

## Required Proof

F3.2.2 must prove:

- old runtime spend snapshot equals projection spend snapshot,
- `diff_count = 0`,
- public panel no longer directly reads `v_director_finance_spend_kinds_v3`,
- `director_finance_panel_scope_v4` contract shape remains `v4`,
- no money semantics or rounding changed.

## Mojibake

No mojibake fix is needed inside the exact spend path. Supplier detail mojibake remains out of scope.
