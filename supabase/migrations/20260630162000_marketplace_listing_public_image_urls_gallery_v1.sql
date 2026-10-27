begin;

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
      and ml.link_status = 'human_confirmed'
      and ml.final_linked_by_human = true
      and ml.marketplace_visible = true
      and ma.public_marketplace_visible = true
      and ma.storage_bucket = 'public-marketplace-media'
      and ma.media_kind = 'photo'
    order by ml.created_at asc
    limit greatest(least(coalesce(p_limit, 5), 5), 1)
  ) gallery
$$;

grant execute on function public.marketplace_listing_public_image_urls_v1(uuid, integer) to anon, authenticated;

commit;
