begin;

create or replace function public.media_storage_upload_session_insert_allowed_v1(
  p_bucket_id text,
  p_name text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.media_upload_sessions mus
    where mus.storage_bucket = p_bucket_id
      and mus.storage_key = p_name
      and mus.requested_by_user_id = auth.uid()
      and mus.status = 'created'
      and mus.expires_at > now()
  )
$$;

drop policy if exists rls_storage_media_upload_session_insert_v1 on storage.objects;
create policy rls_storage_media_upload_session_insert_v1 on storage.objects
  for insert to authenticated
  with check (public.media_storage_upload_session_insert_allowed_v1(bucket_id, name));

create or replace function public.marketplace_listing_public_image_url_v1(
  p_listing_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select concat('/storage/v1/object/public/', ma.storage_bucket, '/', ma.storage_key)
  from public.media_links ml
  join public.media_assets ma
    on ma.id = ml.media_asset_id
  where ml.target_type = 'marketplace_product'
    and ml.target_id = p_listing_id::text
    and ml.link_status = 'human_confirmed'
    and ml.final_linked_by_human = true
    and ml.marketplace_visible = true
    and ma.public_marketplace_visible = true
    and ma.storage_bucket = 'public-marketplace-media'
    and ma.media_kind = 'photo'
  order by ml.created_at asc
  limit 1
$$;

create or replace function public.media_backend_confirm_link(
  p_media_asset_id uuid,
  p_org_id uuid,
  p_project_id uuid,
  p_target_type text,
  p_target_id text,
  p_purpose text,
  p_actor_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
  v_marketplace_visible boolean := p_target_type = 'marketplace_product';
  v_client_visible boolean := p_target_type = 'client_report';
begin
  if not exists (
    select 1
    from public.media_assets ma
    where ma.id = p_media_asset_id
      and ma.org_id = p_org_id
      and ma.owner_user_id = p_actor_user_id
  ) then
    raise exception 'media_backend_confirm_link: media asset not found'
      using errcode = 'P0001';
  end if;

  insert into public.media_links (
    media_asset_id,
    org_id,
    project_id,
    target_type,
    target_id,
    purpose,
    link_status,
    created_by,
    final_linked_by_human,
    client_visible,
    marketplace_visible
  )
  values (
    p_media_asset_id,
    p_org_id,
    p_project_id,
    p_target_type,
    p_target_id,
    p_purpose,
    'human_confirmed',
    'human',
    true,
    v_client_visible,
    v_marketplace_visible
  )
  on conflict (media_asset_id, target_type, target_id, purpose) do update
  set
    link_status = 'human_confirmed',
    created_by = 'human',
    final_linked_by_human = true,
    client_visible = excluded.client_visible,
    marketplace_visible = excluded.marketplace_visible
  returning id into v_link_id;

  update public.media_assets
  set
    final_linked_by_human = true,
    client_visible = media_assets.client_visible or v_client_visible,
    public_marketplace_visible = media_assets.public_marketplace_visible or v_marketplace_visible,
    requires_signed_url = case when v_marketplace_visible then false else media_assets.requires_signed_url end,
    updated_at = now()
  where id = p_media_asset_id;

  return v_link_id;
end
$$;

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
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Supplier') as supplier_name,
    coalesce(nullif(trim(c.name), ''), nullif(trim(up.full_name), ''), 'Supplier') as seller_display_name,
    public.marketplace_listing_public_image_url_v1(ml.id) as image_url
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
    public.marketplace_listing_public_image_url_v1(ml.id) as image_url
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
  al.updated_at;
$$;

grant execute on function public.marketplace_listing_public_image_url_v1(uuid) to anon, authenticated;
grant execute on function public.media_storage_upload_session_insert_allowed_v1(text, text) to authenticated;
grant execute on function public.marketplace_items_scope_page_v1(integer, integer, text, text) to anon, authenticated;
grant execute on function public.marketplace_item_scope_detail_v1(uuid) to anon, authenticated;
grant execute on function public.media_backend_confirm_link(uuid, uuid, uuid, text, text, text, uuid) to authenticated;

commit;
