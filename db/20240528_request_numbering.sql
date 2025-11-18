-- db/20240528_request_numbering.sql
-- Добавление человекочитаемых номеров заявок формата REQ-XXXX/YYYY и RPC для прораба

begin;

alter table if exists public.requests
  add column if not exists year integer,
  add column if not exists seq integer,
  add column if not exists display_no text;

-- Бэкап существующих записей: выставляем год и порядковый номер по году
update public.requests r
set year = coalesce(r.year, extract(year from coalesce(r.created_at, now()))::int)
where r.year is null;

with numbered as (
  select
    r.id,
    r.year,
    row_number() over (partition by r.year order by coalesce(r.created_at, now()), r.id) as rn
  from public.requests r
  where r.year is not null
)
update public.requests r
set seq = coalesce(r.seq, n.rn),
    display_no = coalesce(
      r.display_no,
      format('REQ-%s/%s', lpad(n.rn::text, 4, '0'), n.year::text)
    )
from numbered n
where n.id = r.id;

-- Функция генерации следующего номера в рамках года
create or replace function public.fn_next_request_number(p_year integer default extract(year from now())::int)
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
  perform pg_advisory_xact_lock(7101, v_year);

  select coalesce(max(seq), 0)
    into v_max
  from public.requests
  where year = v_year;

  v_next := v_max + 1;

  seq := v_next;
  display_no := format('REQ-%s/%s', lpad(v_next::text, 4, '0'), v_year::text);
  return next;
end;
$$;

-- RPC: создание нового черновика заявки
create or replace function public.request_create_draft(
  p_foreman_name text default null,
  p_need_by date default null,
  p_comment text default null,
  p_object_type_code text default null,
  p_level_code text default null,
  p_system_code text default null,
  p_zone_code text default null
)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer := extract(year from coalesce(p_need_by::timestamp with time zone, now()))::int;
  v_seq integer;
  v_display text;
  v_row public.requests;
begin
  select seq, display_no into v_seq, v_display from public.fn_next_request_number(v_year);

  insert into public.requests (
    id,
    status,
    year,
    seq,
    display_no,
    foreman_name,
    need_by,
    comment,
    object_type_code,
    level_code,
    system_code,
    zone_code
  )
  values (
    gen_random_uuid(),
    'draft',
    v_year,
    v_seq,
    v_display,
    trim(nullif(p_foreman_name, '')),
    p_need_by,
    nullif(p_comment, ''),
    nullif(p_object_type_code, ''),
    nullif(p_level_code, ''),
    nullif(p_system_code, ''),
    nullif(p_zone_code, '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- RPC: обновление статуса заявки на «pending»
create or replace function public.request_submit(
  p_request_id uuid
)
returns public.requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.requests;
begin
  update public.requests
     set status = 'pending',
         submitted_at = coalesce(submitted_at, now())
   where id = p_request_id
   returning * into v_row;

  if not found then
    raise exception 'request % not found', p_request_id;
  end if;

  update public.request_items ri
     set status = 'На утверждении'
   where ri.request_id = p_request_id
     and (
       ri.status is null or
       lower(ri.status) in ('черновик', 'draft')
     );

  return v_row;
end;
$$;

commit;
