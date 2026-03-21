begin;

create or replace function public.fn_next_request_number(
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
  perform pg_advisory_xact_lock(7101, v_year);

  select coalesce(max(r.seq), 0)
    into v_max
  from public.requests r
  where r.year = v_year;

  v_next := v_max + 1;

  seq := v_next;
  display_no := format('REQ-%s/%s', lpad(v_next::text, 4, '0'), v_year::text);
  return next;
end;
$$;

notify pgrst, 'reload schema';

commit;
