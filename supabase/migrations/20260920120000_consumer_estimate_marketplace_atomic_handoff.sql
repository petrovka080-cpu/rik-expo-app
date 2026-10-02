begin;

alter table public.market_listings
  add column if not exists client_mutation_id text;

create unique index if not exists market_listings_user_client_mutation_id_key
  on public.market_listings (user_id, client_mutation_id);

create table if not exists public.consumer_estimate_marketplace_handoffs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  organization_id uuid not null,
  local_request_id text not null,
  revision_id uuid not null references public.estimate_revision(id) on delete restrict,
  revision_checksum_sha256 text not null check (revision_checksum_sha256 ~ '^[0-9a-f]{64}$'),
  artifact_id uuid not null references public.estimate_revision_artifact(id) on delete restrict,
  artifact_sha256 text not null check (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  listing_id uuid not null references public.market_listings(id) on delete restrict,
  idempotency_key text not null,
  state text not null check (state = 'sent'),
  created_at timestamptz not null default now(),
  unique (owner_user_id, local_request_id),
  unique (owner_user_id, idempotency_key),
  unique (listing_id)
);

create index if not exists consumer_estimate_marketplace_handoffs_owner_created_idx
  on public.consumer_estimate_marketplace_handoffs (owner_user_id, created_at desc);

alter table public.consumer_estimate_marketplace_handoffs enable row level security;
alter table public.consumer_estimate_marketplace_handoffs force row level security;
alter table public.market_listings enable row level security;

drop policy if exists consumer_estimate_marketplace_handoff_owner_read_v1
  on public.consumer_estimate_marketplace_handoffs;
create policy consumer_estimate_marketplace_handoff_owner_read_v1
  on public.consumer_estimate_marketplace_handoffs
  for select to authenticated
  using (owner_user_id = auth.uid());

-- A published demand is the intentionally public projection. The private
-- canonical revision, artifact and handoff lineage remain owner/tenant scoped.
drop policy if exists consumer_estimate_marketplace_published_read_v1
  on public.market_listings;
create policy consumer_estimate_marketplace_published_read_v1
  on public.market_listings
  for select to anon, authenticated
  using (status in ('active', 'published'));
grant select on table public.market_listings to anon, authenticated;

create or replace function public.consumer_estimate_marketplace_reject_mutation_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'consumer estimate marketplace handoff is immutable';
end;
$$;

drop trigger if exists consumer_estimate_marketplace_handoff_immutable_v1
  on public.consumer_estimate_marketplace_handoffs;
create trigger consumer_estimate_marketplace_handoff_immutable_v1
before update or delete on public.consumer_estimate_marketplace_handoffs
for each row execute function public.consumer_estimate_marketplace_reject_mutation_v1();

create or replace function public.consumer_estimate_marketplace_publish_v1(
  p_local_request_id text,
  p_revision_id uuid,
  p_artifact_id uuid,
  p_idempotency_key text,
  p_expected_revision_checksum_sha256 text,
  p_expected_artifact_sha256 text,
  p_description text,
  p_city text,
  p_address_text text,
  p_contact_phone text
)
returns table (
  listing_id uuid,
  created boolean,
  server_status text,
  revision_id uuid,
  release_id uuid,
  artifact_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := nullif(lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))), '');
  v_tenant_text text := nullif(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')), '');
  v_tenant uuid;
  v_revision public.estimate_revision%rowtype;
  v_artifact public.estimate_revision_artifact%rowtype;
  v_existing public.consumer_estimate_marketplace_handoffs%rowtype;
  v_listing_id uuid;
  v_title text;
  v_items jsonb;
  v_total numeric;
  v_projected_row_count integer;
  v_selected_row_count integer;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if v_role is distinct from 'consumer' then
    raise exception using errcode = '42501', message = 'consumer role required';
  end if;
  if v_tenant_text is null or v_tenant_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode = '42501', message = 'tenant context required';
  end if;
  v_tenant := v_tenant_text::uuid;

  if nullif(trim(coalesce(p_local_request_id, '')), '') is null
    or length(p_local_request_id) > 240
    or nullif(trim(coalesce(p_idempotency_key, '')), '') is null
    or length(p_idempotency_key) > 240
    or coalesce(p_expected_revision_checksum_sha256, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_expected_artifact_sha256, '') !~ '^[0-9a-f]{64}$'
    or length(trim(coalesce(p_description, ''))) < 20
    or nullif(trim(coalesce(p_city, '')), '') is null
    or nullif(trim(coalesce(p_address_text, '')), '') is null
    or length(regexp_replace(coalesce(p_contact_phone, ''), '\D', '', 'g')) < 7 then
    raise exception using errcode = '22023', message = 'invalid consumer marketplace handoff input';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_actor::text || ':' || trim(p_idempotency_key), 0)
  );

  select handoff.*
    into v_existing
    from public.consumer_estimate_marketplace_handoffs handoff
   where handoff.owner_user_id = v_actor
     and (
       handoff.idempotency_key = trim(p_idempotency_key)
       or handoff.local_request_id = trim(p_local_request_id)
     )
   order by handoff.created_at
   limit 1;

  if found then
    if v_existing.organization_id <> v_tenant
      or v_existing.revision_id <> p_revision_id
      or v_existing.artifact_id <> p_artifact_id
      or v_existing.revision_checksum_sha256 <> p_expected_revision_checksum_sha256
      or v_existing.artifact_sha256 <> p_expected_artifact_sha256 then
      raise exception using errcode = '23505', message = 'consumer marketplace idempotency identity conflict';
    end if;
    return query
      select v_existing.listing_id, false, 'active'::text,
        v_existing.revision_id, revision.release_id, v_existing.artifact_id
      from public.estimate_revision revision
      where revision.id = v_existing.revision_id;
    return;
  end if;

  select revision.*
    into v_revision
    from public.estimate_revision revision
   where revision.id = p_revision_id
   for share;

  if not found
    or v_revision.owner_user_id <> v_actor
    or v_revision.organization_id is distinct from v_tenant
    or v_revision.status <> 'ready'
    or v_revision.checksum_sha256 <> p_expected_revision_checksum_sha256 then
    raise exception using errcode = '42501', message = 'current estimate revision identity is not publishable';
  end if;

  select artifact.*
    into v_artifact
    from public.estimate_revision_artifact artifact
   where artifact.id = p_artifact_id
     and artifact.revision_id = p_revision_id
   for share;

  if not found
    or v_artifact.artifact_kind <> 'procurement'
    or v_artifact.status <> 'ready'
    or v_artifact.sha256 is distinct from p_expected_artifact_sha256 then
    raise exception using errcode = '22023', message = 'ready procurement artifact identity required';
  end if;

  if not exists (
    select 1
    from public.estimate_revision_photo_attachment attachment
    join lateral (
      select event.event_kind
      from public.estimate_revision_photo_attachment_event event
      where event.attachment_id = attachment.attachment_id
      order by event.created_at desc, event.event_id desc
      limit 1
    ) latest on latest.event_kind = 'attached'
    where attachment.parent_revision_id = p_revision_id
      and attachment.owner_user_id = v_actor
      and attachment.tenant_id = v_tenant
  ) then
    raise exception using errcode = '22023', message = 'committed canonical photo required';
  end if;

  select count(*)::integer,
         coalesce(jsonb_agg(jsonb_build_object(
           'rik_code', row.row_id,
           'name', row.title_ru,
           'uom', row.unit_id,
           'qty', row.quantity,
           'price', row.unit_price,
           'kind', case
             when row.category in ('material', 'work', 'service') then row.category
             when row.category = 'transport' then 'delivery'
             when row.category = 'equipment' then 'rent'
             else 'service'
           end,
           'canonical_revision_id', v_revision.id,
           'canonical_release_id', v_revision.release_id,
           'canonical_artifact_id', v_artifact.id
         ) order by row.ordinal), '[]'::jsonb)
    into v_selected_row_count, v_items
    from public.estimate_revision_row row
   where row.revision_id = p_revision_id
     and row.procurement_eligible
     and row.quantity is not null;

  v_projected_row_count := case
    when coalesce(v_artifact.metadata ->> 'projectedRowCount', '') ~ '^[0-9]+$'
      then (v_artifact.metadata ->> 'projectedRowCount')::integer
    else null
  end;
  if v_selected_row_count < 1
    or (v_projected_row_count is not null and v_projected_row_count <> v_selected_row_count) then
    raise exception using errcode = '22023', message = 'procurement artifact row projection mismatch';
  end if;

  v_title := coalesce(
    nullif(trim(v_artifact.metadata ->> 'displayTitleRu'), ''),
    nullif(trim(v_revision.catalog_id), ''),
    'Заявка по смете'
  );
  v_total := case
    when coalesce(v_revision.totals ->> 'amount', '') ~ '^[0-9]+([.][0-9]+)?$'
      then (v_revision.totals ->> 'amount')::numeric
    else null
  end;

  insert into public.market_listings (
    title, user_id, company_id, city, price, kind, side, description,
    contacts_phone, contacts_whatsapp, contacts_email, items_json,
    uom, uom_code, rik_code, status, created_at, updated_at, client_mutation_id
  ) values (
    v_title, v_actor, null, trim(p_city), v_total, 'work', 'demand', trim(p_description),
    trim(p_contact_phone), null, null, v_items,
    null, null, v_revision.catalog_id, 'active', now(), now(), trim(p_idempotency_key)
  )
  returning id into v_listing_id;

  insert into public.consumer_estimate_marketplace_handoffs (
    owner_user_id, organization_id, local_request_id,
    revision_id, revision_checksum_sha256, artifact_id, artifact_sha256,
    listing_id, idempotency_key, state
  ) values (
    v_actor, v_tenant, trim(p_local_request_id),
    v_revision.id, v_revision.checksum_sha256, v_artifact.id, v_artifact.sha256,
    v_listing_id, trim(p_idempotency_key), 'sent'
  );

  return query select v_listing_id, true, 'active'::text,
    v_revision.id, v_revision.release_id, v_artifact.id;
end;
$$;

revoke all on table public.consumer_estimate_marketplace_handoffs from public, anon, authenticated;
grant select on table public.consumer_estimate_marketplace_handoffs to authenticated;
revoke all on function public.consumer_estimate_marketplace_reject_mutation_v1() from public, anon, authenticated;
revoke all on function public.consumer_estimate_marketplace_publish_v1(text,uuid,uuid,text,text,text,text,text,text,text)
  from public, anon;
grant execute on function public.consumer_estimate_marketplace_publish_v1(text,uuid,uuid,text,text,text,text,text,text,text)
  to authenticated;

comment on table public.consumer_estimate_marketplace_handoffs is
  'Immutable lineage from one exact ready canonical estimate/procurement artifact to one published marketplace demand.';
comment on function public.consumer_estimate_marketplace_publish_v1(text,uuid,uuid,text,text,text,text,text,text,text) is
  'Atomic consumer estimate marketplace handoff. Server validates actor role, tenant, immutable revision checksum, ready procurement artifact and committed canonical photo; repeated intent returns the same listing.';

commit;
