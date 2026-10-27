begin;

do $$
declare
  v_definition text;
  v_hardened_definition text;
begin
  select pg_get_functiondef('public.director_report_fetch_works_v1(date,date,text,boolean)'::regprocedure)
  into v_definition;

  if v_definition is null then
    raise exception 'director_report_fetch_works_v1(date,date,text,boolean) is missing';
  end if;

  v_hardened_definition := replace(
    v_definition,
$old$
price_scope as (
  select *
  from public.director_report_fetch_issue_price_scope_v1(
    (
      select array_agg(distinct src.request_item_id order by src.request_item_id)
      from source_rows src
      where src.request_item_id is not null
    ),
    (
      select array_agg(distinct src.rik_code order by src.rik_code)
      from source_rows src
      where src.rik_code <> ''
    ),
    false
  )
),
$old$,
$new$
price_scope as (
  select *
  from public.director_report_fetch_issue_price_scope_v1(
    case when p_include_costs then (
      select array_agg(distinct src.request_item_id order by src.request_item_id)
      from source_rows src
      where src.request_item_id is not null
    ) else '{}'::text[] end,
    case when p_include_costs then (
      select array_agg(distinct src.rik_code order by src.rik_code)
      from source_rows src
      where src.rik_code <> ''
    ) else '{}'::text[] end,
    false
  )
  where p_include_costs
),
$new$
  );

  if v_hardened_definition = v_definition then
    raise exception 'director_report_fetch_works_v1 price_scope block did not match expected definition';
  end if;

  execute v_hardened_definition;
end $$;

comment on function public.director_report_fetch_works_v1(date, date, text, boolean) is
'Canonical works payload for director reports with linked work/location/material detail and backend-safe issued-material cost shaping. C2 hardening gates price scope work when p_include_costs is false.';

grant execute on function public.director_report_fetch_works_v1(date, date, text, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
