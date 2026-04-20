# PDF-Z0.4 Freshness / Invalidation Model

Status: GREEN audit artifact.

Baseline: `a105e8738e55d4a81f20c1031e5c1b1147578fc8`

Mode: design only. No computation, SQL, template, or runtime behavior was changed.

## Source Version Rule

`source_version` must be derived only from business-significant inputs that affect PDF content.

Include:

- selected document entity or report scope
- period/date filters
- object/work/material/supplier/kind filters
- source rows and reference labels that appear in the PDF
- totals/groupings/ordering inputs
- visible company/generated-by metadata if printed
- template and render contract versions through `artifact_version`

Exclude:

- random request IDs
- signed URL expiry
- local loading/busy state
- transport retry metadata
- `generated_at` when it is only operational noise and not printed as content
- cache timestamps that do not affect visible PDF content

## Artifact Version Rule

`artifact_version = hash(source_version + template_version + render_contract_version + artifact_cache_contract_version)`

A signed URL refresh must not change `artifact_version`. A template change must change `artifact_version` even when `source_version` is identical.

## Invalidation Matrix

| PDF family | Source version inputs | Invalidation triggers | Rebuild policy |
| --- | --- | --- | --- |
| Director finance management | finance source payload, period/scope filters, visible company/generated-by policy, spend kind/supplier/reference labels, management template version | finance fact mutation, payment mutation, spend kind/supplier label mutation, scope/date change, template/render contract change | Tier 1: background or lazy stale-read build, deterministic artifact reuse, manifest required |
| Director finance supplier summary | finance source payload plus supplier/kind filters, supplier labels, summary template version | same finance triggers plus supplier/kind scoped changes | Tier 2 initially, Tier 1 if usage proves hot |
| Director production report | normalized request, authoritative production source payload, period/object/price stage, template/cache contract | production material/work/report fact change, object/date/price stage change, template/render/cache contract change | Already deterministic artifact after PDF-X.B1; add manifest/prewarm next |
| Director subcontract report | subcontract source payload, period/object/contractor scope, contractor/reference labels, template version | subcontract rows, object/date filters, contractor/reference label changes, template/render contract change | Tier 2/Tier 1 depending usage; deterministic artifact needed before manifest |
| Warehouse material reports | issue/incoming/material movement rows, period/day/object/material scope, warehouse/company/generated-by labels, template version | warehouse incoming/issue/material fact mutation in selected scope, reference label mutation, date/object/material filter change, template/render contract change | Tier 1 for period reports; day reports may stay Tier 2 |
| Warehouse object-work report | object/work/material movement rows, object/work/date scope, labels, template version | object/work/material fact mutation, object/work/date filter change, reference label mutation, template/render contract change | Tier 1 |
| Warehouse registers | incoming/issue register rows by day/period, warehouse/company labels, template version | issue/incoming fact mutation in selected day/period, label mutation, template change | Tier 2 summary-first; artifact optional |
| Warehouse single forms | one issue/incoming document header/lines, labels, template version | document header/line mutation, label mutation, template change | Tier 3 on demand unless hot |
| Foreman request | request header/items, reference labels, company/foreman visible metadata, template version | request header/item mutation, reference label mutation, template change | Tier 3 on demand |
| Proposal shared family | proposal header/items, request/request_items, supplier/catalog/reference labels, visible metadata, template version | proposal or proposal_items mutation, request item source mutation, supplier/catalog/reference label mutation, template change | Tier 2 summary-first |
| Accountant payment order | `pdf_payment_source_v1` payload, payment/proposal/allocation/bill/attachment visible data, template version | payment/order mutation, allocations or bill source mutation, attachment metadata change, template change | Tier 2; artifact optional |
| Contractor act/history | contractor work source payload, work log/material rows, catalog labels, subcontract/header data, template version | work progress/material/log mutation, catalog/reference label change, template change | Tier 2; make RPC source authoritative before artifact |
| Reports dashboard export | report dashboard result rows and selected report parameters | user reruns report, report parameters change, underlying saved report source changes if persisted later | Tier 3 on demand because source is already loaded |
| Remote attachment PDF | attachment URL/path/version metadata | attachment replacement/removal | No rebuild; storage lifecycle only |

## Rebuild Policies

### Tier 1 - always-prebuilt

Use for heavy, repeated, report-scale PDFs. Policy:

- manifest exists for the current scope
- backend computes source version from authoritative source/projection
- if artifact missing or stale, build in background or lazy stale-read
- user click opens `ready` artifact or enters bounded `building` state
- stale artifact is not labeled fresh forever

### Tier 2 - summary-first

Use when source aggregation is heavier than rendering, but artifact does not need to be permanently prebuilt. Policy:

- source/projection summary has version and `computed_at`
- PDF can be built quickly from summary on demand
- optional short artifact reuse is allowed only with source/template version

### Tier 3 - on-demand acceptable

Use for small or rare single-entity documents. Policy:

- no durable manifest required
- current backend/local render can remain
- revisit only with production telemetry showing hot repeated opens or large payloads

## Anti-Patterns To Avoid

- Rebuilding every PDF on every data mutation without a tier policy.
- Serving a cached PDF by TTL alone.
- Treating signed URL freshness as document freshness.
- Hashing non-content noise into `source_version`.
- Putting business totals into a manifest as a second source of truth.
- Refactoring the viewer before source/render lifecycle is fixed.
