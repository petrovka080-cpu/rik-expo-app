begin;

create or replace function public.marketplace_listing_is_public_feed_fixture_v1(
  p_title text,
  p_description text,
  p_contacts_email text,
  p_client_mutation_id text,
  p_items_json jsonb
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    lower(coalesce(p_title, '')) like '%synthetic marketplace listing%'
    or lower(coalesce(p_description, '')) like '%synthetic marketplace searchable description%'
    or lower(coalesce(p_contacts_email, '')) ~ '^proof-[0-9]+@example\.invalid$'
    or lower(coalesce(p_client_mutation_id, '')) ~ '^proof_[a-z0-9][a-z0-9_-]*:market-listing:'
    or coalesce(p_items_json, 'null'::jsonb)::text ~* '"proof_run_id"[[:space:]]*:[[:space:]]*"proof_[a-z0-9][a-z0-9_-]{2,}"';
$$;

create or replace function public.marketplace_listing_public_image_urls_v1(
  p_listing_id uuid,
  p_limit integer default 7
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
    limit greatest(least(coalesce(p_limit, 7), 7), 1)
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
  active_demand_count bigint,
  material_count bigint,
  work_count bigint,
  service_count bigint,
  delivery_count bigint,
  rent_count bigint
)
language sql
stable
set search_path = public
as $$
with eligible_listings as (
  select ml.*
  from public.market_listings ml
  where ml.status = 'active'
    and (p_side is null or ml.side = p_side)
    and (p_kind is null or ml.kind = p_kind)
    and not public.marketplace_listing_is_public_feed_fixture_v1(
      ml.title,
      ml.description,
      ml.contacts_email,
      ml.client_mutation_id,
      ml.items_json::jsonb
    )
),
eligible_active_for_counts as (
  select ml.*
  from public.market_listings ml
  where ml.status = 'active'
    and (p_side is null or ml.side = p_side)
    and (p_kind is null or ml.kind = p_kind)
    and not public.marketplace_listing_is_public_feed_fixture_v1(
      ml.title,
      ml.description,
      ml.contacts_email,
      ml.client_mutation_id,
      ml.items_json::jsonb
    )
),
page_counts as (
  select
    (select count(*)::bigint from eligible_listings) as total_count,
    (
      select count(*)::bigint
      from public.market_listings ml
      where ml.status = 'active'
        and ml.side = 'demand'
        and not public.marketplace_listing_is_public_feed_fixture_v1(
          ml.title,
          ml.description,
          ml.contacts_email,
          ml.client_mutation_id,
          ml.items_json::jsonb
        )
    ) as active_demand_count,
    count(*) filter (where kind = 'material')::bigint as material_count,
    count(*) filter (where kind = 'work')::bigint as work_count,
    count(*) filter (where kind = 'service')::bigint as service_count,
    count(*) filter (
      where kind = 'delivery'
        or lower(coalesce(title, '') || ' ' || coalesce(description, '')) like '%достав%'
        or lower(coalesce(title, '') || ' ' || coalesce(description, '')) like '%delivery%'
    )::bigint as delivery_count,
    count(*) filter (where kind = 'rent')::bigint as rent_count
  from eligible_active_for_counts
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
  from eligible_listings ml
  left join public.companies c
    on c.id = ml.company_id
  left join public.user_profiles up
    on up.user_id = ml.user_id
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
  page_counts.active_demand_count,
  page_counts.material_count,
  page_counts.work_count,
  page_counts.service_count,
  page_counts.delivery_count,
  page_counts.rent_count
from page_listings pl
cross join page_counts
cross join lateral (
  select
    public.marketplace_listing_public_image_urls_v1(pl.id, 7) as image_urls,
    public.marketplace_listing_public_video_urls_v1(pl.id, 1) as video_urls
) media
order by pl.created_at desc;
$$;

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
    and not public.marketplace_listing_is_public_feed_fixture_v1(
      ml.title,
      ml.description,
      ml.contacts_email,
      ml.client_mutation_id,
      ml.items_json::jsonb
    )
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
  '[]'::jsonb as erp_items_json,
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
  0::integer as erp_item_count
from target_listing tl
cross join lateral (
  select
    public.marketplace_listing_public_image_urls_v1(tl.id, 7) as image_urls,
    public.marketplace_listing_public_video_urls_v1(tl.id, 1) as video_urls
) media
order by tl.created_at desc;
$$;

create or replace function public.marketplace_my_listings_scope_page_v1(
  p_offset integer default 0,
  p_limit integer default 8
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
with scoped_listings as (
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
    coalesce(nullif(trim(ml.status), ''), 'active') as status,
    ml.created_at,
    ml.updated_at,
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Supplier') as supplier_name,
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Supplier') as seller_display_name
  from public.market_listings ml
  left join public.companies c
    on c.id = ml.company_id
  left join public.user_profiles up
    on up.user_id = ml.user_id
  where auth.uid() is not null
    and ml.user_id = auth.uid()
    and not public.marketplace_listing_is_public_feed_fixture_v1(
      ml.title,
      ml.description,
      ml.contacts_email,
      ml.client_mutation_id,
      ml.items_json::jsonb
    )
),
page_counts as (
  select
    count(*)::bigint as total_count,
    count(*) filter (where side = 'demand' and status in ('active', 'published'))::bigint as active_demand_count
  from scoped_listings
),
page_listings as (
  select *
  from scoped_listings
  order by created_at desc nulls last, id desc
  offset greatest(coalesce(p_offset, 0), 0)
  limit greatest(least(coalesce(p_limit, 8), 24), 1)
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
    public.marketplace_listing_public_image_urls_v1(pl.id, 7) as image_urls,
    public.marketplace_listing_public_video_urls_v1(pl.id, 1) as video_urls
) media
order by pl.created_at desc nulls last, pl.id desc;
$$;

grant execute on function public.marketplace_listing_is_public_feed_fixture_v1(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.marketplace_listing_public_image_urls_v1(uuid, integer) to anon, authenticated;
grant execute on function public.marketplace_items_scope_page_v1(integer, integer, text, text) to anon, authenticated;
grant execute on function public.marketplace_item_scope_detail_v1(uuid) to anon, authenticated;
grant execute on function public.marketplace_my_listings_scope_page_v1(integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
