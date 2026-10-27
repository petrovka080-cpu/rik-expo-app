begin;

create index if not exists idx_market_listings_my_user_created_v1
  on public.market_listings (user_id, created_at desc, id desc);

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
    public.marketplace_listing_public_image_urls_v1(pl.id, 5) as image_urls,
    public.marketplace_listing_public_video_urls_v1(pl.id, 1) as video_urls
) media
order by pl.created_at desc nulls last, pl.id desc;
$$;

grant execute on function public.marketplace_my_listings_scope_page_v1(integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
