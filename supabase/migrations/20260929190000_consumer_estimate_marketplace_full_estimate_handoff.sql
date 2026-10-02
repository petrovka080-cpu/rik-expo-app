begin;

-- whole_app_staging owns Marketplace but deliberately does not duplicate the
-- canonical estimate database. The local canonical backend validates and
-- returns the immutable revision/artifact projection; this bridge validates
-- the complete projection shape and writes it atomically under the signed-in
-- owner. Direct client writes remain unnecessary for this flow.
create table if not exists public.consumer_estimate_marketplace_handoffs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  organization_id uuid,
  local_request_id text not null,
  revision_id uuid not null,
  release_id uuid not null,
  revision_checksum_sha256 text not null check (revision_checksum_sha256 ~ '^[0-9a-f]{64}$'),
  artifact_id uuid not null,
  artifact_sha256 text not null check (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  canonical_catalog_id text not null,
  estimate_row_count integer not null check (estimate_row_count > 0 and estimate_row_count <= 500),
  items_json jsonb not null check (jsonb_typeof(items_json) = 'array'),
  listing_id uuid not null references public.market_listings(id) on delete restrict,
  idempotency_key text not null,
  state text not null default 'sent' check (state = 'sent'),
  created_at timestamptz not null default now(),
  unique(owner_user_id, idempotency_key),
  unique(owner_user_id, local_request_id)
);

alter table public.consumer_estimate_marketplace_handoffs enable row level security;
drop policy if exists consumer_estimate_marketplace_handoffs_owner_read_v1
  on public.consumer_estimate_marketplace_handoffs;
create policy consumer_estimate_marketplace_handoffs_owner_read_v1
  on public.consumer_estimate_marketplace_handoffs
  for select to authenticated
  using (owner_user_id = auth.uid());

revoke all on public.consumer_estimate_marketplace_handoffs from public, anon, authenticated;
grant select on public.consumer_estimate_marketplace_handoffs to authenticated;

create or replace function public.consumer_estimate_marketplace_publish_v1(
  p_local_request_id text,
  p_revision_id uuid,
  p_release_id uuid,
  p_artifact_id uuid,
  p_idempotency_key text,
  p_expected_revision_checksum_sha256 text,
  p_expected_artifact_sha256 text,
  p_canonical_catalog_id text,
  p_title text,
  p_description text,
  p_city text,
  p_address_text text,
  p_contact_phone text,
  p_expected_row_count integer,
  p_items jsonb
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
  v_tenant_text text := nullif(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')), '');
  v_tenant uuid;
  v_existing public.consumer_estimate_marketplace_handoffs%rowtype;
  v_listing_id uuid;
  v_items jsonb;
  v_item_count integer;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if v_tenant_text is not null
    and v_tenant_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    v_tenant := v_tenant_text::uuid;
  else
    v_tenant := null;
  end if;

  if nullif(trim(coalesce(p_local_request_id, '')), '') is null
    or length(p_local_request_id) > 240
    or nullif(trim(coalesce(p_idempotency_key, '')), '') is null
    or length(p_idempotency_key) > 240
    or coalesce(p_expected_revision_checksum_sha256, '') !~ '^[0-9a-f]{64}$'
    or coalesce(p_expected_artifact_sha256, '') !~ '^[0-9a-f]{64}$'
    or nullif(trim(coalesce(p_canonical_catalog_id, '')), '') is null
    or length(trim(coalesce(p_title, ''))) < 3
    or length(trim(coalesce(p_description, ''))) < 20
    or nullif(trim(coalesce(p_city, '')), '') is null
    or nullif(trim(coalesce(p_address_text, '')), '') is null
    or length(regexp_replace(coalesce(p_contact_phone, ''), '\D', '', 'g')) < 7
    or p_expected_row_count is null
    or p_expected_row_count < 1
    or p_expected_row_count > 500
    or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'invalid consumer marketplace handoff input';
  end if;

  v_items := p_items;
  v_item_count := jsonb_array_length(v_items);
  if v_item_count <> p_expected_row_count then
    raise exception using errcode = '22023', message = 'full estimate row count mismatch';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_items) item
    where jsonb_typeof(item) is distinct from 'object'
      or nullif(trim(coalesce(item ->> 'rik_code', '')), '') is null
      or nullif(trim(coalesce(item ->> 'name', '')), '') is null
      or nullif(trim(coalesce(item ->> 'uom', '')), '') is null
      or jsonb_typeof(item -> 'qty') is distinct from 'number'
      or (item ->> 'qty')::numeric <= 0
      or coalesce(item ->> 'kind', '') not in ('material', 'work', 'delivery', 'rent', 'service')
      or coalesce(item ->> 'canonical_revision_id', '') <> p_revision_id::text
      or coalesce(item ->> 'canonical_release_id', '') <> p_release_id::text
      or coalesce(item ->> 'canonical_artifact_id', '') <> p_artifact_id::text
      or coalesce(item ->> 'canonical_row_sha256', '') !~ '^[0-9a-f]{64}$'
      or jsonb_typeof(item -> 'included_in_estimate') is distinct from 'boolean'
  ) then
    raise exception using errcode = '22023', message = 'full estimate row identity or quantity mismatch';
  end if;

  if (
    select count(distinct item ->> 'rik_code')
    from jsonb_array_elements(v_items) item
  ) <> v_item_count then
    raise exception using errcode = '22023', message = 'full estimate row identity is not unique';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':' || trim(p_idempotency_key), 0));
  select handoff.* into v_existing
  from public.consumer_estimate_marketplace_handoffs handoff
  where handoff.owner_user_id = v_actor
    and (
      handoff.idempotency_key = trim(p_idempotency_key)
      or handoff.local_request_id = trim(p_local_request_id)
    )
  order by handoff.created_at
  limit 1;

  if found then
    if v_existing.organization_id is distinct from v_tenant
      or v_existing.revision_id <> p_revision_id
      or v_existing.release_id <> p_release_id
      or v_existing.artifact_id <> p_artifact_id
      or v_existing.revision_checksum_sha256 <> p_expected_revision_checksum_sha256
      or v_existing.artifact_sha256 <> p_expected_artifact_sha256
      or v_existing.canonical_catalog_id <> trim(p_canonical_catalog_id)
      or v_existing.estimate_row_count <> p_expected_row_count
      or v_existing.items_json <> v_items then
      raise exception using errcode = '23505', message = 'consumer marketplace idempotency identity conflict';
    end if;
    return query select v_existing.listing_id, false, 'draft'::text,
      v_existing.revision_id, v_existing.release_id, v_existing.artifact_id;
    return;
  end if;

  insert into public.market_listings (
    title, user_id, company_id, city, price, kind, side, description,
    contacts_phone, contacts_whatsapp, contacts_email, items_json,
    uom, uom_code, rik_code, status, created_at, updated_at, client_mutation_id
  ) values (
    trim(p_title), v_actor, null, trim(p_city), null, 'work', 'demand', trim(p_description),
    trim(p_contact_phone), null, null, v_items,
    null, null, null, 'draft', now(), now(), trim(p_idempotency_key)
  ) returning id into v_listing_id;

  insert into public.consumer_estimate_marketplace_handoffs (
    owner_user_id, organization_id, local_request_id,
    revision_id, release_id, revision_checksum_sha256,
    artifact_id, artifact_sha256, canonical_catalog_id,
    estimate_row_count, items_json, listing_id, idempotency_key
  ) values (
    v_actor, v_tenant, trim(p_local_request_id),
    p_revision_id, p_release_id, p_expected_revision_checksum_sha256,
    p_artifact_id, p_expected_artifact_sha256, trim(p_canonical_catalog_id),
    p_expected_row_count, v_items, v_listing_id, trim(p_idempotency_key)
  );

  return query select v_listing_id, true, 'draft'::text,
    p_revision_id, p_release_id, p_artifact_id;
end;
$$;

revoke all on function public.consumer_estimate_marketplace_publish_v1(
  text,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,integer,jsonb
) from public, anon;
grant execute on function public.consumer_estimate_marketplace_publish_v1(
  text,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,integer,jsonb
) to authenticated;

comment on function public.consumer_estimate_marketplace_publish_v1(
  text,uuid,uuid,uuid,text,text,text,text,text,text,text,text,text,integer,jsonb
) is
  'Atomic whole_app_staging Marketplace draft bridge for a locally validated immutable canonical estimate projection. It stages every positive-quantity row with exact revision, release, artifact and row hashes; shortened or mixed-lineage payloads fail closed and no public listing is created without real geodata.';

commit;
