# F3.2.1 Spend Field Inventory

Mode: design/inventory for one execution slice. Scope is only the spend section inside `director_finance_panel_scope_v4`.

## Exact Runtime Chain

The current hot chain is:

```text
proposal_scope_for_spend
-> request_identity_for_spend
-> purchase_scope_for_spend
-> spend_base
-> proposal_spend_rows
-> kind_supplier_rows
-> kind_rows
-> spend_header
-> spend_overpay_suppliers
-> supplier_overpay_rows
-> object_overpay_rows
```

F3.2 must only move this spend chain. It must not touch finance supplier/object rollups, invoice rows, panel filters, payment/debt semantics, supplier detail, or PDF/export.

## Source Fields From `v_director_finance_spend_kinds_v3`

| Runtime field | Current expression | Use |
| --- | --- | --- |
| `kind_name` | `coalesce(nullif(trim(v.kind_name), ''), 'Другое')` | Spend grouping and kind row order. |
| `supplier_name` | `coalesce(nullif(trim(v.supplier), ''), pu.supplier_name, '—')` | Supplier grouping and overpay supplier rows. |
| `proposal_id` | `nullif(trim(v.proposal_id::text), '')` | Proposal-level `toPay` cap. |
| `proposal_no` | `nullif(trim(v.proposal_no), '')` | Preserved spend row identity/debug value. |
| `director_approved_date` | `v.director_approved_at::date` | Date filtering. |
| `approved_alloc` | `coalesce(v.approved_alloc, 0)::numeric` | Approved spend total. |
| `paid_alloc` | `coalesce(v.paid_alloc_cap, v.paid_alloc, 0)::numeric` | Paid spend total. |
| `overpay_alloc` | `coalesce(v.overpay_alloc, 0)::numeric` | Overpayment totals. |

## Enrichment Fields

| Field | Current source | Use |
| --- | --- | --- |
| `request_id` | `proposal_items -> request_items` | Joins to object identity. |
| `object_id` | `request_object_identity_scope_v1` or `purchases` | Object filter and object overpay rows. |
| `object_code` | `request_object_identity_scope_v1` | Object overpay key. |
| `object_name` | `request_object_identity_scope_v1`, `purchases`, fallback `Без объекта` | Object overpay key and label. |
| `supplier_name` fallback | `purchases.supplier_name` | Supplier grouping fallback when spend source supplier is blank. |

## Derived Aggregates

| Aggregate | Current rule | Output dependency |
| --- | --- | --- |
| `proposal_spend_rows.to_pay` | Per proposal: `greatest(sum(approved_alloc) - sum(paid_alloc), 0)` | `spend.header.toPay`. |
| `kind_supplier_rows` | Group by `kind_name`, `supplier_name`; sum approved/paid/overpay; count rows | `spend.kindRows[].suppliers`. |
| `kind_rows.to_pay` | Per kind: `greatest(sum(approved) - sum(paid), 0)` | `spend.kindRows[].toPay`. |
| `spend_header.approved` | Sum `approved_alloc` | `spend.header.approved`. |
| `spend_header.paid` | Sum `paid_alloc` | `spend.header.paid`. |
| `spend_header.to_pay` | Sum proposal-level `to_pay` | `spend.header.toPay`. |
| `spend_header.overpay` | Sum `overpay_alloc` | `spend.header.overpay` and `canonical.summary.overpaymentTotal`. |
| `spend_overpay_suppliers` | Group overpay rows by supplier where `overpay_alloc > 0` | `spend.overpaySuppliers`. |
| `supplier_overpay_rows` | `md5(lower(supplier_name))`, sum overpay | Joined into `canonical.suppliers[].overpaymentTotal`. |
| `object_overpay_rows` | Stable object key, sum overpay | Joined into `canonical.objects[].overpaymentTotal`. |

## Fields That Must Not Change

- `approved_alloc`
- `paid_alloc`
- `overpay_alloc`
- proposal-level `toPay` cap
- kind-level `toPay`
- supplier overpay identity: `md5(lower(supplier_name))`
- object key fallback order: `object_code`, `object_id`, `md5(lower(object_name_or_fallback))`
- kind row order
- supplier order inside kind rows
- overpay supplier order
- panel JSON shape

## Runtime Fields Allowed To Stay Runtime

- Date/object filtering can remain runtime over prepared spend rows.
- JSON assembly can remain runtime as long as raw source extraction and joins are not repeated in the public panel.
- Old raw spend source can remain available only as rebuild/proof/fallback source.

## Mojibake Check

No mojibake literal was found in this exact spend section. Mojibake remains a supplier-detail candidate, outside F3.2 scope.
