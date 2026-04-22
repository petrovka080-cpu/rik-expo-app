# F3.2.1 Spend Mapping

## Chosen Replacement

Create a prepared row projection for panel spend basis:

```text
finance_panel_spend_projection_v1
```

The projection stores the enriched spend row basis that the panel currently rebuilds on every call.

The old runtime source is preserved as:

```text
finance_panel_spend_runtime_source_v1()
```

This source remains the build/proof/fallback source. It is not removed.

## Public Panel Hookup

`director_finance_panel_scope_v4` should no longer contain the old raw spend source chain:

```text
proposal_scope_for_spend
request_identity_for_spend
purchase_scope_for_spend
spend_base from v_director_finance_spend_kinds_v3
```

Instead, the public panel delegates spend payload derivation to:

```text
finance_panel_spend_scope_v1(p_object_id, p_date_from, p_date_to)
```

That helper chooses:

```text
finance_panel_spend_projection_v1
  if projection metadata says rebuild success
otherwise
  finance_panel_spend_runtime_source_v1()
```

## Projection Fields

| Projection field | Source |
| --- | --- |
| `projection_row_no` | rebuild row number |
| `kind_name` | normalized runtime source kind |
| `supplier_name` | normalized runtime source supplier |
| `proposal_id` | normalized runtime source proposal id |
| `proposal_no` | normalized runtime source proposal number |
| `object_id` | enriched object id |
| `object_code` | enriched object code |
| `object_name` | enriched object name |
| `director_approved_date` | `v_director_finance_spend_kinds_v3.director_approved_at::date` |
| `approved_alloc` | current runtime money value |
| `paid_alloc` | current runtime money value |
| `overpay_alloc` | current runtime money value |
| `projection_version` | `1` |
| `rebuilt_at` | rebuild timestamp |

## Money Semantics

Money values are not recalculated differently.

The projection stores the same numeric values produced by the old runtime source:

- `approved_alloc`
- `paid_alloc`
- `overpay_alloc`

All existing aggregate formulas remain identical:

- spend header approved: sum `approved_alloc`
- spend header paid: sum `paid_alloc`
- spend header overpay: sum `overpay_alloc`
- spend header toPay: sum per-proposal `greatest(sum(approved_alloc) - sum(paid_alloc), 0)`
- kind toPay: `greatest(sum(approved) - sum(paid), 0)`

## Fallback Contract

Fallback is preserved.

If `finance_panel_spend_projection_meta_v1` has no successful rebuild for projection version 1, `finance_panel_spend_scope_v1` uses `finance_panel_spend_runtime_source_v1()`.

This means F3.2 does not remove the old truth/proof path.

## Proof Contract

Add helper:

```text
finance_panel_spend_drift_check_v1(p_object_id, p_date_from, p_date_to)
```

It compares:

```text
projection spend snapshot == runtime spend snapshot
```

Required result for GREEN:

```text
diff_count = 0
is_drift_free = true
```

## CPU Proof

Add helper:

```text
finance_panel_spend_f3_2_cpu_proof_v1()
```

It must prove:

- `director_finance_panel_scope_v4` no longer directly contains `v_director_finance_spend_kinds_v3`
- the panel reads `finance_panel_spend_scope_v1`
- the runtime source helper still exists
- the projection table exists

## Exact Next Slice

F3.2.2 should implement only this mapping. Supplier detail and PDF/export stay untouched.
