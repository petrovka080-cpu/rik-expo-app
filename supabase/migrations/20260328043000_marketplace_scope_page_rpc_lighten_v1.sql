create or replace function public.marketplace_items_scope_page_v1(
  p_offset integer default 0,
  p_limit integer default 24,
  p_side text default null,
  p_kind text default null
)
returns table (
  id uuid,
  name text,
  title text,
  category text,
  price numeric,
  supplier_id uuid,
  supplier_name text,
  in_stock boolean,
  unit text,
  image_url text,
  user_id uuid,
  company_id uuid,
  seller_display_name text,
  city text,
  kind text,
  side text,
  description text,
  contacts_phone text,
  contacts_whatsapp text,
  contacts_email text,
  items_json jsonb,
  erp_items_json jsonb,
  uom text,
  uom_code text,
  rik_code text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  primary_rik_code text,
  stock_qty_available numeric,
  stock_uom text,
  total_available_count numeric,
  stock_match_count integer,
  erp_item_count integer,
  total_count bigint,
  active_demand_count bigint
)
language sql
stable
set search_path = public
as $$
with filtered_listings as (
  select
    ml.id,
    ml.title,
    ml.user_id,
    ml.company_id,
    ml.city,
    ml.price,
    ml.kind,
    ml.side,
    ml.description,
    ml.contacts_phone,
    ml.contacts_whatsapp,
    ml.contacts_email,
    ml.items_json::jsonb as items_json_jsonb,
    ml.uom,
    ml.uom_code,
    ml.rik_code,
    ml.status,
    ml.created_at,
    ml.updated_at,
    ml.company_id as supplier_id,
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Поставщик') as supplier_name,
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Поставщик') as seller_display_name,
    null::text as image_url
  from public.market_listings ml
  left join public.companies c
    on c.id = ml.company_id
  left join public.user_profiles up
    on up.user_id = ml.user_id
  where ml.status = 'active'
    and (p_side is null or ml.side = p_side)
    and (p_kind is null or ml.kind = p_kind)
),
page_counts as (
  select
    (
      select count(*)::bigint
      from public.market_listings ml
      where ml.status = 'active'
        and (p_side is null or ml.side = p_side)
        and (p_kind is null or ml.kind = p_kind)
    ) as total_count,
    (
      select count(*)::bigint
      from public.market_listings ml
      where ml.status = 'active'
        and ml.side = 'demand'
    ) as active_demand_count
),
page_listings as (
  select *
  from filtered_listings
  order by created_at desc
  offset greatest(coalesce(p_offset, 0), 0)
  limit greatest(least(coalesce(p_limit, 24), 100), 1)
),
expanded_items as (
  select
    al.id as listing_id,
    ord.ordinality::integer as ordinal,
    nullif(trim(coalesce(ord.item ->> 'rik_code', al.rik_code)), '') as rik_code,
    nullif(trim(ord.item ->> 'name'), '') as raw_name,
    nullif(trim(ord.item ->> 'uom'), '') as raw_uom,
    case
      when nullif(trim(ord.item ->> 'qty'), '') is null then null
      else nullif(trim(ord.item ->> 'qty'), '')::numeric
    end as qty_raw,
    case
      when nullif(trim(ord.item ->> 'price'), '') is null then null
      else nullif(trim(ord.item ->> 'price'), '')::numeric
    end as price_raw,
    nullif(trim(ord.item ->> 'kind'), '') as kind_raw
  from page_listings al
  join lateral jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(al.items_json_jsonb, '[]'::jsonb)) = 'array'
        then coalesce(al.items_json_jsonb, '[]'::jsonb)
      else '[]'::jsonb
    end
  ) with ordinality as ord(item, ordinality) on true

  union all

  select
    al.id as listing_id,
    1 as ordinal,
    nullif(trim(al.rik_code), '') as rik_code,
    nullif(trim(al.title), '') as raw_name,
    coalesce(nullif(trim(al.uom_code), ''), nullif(trim(al.uom), '')) as raw_uom,
    1::numeric as qty_raw,
    al.price::numeric as price_raw,
    nullif(trim(al.kind), '') as kind_raw
  from page_listings al
  where not exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(coalesce(al.items_json_jsonb, '[]'::jsonb)) = 'array'
          then coalesce(al.items_json_jsonb, '[]'::jsonb)
        else '[]'::jsonb
      end
    ) as existing(item)
  )
    and nullif(trim(al.rik_code), '') is not null
),
stock_items as (
  select
    ei.listing_id,
    ei.ordinal,
    ei.rik_code,
    ei.raw_name,
    ei.raw_uom,
    coalesce(ei.qty_raw, 1::numeric) as qty,
    ei.price_raw,
    ei.kind_raw,
    stk.qty_available::numeric as qty_available,
    nullif(trim(stk.uom_code), '') as stock_uom
  from expanded_items ei
  left join public.v_marketplace_catalog_stock stk
    on stk.code = ei.rik_code
)
select
  al.id,
  al.title as name,
  al.title,
  coalesce(nullif(trim(al.kind), ''), 'material') as category,
  al.price,
  al.supplier_id,
  al.supplier_name,
  coalesce(bool_or(coalesce(si.qty_available, 0) > 0), false) as in_stock,
  coalesce(
    nullif(trim(al.uom_code), ''),
    nullif(trim(al.uom), ''),
    case
      when count(*) filter (where si.qty_available is not null) = 1
        then max(si.stock_uom)
      else null
    end
  ) as unit,
  al.image_url,
  al.user_id,
  al.company_id,
  al.seller_display_name,
  al.city,
  al.kind,
  al.side,
  al.description,
  al.contacts_phone,
  al.contacts_whatsapp,
  al.contacts_email,
  al.items_json_jsonb as items_json,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rikCode', si.rik_code,
        'nameHuman', coalesce(si.raw_name, al.title, si.rik_code),
        'uom', coalesce(si.raw_uom, nullif(trim(al.uom_code), ''), nullif(trim(al.uom), '')),
        'qty', si.qty,
        'price', coalesce(si.price_raw, al.price::numeric),
        'kind', coalesce(si.kind_raw, nullif(trim(al.kind), ''))
      )
      order by si.ordinal
    ) filter (where si.rik_code is not null),
    '[]'::jsonb
  ) as erp_items_json,
  al.uom,
  al.uom_code,
  al.rik_code,
  al.status,
  al.created_at,
  al.updated_at,
  max(case when si.ordinal = 1 then si.rik_code end) as primary_rik_code,
  case
    when count(*) filter (where si.qty_available is not null) = 1
      then max(si.qty_available)
    else null
  end as stock_qty_available,
  case
    when count(*) filter (where si.qty_available is not null) = 1
      then max(si.stock_uom)
    else null
  end as stock_uom,
  case
    when count(*) filter (where si.qty_available is not null) > 0
      then sum(coalesce(si.qty_available, 0))
    else null
  end as total_available_count,
  count(*) filter (where si.qty_available is not null)::integer as stock_match_count,
  count(*) filter (where si.rik_code is not null)::integer as erp_item_count,
  page_counts.total_count,
  page_counts.active_demand_count
from page_listings al
cross join page_counts
left join stock_items si
  on si.listing_id = al.id
group by
  al.id,
  al.title,
  al.price,
  al.supplier_id,
  al.supplier_name,
  al.image_url,
  al.user_id,
  al.company_id,
  al.seller_display_name,
  al.city,
  al.kind,
  al.side,
  al.description,
  al.contacts_phone,
  al.contacts_whatsapp,
  al.contacts_email,
  al.items_json_jsonb,
  al.uom,
  al.uom_code,
  al.rik_code,
  al.status,
  al.created_at,
  al.updated_at,
  page_counts.total_count,
  page_counts.active_demand_count
order by al.created_at desc;
$$;
