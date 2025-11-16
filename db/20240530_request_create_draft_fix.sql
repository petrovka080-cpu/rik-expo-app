-- db/20240530_request_create_draft_fix.sql
-- Исправление request_create_draft: явные алиасы для display_no/seq

begin;

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
  select next_no.seq, next_no.display_no
    into v_seq, v_display
  from public.fn_next_request_number(v_year) as next_no(seq integer, display_no text);

  insert into public.requests as r (
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
  returning r.* into v_row;

  return v_row;
end;
$$;

commit;
