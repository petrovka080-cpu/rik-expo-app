begin;

-- ============================================================================
-- F3.2 - Director finance panel spend CPU tail hardening
--
-- Scope: only the spend section consumed by director_finance_panel_scope_v4.
-- The old runtime spend source is preserved as build/proof/fallback source.
-- Money semantics, rounding, supplier/object finance rollups, supplier detail,
-- PDF/export, and write-paths are intentionally untouched.
-- ============================================================================

create table if not exists public.finance_panel_spend_projection_v1 (
  projection_row_no       bigint      not null,
  kind_name               text        not null default E'\u0414\u0440\u0443\u0433\u043e\u0435',
  supplier_name           text        not null default E'\u2014',
  proposal_id             text,
  proposal_no             text,
  object_id               text,
  object_code             text,
  object_name             text        not null default E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430',
  director_approved_date  date,
  approved_alloc          numeric     not null default 0,
  paid_alloc              numeric     not null default 0,
  overpay_alloc           numeric     not null default 0,
  projection_version      integer     not null default 1,
  rebuilt_at              timestamptz not null default now(),

  constraint pk_fpsp_v1 primary key (projection_row_no)
);

comment on table public.finance_panel_spend_projection_v1 is
  'F3.2 prepared panel spend row basis. Built from the preserved runtime spend source. NOT a source of financial truth.';

create index if not exists idx_fpsp_v1_date
  on public.finance_panel_spend_projection_v1 (director_approved_date);

create index if not exists idx_fpsp_v1_object
  on public.finance_panel_spend_projection_v1 (object_id)
  where object_id is not null;

create index if not exists idx_fpsp_v1_supplier
  on public.finance_panel_spend_projection_v1 (supplier_name);

create index if not exists idx_fpsp_v1_kind
  on public.finance_panel_spend_projection_v1 (kind_name);

create table if not exists public.finance_panel_spend_projection_meta_v1 (
  id                         boolean     primary key default true check (id),
  projection_version         integer     not null default 1,
  rebuilt_at                 timestamptz,
  source_row_count           bigint      not null default 0,
  projected_row_count        bigint      not null default 0,
  last_rebuild_started_at    timestamptz,
  last_rebuild_finished_at   timestamptz,
  last_rebuild_duration_ms   integer,
  last_rebuild_status        text        not null default 'never',
  last_rebuild_error         text,
  constraint chk_fpsp_meta_v1_status check (last_rebuild_status in ('never', 'started', 'success', 'failed'))
);

insert into public.finance_panel_spend_projection_meta_v1 (id)
values (true)
on conflict (id) do nothing;

comment on table public.finance_panel_spend_projection_meta_v1 is
  'F3.2 metadata for finance_panel_spend_projection_v1 rebuild/status. Used to decide projection vs runtime fallback.';

create or replace function public.finance_panel_spend_runtime_source_v1()
returns table (
  kind_name text,
  supplier_name text,
  proposal_id text,
  proposal_no text,
  object_id text,
  object_code text,
  object_name text,
  director_approved_date date,
  approved_alloc numeric,
  paid_alloc numeric,
  overpay_alloc numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with proposal_scope_for_spend as (
    select
      pi.proposal_id::text,
      min(ri.request_id::text) filter (where ri.request_id is not null) as request_id
    from public.proposal_items pi
    left join public.request_items ri on ri.id::text = pi.request_item_id::text
    group by pi.proposal_id::text
  ),
  request_identity_for_spend as (
    select
      roi.request_id::text,
      nullif(btrim(coalesce(roi.construction_object_code, '')), '') as object_code,
      nullif(btrim(coalesce(roi.construction_object_name, '')), '') as object_name,
      nullif(btrim(coalesce(req.object_id::text, '')), '') as legacy_object_id
    from public.request_object_identity_scope_v1 roi
    left join public.requests req on req.id::text = roi.request_id::text
  ),
  purchase_scope_for_spend as (
    select
      p.proposal_id::text,
      max(nullif(trim(p.object_id::text), '')) as legacy_object_id,
      max(nullif(trim(p.object_name), '')) as legacy_object_name,
      max(nullif(trim(p.supplier), '')) as supplier_name
    from public.purchases p
    where p.proposal_id is not null
    group by p.proposal_id::text
  )
  select
    coalesce(nullif(trim(v.kind_name), ''), E'\u0414\u0440\u0443\u0433\u043e\u0435')::text as kind_name,
    coalesce(nullif(trim(v.supplier), ''), pu.supplier_name, E'\u2014')::text as supplier_name,
    nullif(trim(v.proposal_id::text), '')::text as proposal_id,
    nullif(trim(v.proposal_no), '')::text as proposal_no,
    coalesce(ri.legacy_object_id, pu.legacy_object_id) as object_id,
    ri.object_code,
    coalesce(ri.object_name, pu.legacy_object_name, E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430')::text as object_name,
    v.director_approved_at::date as director_approved_date,
    coalesce(v.approved_alloc, 0)::numeric as approved_alloc,
    coalesce(v.paid_alloc_cap, v.paid_alloc, 0)::numeric as paid_alloc,
    coalesce(v.overpay_alloc, 0)::numeric as overpay_alloc
  from public.v_director_finance_spend_kinds_v3 v
  left join proposal_scope_for_spend ps on ps.proposal_id = nullif(trim(v.proposal_id::text), '')
  left join request_identity_for_spend ri on ri.request_id = ps.request_id
  left join purchase_scope_for_spend pu on pu.proposal_id = nullif(trim(v.proposal_id::text), '');
$$;

comment on function public.finance_panel_spend_runtime_source_v1() is
  'F3.2 preserved old director panel spend source. Used only for projection rebuild, drift proof, and fallback.';

create or replace function public.finance_panel_spend_projection_rebuild_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_started_at timestamptz := timezone('utc', now());
  v_finished_at timestamptz;
  v_duration_ms integer;
  v_source_count bigint := 0;
  v_projected_count bigint := 0;
begin
  insert into public.finance_panel_spend_projection_meta_v1 (
    id,
    projection_version,
    last_rebuild_started_at,
    last_rebuild_status,
    last_rebuild_error
  )
  values (true, 1, v_started_at, 'started', null)
  on conflict (id) do update set
    projection_version = excluded.projection_version,
    last_rebuild_started_at = excluded.last_rebuild_started_at,
    last_rebuild_status = 'started',
    last_rebuild_error = null;

  begin
    truncate table public.finance_panel_spend_projection_v1;

    insert into public.finance_panel_spend_projection_v1 (
      projection_row_no,
      kind_name,
      supplier_name,
      proposal_id,
      proposal_no,
      object_id,
      object_code,
      object_name,
      director_approved_date,
      approved_alloc,
      paid_alloc,
      overpay_alloc,
      projection_version,
      rebuilt_at
    )
    with source_rows as (
      select
        row_number() over (
          order by
            coalesce(s.proposal_id, ''),
            coalesce(s.proposal_no, ''),
            coalesce(s.kind_name, ''),
            coalesce(s.supplier_name, ''),
            coalesce(s.object_id, ''),
            coalesce(s.object_code, ''),
            coalesce(s.object_name, ''),
            s.director_approved_date nulls last,
            s.approved_alloc,
            s.paid_alloc,
            s.overpay_alloc
        )::bigint as projection_row_no,
        s.*
      from public.finance_panel_spend_runtime_source_v1() s
    )
    select
      projection_row_no,
      kind_name,
      supplier_name,
      proposal_id,
      proposal_no,
      object_id,
      object_code,
      object_name,
      director_approved_date,
      approved_alloc,
      paid_alloc,
      overpay_alloc,
      1,
      v_started_at
    from source_rows;

    get diagnostics v_projected_count = row_count;
    v_source_count := v_projected_count;
    v_finished_at := timezone('utc', now());
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000))::integer;

    update public.finance_panel_spend_projection_meta_v1
    set
      projection_version = 1,
      rebuilt_at = v_finished_at,
      source_row_count = v_source_count,
      projected_row_count = v_projected_count,
      last_rebuild_started_at = v_started_at,
      last_rebuild_finished_at = v_finished_at,
      last_rebuild_duration_ms = v_duration_ms,
      last_rebuild_status = 'success',
      last_rebuild_error = null
    where id;

    return jsonb_build_object(
      'status', 'success',
      'projection_version', 1,
      'source_row_count', v_source_count,
      'projected_row_count', v_projected_count,
      'rebuild_started_at', v_started_at,
      'rebuild_finished_at', v_finished_at,
      'rebuild_duration_ms', v_duration_ms,
      'strategy', 'full_truncate_rebuild',
      'build_source', 'finance_panel_spend_runtime_source_v1'
    );
  exception when others then
    v_finished_at := timezone('utc', now());
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000))::integer;

    update public.finance_panel_spend_projection_meta_v1
    set
      last_rebuild_finished_at = v_finished_at,
      last_rebuild_duration_ms = v_duration_ms,
      last_rebuild_status = 'failed',
      last_rebuild_error = sqlerrm
    where id;

    raise;
  end;
end;
$fn$;

create or replace function public.finance_panel_spend_projection_status_v1(
  p_expected_projection_version integer default 1
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'projection_version', coalesce(m.projection_version, 0),
    'expected_projection_version', p_expected_projection_version,
    'is_ready', coalesce(m.last_rebuild_status = 'success' and m.projection_version = p_expected_projection_version, false),
    'rebuilt_at', m.rebuilt_at,
    'source_row_count', coalesce(m.source_row_count, 0),
    'projected_row_count', coalesce(m.projected_row_count, 0),
    'last_rebuild_started_at', m.last_rebuild_started_at,
    'last_rebuild_finished_at', m.last_rebuild_finished_at,
    'last_rebuild_duration_ms', m.last_rebuild_duration_ms,
    'last_rebuild_status', coalesce(m.last_rebuild_status, 'missing'),
    'last_rebuild_error', m.last_rebuild_error
  )
  from (select true as id) seed
  left join public.finance_panel_spend_projection_meta_v1 m on m.id = seed.id;
$$;

create or replace function public.finance_panel_spend_snapshot_v1(
  p_object_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_source text default 'projection'
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with source_choice as (
  select case when lower(coalesce(p_source, 'projection')) = 'runtime' then 'runtime' else 'projection' end as source_name
),
spend_base as (
  select
    sp.kind_name,
    sp.supplier_name,
    sp.proposal_id,
    sp.proposal_no,
    sp.object_id,
    sp.object_code,
    sp.object_name,
    sp.director_approved_date,
    sp.approved_alloc,
    sp.paid_alloc,
    sp.overpay_alloc
  from public.finance_panel_spend_projection_v1 sp
  where (select source_name from source_choice) = 'projection'
    and (p_date_from is null or sp.director_approved_date >= p_date_from)
    and (p_date_to is null or sp.director_approved_date <= p_date_to)
    and (p_object_id is null or sp.object_id = p_object_id::text)
  union all
  select
    rt.kind_name,
    rt.supplier_name,
    rt.proposal_id,
    rt.proposal_no,
    rt.object_id,
    rt.object_code,
    rt.object_name,
    rt.director_approved_date,
    rt.approved_alloc,
    rt.paid_alloc,
    rt.overpay_alloc
  from public.finance_panel_spend_runtime_source_v1() rt
  where (select source_name from source_choice) = 'runtime'
    and (p_date_from is null or rt.director_approved_date >= p_date_from)
    and (p_date_to is null or rt.director_approved_date <= p_date_to)
    and (p_object_id is null or rt.object_id = p_object_id::text)
),
proposal_spend_rows as (
  select proposal_id, greatest(sum(approved_alloc) - sum(paid_alloc), 0)::numeric as to_pay
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
object_overpay_rows as (
  select
    coalesce(
      nullif(btrim(coalesce(object_code, '')), ''),
      nullif(btrim(coalesce(object_id, '')), ''),
      md5(lower(coalesce(nullif(btrim(coalesce(object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430')))
    )::text as object_key,
    max(nullif(btrim(coalesce(object_id, '')), '')) as object_id,
    max(nullif(btrim(coalesce(object_code, '')), '')) as object_code,
    max(coalesce(nullif(btrim(coalesce(object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430'))::text as object_name,
    coalesce(sum(overpay_alloc), 0)::numeric as overpayment
  from spend_base
  group by 1
)
select jsonb_build_object(
  'spend', jsonb_build_object(
    'header', jsonb_build_object(
      'approved', coalesce((select approved from spend_header), 0),
      'paid', coalesce((select paid from spend_header), 0),
      'toPay', coalesce((select to_pay from spend_header), 0),
      'overpay', coalesce((select overpay from spend_header), 0)
    ),
    'kindRows', coalesce(
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
              when E'\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b' then 1
              when E'\u0420\u0430\u0431\u043e\u0442\u044b' then 2
              when E'\u0423\u0441\u043b\u0443\u0433\u0438' then 3
              when E'\u0414\u0440\u0443\u0433\u043e\u0435' then 4
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
  'supplierOverpayRows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'supplierId', sor.supplier_id,
          'supplierName', sor.supplier_name,
          'overpayment', sor.overpayment
        )
        order by sor.overpayment desc, sor.supplier_name asc
      )
      from supplier_overpay_rows sor
    ),
    '[]'::jsonb
  ),
  'objectOverpayRows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'objectKey', oor.object_key,
          'objectId', oor.object_id,
          'objectCode', oor.object_code,
          'objectName', oor.object_name,
          'overpayment', oor.overpayment
        )
        order by oor.overpayment desc, oor.object_name asc
      )
      from object_overpay_rows oor
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'source', case
      when (select source_name from source_choice) = 'projection' then 'finance_panel_spend_projection_v1'
      else 'finance_panel_spend_runtime_source_v1'
    end,
    'projection_version', 1,
    'filters', jsonb_build_object('objectId', p_object_id::text, 'dateFrom', p_date_from, 'dateTo', p_date_to),
    'row_count', (select count(*)::integer from spend_base)
  )
);
$$;

create or replace function public.finance_panel_spend_scope_v1(
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
  with status as (
    select public.finance_panel_spend_projection_status_v1(1) as payload
  )
  select public.finance_panel_spend_snapshot_v1(
    p_object_id => p_object_id,
    p_date_from => p_date_from,
    p_date_to => p_date_to,
    p_source => case
      when coalesce(((select payload from status) ->> 'is_ready')::boolean, false) then 'projection'
      else 'runtime'
    end
  );
$$;

create or replace function public.finance_panel_spend_drift_check_v1(
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
with runtime_payload as (
  select public.finance_panel_spend_snapshot_v1(p_object_id, p_date_from, p_date_to, 'runtime') as payload
),
projection_payload as (
  select public.finance_panel_spend_snapshot_v1(p_object_id, p_date_from, p_date_to, 'projection') as payload
),
counts as (
  select
    coalesce(((select payload from runtime_payload) #>> '{meta,row_count}')::integer, 0) as runtime_row_count,
    coalesce(((select payload from projection_payload) #>> '{meta,row_count}')::integer, 0) as projection_row_count
),
comparisons as (
  select
    ((select payload from runtime_payload) -> 'spend') = ((select payload from projection_payload) -> 'spend') as spend_equal,
    ((select payload from runtime_payload) -> 'supplierOverpayRows') = ((select payload from projection_payload) -> 'supplierOverpayRows') as supplier_overpay_equal,
    ((select payload from runtime_payload) -> 'objectOverpayRows') = ((select payload from projection_payload) -> 'objectOverpayRows') as object_overpay_equal
)
select jsonb_build_object(
  'projection_version', 'f3_2_finance_panel_spend_v1',
  'runtime_row_count', (select runtime_row_count from counts),
  'projection_row_count', (select projection_row_count from counts),
  'spend_equal', (select spend_equal from comparisons),
  'supplier_overpay_equal', (select supplier_overpay_equal from comparisons),
  'object_overpay_equal', (select object_overpay_equal from comparisons),
  'diff_count', case
    when (select spend_equal and supplier_overpay_equal and object_overpay_equal from comparisons) then 0
    else 1
  end,
  'is_drift_free', (select spend_equal and supplier_overpay_equal and object_overpay_equal from comparisons),
  'checked_at', timezone('utc', now()),
  'filters', jsonb_build_object('objectId', p_object_id::text, 'dateFrom', p_date_from, 'dateTo', p_date_to)
)
from comparisons;
$$;

do $$
declare
  v_definition text;
  v_hardened_definition text;
  v_start integer;
  v_end integer;
  v_replacement text := $replacement$
spend_scope_payload as (
  select public.finance_panel_spend_scope_v1(
    p_object_id => p_object_id,
    p_date_from => p_date_from,
    p_date_to => p_date_to
  ) as payload
),
spend_header as (
  select
    coalesce(nullif(sp.payload #>> '{spend,header,approved}', '')::numeric, 0)::numeric as approved,
    coalesce(nullif(sp.payload #>> '{spend,header,paid}', '')::numeric, 0)::numeric as paid,
    coalesce(nullif(sp.payload #>> '{spend,header,toPay}', '')::numeric, 0)::numeric as to_pay,
    coalesce(nullif(sp.payload #>> '{spend,header,overpay}', '')::numeric, 0)::numeric as overpay
  from spend_scope_payload sp
),
kind_rows as (
  select
    x.kind as kind_name,
    coalesce(x.approved, 0)::numeric as approved,
    coalesce(x.paid, 0)::numeric as paid,
    coalesce(x.overpay, 0)::numeric as overpay,
    coalesce(x."toPay", 0)::numeric as to_pay,
    coalesce(x.suppliers, '[]'::jsonb) as suppliers
  from spend_scope_payload sp
  cross join lateral jsonb_to_recordset(coalesce(sp.payload #> '{spend,kindRows}', '[]'::jsonb))
    as x(kind text, approved numeric, paid numeric, overpay numeric, "toPay" numeric, suppliers jsonb)
),
spend_overpay_suppliers as (
  select
    x.supplier as supplier_name,
    coalesce(x.count, 0)::integer as count,
    coalesce(x.overpay, 0)::numeric as overpay
  from spend_scope_payload sp
  cross join lateral jsonb_to_recordset(coalesce(sp.payload #> '{spend,overpaySuppliers}', '[]'::jsonb))
    as x(supplier text, approved numeric, paid numeric, overpay numeric, count integer)
),
supplier_overpay_rows as (
  select
    x."supplierId" as supplier_id,
    x."supplierName" as supplier_name,
    coalesce(x.overpayment, 0)::numeric as overpayment
  from spend_scope_payload sp
  cross join lateral jsonb_to_recordset(coalesce(sp.payload -> 'supplierOverpayRows', '[]'::jsonb))
    as x("supplierId" text, "supplierName" text, overpayment numeric)
),
object_overpay_rows as (
  select
    x."objectKey" as object_key,
    x."objectId" as object_id,
    x."objectCode" as object_code,
    x."objectName" as object_name,
    coalesce(x.overpayment, 0)::numeric as overpayment
  from spend_scope_payload sp
  cross join lateral jsonb_to_recordset(coalesce(sp.payload -> 'objectOverpayRows', '[]'::jsonb))
    as x("objectKey" text, "objectId" text, "objectCode" text, "objectName" text, overpayment numeric)
),
$replacement$;
begin
  select pg_get_functiondef('public.director_finance_panel_scope_v4(uuid,date,date,integer,integer,integer,integer)'::regprocedure)
  into v_definition;

  if v_definition is null then
    raise exception 'director_finance_panel_scope_v4(uuid,date,date,integer,integer,integer,integer) is missing';
  end if;

  v_start := strpos(v_definition, 'proposal_scope_for_spend as (');
  v_end := strpos(v_definition, 'ordered_rows as (');

  if v_start <= 0 or v_end <= v_start then
    raise exception 'F3.2 spend section markers were not found in director_finance_panel_scope_v4';
  end if;

  v_hardened_definition :=
    substring(v_definition from 1 for v_start - 1)
    || v_replacement
    || substring(v_definition from v_end);

  v_hardened_definition := replace(
    v_hardened_definition,
    '''spendRowsSource'', ''v_director_finance_spend_kinds_v3''',
    '''spendRowsSource'', coalesce((select payload #>> ''{meta,source}'' from spend_scope_payload), ''finance_panel_spend_projection_v1'')'
  );

  if v_hardened_definition = v_definition then
    raise exception 'F3.2 director_finance_panel_scope_v4 replacement produced no changes';
  end if;

  if strpos(lower(v_hardened_definition), 'v_director_finance_spend_kinds_v3') > 0 then
    raise exception 'F3.2 replacement failed: panel still directly references v_director_finance_spend_kinds_v3';
  end if;

  execute v_hardened_definition;
end $$;

create or replace function public.finance_panel_spend_f3_2_cpu_proof_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with panel_proc as (
  select lower(pg_get_functiondef('public.director_finance_panel_scope_v4(uuid,date,date,integer,integer,integer,integer)'::regprocedure)) as definition
),
runtime_proc as (
  select lower(pg_get_functiondef('public.finance_panel_spend_runtime_source_v1()'::regprocedure)) as definition
)
select jsonb_build_object(
  'checked_at', timezone('utc', now()),
  'panel_uses_spend_scope_helper', position('finance_panel_spend_scope_v1' in (select definition from panel_proc)) > 0,
  'panel_has_direct_spend_view', position('v_director_finance_spend_kinds_v3' in (select definition from panel_proc)) > 0,
  'panel_has_old_spend_source_ctes',
    position('proposal_scope_for_spend as' in (select definition from panel_proc)) > 0
    or position('purchase_scope_for_spend as' in (select definition from panel_proc)) > 0,
  'runtime_source_exists', (select definition from runtime_proc) is not null,
  'runtime_source_has_spend_view', position('v_director_finance_spend_kinds_v3' in (select definition from runtime_proc)) > 0,
  'projection_table_exists', to_regclass('public.finance_panel_spend_projection_v1') is not null,
  'projection_meta_exists', to_regclass('public.finance_panel_spend_projection_meta_v1') is not null
);
$$;

select public.finance_panel_spend_projection_rebuild_v1();

comment on function public.director_finance_panel_scope_v4(
  uuid,
  date,
  date,
  integer,
  integer,
  integer,
  integer
) is
  'F3.2: Director finance panel scope v4 with spend section backed by finance_panel_spend_projection_v1 when ready; old runtime spend source is retained for proof/fallback. Money semantics unchanged.';

grant select on public.finance_panel_spend_projection_v1 to authenticated;
grant select on public.finance_panel_spend_projection_meta_v1 to authenticated;
grant execute on function public.finance_panel_spend_runtime_source_v1() to authenticated;
grant execute on function public.finance_panel_spend_projection_rebuild_v1() to authenticated;
grant execute on function public.finance_panel_spend_projection_status_v1(integer) to authenticated;
grant execute on function public.finance_panel_spend_snapshot_v1(uuid, date, date, text) to authenticated;
grant execute on function public.finance_panel_spend_scope_v1(uuid, date, date) to authenticated;
grant execute on function public.finance_panel_spend_drift_check_v1(uuid, date, date) to authenticated;
grant execute on function public.finance_panel_spend_f3_2_cpu_proof_v1() to authenticated;
grant execute on function public.director_finance_panel_scope_v4(uuid, date, date, integer, integer, integer, integer) to authenticated;

notify pgrst, 'reload schema';

commit;
