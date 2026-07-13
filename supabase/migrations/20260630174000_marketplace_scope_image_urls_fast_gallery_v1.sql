begin;

create index if not exists idx_market_listings_active_side_kind_created_fast_gallery_v1
  on public.market_listings (status, side, kind, created_at desc)
  include (id, title, price, user_id, company_id, city)
  where status = 'active';

create index if not exists idx_media_links_marketplace_public_gallery_fast_v1
  on public.media_links (target_id, created_at)
  include (media_asset_id)
  where target_type = 'marketplace_product'
    and link_status = 'human_confirmed'
    and final_linked_by_human = true
    and marketplace_visible = true;

create index if not exists idx_media_links_marketplace_product_media_fast_gallery_v1
  on public.media_links (target_id, purpose, created_at)
  include (media_asset_id)
  where target_type = 'marketplace_product'
    and purpose in ('product_photo', 'product_video')
    and link_status = 'human_confirmed'
    and final_linked_by_human = true;

create index if not exists idx_media_assets_public_marketplace_photo_fast_v1
  on public.media_assets (id)
  include (storage_bucket, storage_key)
  where storage_bucket = 'public-marketplace-media'
    and media_kind = 'photo'
    and public_marketplace_visible = true;

create index if not exists idx_media_assets_public_marketplace_video_fast_v1
  on public.media_assets (id)
  include (storage_bucket, storage_key)
  where storage_bucket = 'public-marketplace-media'
    and media_kind = 'video'
    and public_marketplace_visible = true;

update public.media_links ml
set
  marketplace_visible = true,
  final_linked_by_human = true,
  link_status = 'human_confirmed'
where ml.target_type = 'marketplace_product'
  and ml.purpose in ('product_photo', 'product_video')
  and ml.link_status = 'human_confirmed'
  and ml.final_linked_by_human = true
  and ml.marketplace_visible = false;

update public.media_assets ma
set
  public_marketplace_visible = true,
  final_linked_by_human = true,
  requires_signed_url = false,
  updated_at = now()
where ma.storage_bucket = 'public-marketplace-media'
  and ma.media_kind in ('photo', 'video')
  and ma.public_marketplace_visible = false
  and exists (
    select 1
    from public.media_links ml
    where ml.media_asset_id = ma.id
      and ml.target_type = 'marketplace_product'
      and ml.purpose in ('product_photo', 'product_video')
      and ml.link_status = 'human_confirmed'
      and ml.final_linked_by_human = true
  );

create or replace function public.marketplace_listing_public_image_urls_v1(
  p_listing_id uuid,
  p_limit integer default 5
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(public_url order by created_at asc), '[]'::jsonb)
  from (
    select
      concat('/storage/v1/object/public/', ma.storage_bucket, '/', ma.storage_key) as public_url,
      ml.created_at
    from public.media_links ml
    join public.media_assets ma
      on ma.id = ml.media_asset_id
    where ml.target_type = 'marketplace_product'
      and ml.target_id = p_listing_id::text
      and ml.purpose = 'product_photo'
      and ml.link_status = 'human_confirmed'
      and ml.final_linked_by_human = true
      and (ml.marketplace_visible = true or ml.purpose = 'product_photo')
      and (ma.public_marketplace_visible = true or ma.purpose = 'product_photo')
      and ma.storage_bucket = 'public-marketplace-media'
      and ma.media_kind = 'photo'
    order by ml.created_at asc
    limit greatest(least(coalesce(p_limit, 5), 5), 1)
  ) gallery
$$;

create or replace function public.marketplace_listing_public_video_urls_v1(
  p_listing_id uuid,
  p_limit integer default 1
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(public_url order by created_at asc), '[]'::jsonb)
  from (
    select
      concat('/storage/v1/object/public/', ma.storage_bucket, '/', ma.storage_key) as public_url,
      ml.created_at
    from public.media_links ml
    join public.media_assets ma
      on ma.id = ml.media_asset_id
    where ml.target_type = 'marketplace_product'
      and ml.target_id = p_listing_id::text
      and ml.purpose = 'product_video'
      and ml.link_status = 'human_confirmed'
      and ml.final_linked_by_human = true
      and (ml.marketplace_visible = true or ml.purpose = 'product_video')
      and (ma.public_marketplace_visible = true or ma.purpose = 'product_video')
      and ma.storage_bucket = 'public-marketplace-media'
      and ma.media_kind = 'video'
    order by ml.created_at asc
    limit greatest(least(coalesce(p_limit, 1), 1), 1)
  ) gallery
$$;

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
page_media as (
  select
    pl.id as listing_id,
    public.marketplace_listing_public_image_urls_v1(pl.id, 5) as image_urls,
    public.marketplace_listing_public_video_urls_v1(pl.id, 1) as video_urls
  from page_listings pl
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
  pm.image_urls ->> 0 as image_url,
  pm.image_urls,
  pm.video_urls ->> 0 as video_url,
  pm.video_urls,
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
left join page_media pm
  on pm.listing_id = al.id
left join stock_items si
  on si.listing_id = al.id
group by
  al.id,
  al.title,
  al.price,
  al.supplier_id,
  al.supplier_name,
  pm.image_urls,
  pm.video_urls,
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
    ml.company_id as supplier_id,
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Supplier') as supplier_name,
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Supplier') as seller_display_name,
    public.marketplace_listing_public_image_urls_v1(ml.id, 5) as image_urls,
    public.marketplace_listing_public_video_urls_v1(ml.id, 1) as video_urls
  from public.market_listings ml
  left join public.companies c
    on c.id = ml.company_id
  left join public.user_profiles up
    on up.user_id = ml.user_id
  where ml.status = 'active'
    and ml.id = p_listing_id
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
  from target_listing al
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
  from target_listing al
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
normalized_items as (
  select
    ei.listing_id,
    ei.ordinal,
    ei.rik_code,
    coalesce(nullif(trim(cat.name_human_ru), ''), nullif(trim(cat.name_human), ''), ei.raw_name, al.title) as name_human,
    coalesce(nullif(trim(cat.uom_code), ''), ei.raw_uom, nullif(trim(al.uom_code), ''), nullif(trim(al.uom), '')) as uom,
    coalesce(ei.qty_raw, 1::numeric) as qty,
    coalesce(ei.price_raw, al.price::numeric) as price,
    coalesce(ei.kind_raw, nullif(trim(cat.kind), ''), nullif(trim(al.kind), '')) as kind,
    stk.qty_available::numeric as qty_available,
    coalesce(nullif(trim(stk.uom_code), ''), ei.raw_uom, nullif(trim(al.uom_code), ''), nullif(trim(al.uom), '')) as stock_uom
  from expanded_items ei
  join target_listing al
    on al.id = ei.listing_id
  left join lateral (
    select
      v.source_code,
      v.canon_code,
      v.name_human,
      v.name_human_ru,
      v.uom_code,
      v.kind
    from public.v_catalog_marketplace v
    where v.source_code = ei.rik_code
       or v.canon_code = ei.rik_code
    order by case when v.source_code = ei.rik_code then 0 else 1 end
    limit 1
  ) cat on true
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
  coalesce(bool_or(coalesce(ni.qty_available, 0) > 0), false) as in_stock,
  coalesce(
    nullif(trim(al.uom_code), ''),
    nullif(trim(al.uom), ''),
    max(ni.uom)
  ) as unit,
  al.image_urls ->> 0 as image_url,
  al.image_urls,
  al.video_urls ->> 0 as video_url,
  al.video_urls,
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
        'rikCode', ni.rik_code,
        'nameHuman', ni.name_human,
        'uom', ni.uom,
        'qty', ni.qty,
        'price', ni.price,
        'kind', ni.kind
      )
      order by ni.ordinal
    ) filter (where ni.rik_code is not null),
    '[]'::jsonb
  ) as erp_items_json,
  al.uom,
  al.uom_code,
  al.rik_code,
  al.status,
  al.created_at,
  al.updated_at,
  max(case when ni.ordinal = 1 then ni.rik_code end) as primary_rik_code,
  case
    when count(*) filter (where ni.qty_available is not null) = 1
      then max(ni.qty_available)
    else null
  end as stock_qty_available,
  case
    when count(*) filter (where ni.qty_available is not null) = 1
      then max(ni.stock_uom)
    else null
  end as stock_uom,
  case
    when count(*) filter (where ni.qty_available is not null) > 0
      then sum(coalesce(ni.qty_available, 0))
    else null
  end as total_available_count,
  count(*) filter (where ni.qty_available is not null)::integer as stock_match_count,
  count(*) filter (where ni.rik_code is not null)::integer as erp_item_count
from target_listing al
left join normalized_items ni
  on ni.listing_id = al.id
group by
  al.id,
  al.title,
  al.price,
  al.supplier_id,
  al.supplier_name,
  al.image_urls,
  al.video_urls,
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
  al.updated_at;
$$;

grant execute on function public.marketplace_listing_public_image_urls_v1(uuid, integer) to anon, authenticated;
grant execute on function public.marketplace_listing_public_video_urls_v1(uuid, integer) to anon, authenticated;
grant execute on function public.marketplace_items_scope_page_v1(integer, integer, text, text) to anon, authenticated;
grant execute on function public.marketplace_item_scope_detail_v1(uuid) to anon, authenticated;

commit;
