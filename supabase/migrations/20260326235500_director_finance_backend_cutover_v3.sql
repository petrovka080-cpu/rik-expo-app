begin;

create or replace function public.director_finance_panel_scope_v3(
  p_object_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_due_days integer default 7,
  p_critical_days integer default 14,
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
    case
      when coalesce(p_due_days, 7) = 0 then 7
      else coalesce(p_due_days, 7)
    end::integer as due_days,
    case
      when coalesce(p_critical_days, 14) = 0 then 14
      else coalesce(p_critical_days, 14)
    end::integer as critical_days,
    greatest(coalesce(p_limit, 50), 1)::integer as limit_value,
    greatest(coalesce(p_offset, 0), 0)::integer as offset_value
),
proposal_scope as (
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
finance_base as (
  select
    coalesce(
      nullif(trim(coalesce(src.row_json ->> 'request_id', '')), ''),
      ps.request_id
    ) as request_id,
    coalesce(
      nullif(trim(coalesce(src.row_json ->> 'object_id', '')), ''),
      ps.object_id,
      pu.object_id
    ) as object_id,
    coalesce(
      nullif(trim(coalesce(src.row_json ->> 'supplier_id', '')), ''),
      pu.supplier_id,
      md5(lower(coalesce(nullif(trim(src.row_json ->> 'supplier'), ''), pu.supplier_name, U&'\2014')))
    ) as supplier_id,
    coalesce(
      nullif(trim(src.row_json ->> 'supplier'), ''),
      pu.supplier_name,
      U&'\2014'
    )::text as supplier_name,
    coalesce(
      nullif(trim(coalesce(src.row_json ->> 'proposal_id', src.row_json ->> 'proposalId')), ''),
      nullif(trim(coalesce(src.row_json ->> 'id', '')), '')
    ) as proposal_id,
    coalesce(
      nullif(trim(src.row_json ->> 'proposal_no'), ''),
      nullif(trim(src.row_json ->> 'proposalNo'), ''),
      nullif(trim(src.row_json ->> 'pretty'), '')
    ) as proposal_no,
    coalesce(
      nullif(trim(src.row_json ->> 'invoice_number'), ''),
      nullif(trim(src.row_json ->> 'invoiceNumber'), '')
    ) as invoice_number,
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
        ) + (select due_days from normalized_args)
      )
    ) as due_date
  from public.list_accountant_inbox_fact(null) as src(row_json)
  left join proposal_scope ps
    on ps.proposal_id = nullif(trim(coalesce(src.row_json ->> 'proposal_id', src.row_json ->> 'proposalId')), '')
  left join purchase_scope pu
    on pu.proposal_id = nullif(trim(coalesce(src.row_json ->> 'proposal_id', src.row_json ->> 'proposalId')), '')
),
finance_filtered as (
  select
    fb.*,
    (fb.amount_paid > 0 and fb.amount_debt > 0) as is_partial,
    (fb.amount_debt > 0 and fb.due_date is not null and fb.due_date < current_date) as is_overdue,
    case
      when fb.amount_debt > 0 and fb.due_date is not null and fb.due_date < current_date
        then (current_date - fb.due_date)::integer
      else null::integer
    end as overdue_days
  from finance_base fb
  where (p_object_id is null or fb.object_id = p_object_id::text)
    and (
      fb.approved_date is null
      or (
        (p_date_from is null or fb.approved_date >= p_date_from)
        and (p_date_to is null or fb.approved_date <= p_date_to)
      )
    )
),
classified_finance as (
  select
    ff.*,
    (
      ff.is_overdue
      and coalesce(ff.overdue_days, 0) >= (select critical_days from normalized_args)
    ) as is_critical
  from finance_filtered ff
),
summary_row as (
  select
    coalesce(sum(amount_total), 0)::numeric as total_amount,
    coalesce(sum(amount_paid), 0)::numeric as total_paid,
    coalesce(sum(amount_debt), 0)::numeric as total_debt,
    coalesce(sum(amount_paid) filter (where is_partial), 0)::numeric as partial_paid,
    coalesce(sum(amount_debt) filter (where is_overdue), 0)::numeric as overdue_amount,
    coalesce(sum(amount_debt) filter (where is_critical), 0)::numeric as critical_amount,
    count(*)::integer as row_count,
    count(*) filter (where amount_debt > 0)::integer as debt_count,
    count(*) filter (where is_partial)::integer as partial_count,
    count(*) filter (where is_overdue)::integer as overdue_count,
    count(*) filter (where is_critical)::integer as critical_count
  from classified_finance
),
supplier_finance_rows as (
  select
    supplier_id,
    max(supplier_name)::text as supplier_name,
    count(*)::integer as invoice_count,
    coalesce(sum(amount_total), 0)::numeric as payable,
    coalesce(sum(amount_paid), 0)::numeric as paid,
    coalesce(sum(amount_debt), 0)::numeric as debt,
    coalesce(sum(amount_debt) filter (where is_overdue), 0)::numeric as overdue_amount,
    coalesce(sum(amount_debt) filter (where is_critical), 0)::numeric as critical_amount,
    count(*) filter (where amount_debt > 0)::integer as debt_count,
    count(*) filter (where is_overdue)::integer as overdue_count,
    count(*) filter (where is_critical)::integer as critical_count
  from classified_finance
  group by supplier_id
),
spend_base as (
  select
    coalesce(nullif(trim(v.kind_name), ''), U&'\0414\0440\0443\0433\043e\0435')::text as kind_name,
    coalesce(nullif(trim(v.supplier), ''), pu.supplier_name, U&'\2014')::text as supplier_name,
    nullif(trim(v.proposal_id::text), '')::text as proposal_id,
    nullif(trim(v.proposal_no), '')::text as proposal_no,
    coalesce(v.approved_alloc, 0)::numeric as approved_alloc,
    coalesce(v.paid_alloc_cap, v.paid_alloc, 0)::numeric as paid_alloc,
    coalesce(v.overpay_alloc, 0)::numeric as overpay_alloc
  from public.v_director_finance_spend_kinds_v3 v
  left join proposal_scope ps
    on ps.proposal_id = nullif(trim(v.proposal_id::text), '')
  left join purchase_scope pu
    on pu.proposal_id = nullif(trim(v.proposal_id::text), '')
  where (p_date_from is null or v.director_approved_at::date >= p_date_from)
    and (p_date_to is null or v.director_approved_at::date <= p_date_to)
    and (
      p_object_id is null
      or coalesce(ps.object_id, pu.object_id) = p_object_id::text
    )
),
proposal_spend_rows as (
  select
    proposal_id,
    greatest(sum(approved_alloc) - sum(paid_alloc), 0)::numeric as to_pay
  from spend_base
  where proposal_id is not null
  group by proposal_id
),
kind_supplier_rows as (
  select
    kind_name,
    supplier_name,
    count(*)::integer as count,
    coalesce(sum(approved_alloc), 0)::numeric as approved,
    coalesce(sum(paid_alloc), 0)::numeric as paid,
    coalesce(sum(overpay_alloc), 0)::numeric as overpay
  from spend_base
  group by kind_name, supplier_name
),
kind_rows as (
  select
    k.kind_name,
    coalesce(sum(k.approved), 0)::numeric as approved,
    coalesce(sum(k.paid), 0)::numeric as paid,
    coalesce(sum(k.overpay), 0)::numeric as overpay,
    greatest(coalesce(sum(k.approved), 0) - coalesce(sum(k.paid), 0), 0)::numeric as to_pay,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'supplier', s.supplier_name,
            'approved', s.approved,
            'paid', s.paid,
            'overpay', s.overpay,
            'count', s.count
          )
          order by s.approved desc, s.supplier_name asc
        )
        from kind_supplier_rows s
        where s.kind_name = k.kind_name
      ),
      '[]'::jsonb
    ) as suppliers
  from kind_supplier_rows k
  group by k.kind_name
),
spend_header as (
  select
    coalesce(sum(approved_alloc), 0)::numeric as approved,
    coalesce(sum(paid_alloc), 0)::numeric as paid,
    coalesce((select sum(psr.to_pay) from proposal_spend_rows psr), 0)::numeric as to_pay,
    coalesce(sum(overpay_alloc), 0)::numeric as overpay
  from spend_base
),
spend_overpay_suppliers as (
  select
    supplier_name,
    count(*)::integer as count,
    coalesce(sum(overpay_alloc), 0)::numeric as overpay
  from spend_base
  where overpay_alloc > 0
  group by supplier_name
),
supplier_overpay_rows as (
  select
    md5(lower(supplier_name))::text as supplier_id,
    supplier_name,
    coalesce(sum(overpay), 0)::numeric as overpayment
  from spend_overpay_suppliers
  group by supplier_name
),
ordered_rows as (
  select
    cf.request_id,
    cf.object_id,
    cf.supplier_id,
    cf.supplier_name,
    cf.proposal_id,
    cf.proposal_no,
    cf.invoice_number,
    cf.amount_total,
    cf.amount_paid,
    cf.amount_debt,
    cf.due_date,
    cf.is_overdue,
    cf.overdue_days,
    case
      when cf.amount_total > 0 and cf.amount_debt <= 0 then 'paid'
      when cf.is_overdue then 'overdue'
      when cf.approved_date is not null then 'approved'
      else 'pending'
    end::text as status
  from classified_finance cf
  order by
    cf.is_overdue desc,
    cf.due_date asc nulls last,
    cf.amount_debt desc,
    cf.supplier_name asc,
    cf.proposal_id asc nulls last
),
paged_rows as (
  select *
  from ordered_rows
  offset (select offset_value from normalized_args)
  limit (select limit_value from normalized_args)
)
select jsonb_build_object(
  'document_type', 'director_finance_panel_scope',
  'version', 'v3',
  'summary', jsonb_build_object(
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
  'report', jsonb_build_object(
    'suppliers',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'supplier', sfr.supplier_name,
            'count', sfr.invoice_count,
            'approved', sfr.payable,
            'paid', sfr.paid,
            'toPay', sfr.debt,
            'overdueCount', sfr.overdue_count,
            'criticalCount', sfr.critical_count
          )
          order by sfr.debt desc, sfr.supplier_name asc
        )
        from supplier_finance_rows sfr
      ),
      '[]'::jsonb
    )
  ),
  'spend', jsonb_build_object(
    'header', jsonb_build_object(
      'approved', coalesce((select approved from spend_header), 0),
      'paid', coalesce((select paid from spend_header), 0),
      'toPay', coalesce((select to_pay from spend_header), 0),
      'overpay', coalesce((select overpay from spend_header), 0)
    ),
    'kinds', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'kind', kr.kind_name,
            'approved', kr.approved,
            'paid', kr.paid,
            'overpay', kr.overpay,
            'toPay', kr.to_pay,
            'suppliers', kr.suppliers
          )
          order by
            case kr.kind_name
              when U&'\041c\0430\0442\0435\0440\0438\0430\043b\044b' then 1
              when U&'\0420\0430\0431\043e\0442\044b' then 2
              when U&'\0423\0441\043b\0443\0433\0438' then 3
              when U&'\0414\0440\0443\0433\043e\0435' then 4
              else 5
            end,
            kr.approved desc,
            kr.kind_name asc
        )
        from kind_rows kr
      ),
      '[]'::jsonb
    ),
    'overpaySuppliers', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'supplier', sos.supplier_name,
            'approved', 0,
            'paid', 0,
            'overpay', sos.overpay,
            'count', sos.count
          )
          order by sos.overpay desc, sos.supplier_name asc
        )
        from spend_overpay_suppliers sos
      ),
      '[]'::jsonb
    )
  ),
  'summary_v2', jsonb_build_object(
    'totalAmount', coalesce((select total_amount from summary_row), 0),
    'totalPaid', coalesce((select total_paid from summary_row), 0),
    'totalDebt', coalesce((select total_debt from summary_row), 0),
    'overdueAmount', coalesce((select overdue_amount from summary_row), 0),
    'bySupplier', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'supplierId', sfr.supplier_id,
            'supplierName', sfr.supplier_name,
            'debt', sfr.debt
          )
          order by sfr.debt desc, sfr.supplier_name asc
        )
        from supplier_finance_rows sfr
      ),
      '[]'::jsonb
    )
  ),
  'summary_v3', jsonb_build_object(
    'totalPayable', coalesce((select total_amount from summary_row), 0),
    'totalApproved', coalesce((select total_amount from summary_row), 0),
    'totalPaid', coalesce((select total_paid from summary_row), 0),
    'totalDebt', coalesce((select total_debt from summary_row), 0),
    'totalOverpayment', coalesce((select overpay from spend_header), 0),
    'overdueAmount', coalesce((select overdue_amount from summary_row), 0),
    'criticalAmount', coalesce((select critical_amount from summary_row), 0),
    'overdueCount', coalesce((select overdue_count from summary_row), 0),
    'criticalCount', coalesce((select critical_count from summary_row), 0),
    'debtCount', coalesce((select debt_count from summary_row), 0),
    'partialCount', coalesce((select partial_count from summary_row), 0),
    'partialPaid', coalesce((select partial_paid from summary_row), 0),
    'rowCount', coalesce((select row_count from summary_row), 0),
    'supplierRowCount', coalesce((select count(*)::integer from supplier_finance_rows), 0)
  ),
  'supplierRows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', sfr.supplier_id,
          'supplierId', sfr.supplier_id,
          'supplierName', sfr.supplier_name,
          'payable', sfr.payable,
          'paid', sfr.paid,
          'debt', sfr.debt,
          'overpayment', coalesce(sor.overpayment, 0),
          'overdueAmount', sfr.overdue_amount,
          'criticalAmount', sfr.critical_amount,
          'invoiceCount', sfr.invoice_count,
          'debtCount', sfr.debt_count,
          'overdueCount', sfr.overdue_count,
          'criticalCount', sfr.critical_count
        )
        order by sfr.debt desc, sfr.supplier_name asc
      )
      from supplier_finance_rows sfr
      left join supplier_overpay_rows sor
        on sor.supplier_id = sfr.supplier_id
    ),
    '[]'::jsonb
  ),
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'requestId', pr.request_id,
          'objectId', pr.object_id,
          'supplierId', pr.supplier_id,
          'supplierName', pr.supplier_name,
          'proposalId', pr.proposal_id,
          'proposalNo', pr.proposal_no,
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
    'owner', 'backend',
    'generatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'filtersEcho', jsonb_build_object(
      'objectId', p_object_id::text,
      'dateFrom', p_date_from,
      'dateTo', p_date_to,
      'dueDays', (select due_days from normalized_args),
      'criticalDays', (select critical_days from normalized_args)
    ),
    'sourceVersion', 'director_finance_panel_scope_v3',
    'financeRowsSource', 'list_accountant_inbox_fact',
    'spendRowsSource', 'v_director_finance_spend_kinds_v3',
    'payloadShapeVersion', 'v3'
  )
);
$$;

comment on function public.director_finance_panel_scope_v3(uuid, date, date, integer, integer, integer, integer) is
'Director finance panel scope v3. Establishes one backend-owned finance contract for summary, spend, supplier grouping, rows, overpayment totals, and scope metadata.';

grant execute on function public.director_finance_panel_scope_v3(uuid, date, date, integer, integer, integer, integer) to authenticated;

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
    'payloadShapeVersion', 'v2'
  )
)
from legacy_payload;
$$;

comment on function public.director_finance_supplier_scope_v2(text, text, uuid, date, date, integer, integer) is
'Director finance supplier scope v2. Keeps supplier modal semantics backend-owned and adds versioned summary/overpayment metadata for cutover.';

grant execute on function public.director_finance_supplier_scope_v2(text, text, uuid, date, date, integer, integer) to authenticated;

commit;
