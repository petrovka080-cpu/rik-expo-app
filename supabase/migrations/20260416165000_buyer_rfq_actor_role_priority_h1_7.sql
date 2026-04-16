begin;

create or replace function public.buyer_rfq_actor_is_buyer_v1()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := null;
  v_is_buyer boolean := false;
begin
  if v_actor_id is null then
    return false;
  end if;

  select nullif(lower(trim(p.role)), '')
    into v_actor_role
  from public.profiles p
  where p.user_id = v_actor_id
    and lower(trim(coalesce(p.role, ''))) = 'buyer'
  limit 1;

  if v_actor_role = 'buyer' then
    return true;
  end if;

  select exists (
    select 1
    from public.company_members cm
    where cm.user_id = v_actor_id
      and lower(trim(coalesce(cm.role, ''))) = 'buyer'
  )
    into v_is_buyer;

  if v_is_buyer then
    return true;
  end if;

  v_actor_role := nullif(
    lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))),
    ''
  );

  if v_actor_role = 'buyer' then
    return true;
  end if;

  return lower(trim(coalesce(public.get_my_role(), ''))) = 'buyer';
end;
$$;

comment on function public.buyer_rfq_actor_is_buyer_v1() is
'H1.7 RFQ recovery: validates buyer actor role from server-owned buyer sources before get_my_role contractor compatibility override. Business permission remains buyer-only.';

grant execute on function public.buyer_rfq_actor_is_buyer_v1() to authenticated, service_role;

create or replace function public.buyer_rfq_create_and_publish_v1(
  p_request_item_ids uuid[],
  p_deadline_at timestamptz,
  p_contact_phone text default null,
  p_contact_email text default null,
  p_contact_whatsapp text default null,
  p_delivery_days integer default null,
  p_radius_km numeric default null,
  p_visibility text default 'open',
  p_city text default null,
  p_lat numeric default null,
  p_lng numeric default null,
  p_address_text text default null,
  p_address_place_id text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := nullif(lower(trim(coalesce(public.get_my_role(), ''))), '');
  v_actor_is_buyer boolean := public.buyer_rfq_actor_is_buyer_v1();
  v_request_item_ids uuid[];
  v_visible_count integer := 0;
  v_source_count integer := 0;
  v_tender_id uuid;
begin
  if v_actor_id is null then
    raise exception 'buyer_rfq_create_and_publish_v1: auth required'
      using errcode = '42501';
  end if;

  if not v_actor_is_buyer then
    raise exception 'buyer_rfq_create_and_publish_v1: forbidden actor role'
      using errcode = '42501',
        detail = coalesce(v_actor_role, 'unknown');
  end if;

  v_request_item_ids := array(
    select distinct item_id
    from unnest(coalesce(p_request_item_ids, array[]::uuid[])) as item_id
    where item_id is not null
  );

  if coalesce(array_length(v_request_item_ids, 1), 0) = 0 then
    raise exception 'buyer_rfq_create_and_publish_v1: request items are required'
      using errcode = '22023';
  end if;

  if p_deadline_at is null or p_deadline_at <= now() then
    raise exception 'buyer_rfq_create_and_publish_v1: deadline must be in the future'
      using errcode = '22023';
  end if;

  select count(*)
    into v_visible_count
  from (
    select distinct nullif(trim(coalesce(request_item_id::text, '')), '')::uuid as request_item_id
    from public.list_buyer_inbox(null)
  ) visible_scope
  where visible_scope.request_item_id = any(v_request_item_ids);

  if v_visible_count <> array_length(v_request_item_ids, 1) then
    raise exception 'buyer_rfq_create_and_publish_v1: one or more request items are outside buyer scope'
      using errcode = '42501';
  end if;

  select count(*)
    into v_source_count
  from public.request_items ri
  where ri.id = any(v_request_item_ids);

  if v_source_count <> array_length(v_request_item_ids, 1) then
    raise exception 'buyer_rfq_create_and_publish_v1: one or more request items do not exist'
      using errcode = '22023';
  end if;

  insert into public.tenders (
    created_by,
    mode,
    status,
    visibility,
    deadline_at,
    contact_phone,
    contact_email,
    contact_whatsapp,
    delivery_days,
    radius_km,
    city,
    lat,
    lng,
    address_text,
    address_place_id,
    note
  )
  values (
    v_actor_id,
    'rfq',
    'draft',
    coalesce(nullif(trim(coalesce(p_visibility, '')), ''), 'open'),
    p_deadline_at,
    nullif(trim(coalesce(p_contact_phone, '')), ''),
    nullif(trim(coalesce(p_contact_email, '')), ''),
    nullif(trim(coalesce(p_contact_whatsapp, '')), ''),
    p_delivery_days,
    p_radius_km,
    nullif(trim(coalesce(p_city, '')), ''),
    p_lat,
    p_lng,
    nullif(trim(coalesce(p_address_text, '')), ''),
    nullif(trim(coalesce(p_address_place_id, '')), ''),
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_tender_id;

  insert into public.tender_items (
    tender_id,
    request_item_id,
    rik_code,
    name_human,
    qty,
    uom
  )
  select
    v_tender_id,
    ri.id,
    ri.rik_code,
    ri.name_human,
    ri.qty,
    ri.uom
  from public.request_items ri
  where ri.id = any(v_request_item_ids);

  perform public.tender_publish(v_tender_id);

  return v_tender_id;
end;
$$;

comment on function public.buyer_rfq_create_and_publish_v1(
  uuid[],
  timestamptz,
  text,
  text,
  text,
  integer,
  numeric,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text
) is
'Buyer RFQ create-and-publish v1. H1.7 role boundary hardening: buyer-only permission is resolved from profiles, company_members, trusted app_metadata, or get_my_role before creating/publishing RFQ.';

grant execute on function public.buyer_rfq_create_and_publish_v1(
  uuid[],
  timestamptz,
  text,
  text,
  text,
  integer,
  numeric,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text
) to authenticated;

notify pgrst, 'reload schema';

commit;
