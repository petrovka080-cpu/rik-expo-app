begin;

create or replace function public.director_report_fetch_works_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null,
  p_include_costs boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with cfg as (
  select
    'Без объекта'::text as without_object,
    'Без вида работ'::text as without_work,
    'Без этажа'::text as without_level,
    '—'::text as dash,
    case
      when nullif(trim(coalesce(p_object_name, '')), '') is null then null::text
      else trim(
        regexp_replace(
          trim(coalesce(p_object_name, '')),
          '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
          '',
          'i'
        )
      )::text
    end as target_object_name
),
system_ref as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    coalesce(
      nullif(trim(name_human_ru::text), ''),
      nullif(trim(display_name::text), ''),
      nullif(trim(alias_ru::text), ''),
      nullif(trim(name::text), '')
    )::text as system_name
  from public.ref_systems
  where trim(coalesce(code::text, '')) <> ''
  order by
    upper(trim(coalesce(code::text, ''))),
    nullif(trim(name_human_ru::text), '') desc nulls last,
    nullif(trim(display_name::text), '') desc nulls last,
    nullif(trim(alias_ru::text), '') desc nulls last,
    nullif(trim(name::text), '') desc nulls last
),
level_ref as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    coalesce(
      nullif(trim(name_human_ru::text), ''),
      nullif(trim(display_name::text), ''),
      nullif(trim(name::text), '')
    )::text as level_name
  from public.ref_levels
  where trim(coalesce(code::text, '')) <> ''
  order by
    upper(trim(coalesce(code::text, ''))),
    nullif(trim(name_human_ru::text), '') desc nulls last,
    nullif(trim(display_name::text), '') desc nulls last,
    nullif(trim(name::text), '') desc nulls last
),
ledger_names as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    nullif(trim(name::text), '')::text as name_ru
  from public.v_wh_balance_ledger_ui
  where trim(coalesce(code::text, '')) <> ''
  order by upper(trim(coalesce(code::text, '')))
),
rik_names as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    nullif(trim(name_ru::text), '')::text as name_ru
  from public.v_rik_names_ru
  where trim(coalesce(code::text, '')) <> ''
  order by upper(trim(coalesce(code::text, '')))
),
override_names as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    nullif(trim(name_ru::text), '')::text as name_ru
  from public.catalog_name_overrides
  where trim(coalesce(code::text, '')) <> ''
  order by upper(trim(coalesce(code::text, '')))
),
request_item_prices as (
  select
    pi.request_item_id::text as request_item_id,
    case
      when sum(greatest(coalesce(pi.qty, 0)::numeric, 1)) > 0
        then sum(coalesce(pi.price, 0)::numeric * greatest(coalesce(pi.qty, 0)::numeric, 1))
          / sum(greatest(coalesce(pi.qty, 0)::numeric, 1))
      else 0::numeric
    end as unit_price
  from public.purchase_items pi
  where pi.request_item_id is not null
    and coalesce(pi.price, 0)::numeric > 0
  group by pi.request_item_id::text
),
proposal_code_prices as (
  select
    upper(trim(coalesce(pi.rik_code::text, '')))::text as rik_code,
    case
      when sum(greatest(coalesce(pi.qty, 0)::numeric, 1)) > 0
        then sum(coalesce(pi.price, 0)::numeric * greatest(coalesce(pi.qty, 0)::numeric, 1))
          / sum(greatest(coalesce(pi.qty, 0)::numeric, 1))
      else 0::numeric
    end as unit_price
  from public.proposal_items pi
  where trim(coalesce(pi.rik_code::text, '')) <> ''
    and coalesce(pi.price, 0)::numeric > 0
  group by upper(trim(coalesce(pi.rik_code::text, '')))
),
source_rows as (
  select
    wi.id::text as issue_id,
    wii.id::text as issue_item_id,
    wi.iss_date::timestamptz as iss_date,
    ri.request_id::text as request_id_from_item,
    wi.request_id::text as request_id_from_issue,
    nullif(trim(wii.request_item_id::text), '')::text as request_item_id,
    wi.note::text as issue_note,
    nullif(trim(wi.object_name::text), '')::text as issue_object_name,
    nullif(trim(wi.work_name::text), '')::text as issue_work_name,
    nullif(trim(req.system_code::text), '')::text as request_system_code,
    sr.system_name::text as request_system_name,
    nullif(trim(req.level_code::text), '')::text as request_level_code,
    lr.level_name::text as request_level_name,
    nullif(trim(req.zone_code::text), '')::text as request_zone_name,
    upper(trim(coalesce(wii.rik_code::text, '')))::text as rik_code,
    coalesce(nullif(trim(wii.uom_id::text), ''), '')::text as uom,
    coalesce(wii.qty, 0)::numeric as qty
  from public.warehouse_issue_items wii
  join public.warehouse_issues wi
    on wi.id = wii.issue_id
  left join public.request_items ri
    on ri.id::text = wii.request_item_id::text
  left join public.requests req
    on req.id::text = coalesce(ri.request_id::text, wi.request_id::text)
  left join system_ref sr
    on sr.code = upper(trim(coalesce(req.system_code::text, '')))
  left join level_ref lr
    on lr.code = upper(trim(coalesce(req.level_code::text, '')))
  where wi.status = 'Подтверждено'
    and (p_from is null or wi.iss_date::date >= p_from)
    and (p_to is null or wi.iss_date::date <= p_to)
    and trim(coalesce(wii.rik_code::text, '')) <> ''
),
parsed as (
  select
    s.*,
    trim(
      regexp_replace(
        coalesce(substring(coalesce(s.issue_note, '') from '(?i)Объект:\s*([^\n\r]+)'), ''),
        '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
        '',
        'i'
      )
    )::text as free_object_name_raw,
    trim(
      regexp_replace(
        coalesce(substring(coalesce(s.issue_note, '') from '(?i)(?:Вид|Работа):\s*([^\n\r]+)'), ''),
        '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
        '',
        'i'
      )
    )::text as free_work_name_raw,
    trim(
      regexp_replace(
        coalesce(
          nullif(substring(coalesce(s.issue_note, '') from '(?i)Система:\s*([^\n\r]+)'), ''),
          substring(coalesce(s.issue_note, '') from '(?i)Контекст:\s*([^\n\r]+)')
        ),
        '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
        '',
        'i'
      )
    )::text as free_system_name_raw,
    trim(
      regexp_replace(
        coalesce(substring(coalesce(s.issue_note, '') from '(?i)Зона:\s*([^\n\r]+)'), ''),
        '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
        '',
        'i'
      )
    )::text as free_zone_name_raw,
    trim(
      regexp_replace(
        coalesce(
          nullif(substring(coalesce(s.issue_note, '') from '(?i)Этаж:\s*([^\n\r]+)'), ''),
          substring(coalesce(s.issue_note, '') from '(?i)Уровень:\s*([^\n\r]+)')
        ),
        '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
        '',
        'i'
      )
    )::text as free_level_name_raw
  from source_rows s
),
resolved as (
  select
    p.issue_id,
    p.issue_item_id,
    p.request_item_id,
    p.rik_code,
    p.uom,
    p.qty,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is not null
        then nullif(trim(coalesce(p.request_id_from_issue, '')), '')
      else coalesce(
        nullif(trim(coalesce(p.request_id_from_item, '')), ''),
        nullif(trim(coalesce(p.request_id_from_issue, '')), '')
      )
    end as request_id_resolved,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(
          nullif(trim(coalesce(p.request_id_from_item, '')), ''),
          nullif(trim(coalesce(p.request_id_from_issue, '')), '')
        ) is not null
        then true
      else false
    end as has_request_ctx,
    coalesce(
      nullif(
        trim(
          regexp_replace(
            trim(coalesce(p.issue_object_name, '')),
            '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
            '',
            'i'
          )
        ),
        ''
      ),
      cfg.without_object
    )::text as object_name_resolved,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(
          nullif(trim(coalesce(p.request_id_from_item, '')), ''),
          nullif(trim(coalesce(p.request_id_from_issue, '')), '')
        ) is not null
        then coalesce(
          nullif(
            trim(
              regexp_replace(
                regexp_replace(
                  coalesce(
                    nullif(trim(coalesce(p.request_system_name, '')), ''),
                    nullif(trim(coalesce(p.request_system_code, '')), '')
                  ),
                  '\s+',
                  ' ',
                  'g'
                ),
                '\s*/\s*',
                ' / ',
                'g'
              )
            ),
            ''
          ),
          cfg.without_work
        )
      else coalesce(
        nullif(
          trim(
            regexp_replace(
              regexp_replace(
                coalesce(
                  nullif(trim(coalesce(p.issue_work_name, '')), ''),
                  nullif(trim(coalesce(p.free_work_name_raw, '')), '')
                ),
                '\s+',
                ' ',
                'g'
              ),
              '\s*/\s*',
              ' / ',
              'g'
            )
          ),
          ''
        ),
        cfg.without_work
      )
    end::text as work_type_name,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(
          nullif(trim(coalesce(p.request_id_from_item, '')), ''),
          nullif(trim(coalesce(p.request_id_from_issue, '')), '')
        ) is not null
        then coalesce(
          nullif(
            trim(
              regexp_replace(
                regexp_replace(
                  coalesce(
                    nullif(trim(coalesce(p.request_level_name, '')), ''),
                    nullif(trim(coalesce(p.request_level_code, '')), '')
                  ),
                  '\s+',
                  ' ',
                  'g'
                ),
                '\s*/\s*',
                ' / ',
                'g'
              )
            ),
            ''
          ),
          cfg.without_level
        )
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is not null
        then cfg.without_level
      else coalesce(
        nullif(
          trim(
            regexp_replace(
              regexp_replace(
                coalesce(nullif(trim(coalesce(p.free_level_name_raw, '')), ''), cfg.without_level),
                '\s+',
                ' ',
                'g'
              ),
              '\s*/\s*',
              ' / ',
              'g'
            )
          ),
          ''
        ),
        cfg.without_level
      )
    end::text as level_name_resolved,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(
          nullif(trim(coalesce(p.request_id_from_item, '')), ''),
          nullif(trim(coalesce(p.request_id_from_issue, '')), '')
        ) is not null
        then coalesce(
          nullif(trim(coalesce(p.request_system_name, '')), ''),
          nullif(trim(coalesce(p.request_system_code, '')), '')
        )
      else nullif(trim(coalesce(p.free_system_name_raw, '')), '')
    end::text as system_name_resolved,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(
          nullif(trim(coalesce(p.request_id_from_item, '')), ''),
          nullif(trim(coalesce(p.request_id_from_issue, '')), '')
        ) is not null
        then nullif(trim(coalesce(p.request_zone_name, '')), '')
      else nullif(trim(coalesce(p.free_zone_name_raw, '')), '')
    end::text as zone_name_resolved,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(
          nullif(trim(coalesce(p.request_id_from_item, '')), ''),
          nullif(trim(coalesce(p.request_id_from_issue, '')), '')
        ) is not null
        then false
      else p.request_item_id is null
    end as is_without_request
  from parsed p
  cross join cfg
),
filtered as (
  select
    r.*,
    case
      when trim(
        concat_ws(
          ' / ',
          r.object_name_resolved,
          case when r.level_name_resolved = cfg.without_level then null else r.level_name_resolved end,
          r.system_name_resolved,
          r.zone_name_resolved
        )
      ) <> ''
        then trim(
          concat_ws(
            ' / ',
            r.object_name_resolved,
            case when r.level_name_resolved = cfg.without_level then null else r.level_name_resolved end,
            r.system_name_resolved,
            r.zone_name_resolved
          )
        )
      else r.object_name_resolved
    end::text as location_label
  from resolved r
  cross join cfg
  where cfg.target_object_name is null or r.object_name_resolved = cfg.target_object_name
),
named as (
  select
    f.issue_id,
    f.issue_item_id,
    f.request_item_id,
    f.request_id_resolved,
    f.object_name_resolved,
    f.work_type_name,
    f.level_name_resolved,
    f.system_name_resolved,
    f.zone_name_resolved,
    f.location_label,
    f.uom,
    f.qty,
    f.is_without_request,
    f.rik_code,
    coalesce(
      nullif(trim(coalesce(onm.name_ru, '')), ''),
      nullif(trim(coalesce(rnm.name_ru, '')), ''),
      nullif(trim(coalesce(lnm.name_ru, '')), ''),
      f.rik_code
    )::text as material_name_resolved,
    case
      when p_include_costs then coalesce(rip.unit_price, pcp.unit_price, 0)::numeric
      else 0::numeric
    end as unit_price,
    case
      when p_include_costs then f.qty * coalesce(rip.unit_price, pcp.unit_price, 0)::numeric
      else 0::numeric
    end as amount_sum
  from filtered f
  left join override_names onm
    on onm.code = f.rik_code
  left join rik_names rnm
    on rnm.code = f.rik_code
  left join ledger_names lnm
    on lnm.code = f.rik_code
  left join request_item_prices rip
    on rip.request_item_id = f.request_item_id
  left join proposal_code_prices pcp
    on pcp.rik_code = f.rik_code
),
materials_agg as (
  select
    n.work_type_name,
    n.object_name_resolved,
    n.level_name_resolved,
    n.system_name_resolved,
    n.zone_name_resolved,
    n.location_label,
    n.material_name_resolved,
    n.rik_code,
    n.uom,
    coalesce(sum(n.qty), 0)::numeric as qty_sum,
    count(distinct n.issue_id)::bigint as docs_count,
    coalesce(sum(n.amount_sum), 0)::numeric as amount_sum,
    array_agg(distinct n.issue_id order by n.issue_id) as source_issue_ids,
    array_agg(distinct n.request_item_id order by n.request_item_id)
      filter (where n.request_item_id is not null) as source_request_item_ids
  from named n
  group by
    n.work_type_name,
    n.object_name_resolved,
    n.level_name_resolved,
    n.system_name_resolved,
    n.zone_name_resolved,
    n.location_label,
    n.material_name_resolved,
    n.rik_code,
    n.uom
),
levels_agg as (
  select
    n.work_type_name,
    n.object_name_resolved,
    n.level_name_resolved,
    n.system_name_resolved,
    n.zone_name_resolved,
    n.location_label,
    coalesce(sum(n.qty), 0)::numeric as total_qty,
    count(distinct n.issue_id)::bigint as total_docs,
    count(*)::bigint as total_positions,
    count(*) filter (where not n.is_without_request)::bigint as req_positions,
    count(*) filter (where n.is_without_request)::bigint as free_positions,
    array_agg(distinct n.issue_id order by n.issue_id) as source_issue_ids,
    array_agg(distinct n.request_item_id order by n.request_item_id)
      filter (where n.request_item_id is not null) as source_request_item_ids
  from named n
  group by
    n.work_type_name,
    n.object_name_resolved,
    n.level_name_resolved,
    n.system_name_resolved,
    n.zone_name_resolved,
    n.location_label
),
works_agg as (
  select
    n.work_type_name,
    coalesce(sum(n.qty), 0)::numeric as total_qty,
    count(distinct n.issue_id)::bigint as total_docs,
    count(*)::bigint as total_positions,
    count(*) filter (where not n.is_without_request)::bigint as req_positions,
    count(*) filter (where n.is_without_request)::bigint as free_positions,
    count(distinct n.location_label)::bigint as location_count
  from named n
  group by n.work_type_name
),
summary_agg as (
  select
    coalesce(sum(n.qty), 0)::numeric as total_qty,
    count(distinct n.issue_id)::bigint as total_docs,
    count(*)::bigint as total_positions,
    coalesce(
      sum(
        case
          when lower(n.work_type_name) like lower(cfg.without_work) || '%' then n.qty
          else 0::numeric
        end
      ),
      0::numeric
    )::numeric as qty_without_work,
    coalesce(
      sum(
        case
          when n.level_name_resolved = cfg.without_level then n.qty
          else 0::numeric
        end
      ),
      0::numeric
    )::numeric as qty_without_level,
    count(*) filter (where n.is_without_request)::bigint as positions_without_request,
    coalesce(sum(n.amount_sum), 0)::numeric as issue_cost_total,
    count(*) filter (where n.qty > 0)::bigint as issue_positions,
    count(*) filter (where n.qty > 0 and coalesce(n.unit_price, 0) <= 0)::bigint as unpriced_issue_positions
  from named n
  cross join cfg
)
select jsonb_build_object(
  'summary',
    jsonb_build_object(
      'total_qty', coalesce((select s.total_qty from summary_agg s), 0),
      'total_docs', coalesce((select s.total_docs from summary_agg s), 0),
      'total_positions', coalesce((select s.total_positions from summary_agg s), 0),
      'pct_without_work',
        case
          when coalesce((select s.total_qty from summary_agg s), 0) > 0
            then round((coalesce((select s.qty_without_work from summary_agg s), 0) * 10000.0) / (select s.total_qty from summary_agg s)) / 100.0
          else 0
        end,
      'pct_without_level',
        case
          when coalesce((select s.total_qty from summary_agg s), 0) > 0
            then round((coalesce((select s.qty_without_level from summary_agg s), 0) * 10000.0) / (select s.total_qty from summary_agg s)) / 100.0
          else 0
        end,
      'pct_without_request',
        case
          when coalesce((select s.total_positions from summary_agg s), 0) > 0
            then round((coalesce((select s.positions_without_request from summary_agg s), 0) * 10000.0) / (select s.total_positions from summary_agg s)) / 100.0
          else 0
        end,
      'issue_cost_total', case when p_include_costs then coalesce((select s.issue_cost_total from summary_agg s), 0) else 0 end,
      'purchase_cost_total', 0,
      'issue_to_purchase_pct', 0,
      'unpriced_issue_pct',
        case
          when p_include_costs and coalesce((select s.issue_positions from summary_agg s), 0) > 0
            then round((coalesce((select s.unpriced_issue_positions from summary_agg s), 0) * 10000.0) / (select s.issue_positions from summary_agg s)) / 100.0
          else 0
        end
    ),
  'works',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', w.work_type_name,
          'work_type_name', w.work_type_name,
          'total_qty', w.total_qty,
          'total_docs', w.total_docs,
          'total_positions', w.total_positions,
          'share_total_pct',
            case
              when coalesce((select s.total_qty from summary_agg s), 0) > 0
                then round((w.total_qty * 10000.0) / (select s.total_qty from summary_agg s)) / 100.0
              else 0
            end,
          'req_positions', w.req_positions,
          'free_positions', w.free_positions,
          'location_count', w.location_count,
          'levels',
            coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', (l.work_type_name || '::' || l.location_label),
                  'level_name', l.level_name_resolved,
                  'object_name', l.object_name_resolved,
                  'system_name', l.system_name_resolved,
                  'zone_name', l.zone_name_resolved,
                  'location_label', l.location_label,
                  'total_qty', l.total_qty,
                  'total_docs', l.total_docs,
                  'total_positions', l.total_positions,
                  'share_in_work_pct',
                    case
                      when w.total_qty > 0
                        then round((l.total_qty * 10000.0) / w.total_qty) / 100.0
                      else 0
                    end,
                  'req_positions', l.req_positions,
                  'free_positions', l.free_positions,
                  'source_issue_ids', to_jsonb(coalesce(l.source_issue_ids, array[]::text[])),
                  'source_request_item_ids', to_jsonb(coalesce(l.source_request_item_ids, array[]::text[])),
                  'materials',
                    coalesce((
                      select jsonb_agg(
                        jsonb_build_object(
                          'material_name', m.material_name_resolved,
                          'rik_code', m.rik_code,
                          'uom', m.uom,
                          'qty_sum', m.qty_sum,
                          'docs_count', m.docs_count,
                          'unit_price',
                            case
                              when p_include_costs and m.qty_sum > 0 then m.amount_sum / m.qty_sum
                              else 0
                            end,
                          'amount_sum', case when p_include_costs then m.amount_sum else 0 end,
                          'source_issue_ids', to_jsonb(coalesce(m.source_issue_ids, array[]::text[])),
                          'source_request_item_ids', to_jsonb(coalesce(m.source_request_item_ids, array[]::text[]))
                        )
                        order by
                          case when p_include_costs then m.amount_sum else 0 end desc,
                          m.qty_sum desc,
                          m.material_name_resolved asc
                      )
                      from materials_agg m
                      where m.work_type_name = l.work_type_name
                        and m.object_name_resolved = l.object_name_resolved
                        and m.level_name_resolved = l.level_name_resolved
                        and coalesce(m.system_name_resolved, '') = coalesce(l.system_name_resolved, '')
                        and coalesce(m.zone_name_resolved, '') = coalesce(l.zone_name_resolved, '')
                        and m.location_label = l.location_label
                    ), '[]'::jsonb)
                )
                order by
                  l.total_qty desc,
                  l.total_positions desc,
                  l.location_label asc
              )
              from levels_agg l
              where l.work_type_name = w.work_type_name
            ), '[]'::jsonb)
        )
        order by
          w.total_qty desc,
          w.total_positions desc,
          w.work_type_name asc
      )
      from works_agg w
    ), '[]'::jsonb)
);
$$;

comment on function public.director_report_fetch_works_v1(date, date, text, boolean) is
'Canonical works payload for director reports. DB-3 completion: nested work->location->materials payload with backend material-name resolution and discipline cost shaping.';

grant execute on function public.director_report_fetch_works_v1(date, date, text, boolean) to authenticated;

commit;
