begin;

create or replace function public.director_report_fetch_options_v1(
  p_from date default null,
  p_to date default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with cfg as (
  select 'Без объекта'::text as without_object
),
issue_scope as (
  select
    row_number() over (
      order by
        wi.iss_date desc,
        wi.id desc,
        wii.id desc
    )::bigint as sort_ord,
    wi.id::text as issue_id,
    nullif(trim(wi.request_id::text), '')::text as issue_request_id,
    nullif(trim(wi.target_object_id::text), '')::text as issue_object_id,
    wi.note::text as issue_note,
    nullif(trim(wi.object_name::text), '')::text as issue_object_name,
    nullif(trim(wii.request_item_id::text), '')::text as request_item_id
  from public.warehouse_issue_items wii
  join public.warehouse_issues wi
    on wi.id = wii.issue_id
  where wi.status = 'Подтверждено'
    and trim(coalesce(wii.rik_code::text, '')) <> ''
    and (p_from is null or wi.iss_date::date >= p_from)
    and (p_to is null or wi.iss_date::date <= p_to)
),
request_item_links as (
  select distinct on (ri.id::text)
    ri.id::text as request_item_id,
    nullif(trim(ri.request_id::text), '')::text as request_id
  from public.request_items ri
  join (
    select distinct s.request_item_id
    from issue_scope s
    where s.request_item_id is not null
  ) src
    on src.request_item_id = ri.id::text
  order by ri.id::text
),
request_scope_ids as (
  select distinct
    coalesce(ril.request_id, s.issue_request_id) as request_id
  from issue_scope s
  left join request_item_links ril
    on ril.request_item_id = s.request_item_id
  where coalesce(ril.request_id, s.issue_request_id) is not null
),
requests_ref as (
  select
    req.id::text as id,
    nullif(trim(req.object_id::text), '')::text as object_id,
    nullif(trim(req.object_name::text), '')::text as object_name,
    nullif(trim(req.object_type_code::text), '')::text as object_type_code
  from public.requests req
  join request_scope_ids src
    on src.request_id = req.id::text
),
object_scope_ids as (
  select distinct object_id
  from (
    select r.object_id
    from requests_ref r
    where r.object_id is not null
    union all
    select s.issue_object_id
    from issue_scope s
    where s.issue_object_id is not null
  ) ids
),
objects_ref as (
  select
    o.id::text as id,
    nullif(trim(o.name::text), '')::text as name
  from public.objects o
  join object_scope_ids src
    on src.object_id = o.id::text
),
object_types_ref as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    coalesce(
      nullif(trim(name_human_ru::text), ''),
      nullif(trim(display_name::text), ''),
      nullif(trim(name::text), '')
    )::text as object_type_name
  from public.ref_object_types
  where trim(coalesce(code::text, '')) <> ''
  order by
    upper(trim(coalesce(code::text, ''))),
    nullif(trim(name_human_ru::text), '') desc nulls last,
    nullif(trim(display_name::text), '') desc nulls last,
    nullif(trim(name::text), '') desc nulls last
),
parsed as (
  select
    s.*,
    trim(
      regexp_replace(
        coalesce(
          substring(coalesce(s.issue_note, '') from '(?i)Объект:\s*([^\n\r]+)'),
          ''
        ),
        '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
        '',
        'i'
      )
    )::text as free_object_name_raw
  from issue_scope s
),
resolved as (
  select
    p.sort_ord,
    coalesce(r.object_id, p.issue_object_id)::text as object_id_resolved,
    coalesce(
      nullif(
        trim(
          regexp_replace(
            coalesce(o_req.name, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      nullif(
        trim(
          regexp_replace(
            coalesce(r.object_name, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      nullif(
        trim(
          regexp_replace(
            coalesce(rot.object_type_name, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      nullif(
        trim(
          regexp_replace(
            coalesce(o_issue.name, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      nullif(
        trim(
          regexp_replace(
            coalesce(p.issue_object_name, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      nullif(
        trim(
          regexp_replace(
            coalesce(p.free_object_name_raw, ''),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      cfg.without_object
    )::text as object_name_canonical
  from parsed p
  left join request_item_links ril
    on ril.request_item_id = p.request_item_id
  left join requests_ref r
    on r.id = coalesce(ril.request_id, p.issue_request_id)
  left join objects_ref o_req
    on o_req.id = r.object_id
  left join objects_ref o_issue
    on o_issue.id = p.issue_object_id
  left join object_types_ref rot
    on rot.code = upper(trim(coalesce(r.object_type_code, '')))
  cross join cfg
),
grouped as (
  select
    r.object_name_canonical,
    (
      array_agg(r.object_id_resolved order by r.sort_ord)
      filter (where r.object_id_resolved is not null)
    )[1]::text as object_id_resolved
  from resolved r
  group by r.object_name_canonical
)
select jsonb_build_object(
  'objects',
    coalesce(
      (
        select jsonb_agg(g.object_name_canonical order by g.object_name_canonical)
        from grouped g
      ),
      '[]'::jsonb
    ),
  'objectIdByName',
    coalesce(
      (
        select jsonb_object_agg(g.object_name_canonical, to_jsonb(g.object_id_resolved))
        from grouped g
      ),
      '{}'::jsonb
    )
);
$$;

comment on function public.director_report_fetch_options_v1(date, date) is
'Director report options payload for selected period. Replaces wide fact-row options extraction with direct object identity aggregation.';

grant execute on function public.director_report_fetch_options_v1(date, date) to authenticated;

commit;
