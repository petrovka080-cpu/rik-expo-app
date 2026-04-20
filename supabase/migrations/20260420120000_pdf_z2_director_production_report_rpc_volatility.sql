begin;

alter function public.director_report_transport_scope_v1(date, date, text, boolean, boolean)
  volatile;

alter function public.pdf_director_production_source_v1(text, text, text, boolean)
  volatile;

comment on function public.director_report_transport_scope_v1(date, date, text, boolean, boolean) is
  'PDF-Z2: Director report transport wrapper is VOLATILE because the discipline branch calls director_report_fetch_works_v1, which records runtime metrics. Prevents PostgREST read-only transaction failures without changing report semantics.';

comment on function public.pdf_director_production_source_v1(text, text, text, boolean) is
  'PDF-Z2: Director production PDF source wrapper is VOLATILE because it calls the runtime-metric-backed Director works source. Prevents PostgREST read-only transaction failures without changing PDF formulas, grouping, ordering, or template semantics.';

do $$
declare
  v_transport_volatility "char";
  v_pdf_source_volatility "char";
  v_works_source_volatility "char";
begin
  select p.provolatile
    into v_transport_volatility
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid = 'public.director_report_transport_scope_v1(date,date,text,boolean,boolean)'::regprocedure;

  select p.provolatile
    into v_pdf_source_volatility
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid = 'public.pdf_director_production_source_v1(text,text,text,boolean)'::regprocedure;

  select p.provolatile
    into v_works_source_volatility
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.oid = 'public.director_report_fetch_works_v1(date,date,text,boolean)'::regprocedure;

  if v_works_source_volatility <> 'v' then
    raise exception 'PDF-Z2 volatility guard failed: director_report_fetch_works_v1 is not volatile';
  end if;

  if v_transport_volatility <> 'v' then
    raise exception 'PDF-Z2 volatility guard failed: director_report_transport_scope_v1 is not volatile';
  end if;

  if v_pdf_source_volatility <> 'v' then
    raise exception 'PDF-Z2 volatility guard failed: pdf_director_production_source_v1 is not volatile';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
