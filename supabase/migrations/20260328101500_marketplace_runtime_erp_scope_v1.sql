create or replace view public.marketplace_items_scope_v1 as
with active_listings as (
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
    ml.items_json,
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
  from active_listings al
  join lateral jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(al.items_json::jsonb, '[]'::jsonb)) = 'array'
        then coalesce(al.items_json::jsonb, '[]'::jsonb)
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
  from active_listings al
  where not exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(coalesce(al.items_json::jsonb, '[]'::jsonb)) = 'array'
          then coalesce(al.items_json::jsonb, '[]'::jsonb)
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
  join active_listings al
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
  al.items_json::jsonb as items_json,
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
from active_listings al
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
  al.items_json,
  al.uom,
  al.uom_code,
  al.rik_code,
  al.status,
  al.created_at,
  al.updated_at;

grant select on public.marketplace_items_scope_v1 to anon, authenticated;

create table if not exists public.supplier_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  sender_user_id uuid not null default auth.uid(),
  supplier_id uuid null references public.companies(id) on delete set null,
  supplier_user_id uuid null references auth.users(id) on delete set null,
  marketplace_item_id uuid not null references public.market_listings(id) on delete cascade,
  message text not null check (char_length(btrim(message)) between 1 and 2000)
);

create index if not exists supplier_messages_marketplace_item_created_idx
  on public.supplier_messages (marketplace_item_id, created_at desc);

create index if not exists supplier_messages_sender_created_idx
  on public.supplier_messages (sender_user_id, created_at desc);

grant select, insert on public.supplier_messages to authenticated;

alter table public.supplier_messages enable row level security;

drop policy if exists supplier_messages_insert_authenticated on public.supplier_messages;
create policy supplier_messages_insert_authenticated
  on public.supplier_messages
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and sender_user_id = auth.uid()
  );

drop policy if exists supplier_messages_select_related on public.supplier_messages;
create policy supplier_messages_select_related
  on public.supplier_messages
  for select
  to authenticated
  using (
    sender_user_id = auth.uid()
    or supplier_user_id = auth.uid()
  );
