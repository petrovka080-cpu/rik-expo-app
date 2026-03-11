-- Director Obligations Source Hardening v1 (DRAFT, additive only)
-- Purpose:
--   harden source semantics for v_director_obligations_facts_v1 before any runtime/UI integration.
--
-- Covers:
--   A) subcontract company binding
--   B) subcontract payment linkage status (explicit unsupported state)
--   C) supplier contour dimension quality classification
--
-- Constraints:
--   - no runtime cutover
--   - no legacy path removal
--   - no warehouse fact merge into obligations layer

begin;

create or replace view public.v_director_obligations_facts_v1 as
with proposal_scope as (
  select
    pi.proposal_id::text as proposal_id,
    count(*)::int as linked_request_items_count,
    count(*) filter (where ri.request_id is not null)::int as linked_requests_count,
    count(distinct req.company_id)::int as company_id_distinct_count,
    max(req.company_id)::uuid as company_id_single,
    max(nullif(trim(coalesce(req.object_name, req.object)), '')) as object_name
  from public.proposal_items pi
  left join public.request_items ri
    on ri.id::text = pi.request_item_id::text
  left join public.requests req
    on req.id::text = ri.request_id::text
  group by pi.proposal_id::text
),
subcontract_scope as (
  select
    coalesce(r.subcontract_id, r.contractor_job_id)::text as subcontract_id,
    count(*)::int as linked_requests_count,
    count(distinct r.company_id)::int as company_id_distinct_count,
    max(r.company_id)::uuid as company_id_single,
    max(nullif(trim(coalesce(r.object_name, r.object)), '')) as object_name_from_requests
  from public.requests r
  where coalesce(r.subcontract_id, r.contractor_job_id) is not null
  group by coalesce(r.subcontract_id, r.contractor_job_id)::text
),
finance_supplier_raw as (
  select
    case
      when lower(coalesce(fs.kind_code, fs.kind_name, '')) ~ '(service|услуг)' then 'service_supplier'
      when lower(coalesce(fs.kind_code, fs.kind_name, '')) ~ '(work|работ)' then 'work_supplier'
      else 'material'
    end::text as obligation_type,
    'finance_supplier'::text as source_origin,
    coalesce(nullif(trim(fs.proposal_id::text), ''), md5(row_to_json(fs)::text)) as source_id,
    ps.company_id_single as company_id,
    nullif(trim(fs.supplier), '') as counterparty_name,
    ps.object_name as object_name,
    nullif(trim(coalesce(fs.kind_name, fs.kind_code)), '') as work_or_category,
    greatest(coalesce(fs.approved_alloc, 0)::numeric, 0::numeric) as amount_approved,
    greatest(coalesce(fs.paid_alloc_cap, fs.paid_alloc, 0)::numeric, 0::numeric) as amount_paid,
    greatest(
      coalesce(fs.approved_alloc, 0)::numeric
      - coalesce(fs.paid_alloc_cap, fs.paid_alloc, 0)::numeric,
      0::numeric
    ) as amount_due,
    'approved'::text as status,
    fs.director_approved_at::timestamptz as approved_at,
    coalesce(fs.director_approved_at::timestamptz, now()) as created_at,
    case
      when fs.director_approved_at is null then 'source_empty_approval'
      when coalesce(fs.approved_alloc, 0)::numeric <= 0 then 'source_empty_amount'
      when nullif(trim(fs.supplier), '') is null then 'source_empty_counterparty'
      when ps.proposal_id is null then 'unmappable_no_proposal_scope'
      when ps.linked_requests_count > 0 and nullif(trim(ps.object_name), '') is null then 'propagation_loss_object'
      when ps.linked_requests_count = 0 then 'unmappable_no_request_link'
      when ps.company_id_distinct_count > 1 then 'unmappable_multi_company_scope'
      when ps.company_id_single is null then 'unmappable_missing_company'
      when nullif(trim(ps.object_name), '') is null then 'source_empty_object'
      else 'valid'
    end::text as quality_class,
    case
      when ps.company_id_distinct_count = 1 and ps.company_id_single is not null then 'bound'
      when ps.company_id_distinct_count > 1 then 'multi_company_conflict'
      else 'missing'
    end::text as company_binding_state,
    'supported'::text as payment_link_state
  from public.v_director_finance_spend_kinds_v3 fs
  left join proposal_scope ps
    on ps.proposal_id = fs.proposal_id::text
),
approved_subcontracts_raw as (
  select
    'subcontract'::text as obligation_type,
    'subcontract'::text as source_origin,
    s.id::text as source_id,
    ss.company_id_single as company_id,
    nullif(trim(s.contractor_org), '') as counterparty_name,
    coalesce(nullif(trim(s.object_name), ''), ss.object_name_from_requests) as object_name,
    nullif(trim(s.work_type), '') as work_or_category,
    greatest(coalesce(s.total_price, 0)::numeric, 0::numeric) as amount_approved,
    0::numeric as amount_paid,
    greatest(coalesce(s.total_price, 0)::numeric, 0::numeric) as amount_due,
    s.status::text as status,
    s.approved_at::timestamptz as approved_at,
    coalesce(s.created_at::timestamptz, s.approved_at::timestamptz, now()) as created_at,
    case
      when lower(coalesce(s.status, '')) <> 'approved' then 'source_empty_approval'
      when coalesce(s.total_price, 0)::numeric <= 0 then 'source_empty_amount'
      when nullif(trim(s.contractor_org), '') is null then 'source_empty_counterparty'
      when ss.subcontract_id is null then 'unmappable_no_request_link'
      when ss.company_id_distinct_count > 1 then 'unmappable_multi_company_scope'
      when ss.company_id_single is null then 'unmappable_missing_company'
      when nullif(trim(coalesce(s.object_name, ss.object_name_from_requests)), '') is null then 'source_empty_object'
      else 'valid'
    end::text as quality_class,
    case
      when ss.company_id_distinct_count = 1 and ss.company_id_single is not null then 'bound'
      when ss.company_id_distinct_count > 1 then 'multi_company_conflict'
      else 'missing'
    end::text as company_binding_state,
    'unsupported_no_subcontract_payment_surface'::text as payment_link_state
  from public.subcontracts s
  left join subcontract_scope ss
    on ss.subcontract_id = s.id::text
),
all_rows as (
  select * from finance_supplier_raw
  union all
  select * from approved_subcontracts_raw
)
select
  obligation_type,
  source_origin,
  source_id,
  company_id,
  counterparty_name,
  object_name,
  work_or_category,
  amount_approved,
  amount_paid,
  amount_due,
  status,
  approved_at,
  created_at,
  quality_class,
  company_binding_state,
  payment_link_state
from all_rows
where quality_class = 'valid';

comment on view public.v_director_obligations_facts_v1 is
'Director obligations canonical rows, source-hardened: valid rows only; company binding and payment linkage states are audited in companion view.';

create or replace view public.v_director_obligations_source_audit_v1 as
with base as (
  select * from (
    select * from (
      select
        case
          when lower(coalesce(fs.kind_code, fs.kind_name, '')) ~ '(service|услуг)' then 'service_supplier'
          when lower(coalesce(fs.kind_code, fs.kind_name, '')) ~ '(work|работ)' then 'work_supplier'
          else 'material'
        end::text as obligation_type,
        'finance_supplier'::text as source_origin,
        coalesce(nullif(trim(fs.proposal_id::text), ''), md5(row_to_json(fs)::text)) as source_id,
        nullif(trim(fs.supplier), '') as counterparty_name,
        nullif(trim(coalesce(fs.kind_name, fs.kind_code)), '') as work_or_category,
        greatest(coalesce(fs.approved_alloc, 0)::numeric, 0::numeric) as amount_approved,
        fs.director_approved_at::timestamptz as approved_at,
        ps.linked_requests_count,
        ps.company_id_distinct_count,
        ps.company_id_single,
        ps.object_name
      from public.v_director_finance_spend_kinds_v3 fs
      left join (
        select
          pi.proposal_id::text as proposal_id,
          count(*) filter (where ri.request_id is not null)::int as linked_requests_count,
          count(distinct req.company_id)::int as company_id_distinct_count,
          max(req.company_id)::uuid as company_id_single,
          max(nullif(trim(coalesce(req.object_name, req.object)), '')) as object_name
        from public.proposal_items pi
        left join public.request_items ri
          on ri.id::text = pi.request_item_id::text
        left join public.requests req
          on req.id::text = ri.request_id::text
        group by pi.proposal_id::text
      ) ps
        on ps.proposal_id = fs.proposal_id::text
    ) s
  ) q
),
classified_supplier as (
  select
    obligation_type,
    source_origin,
    case
      when approved_at is null then 'source_empty_approval'
      when amount_approved <= 0 then 'source_empty_amount'
      when counterparty_name is null then 'source_empty_counterparty'
      when linked_requests_count > 0 and object_name is null then 'propagation_loss_object'
      when linked_requests_count = 0 then 'unmappable_no_request_link'
      when company_id_distinct_count > 1 then 'unmappable_multi_company_scope'
      when company_id_single is null then 'unmappable_missing_company'
      when object_name is null then 'source_empty_object'
      when work_or_category is null then 'source_empty_work_or_category'
      else 'valid'
    end::text as quality_class
  from base
),
classified_subcontract as (
  select
    'subcontract'::text as obligation_type,
    'subcontract'::text as source_origin,
    case
      when lower(coalesce(s.status, '')) <> 'approved' then 'source_empty_approval'
      when coalesce(s.total_price, 0)::numeric <= 0 then 'source_empty_amount'
      when nullif(trim(s.contractor_org), '') is null then 'source_empty_counterparty'
      when ss.linked_requests_count is null then 'unmappable_no_request_link'
      when ss.company_id_distinct_count > 1 then 'unmappable_multi_company_scope'
      when ss.company_id_single is null then 'unmappable_missing_company'
      when nullif(trim(coalesce(s.object_name, ss.object_name_from_requests)), '') is null then 'source_empty_object'
      when nullif(trim(s.work_type), '') is null then 'source_empty_work_or_category'
      else 'valid'
    end::text as quality_class
  from public.subcontracts s
  left join (
    select
      coalesce(r.subcontract_id, r.contractor_job_id)::text as subcontract_id,
      count(*)::int as linked_requests_count,
      count(distinct r.company_id)::int as company_id_distinct_count,
      max(r.company_id)::uuid as company_id_single,
      max(nullif(trim(coalesce(r.object_name, r.object)), '')) as object_name_from_requests
    from public.requests r
    where coalesce(r.subcontract_id, r.contractor_job_id) is not null
    group by coalesce(r.subcontract_id, r.contractor_job_id)::text
  ) ss
    on ss.subcontract_id = s.id::text
)
select
  source_origin,
  obligation_type,
  quality_class,
  count(*)::bigint as rows_count
from (
  select * from classified_supplier
  union all
  select * from classified_subcontract
) x
group by source_origin, obligation_type, quality_class
order by source_origin, obligation_type, quality_class;

comment on view public.v_director_obligations_source_audit_v1 is
'Audit view for obligations source quality classes: valid/source-empty/propagation-loss/unmappable.';

create or replace function public.director_report_fetch_obligations_source_audit_v1()
returns jsonb
language sql
stable
as $$
select jsonb_build_object(
  'quality', coalesce((select jsonb_agg(to_jsonb(a)) from public.v_director_obligations_source_audit_v1 a), '[]'::jsonb),
  'notes', jsonb_build_object(
    'subcontract_payment_linkage', 'unsupported_no_subcontract_payment_surface',
    'company_binding', 'derived_from_requests_linkage_only',
    'ui_cutover', 'not_performed'
  )
);
$$;

comment on function public.director_report_fetch_obligations_source_audit_v1() is
'Returns source-quality audit for director obligations hardening. No runtime integration implied.';

commit;

