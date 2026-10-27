begin;

create index if not exists idx_market_listings_active_created_feed_v2
  on public.market_listings (created_at desc)
  where status = 'active';

create index if not exists idx_market_listings_active_side_created_feed_v2
  on public.market_listings (side, created_at desc)
  where status = 'active';

create index if not exists idx_market_listings_active_kind_created_feed_v2
  on public.market_listings (kind, created_at desc)
  where status = 'active';

create index if not exists idx_market_listings_active_side_kind_created_feed_v2
  on public.market_listings (side, kind, created_at desc)
  where status = 'active';

drop function if exists public.marketplace_items_scope_page_v1(integer, integer, text, text);

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
  image_urls jsonb,
  video_url text,
  video_urls jsonb,
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
with page_counts as (
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
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Supplier') as supplier_name,
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Supplier') as seller_display_name
  from public.market_listings ml
  left join public.companies c
    on c.id = ml.company_id
  left join public.user_profiles up
    on up.user_id = ml.user_id
  where ml.status = 'active'
    and (p_side is null or ml.side = p_side)
    and (p_kind is null or ml.kind = p_kind)
  order by ml.created_at desc
  offset greatest(coalesce(p_offset, 0), 0)
  limit greatest(least(coalesce(p_limit, 24), 100), 1)
)
select
  pl.id,
  pl.title as name,
  pl.title,
  coalesce(nullif(trim(pl.kind), ''), 'material') as category,
  pl.price,
  pl.company_id as supplier_id,
  pl.supplier_name,
  false as in_stock,
  coalesce(nullif(trim(pl.uom_code), ''), nullif(trim(pl.uom), '')) as unit,
  media.image_urls ->> 0 as image_url,
  media.image_urls,
  media.video_urls ->> 0 as video_url,
  media.video_urls,
  pl.user_id,
  pl.company_id,
  pl.seller_display_name,
  pl.city,
  pl.kind,
  pl.side,
  pl.description,
  pl.contacts_phone,
  pl.contacts_whatsapp,
  pl.contacts_email,
  pl.items_json_jsonb as items_json,
  '[]'::jsonb as erp_items_json,
  pl.uom,
  pl.uom_code,
  pl.rik_code,
  pl.status,
  pl.created_at,
  pl.updated_at,
  nullif(trim(pl.rik_code), '') as primary_rik_code,
  null::numeric as stock_qty_available,
  null::text as stock_uom,
  null::numeric as total_available_count,
  0::integer as stock_match_count,
  0::integer as erp_item_count,
  page_counts.total_count,
  page_counts.active_demand_count
from page_listings pl
cross join page_counts
cross join lateral (
  select
    public.marketplace_listing_public_image_urls_v1(pl.id, 5) as image_urls,
    public.marketplace_listing_public_video_urls_v1(pl.id, 1) as video_urls
) media
order by pl.created_at desc;
$$;

drop function if exists public.marketplace_item_scope_detail_v1(uuid);

create or replace function public.marketplace_item_scope_detail_v1(
  p_listing_id uuid
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
  image_urls jsonb,
  video_url text,
  video_urls jsonb,
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
  erp_item_count integer
)
language sql
stable
set search_path = public
as $$
with target_listing as (
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
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Supplier') as supplier_name,
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Supplier') as seller_display_name
  from public.market_listings ml
  left join public.companies c
    on c.id = ml.company_id
  left join public.user_profiles up
    on up.user_id = ml.user_id
  where ml.status = 'active'
    and ml.id = p_listing_id
)
select
  tl.id,
  tl.title as name,
  tl.title,
  coalesce(nullif(trim(tl.kind), ''), 'material') as category,
  tl.price,
  tl.company_id as supplier_id,
  tl.supplier_name,
  false as in_stock,
  coalesce(nullif(trim(tl.uom_code), ''), nullif(trim(tl.uom), '')) as unit,
  media.image_urls ->> 0 as image_url,
  media.image_urls,
  media.video_urls ->> 0 as video_url,
  media.video_urls,
  tl.user_id,
  tl.company_id,
  tl.seller_display_name,
  tl.city,
  tl.kind,
  tl.side,
  tl.description,
  tl.contacts_phone,
  tl.contacts_whatsapp,
  tl.contacts_email,
  tl.items_json_jsonb as items_json,
  coalesce(erp.items, '[]'::jsonb) as erp_items_json,
  tl.uom,
  tl.uom_code,
  tl.rik_code,
  tl.status,
  tl.created_at,
  tl.updated_at,
  nullif(trim(tl.rik_code), '') as primary_rik_code,
  null::numeric as stock_qty_available,
  null::text as stock_uom,
  null::numeric as total_available_count,
  0::integer as stock_match_count,
  coalesce(jsonb_array_length(erp.items), 0)::integer as erp_item_count
from target_listing tl
cross join lateral (
  select
    public.marketplace_listing_public_image_urls_v1(tl.id, 5) as image_urls,
    public.marketplace_listing_public_video_urls_v1(tl.id, 1) as video_urls
) media
cross join lateral (
  select case
    when jsonb_array_length(
      case
        when jsonb_typeof(coalesce(tl.items_json_jsonb, '[]'::jsonb)) = 'array'
          then coalesce(tl.items_json_jsonb, '[]'::jsonb)
        else '[]'::jsonb
      end
    ) > 0
      then (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'rikCode', nullif(trim(coalesce(item ->> 'rik_code', item ->> 'rikCode', tl.rik_code)), ''),
              'nameHuman', coalesce(nullif(trim(item ->> 'name'), ''), nullif(trim(item ->> 'nameHuman'), ''), tl.title),
              'uom', coalesce(nullif(trim(item ->> 'uom'), ''), nullif(trim(tl.uom_code), ''), nullif(trim(tl.uom), '')),
              'qty', coalesce(nullif(trim(item ->> 'qty'), '')::numeric, 1::numeric),
              'price', coalesce(nullif(trim(item ->> 'price'), '')::numeric, tl.price),
              'kind', coalesce(nullif(trim(item ->> 'kind'), ''), nullif(trim(tl.kind), ''))
            )
            order by ordinality
          ) filter (where nullif(trim(coalesce(item ->> 'rik_code', item ->> 'rikCode', tl.rik_code)), '') is not null),
          '[]'::jsonb
        )
        from jsonb_array_elements(
          case
            when jsonb_typeof(coalesce(tl.items_json_jsonb, '[]'::jsonb)) = 'array'
              then coalesce(tl.items_json_jsonb, '[]'::jsonb)
            else '[]'::jsonb
          end
        ) with ordinality as source(item, ordinality)
      )
    when nullif(trim(tl.rik_code), '') is not null
      then jsonb_build_array(jsonb_build_object(
        'rikCode', nullif(trim(tl.rik_code), ''),
        'nameHuman', coalesce(nullif(trim(tl.title), ''), nullif(trim(tl.rik_code), '')),
        'uom', coalesce(nullif(trim(tl.uom_code), ''), nullif(trim(tl.uom), '')),
        'qty', 1::numeric,
        'price', tl.price,
        'kind', nullif(trim(tl.kind), '')
      ))
    else '[]'::jsonb
  end as items
) erp;
$$;

grant execute on function public.marketplace_items_scope_page_v1(integer, integer, text, text) to anon, authenticated;
grant execute on function public.marketplace_item_scope_detail_v1(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
