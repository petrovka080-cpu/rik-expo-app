begin;

create index if not exists idx_fps_v1_supplier_scope_v2
  on public.finance_proposal_summary_v1 (
    (coalesce(nullif(lower(btrim(coalesce(supplier_name, ''))), ''), U&'\2014')),
    object_id,
    approved_date
  );

analyze public.finance_proposal_summary_v1;

create or replace function public.director_finance_supplier_scope_v2_summary_v1(
  p_supplier text,
  p_kind_name text default null,
  p_object_id uuid default null,
  p_from date default null,
  p_to date default null,
  p_due_days integer default 7,
  p_critical_days integer default 14
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with params as (
  select
    coalesce(nullif(btrim(p_supplier), ''), U&'\2014')::text as supplier_name,
    coalesce(nullif(lower(btrim(coalesce(p_supplier, ''))), ''), U&'\2014')::text as supplier_key,
    nullif(btrim(coalesce(p_kind_name, '')), '')::text as kind_name,
    case
      when coalesce(p_due_days, 7) = 0 then 7
      else coalesce(p_due_days, 7)
    end::integer as due_days,
    case
      when coalesce(p_critical_days, 14) = 0 then 14
      else coalesce(p_critical_days, 14)
    end::integer as critical_days
),
kind_scope_proposals as (
  select
    nullif(btrim(v.proposal_id::text), '')::text as proposal_id
  from public.v_director_finance_spend_kinds_v3 v
  cross join params p
  where p.kind_name is not null
    and coalesce(nullif(lower(btrim(coalesce(v.supplier, ''))), ''), U&'\2014') = p.supplier_key
    and coalesce(nullif(btrim(v.kind_name), ''), U&'\0414\0440\0443\0433\043e\0435') = p.kind_name
    and (p_from is null or v.director_approved_at::date >= p_from)
    and (p_to is null or v.director_approved_at::date <= p_to)
    and v.proposal_id is not null
  group by nullif(btrim(v.proposal_id::text), '')
),
summary_rows as (
  select
    fps.proposal_id,
    fps.proposal_no,
    fps.invoice_number,
    fps.amount_total::numeric as amount,
    fps.amount_paid::numeric as paid,
    fps.amount_debt::numeric as rest,
    fps.approved_date,
    fps.invoice_date,
    coalesce(
      fps.due_date,
      case
        when coalesce(fps.invoice_date, fps.approved_date) is null then null
        else coalesce(fps.invoice_date, fps.approved_date) + (select due_days from params)
      end
    ) as due_date
  from public.finance_proposal_summary_v1 fps
  cross join params p
  where coalesce(nullif(lower(btrim(coalesce(fps.supplier_name, ''))), ''), U&'\2014') = p.supplier_key
    and (
      fps.approved_date is null
      or (
        (p_from is null or fps.approved_date >= p_from)
        and (p_to is null or fps.approved_date <= p_to)
      )
    )
    and (
      p.kind_name is null
      or exists(
        select 1
        from kind_scope_proposals ksp
        where ksp.proposal_id = fps.proposal_id
      )
    )
),
summary_classified as (
  select
    sr.*,
    (
      sr.rest > 0
      and sr.due_date is not null
      and sr.due_date <= current_date
    ) as is_overdue,
    (
      sr.rest > 0
      and sr.due_date is not null
      and sr.due_date <= current_date
      and (current_date - sr.due_date) >= (select critical_days from params)
    ) as is_critical
  from summary_rows sr
),
invoice_rows as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', concat_ws(
          '|',
          coalesce(proposal_id, ''),
          coalesce(invoice_number, ''),
          coalesce(invoice_date::text, ''),
          coalesce(approved_date::text, '')
        ),
        'title', case
          when invoice_number is not null then concat(U&'\0421\0447\0451\0442 \2116', invoice_number)
          when proposal_no is not null then concat(U&'\041F\0440\0435\0434\043B\043E\0436\0435\043D\0438\0435 ', proposal_no)
          when proposal_id is not null then concat(U&'\041F\0440\0435\0434\043B\043E\0436\0435\043D\0438\0435 #', left(proposal_id, 8))
          else U&'\0421\0447\0451\0442'
        end,
        'amount', amount,
        'paid', paid,
        'rest', rest,
        'isOverdue', is_overdue,
        'isCritical', is_critical,
        'approvedIso', approved_date::text,
        'invoiceIso', invoice_date::text,
        'dueIso', due_date::text
      )
      order by
        is_overdue desc,
        due_date asc nulls last,
        invoice_date asc nulls last,
        proposal_id asc nulls last
    ),
    '[]'::jsonb
  ) as value
  from summary_classified
  where amount > 0 or rest > 0
),
summary_row as (
  select
    coalesce(sum(rest), 0)::numeric as amount,
    count(*) filter (where rest > 0)::integer as count,
    count(*) filter (where is_overdue and rest > 0)::integer as overdue_count,
    count(*) filter (where is_critical and rest > 0)::integer as critical_count
  from summary_classified
),
overpayment_row as (
  select
    coalesce(sum(fps.spend_overpay), 0)::numeric as overpayment
  from public.finance_proposal_summary_v1 fps
  cross join params p
  where coalesce(nullif(lower(btrim(coalesce(fps.supplier_name, ''))), ''), U&'\2014') = p.supplier_key
    and (
      fps.approved_date is null
      or (
        (p_from is null or fps.approved_date >= p_from)
        and (p_to is null or fps.approved_date <= p_to)
      )
    )
    and (
      p_object_id is null
      or fps.object_id = p_object_id::text
    )
    and (
      p.kind_name is null
      or exists(
        select 1
        from kind_scope_proposals ksp
        where ksp.proposal_id = fps.proposal_id
      )
    )
)
select jsonb_build_object(
  'document_type', 'director_finance_supplier_scope',
  'version', 'v2',
  'supplierId', md5(lower((select supplier_name from params))),
  'supplierName', (select supplier_name from params),
  'kindName', (select kind_name from params),
  'amount', summary_row.amount,
  'count', summary_row.count,
  'approved', summary_row.amount,
  'paid', 0,
  'toPay', summary_row.amount,
  'overpayment', overpayment_row.overpayment,
  'overdueCount', summary_row.overdue_count,
  'criticalCount', summary_row.critical_count,
  'summary', jsonb_build_object(
    'payable', summary_row.amount,
    'paid', 0,
    'debt', summary_row.amount,
    'overpayment', overpayment_row.overpayment,
    'invoiceCount', summary_row.count,
    'overdueCount', summary_row.overdue_count,
    'criticalCount', summary_row.critical_count
  ),
  'invoices', invoice_rows.value,
  'meta', jsonb_build_object(
    'owner', 'backend',
    'generatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'filtersEcho', jsonb_build_object(
      'supplier', (select supplier_name from params),
      'kindName', (select kind_name from params),
      'objectId', p_object_id::text,
      'dateFrom', p_from,
      'dateTo', p_to,
      'dueDays', (select due_days from params),
      'criticalDays', (select critical_days from params)
    ),
    'sourceVersion', 'director_finance_supplier_scope_v2',
    'financeRowsSource', 'finance_proposal_summary_v1',
    'overpaymentSource', 'finance_proposal_summary_v1.spend_overpay',
    'kindScopeSource', case
      when (select kind_name from params) is null then 'none'
      else 'v_director_finance_spend_kinds_v3:proposal_filter'
    end,
    'pathOwner', 'summary',
    'payloadShapeVersion', 'v2'
  )
)
from summary_row
cross join invoice_rows
cross join overpayment_row;
$$;

comment on function public.director_finance_supplier_scope_v2_summary_v1(text, text, uuid, date, date, integer, integer) is
'S6 summary-backed supplier scope helper. Uses finance_proposal_summary_v1 for the normal dueDays=7 runtime path while preserving v2 payload semantics and kind-filter proposal gating.';

grant execute on function public.director_finance_supplier_scope_v2_summary_v1(text, text, uuid, date, date, integer, integer) to authenticated;

create or replace function public.director_finance_supplier_scope_v2_legacy_v1(
  p_supplier text,
  p_kind_name text default null,
  p_object_id uuid default null,
  p_from date default null,
  p_to date default null,
  p_due_days integer default 7,
  p_critical_days integer default 14
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with proposal_scope as (
  select
    pi.proposal_id::text as proposal_id,
    max(req.object_id::text) as object_id
  from public.proposal_items pi
  left join public.request_items ri
    on ri.id::text = pi.request_item_id::text
  left join public.requests req
    on req.id::text = ri.request_id::text
  group by pi.proposal_id::text
),
purchase_scope as (
  select
    p.proposal_id::text as proposal_id,
    max(p.object_id::text) as object_id,
    max(p.supplier_id::text) as supplier_id
  from public.purchases p
  where p.proposal_id is not null
  group by p.proposal_id::text
),
legacy_payload as (
  select public.director_finance_supplier_scope_v1(
    p_supplier => p_supplier,
    p_kind_name => p_kind_name,
    p_from => p_from,
    p_to => p_to,
    p_due_days => p_due_days,
    p_critical_days => p_critical_days
  ) as value
),
spend_scope as (
  select
    coalesce(v.overpay_alloc, 0)::numeric as overpay_alloc
  from public.v_director_finance_spend_kinds_v3 v
  left join proposal_scope ps
    on ps.proposal_id = nullif(trim(v.proposal_id::text), '')
  left join purchase_scope pu
    on pu.proposal_id = nullif(trim(v.proposal_id::text), '')
  where coalesce(nullif(trim(v.supplier), ''), U&'\2014') = coalesce(nullif(trim(p_supplier), ''), U&'\2014')
    and (
      nullif(trim(coalesce(p_kind_name, '')), '') is null
      or coalesce(nullif(trim(v.kind_name), ''), U&'\0414\0440\0443\0433\043e\0435') = nullif(trim(coalesce(p_kind_name, '')), '')
    )
    and (p_from is null or v.director_approved_at::date >= p_from)
    and (p_to is null or v.director_approved_at::date <= p_to)
    and (
      p_object_id is null
      or coalesce(ps.object_id, pu.object_id) = p_object_id::text
    )
),
overpay_row as (
  select coalesce(sum(overpay_alloc), 0)::numeric as overpayment
  from spend_scope
)
select jsonb_build_object(
  'document_type', 'director_finance_supplier_scope',
  'version', 'v2',
  'supplierId', md5(lower(coalesce(nullif(trim(p_supplier), ''), U&'\2014'))),
  'supplierName', coalesce(nullif(trim(legacy_payload.value ->> 'supplier'), ''), coalesce(nullif(trim(p_supplier), ''), U&'\2014')),
  'kindName', nullif(trim(coalesce(p_kind_name, '')), ''),
  'amount', coalesce((legacy_payload.value ->> 'amount')::numeric, 0),
  'count', coalesce((legacy_payload.value ->> 'count')::integer, 0),
  'approved', coalesce((legacy_payload.value ->> 'approved')::numeric, 0),
  'paid', coalesce((legacy_payload.value ->> 'paid')::numeric, 0),
  'toPay', coalesce((legacy_payload.value ->> 'toPay')::numeric, 0),
  'overpayment', coalesce((select overpayment from overpay_row), 0),
  'overdueCount', coalesce((legacy_payload.value ->> 'overdueCount')::integer, 0),
  'criticalCount', coalesce((legacy_payload.value ->> 'criticalCount')::integer, 0),
  'summary', jsonb_build_object(
    'payable', coalesce((legacy_payload.value ->> 'approved')::numeric, 0),
    'paid', coalesce((legacy_payload.value ->> 'paid')::numeric, 0),
    'debt', coalesce((legacy_payload.value ->> 'toPay')::numeric, 0),
    'overpayment', coalesce((select overpayment from overpay_row), 0),
    'invoiceCount', coalesce((legacy_payload.value ->> 'count')::integer, 0),
    'overdueCount', coalesce((legacy_payload.value ->> 'overdueCount')::integer, 0),
    'criticalCount', coalesce((legacy_payload.value ->> 'criticalCount')::integer, 0)
  ),
  'invoices', coalesce(legacy_payload.value -> 'invoices', '[]'::jsonb),
  'meta', jsonb_build_object(
    'owner', 'backend',
    'generatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'filtersEcho', jsonb_build_object(
      'supplier', coalesce(nullif(trim(p_supplier), ''), U&'\2014'),
      'kindName', nullif(trim(coalesce(p_kind_name, '')), ''),
      'objectId', p_object_id::text,
      'dateFrom', p_from,
      'dateTo', p_to,
      'dueDays', case when coalesce(p_due_days, 7) = 0 then 7 else coalesce(p_due_days, 7) end,
      'criticalDays', case when coalesce(p_critical_days, 14) = 0 then 14 else coalesce(p_critical_days, 14) end
    ),
    'sourceVersion', 'director_finance_supplier_scope_v2',
    'financeRowsSource', 'legacy:director_finance_supplier_scope_v1',
    'overpaymentSource', 'v_director_finance_spend_kinds_v3',
    'kindScopeSource', case
      when nullif(trim(coalesce(p_kind_name, '')), '') is null then 'none'
      else 'v_director_finance_spend_kinds_v3:proposal_filter'
    end,
    'pathOwner', 'legacy',
    'payloadShapeVersion', 'v2'
  )
)
from legacy_payload;
$$;

comment on function public.director_finance_supplier_scope_v2_legacy_v1(text, text, uuid, date, date, integer, integer) is
'S6 legacy supplier scope helper. Preserves the existing raw v2 behavior for fallback and non-default dueDays calls.';

grant execute on function public.director_finance_supplier_scope_v2_legacy_v1(text, text, uuid, date, date, integer, integer) to authenticated;

create or replace function public.director_finance_supplier_scope_v2(
  p_supplier text,
  p_kind_name text default null,
  p_object_id uuid default null,
  p_from date default null,
  p_to date default null,
  p_due_days integer default 7,
  p_critical_days integer default 14
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with summary_available as (
  select
    exists(select 1 from public.finance_proposal_summary_v1 limit 1)
    and (
      case
        when coalesce(p_due_days, 7) = 0 then 7
        else coalesce(p_due_days, 7)
      end
    ) = 7 as use_summary
)
select case
  when (select use_summary from summary_available)
    then public.director_finance_supplier_scope_v2_summary_v1(
      p_supplier => p_supplier,
      p_kind_name => p_kind_name,
      p_object_id => p_object_id,
      p_from => p_from,
      p_to => p_to,
      p_due_days => p_due_days,
      p_critical_days => p_critical_days
    )
  else public.director_finance_supplier_scope_v2_legacy_v1(
    p_supplier => p_supplier,
    p_kind_name => p_kind_name,
    p_object_id => p_object_id,
    p_from => p_from,
    p_to => p_to,
    p_due_days => p_due_days,
    p_critical_days => p_critical_days
  )
end;
$$;

comment on function public.director_finance_supplier_scope_v2(text, text, uuid, date, date, integer, integer) is
'S6 hardened director finance supplier scope v2. Uses finance_proposal_summary_v1 on the normal dueDays=7 runtime path and preserves legacy fallback for empty summary or custom dueDays calls.';

grant execute on function public.director_finance_supplier_scope_v2(text, text, uuid, date, date, integer, integer) to authenticated;

notify pgrst, 'reload schema';

commit;
