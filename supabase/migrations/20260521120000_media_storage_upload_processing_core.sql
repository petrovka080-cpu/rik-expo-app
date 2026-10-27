begin;

create extension if not exists pgcrypto;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('private-media', 'private-media', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  ('client-visible-media', 'client-visible-media', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']),
  ('public-marketplace-media', 'public-marketplace-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.media_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  project_id uuid null,
  requested_by_user_id uuid not null,
  requested_by_role text not null,
  target_type text not null,
  target_id text null,
  media_kind text not null check (media_kind in ('photo', 'video')),
  purpose text not null,
  storage_bucket text not null,
  storage_key text not null,
  expected_mime_type text not null,
  expected_byte_size_max bigint not null,
  expected_duration_ms_max integer null,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  project_id uuid null,
  owner_user_id uuid not null,
  owner_role text not null,
  media_kind text not null check (media_kind in ('photo', 'video')),
  purpose text not null,
  storage_bucket text not null,
  storage_key text not null,
  mime_type text not null,
  byte_size bigint not null,
  duration_ms integer null,
  width integer null,
  height integer null,
  content_hash text not null,
  moderation_status text not null default 'draft',
  ai_status text not null default 'not_processed',
  client_visible boolean not null default false,
  public_marketplace_visible boolean not null default false,
  requires_signed_url boolean not null default true,
  final_linked_by_human boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);

create table if not exists public.media_asset_variants (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  variant text not null check (variant in ('tiny', 'thumbnail', 'preview', 'poster', 'original')),
  storage_bucket text not null,
  storage_key text not null,
  width integer null,
  height integer null,
  byte_size bigint null,
  created_at timestamptz not null default now()
);

create table if not exists public.media_links (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  org_id uuid not null,
  project_id uuid null,
  target_type text not null,
  target_id text not null,
  purpose text not null,
  link_status text not null default 'ai_suggested'
    check (link_status in ('ai_suggested', 'human_confirmed', 'rejected', 'needs_review')),
  created_by text not null check (created_by in ('human', 'ai_suggestion')),
  final_linked_by_human boolean not null default false,
  client_visible boolean not null default false,
  marketplace_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.media_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  result_ref_id text null,
  error_ru text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);

create table if not exists public.media_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  analysis_kind text not null,
  confidence text not null,
  detected_objects jsonb not null default '[]'::jsonb,
  suggested_links jsonb not null default '[]'::jsonb,
  extracted_text jsonb null,
  product_suggestion jsonb null,
  construction_suggestion jsonb null,
  warehouse_suggestion jsonb null,
  safety_flags jsonb not null default '[]'::jsonb,
  final_fact boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.request_draft_media_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  project_id uuid null,
  request_draft_id text not null,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  purpose text not null default 'request_evidence',
  created_by_user_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists media_upload_sessions_target_idx
  on public.media_upload_sessions (org_id, target_type, target_id, created_at desc);

create index if not exists media_assets_scope_idx
  on public.media_assets (org_id, project_id, media_kind, created_at desc);

create unique index if not exists media_assets_storage_unique_idx
  on public.media_assets (storage_bucket, storage_key);

create index if not exists media_links_target_idx
  on public.media_links (org_id, target_type, target_id, created_at desc);

create unique index if not exists media_links_unique_human_target_idx
  on public.media_links (media_asset_id, target_type, target_id, purpose);

create index if not exists request_draft_media_links_draft_idx
  on public.request_draft_media_links (org_id, request_draft_id, created_at desc);

alter table public.media_upload_sessions enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_asset_variants enable row level security;
alter table public.media_links enable row level security;
alter table public.media_processing_jobs enable row level security;
alter table public.media_ai_analysis enable row level security;
alter table public.request_draft_media_links enable row level security;

create or replace function public.media_backend_create_upload_session(
  p_org_id uuid,
  p_project_id uuid,
  p_requested_by_user_id uuid,
  p_requested_by_role text,
  p_target_type text,
  p_target_id text,
  p_media_kind text,
  p_purpose text,
  p_expected_mime_type text,
  p_expected_byte_size_max bigint,
  p_expected_duration_ms_max integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid := gen_random_uuid();
  v_bucket text := 'private-media';
  v_storage_key text;
begin
  if p_media_kind not in ('photo', 'video') then
    raise exception 'media_backend_create_upload_session: invalid media_kind'
      using errcode = '22023';
  end if;

  if p_target_type = 'marketplace_product' then
    v_bucket := 'public-marketplace-media';
  elsif p_target_type = 'client_report' then
    v_bucket := 'client-visible-media';
  end if;

  v_storage_key := concat_ws('/', p_org_id::text, v_session_id::text, 'original');

  insert into public.media_upload_sessions (
    id,
    org_id,
    project_id,
    requested_by_user_id,
    requested_by_role,
    target_type,
    target_id,
    media_kind,
    purpose,
    storage_bucket,
    storage_key,
    expected_mime_type,
    expected_byte_size_max,
    expected_duration_ms_max,
    expires_at
  )
  values (
    v_session_id,
    p_org_id,
    p_project_id,
    p_requested_by_user_id,
    p_requested_by_role,
    p_target_type,
    nullif(trim(coalesce(p_target_id, '')), ''),
    p_media_kind,
    p_purpose,
    v_bucket,
    v_storage_key,
    p_expected_mime_type,
    p_expected_byte_size_max,
    p_expected_duration_ms_max,
    now() + interval '30 minutes'
  );

  return v_session_id;
end
$$;

create or replace function public.media_backend_complete_upload_session(
  p_session_id uuid,
  p_mime_type text,
  p_byte_size bigint,
  p_content_hash text,
  p_duration_ms integer default null,
  p_width integer default null,
  p_height integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.media_upload_sessions%rowtype;
  v_asset_id uuid;
begin
  select *
  into v_session
  from public.media_upload_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'media_backend_complete_upload_session: session not found'
      using errcode = 'P0001';
  end if;

  if v_session.expires_at < now() then
    update public.media_upload_sessions
    set status = 'expired'
    where id = p_session_id;

    raise exception 'media_backend_complete_upload_session: session expired'
      using errcode = 'P0001';
  end if;

  if p_byte_size > v_session.expected_byte_size_max then
    raise exception 'media_backend_complete_upload_session: byte size exceeds limit'
      using errcode = '22023';
  end if;

  insert into public.media_assets (
    org_id,
    project_id,
    owner_user_id,
    owner_role,
    media_kind,
    purpose,
    storage_bucket,
    storage_key,
    mime_type,
    byte_size,
    duration_ms,
    width,
    height,
    content_hash
  )
  values (
    v_session.org_id,
    v_session.project_id,
    v_session.requested_by_user_id,
    v_session.requested_by_role,
    v_session.media_kind,
    v_session.purpose,
    v_session.storage_bucket,
    v_session.storage_key,
    p_mime_type,
    p_byte_size,
    p_duration_ms,
    p_width,
    p_height,
    p_content_hash
  )
  on conflict (storage_bucket, storage_key) do update
  set
    mime_type = excluded.mime_type,
    byte_size = excluded.byte_size,
    duration_ms = excluded.duration_ms,
    width = excluded.width,
    height = excluded.height,
    content_hash = excluded.content_hash,
    updated_at = now()
  returning id into v_asset_id;

  if v_session.target_type = 'request_draft' and v_session.target_id is not null then
    insert into public.request_draft_media_links (
      org_id,
      project_id,
      request_draft_id,
      media_asset_id,
      purpose,
      created_by_user_id
    )
    values (
      v_session.org_id,
      v_session.project_id,
      v_session.target_id,
      v_asset_id,
      v_session.purpose,
      v_session.requested_by_user_id
    )
    on conflict do nothing;
  end if;

  insert into public.media_processing_jobs (media_asset_id, job_type)
  values (v_asset_id, 'variant_generation'), (v_asset_id, 'ai_analysis')
  on conflict do nothing;

  update public.media_upload_sessions
  set status = 'completed'
  where id = p_session_id;

  return v_asset_id;
end
$$;

create or replace function public.media_backend_attach_draft_media_to_request(
  p_org_id uuid,
  p_request_draft_id text,
  p_procurement_request_id text,
  p_actor_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
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
  select
    rdml.media_asset_id,
    rdml.org_id,
    rdml.project_id,
    'procurement_request',
    p_procurement_request_id,
    rdml.purpose,
    'human_confirmed',
    'human',
    true,
    false,
    false
  from public.request_draft_media_links rdml
  where rdml.org_id = p_org_id
    and rdml.request_draft_id = p_request_draft_id
    and rdml.created_by_user_id = p_actor_user_id
  on conflict do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end
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
begin
  if not exists (
    select 1
    from public.media_assets ma
    where ma.id = p_media_asset_id
      and ma.org_id = p_org_id
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
    false,
    false
  )
  on conflict (media_asset_id, target_type, target_id, purpose) do update
  set
    link_status = 'human_confirmed',
    created_by = 'human',
    final_linked_by_human = true
  returning id into v_link_id;

  return v_link_id;
end
$$;

create or replace function public.media_backend_queue_processing_job(
  p_media_asset_id uuid,
  p_job_type text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
begin
  if not exists (
    select 1
    from public.media_assets ma
    where ma.id = p_media_asset_id
  ) then
    raise exception 'media_backend_queue_processing_job: media asset not found'
      using errcode = 'P0001';
  end if;

  insert into public.media_processing_jobs (media_asset_id, job_type, status)
  values (p_media_asset_id, p_job_type, 'queued')
  returning id into v_job_id;

  return v_job_id;
end
$$;

create or replace function public.media_backend_record_ai_analysis(
  p_media_asset_id uuid,
  p_analysis_kind text,
  p_confidence text,
  p_detected_objects jsonb default '[]'::jsonb,
  p_suggested_links jsonb default '[]'::jsonb,
  p_product_suggestion jsonb default null,
  p_construction_suggestion jsonb default null,
  p_warehouse_suggestion jsonb default null,
  p_safety_flags jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_analysis_id uuid;
begin
  if not exists (
    select 1
    from public.media_assets ma
    where ma.id = p_media_asset_id
  ) then
    raise exception 'media_backend_record_ai_analysis: media asset not found'
      using errcode = 'P0001';
  end if;

  insert into public.media_ai_analysis (
    media_asset_id,
    analysis_kind,
    confidence,
    detected_objects,
    suggested_links,
    product_suggestion,
    construction_suggestion,
    warehouse_suggestion,
    safety_flags,
    final_fact
  )
  values (
    p_media_asset_id,
    p_analysis_kind,
    p_confidence,
    coalesce(p_detected_objects, '[]'::jsonb),
    coalesce(p_suggested_links, '[]'::jsonb),
    p_product_suggestion,
    p_construction_suggestion,
    p_warehouse_suggestion,
    coalesce(p_safety_flags, '[]'::jsonb),
    false
  )
  returning id into v_analysis_id;

  update public.media_assets
  set ai_status = 'processed',
      updated_at = now()
  where id = p_media_asset_id;

  return v_analysis_id;
end
$$;

comment on table public.media_upload_sessions is 'Backend media upload sessions: frontend receives session and uploads bytes, not base64 business payloads or route-param signed URLs.';
comment on table public.media_links is 'Business object media links. Final business linking requires human confirmation and role policy.';
comment on function public.media_backend_attach_draft_media_to_request(uuid, text, text, uuid) is 'Moves media from request draft to procurement request in backend transaction after human submit.';

commit;
