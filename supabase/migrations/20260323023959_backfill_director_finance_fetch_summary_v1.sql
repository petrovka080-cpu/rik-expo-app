begin;

set check_function_bodies = off;
alter database postgres set check_function_bodies = off;

create table if not exists public.proposal_items (
  id bigint generated always as identity primary key,
  proposal_id uuid,
  request_item_id uuid
);

create table if not exists public.request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  rik_code text,
  name_human text,
  qty numeric,
  uom text,
  kind text,
  item_kind text,
  app_code text,
  note text,
  status text,
  created_at timestamptz,
  director_reject_note text,
  director_reject_at timestamptz
);

create table if not exists public.rik_items (
  id text primary key,
  rik_code text,
  name_human text,
  name_human_ru text,
  uom_code text,
  kind text,
  group_code text,
  sector_code text,
  spec text,
  tags text
);

create table if not exists public.rik_aliases (
  id text primary key,
  rik_code text,
  alias text
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  id_old bigint,
  object_id uuid,
  object_name text,
  object text,
  object_type_code text,
  level_code text,
  system_code text,
  status text,
  submitted_at timestamptz,
  created_at timestamptz,
  display_no text,
  request_no text,
  submitted_by uuid,
  requested_by uuid,
  contractor_job_id uuid,
  subcontract_id uuid
);

alter table if exists public.request_items
  add column if not exists rik_code text,
  add column if not exists name_human text,
  add column if not exists qty numeric,
  add column if not exists uom text,
  add column if not exists kind text,
  add column if not exists item_kind text,
  add column if not exists app_code text,
  add column if not exists note text,
  add column if not exists status text,
  add column if not exists created_at timestamptz,
  add column if not exists director_reject_note text,
  add column if not exists director_reject_at timestamptz;

alter table if exists public.requests
  add column if not exists id_old bigint,
  add column if not exists submitted_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists display_no text,
  add column if not exists request_no text,
  add column if not exists submitted_by uuid,
  add column if not exists requested_by uuid;

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid,
  request_id uuid,
  created_by uuid,
  object_id uuid,
  object_name text,
  supplier_id uuid,
  supplier text
);

alter table if exists public.purchases
  add column if not exists request_id uuid,
  add column if not exists created_by uuid;

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  request_item_id uuid,
  price_per_unit numeric,
  price numeric
);

create table if not exists public.work_progress (
  id uuid primary key default gen_random_uuid(),
  purchase_item_id uuid,
  uom text,
  qty_planned numeric,
  qty_done numeric,
  qty_left numeric
);

create table if not exists public.work_progress_log (
  id uuid primary key default gen_random_uuid(),
  progress_id uuid,
  created_at timestamptz,
  qty numeric,
  note text,
  stage_note text,
  work_uom text
);

create table if not exists public.work_progress_log_materials (
  log_id uuid,
  mat_code text,
  qty_fact numeric,
  uom_mat text,
  uom text
);

create table if not exists public.subcontracts (
  id uuid primary key default gen_random_uuid(),
  object_name text,
  contractor_org text,
  contractor_inn text,
  contractor_phone text,
  contract_number text,
  contract_date date,
  status text,
  work_zone text,
  work_type text,
  qty_planned numeric,
  uom text,
  price_per_unit numeric,
  total_price numeric,
  date_start date,
  date_end date,
  created_at timestamptz
);

do $$
begin
  if to_regclass('public.v_works_fact') is null then
    execute $works$
      create view public.v_works_fact as
      select
        null::uuid as progress_id,
        null::timestamptz as created_at,
        null::uuid as purchase_item_id,
        null::text as work_code,
        null::text as work_name,
        null::text as object_name,
        null::uuid as contractor_id,
        null::timestamptz as started_at,
        null::timestamptz as finished_at,
        null::text as uom_id,
        0::numeric as qty_planned,
        0::numeric as qty_done,
        0::numeric as qty_left,
        null::text as work_status
      where false;
    $works$;
  end if;

  if to_regclass('public.v_director_finance_spend_kinds_v3') is null then
    execute $view$
      create view public.v_director_finance_spend_kinds_v3 as
      select
        null::text as kind_name,
        null::text as supplier,
        null::uuid as proposal_id,
        null::text as proposal_no,
        0::numeric as approved_alloc,
        0::numeric as paid_alloc,
        0::numeric as paid_alloc_cap,
        0::numeric as overpay_alloc,
        null::timestamptz as director_approved_at
      where false;
    $view$;
  end if;

  if to_regprocedure('public.list_accountant_inbox_fact(text)') is null then
    execute $fact$
      create function public.list_accountant_inbox_fact(p_tab text default null)
      returns table(row_json jsonb)
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select null::jsonb as row_json
        where false;
      $body$;
    $fact$;
  end if;

  if to_regprocedure('public.director_finance_fetch_summary_v1(date,date,integer,integer)') is null then
    execute $fn$
      create function public.director_finance_fetch_summary_v1(
        p_from date default null,
        p_to date default null,
        p_due_days integer default 7,
        p_critical_days integer default 14
      )
      returns jsonb
      language plpgsql
      stable
      security definer
      set search_path = public
      as $body$
      declare
        summary_v2 jsonb;
        empty_summary constant jsonb := jsonb_build_object(
          'approved', 0,
          'paid', 0,
          'partialPaid', 0,
          'toPay', 0,
          'overdueCount', 0,
          'overdueAmount', 0,
          'criticalCount', 0,
          'criticalAmount', 0,
          'partialCount', 0,
          'debtCount', 0
        );
        empty_report constant jsonb := jsonb_build_object('suppliers', '[]'::jsonb);
      begin
        if to_regprocedure('public.director_finance_summary_v2(uuid,date,date)') is not null then
          execute
            'select public.director_finance_summary_v2($1::uuid, $2::date, $3::date)'
            using null::uuid, p_from, p_to
            into summary_v2;

          return jsonb_build_object(
            'summary', coalesce(summary_v2 -> 'legacy_summary', empty_summary),
            'report', coalesce(summary_v2 -> 'legacy_report', empty_report),
            'meta', jsonb_build_object(
              'summary_source', 'director_finance_summary_v2',
              'payload_shape_version', 'v1_compat_from_v2',
              'due_days', case when coalesce(p_due_days, 7) = 0 then 7 else coalesce(p_due_days, 7) end,
              'critical_days', case when coalesce(p_critical_days, 14) = 0 then 14 else coalesce(p_critical_days, 14) end
            )
          );
        end if;

        return jsonb_build_object(
          'summary', empty_summary,
          'report', empty_report,
          'meta', jsonb_build_object(
            'summary_source', 'director_finance_fetch_summary_v1_compat_backfill',
            'payload_shape_version', 'v1_empty_bootstrap',
            'due_days', case when coalesce(p_due_days, 7) = 0 then 7 else coalesce(p_due_days, 7) end,
            'critical_days', case when coalesce(p_critical_days, 14) = 0 then 14 else coalesce(p_critical_days, 14) end
          )
        );
      end;
      $body$;
    $fn$;
  end if;

  if to_regprocedure('public.list_buyer_inbox(uuid)') is null then
    execute $buyer$
      create function public.list_buyer_inbox(
        p_company_id uuid default null
      )
      returns table (
        app_code text,
        created_at timestamptz,
        director_reject_at timestamptz,
        director_reject_note text,
        kind text,
        name_human text,
        note text,
        object_name text,
        qty numeric,
        request_id uuid,
        request_id_old bigint,
        request_item_id uuid,
        rik_code text,
        status text,
        uom text
      )
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select
          nullif(trim(coalesce(ri.app_code, '')), '')::text as app_code,
          coalesce(ri.created_at, r.submitted_at, r.created_at)::timestamptz as created_at,
          ri.director_reject_at,
          nullif(trim(coalesce(ri.director_reject_note, '')), '')::text as director_reject_note,
          coalesce(
            nullif(trim(coalesce(ri.kind, '')), ''),
            nullif(trim(coalesce(ri.item_kind, '')), ''),
            'material'
          )::text as kind,
          coalesce(nullif(trim(coalesce(ri.name_human, '')), ''), U&'\2014')::text as name_human,
          nullif(trim(coalesce(ri.note, '')), '')::text as note,
          coalesce(
            nullif(trim(coalesce(r.object_name, '')), ''),
            nullif(trim(coalesce(r.object, '')), ''),
            nullif(trim(coalesce(r.object_type_code, '')), '')
          )::text as object_name,
          coalesce(ri.qty, 0)::numeric as qty,
          r.id as request_id,
          r.id_old as request_id_old,
          ri.id as request_item_id,
          nullif(trim(coalesce(ri.rik_code, '')), '')::text as rik_code,
          coalesce(
            nullif(trim(coalesce(ri.status::text, '')), ''),
            nullif(trim(coalesce(r.status::text, '')), '')
          )::text as status,
          nullif(trim(coalesce(ri.uom, '')), '')::text as uom
        from public.request_items ri
        join public.requests r
          on r.id = ri.request_id
        where p_company_id is null
        order by
          r.id_old desc nulls last,
          coalesce(ri.created_at, r.submitted_at, r.created_at) desc nulls last,
          ri.id asc;
      $body$;
    $buyer$;
  end if;
end;
$$;

comment on view public.v_director_finance_spend_kinds_v3 is
'Compatibility empty view for local replayability when remote history placeholders did not recreate the original director finance spend view. Created only when absent.';

comment on function public.list_accountant_inbox_fact(text) is
'Compatibility empty accountant inbox fact function for local replayability when remote history placeholders did not recreate the original fact RPC. Created only when absent.';

comment on function public.director_finance_fetch_summary_v1(date, date, integer, integer) is
'Compatibility backfill for local replayability of director_finance_panel_scope_v1. Creates the missing v1 summary RPC only when absent; delegates to director_finance_summary_v2 after that RPC exists and otherwise returns the documented empty legacy summary/report envelope.';

comment on function public.list_buyer_inbox(uuid) is
'Compatibility backfill for local replayability of buyer_summary_inbox_scope_v1 and later buyer inbox search proof migrations. Creates the missing legacy buyer inbox RPC only when absent, with the typed list_buyer_inbox row contract over request_items joined to requests.';

grant select on public.v_director_finance_spend_kinds_v3 to authenticated;
grant execute on function public.list_accountant_inbox_fact(text) to authenticated;
grant execute on function public.director_finance_fetch_summary_v1(date, date, integer, integer) to authenticated;
grant execute on function public.list_buyer_inbox(uuid) to authenticated;

commit;
