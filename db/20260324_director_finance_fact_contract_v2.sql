begin;

create or replace function public.director_finance_summary_v2(
  p_object_id uuid default null,
  p_date_from date default null,
  p_date_to date default null
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
    min(ri.request_id::text) filter (where ri.request_id is not null) as request_id,
    max(req.object_id::text) as object_id,
    max(nullif(trim(coalesce(req.object_name, req.object)), '')) as object_name
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
    max(nullif(trim(p.object_name), '')) as object_name,
    max(p.supplier_id::text) as supplier_id,
    max(nullif(trim(p.supplier), '')) as supplier_name
  from public.purchases p
  where p.proposal_id is not null
  group by p.proposal_id::text
),
base as (
  select
    coalesce(
      nullif(trim(coalesce(src.row_json ->> 'proposal_id', src.row_json ->> 'proposalId')), ''),
      nullif(trim(coalesce(src.row_json ->> 'id', '')), '')
    ) as request_id,
    coalesce(
      nullif(trim(coalesce(src.row_json ->> 'proposal_id', src.row_json ->> 'proposalId')), ''),
      nullif(trim(coalesce(src.row_json ->> 'id', '')), '')
    ) as proposal_id,
    coalesce(
      nullif(trim(src.row_json ->> 'request_id'), ''),
      ps.request_id
    ) as linked_request_id,
    coalesce(
      nullif(trim(src.row_json ->> 'object_id'), ''),
      ps.object_id,
      pu.object_id
    ) as object_id,
    coalesce(
      nullif(trim(src.row_json ->> 'supplier_id'), ''),
      pu.supplier_id,
      md5(lower(coalesce(nullif(trim(src.row_json ->> 'supplier'), ''), pu.supplier_name, '—')))
    ) as supplier_id,
    coalesce(
      nullif(trim(src.row_json ->> 'supplier'), ''),
      pu.supplier_name,
      '—'
    ) as supplier_name,
    coalesce(nullif(trim(src.row_json ->> 'invoice_number'), ''), nullif(trim(src.row_json ->> 'invoiceNumber'), '')) as invoice_number,
    coalesce(nullif(trim(src.row_json ->> 'proposal_no'), ''), nullif(trim(src.row_json ->> 'pretty'), '')) as proposal_no,
    coalesce(nullif(trim(src.row_json ->> 'invoice_amount'), '')::numeric, 0)::numeric as amount_total,
    coalesce(nullif(trim(src.row_json ->> 'total_paid'), '')::numeric, 0)::numeric as amount_paid,
    greatest(
      coalesce(nullif(trim(src.row_json ->> 'invoice_amount'), '')::numeric, 0)
      - coalesce(nullif(trim(src.row_json ->> 'total_paid'), '')::numeric, 0),
      0
    )::numeric as amount_debt,
    coalesce(
      nullif(trim(src.row_json ->> 'director_approved_at'), '')::timestamptz::date,
      nullif(trim(src.row_json ->> 'approved_at'), '')::timestamptz::date,
      nullif(trim(src.row_json ->> 'sent_to_accountant_at'), '')::timestamptz::date,
      nullif(trim(src.row_json ->> 'invoice_date'), '')::date
    ) as approved_date,
    coalesce(
      nullif(trim(src.row_json ->> 'invoice_date'), '')::date,
      nullif(trim(src.row_json ->> 'invoiceDate'), '')::date
    ) as invoice_date,
    coalesce(
      nullif(trim(src.row_json ->> 'due_date'), '')::date,
      (
        coalesce(
          nullif(trim(src.row_json ->> 'invoice_date'), '')::date,
          nullif(trim(src.row_json ->> 'invoiceDate'), '')::date,
          nullif(trim(src.row_json ->> 'director_approved_at'), '')::timestamptz::date,
          nullif(trim(src.row_json ->> 'approved_at'), '')::timestamptz::date,
          nullif(trim(src.row_json ->> 'sent_to_accountant_at'), '')::timestamptz::date
        ) + 7
      )
    ) as due_date
  from public.list_accountant_inbox_fact(null) as src(row_json)
  left join proposal_scope ps
    on ps.proposal_id = nullif(trim(coalesce(src.row_json ->> 'proposal_id', src.row_json ->> 'proposalId')), '')
  left join purchase_scope pu
    on pu.proposal_id = nullif(trim(coalesce(src.row_json ->> 'proposal_id', src.row_json ->> 'proposalId')), '')
),
filtered as (
  select
    b.*,
    (b.amount_paid > 0 and b.amount_debt > 0) as is_partial,
    (b.amount_debt > 0 and b.due_date is not null and b.due_date < current_date) as is_overdue,
    case
      when b.amount_debt > 0 and b.due_date is not null and b.due_date < current_date
        then (current_date - b.due_date)::integer
      else null::integer
    end as overdue_days
  from base b
  where (p_object_id is null or b.object_id = p_object_id::text)
    and (
      b.approved_date is null
      or (
        (p_date_from is null or b.approved_date >= p_date_from)
        and (p_date_to is null or b.approved_date <= p_date_to)
      )
    )
),
classified as (
  select
    f.*,
    (f.is_overdue and coalesce(f.overdue_days, 0) >= 14) as is_critical
  from filtered f
),
summary_row as (
  select
    coalesce(sum(amount_total), 0)::numeric as total_amount,
    coalesce(sum(amount_paid), 0)::numeric as total_paid,
    coalesce(sum(amount_debt), 0)::numeric as total_debt,
    coalesce(sum(amount_debt) filter (where is_overdue), 0)::numeric as overdue_amount,
    coalesce(sum(amount_paid) filter (where is_partial), 0)::numeric as partial_paid,
    count(*) filter (where is_overdue)::integer as overdue_count,
    count(*) filter (where is_critical)::integer as critical_count,
    coalesce(sum(amount_debt) filter (where is_critical), 0)::numeric as critical_amount,
    count(*) filter (where is_partial)::integer as partial_count,
    count(*) filter (where amount_debt > 0)::integer as debt_count
  from classified
),
supplier_rows as (
  select
    supplier_id,
    max(supplier_name)::text as supplier_name,
    count(*)::integer as count,
    coalesce(sum(amount_total), 0)::numeric as approved,
    coalesce(sum(amount_paid), 0)::numeric as paid,
    coalesce(sum(amount_debt), 0)::numeric as debt,
    count(*) filter (where is_overdue)::integer as overdue_count,
    count(*) filter (where is_critical)::integer as critical_count
  from classified
  group by supplier_id
)
select jsonb_build_object(
  'document_type', 'director_finance_summary',
  'version', 'v2',
  'total_amount', coalesce((select total_amount from summary_row), 0),
  'total_paid', coalesce((select total_paid from summary_row), 0),
  'total_debt', coalesce((select total_debt from summary_row), 0),
  'overdue_amount', coalesce((select overdue_amount from summary_row), 0),
  'by_supplier', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'supplier_id', sr.supplier_id,
          'supplier_name', sr.supplier_name,
          'debt', sr.debt
        )
        order by sr.debt desc, sr.supplier_name asc
      )
      from supplier_rows sr
    ),
    '[]'::jsonb
  ),
  'legacy_summary', jsonb_build_object(
    'approved', coalesce((select total_amount from summary_row), 0),
    'paid', coalesce((select total_paid from summary_row), 0),
    'partialPaid', coalesce((select partial_paid from summary_row), 0),
    'toPay', coalesce((select total_debt from summary_row), 0),
    'overdueCount', coalesce((select overdue_count from summary_row), 0),
    'overdueAmount', coalesce((select overdue_amount from summary_row), 0),
    'criticalCount', coalesce((select critical_count from summary_row), 0),
    'criticalAmount', coalesce((select critical_amount from summary_row), 0),
    'partialCount', coalesce((select partial_count from summary_row), 0),
    'debtCount', coalesce((select debt_count from summary_row), 0)
  ),
  'legacy_report', jsonb_build_object(
    'suppliers', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'supplier', sr.supplier_name,
            'count', sr.count,
            'approved', sr.approved,
            'paid', sr.paid,
            'toPay', sr.debt,
            'overdueCount', sr.overdue_count,
            'criticalCount', sr.critical_count
          )
          order by sr.debt desc, sr.supplier_name asc
        )
        from supplier_rows sr
      ),
      '[]'::jsonb
    )
  ),
  'meta', jsonb_build_object(
    'rows_source', 'list_accountant_inbox_fact',
    'purchase_scope_source', 'purchases',
    'proposal_scope_source', 'proposal_items/request_items/requests',
    'payload_shape_version', 'v2'
  )
);
$$;

comment on function public.director_finance_summary_v2(uuid, date, date) is
'Director finance summary v2. Moves supplier debt grouping, totals, overdue/critical math, and object-scoped filtering to backend while preserving current finance UI shape through legacy_summary and legacy_report fields.';

grant execute on function public.director_finance_summary_v2(uuid, date, date) to authenticated;

create or replace function public.director_finance_panel_scope_v2(
  p_object_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with normalized_args as (
  select
    greatest(coalesce(p_limit, 50), 1)::integer as limit_value,
    greatest(coalesce(p_offset, 0), 0)::integer as offset_value
),
summary_payload as (
  select public.director_finance_summary_v2(
    p_object_id => p_object_id,
    p_date_from => p_date_from,
    p_date_to => p_date_to
  ) as value
),
legacy_panel_payload as (
  select public.director_finance_panel_scope_v1(
    p_from => p_date_from,
    p_to => p_date_to,
    p_due_days => 7,
    p_critical_days => 14
  ) as value
),
proposal_scope as (
  select
    pi.proposal_id::text as proposal_id,
    min(ri.request_id::text) filter (where ri.request_id is not null) as request_id,
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
    max(p.supplier_id::text) as supplier_id,
    max(nullif(trim(p.supplier), '')) as supplier_name
  from public.purchases p
  where p.proposal_id is not null
  group by p.proposal_id::text
),
base as (
  select
    coalesce(
      nullif(trim(src.row_json ->> 'request_id'), ''),
      ps.request_id
    ) as request_id,
    coalesce(
      nullif(trim(src.row_json ->> 'object_id'), ''),
      ps.object_id,
      pu.object_id
    ) as object_id,
    coalesce(
      nullif(trim(src.row_json ->> 'supplier_id'), ''),
      pu.supplier_id,
      md5(lower(coalesce(nullif(trim(src.row_json ->> 'supplier'), ''), pu.supplier_name, '—')))
    ) as supplier_id,
    coalesce(
      nullif(trim(src.row_json ->> 'supplier'), ''),
      pu.supplier_name,
      '—'
    ) as supplier_name,
    nullif(trim(coalesce(src.row_json ->> 'proposal_id', src.row_json ->> 'proposalId')), '') as proposal_id,
    coalesce(nullif(trim(src.row_json ->> 'invoice_number'), ''), nullif(trim(src.row_json ->> 'invoiceNumber'), '')) as invoice_number,
    coalesce(nullif(trim(src.row_json ->> 'invoice_amount'), '')::numeric, 0)::numeric as amount_total,
    coalesce(nullif(trim(src.row_json ->> 'total_paid'), '')::numeric, 0)::numeric as amount_paid,
    greatest(
      coalesce(nullif(trim(src.row_json ->> 'invoice_amount'), '')::numeric, 0)
      - coalesce(nullif(trim(src.row_json ->> 'total_paid'), '')::numeric, 0),
      0
    )::numeric as amount_debt,
    coalesce(
      nullif(trim(src.row_json ->> 'director_approved_at'), '')::timestamptz::date,
      nullif(trim(src.row_json ->> 'approved_at'), '')::timestamptz::date,
      nullif(trim(src.row_json ->> 'sent_to_accountant_at'), '')::timestamptz::date,
      nullif(trim(src.row_json ->> 'invoice_date'), '')::date
    ) as approved_date,
    coalesce(
      nullif(trim(src.row_json ->> 'due_date'), '')::date,
      (
        coalesce(
          nullif(trim(src.row_json ->> 'invoice_date'), '')::date,
          nullif(trim(src.row_json ->> 'invoiceDate'), '')::date,
          nullif(trim(src.row_json ->> 'director_approved_at'), '')::timestamptz::date,
          nullif(trim(src.row_json ->> 'approved_at'), '')::timestamptz::date,
          nullif(trim(src.row_json ->> 'sent_to_accountant_at'), '')::timestamptz::date
        ) + 7
      )
    ) as due_date
  from public.list_accountant_inbox_fact(null) as src(row_json)
  left join proposal_scope ps
    on ps.proposal_id = nullif(trim(coalesce(src.row_json ->> 'proposal_id', src.row_json ->> 'proposalId')), '')
  left join purchase_scope pu
    on pu.proposal_id = nullif(trim(coalesce(src.row_json ->> 'proposal_id', src.row_json ->> 'proposalId')), '')
),
filtered as (
  select
    b.*,
    (b.amount_debt > 0 and b.due_date is not null and b.due_date < current_date) as is_overdue,
    case
      when b.amount_debt > 0 and b.due_date is not null and b.due_date < current_date
        then (current_date - b.due_date)::integer
      else null::integer
    end as overdue_days
  from base b
  where (p_object_id is null or b.object_id = p_object_id::text)
    and (
      b.approved_date is null
      or (
        (p_date_from is null or b.approved_date >= p_date_from)
        and (p_date_to is null or b.approved_date <= p_date_to)
      )
    )
),
ordered_rows as (
  select
    f.request_id,
    f.object_id,
    f.supplier_id,
    f.supplier_name,
    f.proposal_id,
    f.invoice_number,
    f.amount_total,
    f.amount_paid,
    f.amount_debt,
    f.due_date,
    f.is_overdue,
    f.overdue_days,
    case
      when f.amount_total > 0 and f.amount_debt <= 0 then 'paid'
      when f.is_overdue then 'overdue'
      when f.approved_date is not null then 'approved'
      else 'pending'
    end::text as status
  from filtered f
  order by
    f.is_overdue desc,
    f.due_date asc nulls last,
    f.amount_debt desc,
    f.supplier_name asc,
    f.proposal_id asc nulls last
),
paged_rows as (
  select *
  from ordered_rows
  offset (select offset_value from normalized_args)
  limit (select limit_value from normalized_args)
)
select jsonb_build_object(
  'document_type', 'director_finance_panel_scope',
  'version', 'v2',
  'summary', coalesce((select value -> 'legacy_summary' from summary_payload), '{}'::jsonb),
  'report', coalesce((select value -> 'legacy_report' from summary_payload), jsonb_build_object('suppliers', '[]'::jsonb)),
  'summary_v2', jsonb_build_object(
    'totalAmount', coalesce((select (value ->> 'total_amount')::numeric from summary_payload), 0),
    'totalPaid', coalesce((select (value ->> 'total_paid')::numeric from summary_payload), 0),
    'totalDebt', coalesce((select (value ->> 'total_debt')::numeric from summary_payload), 0),
    'overdueAmount', coalesce((select (value ->> 'overdue_amount')::numeric from summary_payload), 0),
    'bySupplier', coalesce((select value -> 'by_supplier' from summary_payload), '[]'::jsonb)
  ),
  'spend', coalesce((select value -> 'spend' from legacy_panel_payload), '{}'::jsonb),
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'requestId', pr.request_id,
          'objectId', pr.object_id,
          'supplierId', pr.supplier_id,
          'supplierName', pr.supplier_name,
          'proposalId', pr.proposal_id,
          'invoiceNumber', pr.invoice_number,
          'amountTotal', pr.amount_total,
          'amountPaid', pr.amount_paid,
          'amountDebt', pr.amount_debt,
          'dueDate', pr.due_date,
          'isOverdue', pr.is_overdue,
          'overdueDays', pr.overdue_days,
          'status', pr.status
        )
        order by
          pr.is_overdue desc,
          pr.due_date asc nulls last,
          pr.amount_debt desc,
          pr.supplier_name asc,
          pr.proposal_id asc nulls last
      )
      from paged_rows pr
    ),
    '[]'::jsonb
  ),
  'pagination', jsonb_build_object(
    'limit', (select limit_value from normalized_args),
    'offset', (select offset_value from normalized_args),
    'total', (select count(*)::integer from ordered_rows)
  ),
  'meta', jsonb_build_object(
    'summary_source', 'director_finance_summary_v2',
    'spend_source', 'director_finance_panel_scope_v1',
    'rows_source', 'list_accountant_inbox_fact',
    'payload_shape_version', 'v2'
  )
);
$$;

comment on function public.director_finance_panel_scope_v2(uuid, date, date, integer, integer) is
'Director finance panel scope v2. Adds backend-owned paginated debt rows and object filtering while preserving existing finance summary/report/spend shape for the client.';

grant execute on function public.director_finance_panel_scope_v2(uuid, date, date, integer, integer) to authenticated;

commit;
