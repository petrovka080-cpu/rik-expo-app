# Identity Target Map

Date: 2026-03-30  
Scope: Wave 1D - Identity Solidification

## Construction Object

- Canonical identity source:
  - `public.ref_object_types.code`
- Canonical display source:
  - `public.construction_object_identity_lookup_v1.construction_object_name`
- Parent relations:
  - `public.requests.object_type_code -> public.ref_object_types.code`
  - legacy gap path:
    - `public.request_object_identity_shadow_v1.request_id -> construction_object_code`
    - projected via `public.request_object_identity_scope_v1`
- Downstream consumers:
  - `src/lib/api/requestCanonical.read.ts`
  - `src/lib/api/director_reports.context.ts`
  - `src/lib/api/directorReportsScope.service.ts`
  - `src/lib/api/director_reports.service.report.ts`
  - `src/lib/api/director_reports.service.discipline.ts`
- Legacy compatibility notes:
  - `requests.object_name` remains display compatibility only
  - `requests.object_id` remains legacy nullable field and is not the primary owner for current production grouping

## Request Chain

- Canonical identity source:
  - `public.requests.id`
  - `public.request_items.id`
- Parent relations:
  - `public.request_items.request_id -> public.requests.id`
- Downstream consumers:
  - foreman draft and submit boundaries
  - buyer proposal creation via `proposal_items.request_item_id`
  - warehouse/director issue context lookups
- Legacy compatibility notes:
  - no lifecycle semantics changed in Wave 1D
  - object association is read through `request_object_identity_scope_v1`, not guessed from client strings

## Proposal Chain

- Canonical identity source:
  - `public.proposals.id`
  - `public.proposal_items.id`
- Parent relations:
  - `public.proposal_items.proposal_id -> public.proposals.id`
  - `public.proposal_items.request_item_id -> public.request_items.id`
- Downstream consumers:
  - buyer summary/inbox
  - director/accountant downstream linkage
- Legacy compatibility notes:
  - proposal business mutation boundary is already handled in Wave 1B
  - object association should derive through request chain, not material names or supplier buckets

## Finance Identity

- Canonical identity source:
  - `public.purchases.id`
  - `public.proposal_payments.id`
  - `public.proposal_payment_allocations.id`
- Parent relations:
  - `public.purchases.proposal_id -> public.proposals.id`
  - `public.purchases.request_id -> public.requests.id`
  - `public.proposal_payment_allocations.proposal_item_id -> public.proposal_items.id`
- Downstream consumers:
  - accountant financial flows
  - director finance facts
- Legacy compatibility notes:
  - finance object association should derive from linked request/proposal chain
  - finance is not the owner of construction object identity

## Material / Catalog

- Canonical identity source:
  - `public.catalog_items.id`
  - compatibility code source:
    - `catalog_items.rik_code`
    - `request_items.rik_code`
    - `proposal_items.rik_code`
- Parent relations:
  - material rows attach to request/proposal/payment chains but do not define construction object identity
- Downstream consumers:
  - buyer proposal item preparation
  - warehouse/director material naming and pricing
  - PDF material surfaces
- Legacy compatibility notes:
  - `rik_code` remains compatibility join key in existing read models
  - material identity must not be reused as construction object identity

## Stable Read-Side Rule

- Director grouping and request-linked read paths should use:
  - stable construction object key from `request_object_identity_scope_v1`
  - canonical display name from `construction_object_identity_lookup_v1`
- String normalization remains compatibility-only for:
  - unresolved legacy rows
  - deep fallback paths that still lack request-linked stable context

## Explicit Non-Goals

- No UI changes
- No request lifecycle redesign
- No proposal mutation redesign
- No finance semantics redesign
- No early deletion of legacy object display fields
