begin;

create table if not exists public.contractors (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  inn text,
  phone text,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.profiles (
  user_id uuid primary key,
  role text
);

create table if not exists public.objects (
  id uuid primary key default gen_random_uuid(),
  name text
);

create table if not exists public.ref_object_types (
  code text primary key,
  display_name text,
  name_human_ru text,
  name_ru text,
  alias_ru text,
  name text
);

create table if not exists public.ref_systems (
  code text primary key,
  display_name text,
  name_human_ru text,
  name_ru text,
  name text
);

create table if not exists public.ref_zones (
  code text primary key,
  display_name text,
  name_human_ru text,
  name_ru text,
  name text
);

create table if not exists public.ref_levels (
  code text primary key,
  display_name text,
  name_human_ru text,
  name_ru text,
  name text
);

alter table if exists public.ref_object_types
  add column if not exists alias_ru text;

alter table if exists public.subcontracts
  add column if not exists approved_at timestamptz,
  add column if not exists work_mode text,
  add column if not exists created_by uuid;

alter table if exists public.work_progress
  add column if not exists created_at timestamptz,
  add column if not exists contractor_id uuid;

alter table if exists public.purchase_items
  add column if not exists amount numeric;

alter table if exists public.request_items
  add column if not exists name_human text,
  add column if not exists rik_code text,
  add column if not exists qty numeric,
  add column if not exists uom text,
  add column if not exists kind text,
  add column if not exists item_kind text,
  add column if not exists note text,
  add column if not exists row_no integer,
  add column if not exists position_order integer,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table if exists public.requests
  add column if not exists role text,
  add column if not exists submitted_at timestamptz,
  add column if not exists zone_code text,
  add column if not exists company_inn_snapshot text,
  add column if not exists company_name_snapshot text,
  add column if not exists request_no text,
  add column if not exists display_no text,
  add column if not exists note text,
  add column if not exists comment text,
  add column if not exists created_at timestamptz;

do $$
begin
  if to_regclass('public.v_wh_issue_req_heads_ui') is null then
    execute $view$
      create view public.v_wh_issue_req_heads_ui as
      select
        null::uuid as request_id,
        null::text as display_no,
        null::text as object_name,
        null::text as level_code,
        null::text as system_code,
        null::text as zone_code,
        null::text as level_name,
        null::text as system_name,
        null::text as zone_name,
        null::timestamptz as submitted_at,
        null::text as issue_status,
        0::numeric as qty_issued_sum
      where false;
    $view$;
  end if;

  if to_regclass('public.warehouse_issues') is null then
    execute $table$
      create table public.warehouse_issues (
        id bigint generated always as identity primary key,
        request_id uuid,
        request_id_old bigint,
        base_no text,
        no text,
        iss_date timestamptz,
        status text,
        object_name text,
        work_name text,
        note text,
        qty numeric,
        uom text,
        who text,
        team text,
        target_object_id uuid,
        created_at timestamptz
      );
    $table$;
  end if;

  if to_regclass('public.warehouse_issue_items') is null then
    execute $table$
      create table public.warehouse_issue_items (
        id bigint generated always as identity primary key,
        issue_id bigint,
        request_item_id uuid,
        rik_code text,
        uom_id text,
        qty numeric,
        created_at timestamptz
      );
    $table$;
  end if;

  if to_regclass('public.v_wh_issue_req_items_ui') is null then
    execute $view$
      create view public.v_wh_issue_req_items_ui as
      select
        null::uuid as request_item_id,
        null::uuid as request_id,
        null::text as rik_code,
        null::text as name_human,
        null::text as uom,
        0::numeric as qty_limit,
        0::numeric as qty_issued,
        0::numeric as qty_left,
        0::numeric as qty_available,
        0::numeric as qty_can_issue_now
      where false;
    $view$;
  end if;

  if to_regclass('public.v_warehouse_stock') is null then
    execute $view$
      create view public.v_warehouse_stock as
      select
        null::text as rik_code,
        null::text as uom_id,
        0::numeric as qty_available
      where false;
    $view$;
  end if;

  if to_regclass('public.wh_ledger') is null then
    execute $table$
      create table public.wh_ledger (
        id uuid primary key default gen_random_uuid(),
        direction text not null,
        moved_at timestamptz not null default now(),
        code text not null,
        qty numeric not null default 0,
        uom_id text not null,
        warehouse_id text not null,
        incoming_id uuid,
        incoming_item_id uuid,
        issue_doc_id uuid,
        move_id uuid,
        object_id uuid,
        purchase_id uuid,
        note text,
        warehouseman_fio text
      );
    $table$;
  end if;
end;
$$;

comment on table public.contractors is
'Compatibility empty contractors table for local replayability when remote history placeholders did not recreate the original contractor registry. Created only when absent.';

comment on view public.v_wh_issue_req_heads_ui is
'Compatibility empty warehouse issue head view for local replayability when remote history placeholders did not recreate the original warehouse issue read view. Created only when absent.';

comment on view public.v_wh_issue_req_items_ui is
'Compatibility empty warehouse issue item view for local replayability when remote history placeholders did not recreate the original warehouse issue item read view. Created only when absent.';

comment on view public.v_warehouse_stock is
'Compatibility empty warehouse stock view for local replayability when remote history placeholders did not recreate the original warehouse stock read view. Created only when absent.';

comment on table public.wh_ledger is
'Compatibility empty warehouse ledger table for local replayability when remote history placeholders did not recreate the original warehouse ledger table. Created only when absent.';

commit;
