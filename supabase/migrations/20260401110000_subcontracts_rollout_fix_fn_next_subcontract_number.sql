begin;

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
  v_next integer;
begin
  perform pg_advisory_xact_lock(7201, v_year);

  select coalesce(max(s.seq), 0) + 1
    into v_next
  from public.subcontracts s
  where s.year = v_year;

  seq := v_next;
  display_no := format('SUB-%s-%s', right(v_year::text, 2), lpad(v_next::text, 3, '0'));
  return next;
end;
$$;

comment on function public.fn_next_subcontract_number(integer) is
  'Atomic subcontract numbering helper used by subcontract create RPCs.';

commit;
