-- db/20260228_subcontracts_base.sql
-- Создает базовую инфраструктуру подрядов: table + numbering + RPC создания черновика.

begin;

create table if not exists public.subcontracts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid null,

  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'rejected', 'closed')),

  year integer null,
  seq integer null,
  display_no text null,

  foreman_name text null,
  contractor_org text null,
  contractor_rep text null,
  contractor_phone text null,
  contract_number text null,
  contract_date date null,

  object_name text null,
  work_zone text null,
  work_type text null,
  qty_planned numeric null,
  uom text null,
  date_start date null,
  date_end date null,

  work_mode text null check (work_mode in ('labor_only', 'turnkey', 'mixed')),
  price_per_unit numeric null,
  total_price numeric null,
  price_type text null check (price_type in ('by_volume', 'by_shift', 'by_hour')),

  foreman_comment text null,
  director_comment text null,

  submitted_at timestamptz null,
  approved_at timestamptz null,
  rejected_at timestamptz null
);

create index if not exists idx_subcontracts_created_by_created_at
  on public.subcontracts (created_by, created_at desc);

create index if not exists idx_subcontracts_status_created_at
  on public.subcontracts (status, created_at desc);

create unique index if not exists ux_subcontracts_display_no
  on public.subcontracts (display_no)
  where display_no is not null;

create unique index if not exists ux_subcontracts_year_seq
  on public.subcontracts (year, seq)
  where year is not null and seq is not null;

create or replace function public.fn_next_subcontract_number(
  p_year integer default extract(year from now())::int
)
returns table(seq integer, display_no text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := coalesce(p_year, extract(year from now())::int);
  v_max integer;
  v_next integer;
begin
  perform pg_advisory_xact_lock(7201, v_year);

  select coalesce(max(s.seq), 0)
    into v_max
  from public.subcontracts s
  where s.year = v_year;

  v_next := v_max + 1;
  seq := v_next;
  display_no := format('SUB-%s/%s', lpad(v_next::text, 4, '0'), v_year::text);
  return next;
end;
$$;

create or replace function public.subcontract_create_draft(
  p_created_by uuid,
  p_foreman_name text default null,
  p_contractor_org text default null,
  p_contractor_rep text default null,
  p_contractor_phone text default null,
  p_contract_number text default null,
  p_contract_date date default null,
  p_object_name text default null,
  p_work_zone text default null,
  p_work_type text default null,
  p_qty_planned numeric default null,
  p_uom text default null,
  p_date_start date default null,
  p_date_end date default null,
  p_work_mode text default null,
  p_price_per_unit numeric default null,
  p_total_price numeric default null,
  p_price_type text default null,
  p_foreman_comment text default null
)
returns public.subcontracts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from now())::int;
  v_seq integer;
  v_display text;
  v_row public.subcontracts;
begin
  select n.seq, n.display_no into v_seq, v_display
  from public.fn_next_subcontract_number(v_year) n;

  insert into public.subcontracts (
    id,
    created_by,
    status,
    year,
    seq,
    display_no,
    foreman_name,
    contractor_org,
    contractor_rep,
    contractor_phone,
    contract_number,
    contract_date,
    object_name,
    work_zone,
    work_type,
    qty_planned,
    uom,
    date_start,
    date_end,
    work_mode,
    price_per_unit,
    total_price,
    price_type,
    foreman_comment
  )
  values (
    gen_random_uuid(),
    p_created_by,
    'draft',
    v_year,
    v_seq,
    v_display,
    nullif(trim(p_foreman_name), ''),
    nullif(trim(p_contractor_org), ''),
    nullif(trim(p_contractor_rep), ''),
    nullif(trim(p_contractor_phone), ''),
    nullif(trim(p_contract_number), ''),
    p_contract_date,
    nullif(trim(p_object_name), ''),
    nullif(trim(p_work_zone), ''),
    nullif(trim(p_work_type), ''),
    p_qty_planned,
    nullif(trim(p_uom), ''),
    p_date_start,
    p_date_end,
    nullif(trim(p_work_mode), ''),
    p_price_per_unit,
    p_total_price,
    nullif(trim(p_price_type), ''),
    nullif(trim(p_foreman_comment), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

commit;
