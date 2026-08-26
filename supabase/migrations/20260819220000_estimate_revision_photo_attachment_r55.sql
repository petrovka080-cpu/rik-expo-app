begin;

create extension if not exists pgcrypto;

create table public.estimate_revision_request_binding (
  revision_id uuid primary key references public.estimate_revision(id) on delete restrict,
  request_id text not null check (length(request_id) between 1 and 240),
  tenant_id uuid not null,
  owner_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique (owner_user_id, request_id, revision_id)
);

create table public.estimate_revision_photo_upload (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  owner_user_id uuid not null,
  request_id text not null check (length(request_id) between 1 and 240),
  catalog_id text not null,
  row_id text not null check (length(row_id) between 1 and 240),
  parent_revision_id uuid not null references public.estimate_revision(id) on delete restrict,
  parent_checksum_sha256 text not null check (parent_checksum_sha256 ~ '^[0-9a-f]{64}$'),
  staging_storage_bucket text not null default 'private-media',
  staging_storage_key text not null,
  committed_storage_key text not null,
  expected_content_sha256 text not null check (expected_content_sha256 ~ '^[0-9a-f]{64}$'),
  expected_mime_type text not null check (expected_mime_type in ('image/jpeg', 'image/png')),
  expected_size_bytes bigint not null check (expected_size_bytes between 1 and 20971520),
  replaces_attachment_id uuid,
  idempotency_key text not null check (length(idempotency_key) between 1 and 200),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'staged' check (status in ('staged', 'committed', 'rejected', 'deleted')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes',
  committed_at timestamptz,
  unique (owner_user_id, idempotency_key),
  unique (staging_storage_bucket, staging_storage_key),
  unique (staging_storage_bucket, committed_storage_key)
);

create table public.estimate_revision_photo_attachment (
  attachment_id uuid primary key,
  tenant_id uuid not null,
  owner_user_id uuid not null,
  request_id text not null check (length(request_id) between 1 and 240),
  catalog_id text not null,
  row_id text not null check (length(row_id) between 1 and 240),
  parent_revision_id uuid not null references public.estimate_revision(id) on delete restrict,
  parent_checksum_sha256 text not null check (parent_checksum_sha256 ~ '^[0-9a-f]{64}$'),
  storage_bucket text not null,
  storage_object_key text not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  created_at timestamptz not null default now(),
  created_by uuid not null,
  idempotency_key text not null,
  replaces_attachment_id uuid references public.estimate_revision_photo_attachment(attachment_id) on delete restrict,
  unique (owner_user_id, idempotency_key),
  unique (storage_bucket, storage_object_key)
);

create table public.estimate_revision_photo_attachment_event (
  event_id uuid primary key default gen_random_uuid(),
  attachment_id uuid not null references public.estimate_revision_photo_attachment(attachment_id) on delete restrict,
  tenant_id uuid not null,
  owner_user_id uuid not null,
  request_id text not null,
  catalog_id text not null,
  row_id text not null,
  parent_revision_id uuid not null references public.estimate_revision(id) on delete restrict,
  event_kind text not null check (event_kind in ('attached', 'tombstoned')),
  status text not null check (status in ('committed', 'deleted')),
  supersedes_event_id uuid references public.estimate_revision_photo_attachment_event(event_id) on delete restrict,
  idempotency_key text not null check (length(idempotency_key) between 1 and 200),
  created_at timestamptz not null default now(),
  created_by uuid not null,
  unique (created_by, idempotency_key)
);

alter table public.estimate_revision_photo_upload
  add constraint estimate_revision_photo_upload_replaces_fk
  foreign key (replaces_attachment_id)
  references public.estimate_revision_photo_attachment(attachment_id)
  on delete restrict;

create index estimate_revision_photo_upload_owner_idx
  on public.estimate_revision_photo_upload(owner_user_id, created_at desc);
create index estimate_revision_photo_attachment_projection_idx
  on public.estimate_revision_photo_attachment(parent_revision_id, row_id, created_at, attachment_id);
create index estimate_revision_photo_event_projection_idx
  on public.estimate_revision_photo_attachment_event(attachment_id, created_at desc, event_id desc);

create trigger estimate_revision_request_binding_immutable_r55_trg
before update or delete on public.estimate_revision_request_binding
for each row execute function public.estimate_reject_mutation_v1();

create trigger estimate_revision_photo_attachment_immutable_r55_trg
before update or delete on public.estimate_revision_photo_attachment
for each row execute function public.estimate_reject_mutation_v1();

create trigger estimate_revision_photo_attachment_event_immutable_r55_trg
before update or delete on public.estimate_revision_photo_attachment_event
for each row execute function public.estimate_reject_mutation_v1();

create or replace function public.estimate_create_row_photo_upload_r55(
  p_idempotency_key text,
  p_request_id text,
  p_catalog_id text,
  p_parent_revision_id uuid,
  p_row_id text,
  p_content_sha256 text,
  p_mime_type text,
  p_size_bytes bigint,
  p_replaces_attachment_id uuid default null
)
returns table(
  upload_id uuid,
  attachment_id uuid,
  upload_status text,
  storage_bucket text,
  staging_storage_key text,
  committed_storage_key text,
  expires_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_revision public.estimate_revision%rowtype;
  v_existing public.estimate_revision_photo_upload%rowtype;
  v_upload public.estimate_revision_photo_upload%rowtype;
  v_tenant uuid;
  v_digest text;
  v_extension text;
  v_payload_sha256 text;
  v_draft public.estimate_draft%rowtype;
  v_binding public.estimate_revision_request_binding%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'authentication required';
  end if;
  if nullif(trim(p_idempotency_key), '') is null or length(trim(p_idempotency_key)) > 200
    or trim(p_idempotency_key) like 'system:%'
    or nullif(trim(p_request_id), '') is null or length(trim(p_request_id)) > 240
    or nullif(trim(p_catalog_id), '') is null
    or nullif(trim(p_row_id), '') is null or length(trim(p_row_id)) > 240
    or p_content_sha256 !~ '^[0-9a-f]{64}$'
    or p_mime_type not in ('image/jpeg', 'image/png')
    or p_size_bytes not between 1 and 20971520 then
    raise exception using errcode = '22023', message = 'invalid estimate photo upload request';
  end if;

  select * into v_revision
  from public.estimate_revision r
  where r.id = p_parent_revision_id
    and (r.owner_user_id = v_actor or public.rls_current_user_company_member_v1(r.organization_id));
  if v_revision.id is null then
    raise exception using errcode = '42501', message = 'parent revision access denied';
  end if;
  if v_revision.catalog_id <> trim(p_catalog_id) then
    raise exception using errcode = '22023', message = 'catalog does not match parent revision';
  end if;
  if not exists (
    select 1 from public.estimate_revision_row rr
    where rr.revision_id = p_parent_revision_id and rr.row_id = trim(p_row_id)
  ) then
    raise exception using errcode = '22023', message = 'row does not belong to parent revision';
  end if;

  v_tenant := coalesce(v_revision.organization_id, v_revision.owner_user_id);

  if trim(p_request_id) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select * into v_draft from public.estimate_draft d where d.id = trim(p_request_id)::uuid;
    if v_draft.id is not null and not (
      v_draft.owner_user_id = v_actor
      or public.rls_current_user_company_member_v1(v_draft.organization_id)
    ) then
      raise exception using errcode = '42501', message = 'request access denied';
    end if;
  end if;

  select * into v_binding
  from public.estimate_revision_request_binding b
  where b.revision_id = p_parent_revision_id;
  if v_binding.revision_id is null then
    insert into public.estimate_revision_request_binding(
      revision_id, request_id, tenant_id, owner_user_id
    ) values (
      p_parent_revision_id, trim(p_request_id), v_tenant, v_revision.owner_user_id
    )
    on conflict (revision_id) do nothing;
    select * into v_binding
    from public.estimate_revision_request_binding b
    where b.revision_id = p_parent_revision_id;
  end if;
  if v_binding.request_id <> trim(p_request_id)
    or v_binding.tenant_id <> v_tenant
    or v_binding.owner_user_id <> v_revision.owner_user_id then
    raise exception using errcode = '23505', message = 'revision request binding conflict';
  end if;

  if p_replaces_attachment_id is not null and not exists (
    select 1 from public.estimate_revision_photo_attachment a
    where a.attachment_id = p_replaces_attachment_id
      and a.parent_revision_id = p_parent_revision_id
      and a.row_id = trim(p_row_id)
      and a.tenant_id = v_tenant
      and (
        select e.status
        from public.estimate_revision_photo_attachment_event e
        where e.attachment_id = a.attachment_id
        order by e.created_at desc, e.event_id desc
        limit 1
      ) = 'committed'
  ) then
    raise exception using errcode = '22023', message = 'replacement attachment does not match row and revision';
  end if;

  v_payload_sha256 := encode(extensions.digest(
    concat_ws(E'\x1f', v_tenant::text, v_revision.owner_user_id::text, trim(p_request_id),
      trim(p_catalog_id), p_parent_revision_id::text, trim(p_row_id), p_content_sha256,
      p_mime_type, p_size_bytes::text, coalesce(p_replaces_attachment_id::text, '')), 'sha256'
  ), 'hex');

  select * into v_existing
  from public.estimate_revision_photo_upload u
  where u.owner_user_id = v_actor and u.idempotency_key = trim(p_idempotency_key);
  if v_existing.id is not null then
    if v_existing.payload_sha256 <> v_payload_sha256 then
      raise exception using errcode = '23505', message = 'idempotency key conflicts with another photo payload';
    end if;
    return query select v_existing.id, v_existing.attachment_id, v_existing.status,
      v_existing.staging_storage_bucket, v_existing.staging_storage_key,
      v_existing.committed_storage_key, v_existing.expires_at, false;
    return;
  end if;

  v_upload.id := gen_random_uuid();
  v_upload.attachment_id := gen_random_uuid();
  v_digest := encode(extensions.digest(
    concat_ws(E'\x1f', 'estimate-photo-r55', v_tenant::text, trim(p_request_id),
      p_parent_revision_id::text, trim(p_row_id), trim(p_idempotency_key), p_content_sha256), 'sha256'
  ), 'hex');
  v_extension := case p_mime_type when 'image/jpeg' then 'jpg' else 'png' end;

  insert into public.estimate_revision_photo_upload(
    id, attachment_id, tenant_id, owner_user_id, request_id, catalog_id, row_id,
    parent_revision_id, parent_checksum_sha256, staging_storage_bucket,
    staging_storage_key, committed_storage_key, expected_content_sha256,
    expected_mime_type, expected_size_bytes, replaces_attachment_id,
    idempotency_key, payload_sha256
  ) values (
    v_upload.id, v_upload.attachment_id, v_tenant, v_actor, trim(p_request_id),
    trim(p_catalog_id), trim(p_row_id), p_parent_revision_id, v_revision.checksum_sha256,
    'private-media',
    format('estimate-photo/r55/staged/%s/%s.%s', left(v_digest, 2), v_digest, v_extension),
    format('estimate-photo/r55/committed/%s/%s.%s', left(v_digest, 2), v_digest, v_extension),
    p_content_sha256, p_mime_type, p_size_bytes, p_replaces_attachment_id,
    trim(p_idempotency_key), v_payload_sha256
  ) returning * into v_upload;

  return query select v_upload.id, v_upload.attachment_id, v_upload.status,
    v_upload.staging_storage_bucket, v_upload.staging_storage_key,
    v_upload.committed_storage_key, v_upload.expires_at, true;
end;
$$;

create or replace function public.estimate_finalize_row_photo_upload_r55(
  p_actor_user_id uuid,
  p_upload_id uuid,
  p_committed_storage_key text,
  p_verified_content_sha256 text,
  p_verified_mime_type text,
  p_verified_size_bytes bigint
)
returns table(
  attachment_id uuid,
  attachment_event_id uuid,
  parent_revision_id uuid,
  row_id text,
  storage_bucket text,
  storage_object_key text,
  content_sha256 text,
  mime_type text,
  size_bytes bigint,
  attachment_status text,
  created_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_upload public.estimate_revision_photo_upload%rowtype;
  v_revision public.estimate_revision%rowtype;
  v_attachment public.estimate_revision_photo_attachment%rowtype;
  v_event public.estimate_revision_photo_attachment_event%rowtype;
  v_replaced_event public.estimate_revision_photo_attachment_event%rowtype;
begin
  if p_actor_user_id is null then
    raise exception using errcode = '28000', message = 'actor is required';
  end if;
  select * into v_upload
  from public.estimate_revision_photo_upload u
  where u.id = p_upload_id and u.owner_user_id = p_actor_user_id
  for update;
  if v_upload.id is null then
    raise exception using errcode = '42501', message = 'photo upload access denied';
  end if;

  if v_upload.status = 'committed' then
    select * into v_attachment from public.estimate_revision_photo_attachment a
    where a.attachment_id = v_upload.attachment_id;
    select * into v_event from public.estimate_revision_photo_attachment_event e
    where e.attachment_id = v_attachment.attachment_id
    order by e.created_at desc, e.event_id desc limit 1;
    return query select v_attachment.attachment_id, v_event.event_id,
      v_attachment.parent_revision_id, v_attachment.row_id, v_attachment.storage_bucket,
      v_attachment.storage_object_key, v_attachment.content_sha256, v_attachment.mime_type,
      v_attachment.size_bytes, v_event.status, v_attachment.created_at, false;
    return;
  end if;
  if v_upload.status <> 'staged' or v_upload.expires_at < now() then
    raise exception using errcode = '22023', message = 'photo upload is not finalizable';
  end if;
  if p_committed_storage_key <> v_upload.committed_storage_key
    or p_verified_content_sha256 <> v_upload.expected_content_sha256
    or p_verified_mime_type <> v_upload.expected_mime_type
    or p_verified_size_bytes <> v_upload.expected_size_bytes then
    raise exception using errcode = '22023', message = 'verified photo object does not match reservation';
  end if;

  select * into v_revision from public.estimate_revision r where r.id = v_upload.parent_revision_id;
  if v_revision.id is null or v_revision.checksum_sha256 <> v_upload.parent_checksum_sha256
    or v_revision.catalog_id <> v_upload.catalog_id then
    raise exception using errcode = '40001', message = 'parent revision identity changed';
  end if;
  if not exists (
    select 1 from public.estimate_revision_row rr
    where rr.revision_id = v_upload.parent_revision_id and rr.row_id = v_upload.row_id
  ) then
    raise exception using errcode = '40001', message = 'parent revision row is unavailable';
  end if;

  if v_upload.replaces_attachment_id is not null then
    select e.* into v_replaced_event
    from public.estimate_revision_photo_attachment_event e
    join public.estimate_revision_photo_attachment a
      on a.attachment_id = e.attachment_id
    where a.attachment_id = v_upload.replaces_attachment_id
      and a.tenant_id = v_upload.tenant_id
      and a.parent_revision_id = v_upload.parent_revision_id
      and a.row_id = v_upload.row_id
    order by e.created_at desc, e.event_id desc
    limit 1;
    if v_replaced_event.event_id is null or v_replaced_event.status <> 'committed' then
      raise exception using errcode = '40001', message = 'replacement attachment is no longer committed';
    end if;
  end if;

  insert into public.estimate_revision_photo_attachment(
    attachment_id, tenant_id, owner_user_id, request_id, catalog_id, row_id,
    parent_revision_id, parent_checksum_sha256, storage_bucket,
    storage_object_key, content_sha256, mime_type, size_bytes, created_by,
    idempotency_key, replaces_attachment_id
  ) values (
    v_upload.attachment_id, v_upload.tenant_id, v_upload.owner_user_id,
    v_upload.request_id, v_upload.catalog_id, v_upload.row_id,
    v_upload.parent_revision_id, v_upload.parent_checksum_sha256,
    v_upload.staging_storage_bucket, v_upload.committed_storage_key,
    v_upload.expected_content_sha256, v_upload.expected_mime_type,
    v_upload.expected_size_bytes, p_actor_user_id, v_upload.idempotency_key,
    v_upload.replaces_attachment_id
  ) returning * into v_attachment;

  insert into public.estimate_revision_photo_attachment_event(
    attachment_id, tenant_id, owner_user_id, request_id, catalog_id, row_id,
    parent_revision_id, event_kind, status, idempotency_key, created_by
  ) values (
    v_attachment.attachment_id, v_attachment.tenant_id, v_attachment.owner_user_id,
    v_attachment.request_id, v_attachment.catalog_id, v_attachment.row_id,
    v_attachment.parent_revision_id, 'attached', 'committed',
    v_attachment.idempotency_key, p_actor_user_id
  ) returning * into v_event;

  if v_upload.replaces_attachment_id is not null then
    insert into public.estimate_revision_photo_attachment_event(
      attachment_id, tenant_id, owner_user_id, request_id, catalog_id, row_id,
      parent_revision_id, event_kind, status, supersedes_event_id,
      idempotency_key, created_by
    ) values (
      v_upload.replaces_attachment_id, v_upload.tenant_id, v_upload.owner_user_id,
      v_upload.request_id, v_upload.catalog_id, v_upload.row_id,
      v_upload.parent_revision_id, 'tombstoned', 'deleted', v_replaced_event.event_id,
      'system:replacement:' || v_upload.attachment_id::text, p_actor_user_id
    );
  end if;

  update public.estimate_revision_photo_upload
  set status = 'committed', committed_at = now()
  where id = v_upload.id;

  return query select v_attachment.attachment_id, v_event.event_id,
    v_attachment.parent_revision_id, v_attachment.row_id, v_attachment.storage_bucket,
    v_attachment.storage_object_key, v_attachment.content_sha256, v_attachment.mime_type,
    v_attachment.size_bytes, v_event.status, v_attachment.created_at, true;
end;
$$;

create or replace function public.estimate_tombstone_row_photo_attachment_r55(
  p_attachment_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_attachment public.estimate_revision_photo_attachment%rowtype;
  v_previous public.estimate_revision_photo_attachment_event%rowtype;
  v_event_id uuid;
begin
  if v_actor is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  if nullif(trim(p_idempotency_key), '') is null
    or length(trim(p_idempotency_key)) > 200
    or trim(p_idempotency_key) like 'system:%' then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  select * into v_attachment from public.estimate_revision_photo_attachment a
  where a.attachment_id = p_attachment_id
    and (a.owner_user_id = v_actor or public.estimate_revision_visible_v1(a.parent_revision_id));
  if v_attachment.attachment_id is null then
    raise exception using errcode = '42501', message = 'attachment access denied';
  end if;
  select event_id into v_event_id from public.estimate_revision_photo_attachment_event e
  where e.created_by = v_actor and e.idempotency_key = trim(p_idempotency_key);
  if v_event_id is not null then return v_event_id; end if;
  select * into v_previous from public.estimate_revision_photo_attachment_event e
  where e.attachment_id = p_attachment_id order by e.created_at desc, e.event_id desc limit 1;
  if v_previous.status = 'deleted' then return v_previous.event_id; end if;
  insert into public.estimate_revision_photo_attachment_event(
    attachment_id, tenant_id, owner_user_id, request_id, catalog_id, row_id,
    parent_revision_id, event_kind, status, supersedes_event_id,
    idempotency_key, created_by
  ) values (
    v_attachment.attachment_id, v_attachment.tenant_id, v_attachment.owner_user_id,
    v_attachment.request_id, v_attachment.catalog_id, v_attachment.row_id,
    v_attachment.parent_revision_id, 'tombstoned', 'deleted', v_previous.event_id,
    trim(p_idempotency_key), v_actor
  ) returning event_id into v_event_id;
  return v_event_id;
end;
$$;

create or replace function public.estimate_list_revision_photo_attachments_r55(
  p_revision_id uuid,
  p_include_deleted boolean default false
)
returns table(
  attachment_id uuid,
  attachment_event_id uuid,
  tenant_id uuid,
  owner_user_id uuid,
  request_id text,
  catalog_id text,
  row_id text,
  parent_revision_id uuid,
  storage_bucket text,
  storage_object_key text,
  content_sha256 text,
  mime_type text,
  size_bytes bigint,
  attachment_status text,
  created_at timestamptz,
  created_by uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select distinct on (e.attachment_id) e.*
    from public.estimate_revision_photo_attachment_event e
    where e.parent_revision_id = p_revision_id
    order by e.attachment_id, e.created_at desc, e.event_id desc
  )
  select a.attachment_id, latest.event_id, a.tenant_id, a.owner_user_id,
    a.request_id, a.catalog_id, a.row_id, a.parent_revision_id,
    a.storage_bucket, a.storage_object_key, a.content_sha256, a.mime_type,
    a.size_bytes, latest.status, a.created_at, a.created_by
  from public.estimate_revision_photo_attachment a
  join latest on latest.attachment_id = a.attachment_id
  where a.parent_revision_id = p_revision_id
    and public.estimate_revision_visible_v1(a.parent_revision_id)
    and (p_include_deleted or latest.status = 'committed')
  order by a.created_at, a.attachment_id;
$$;

alter table public.estimate_revision_request_binding enable row level security;
alter table public.estimate_revision_photo_upload enable row level security;
alter table public.estimate_revision_photo_attachment enable row level security;
alter table public.estimate_revision_photo_attachment_event enable row level security;

create policy estimate_revision_request_binding_read_r55 on public.estimate_revision_request_binding
  for select to authenticated using (public.estimate_revision_visible_v1(revision_id));
create policy estimate_revision_photo_upload_read_r55 on public.estimate_revision_photo_upload
  for select to authenticated using (
    owner_user_id = auth.uid() or public.estimate_revision_visible_v1(parent_revision_id)
  );
create policy estimate_revision_photo_attachment_read_r55 on public.estimate_revision_photo_attachment
  for select to authenticated using (public.estimate_revision_visible_v1(parent_revision_id));
create policy estimate_revision_photo_attachment_event_read_r55 on public.estimate_revision_photo_attachment_event
  for select to authenticated using (public.estimate_revision_visible_v1(parent_revision_id));

revoke all on function public.estimate_create_row_photo_upload_r55(text,text,text,uuid,text,text,text,bigint,uuid) from public;
grant execute on function public.estimate_create_row_photo_upload_r55(text,text,text,uuid,text,text,text,bigint,uuid) to authenticated;
revoke all on function public.estimate_finalize_row_photo_upload_r55(uuid,uuid,text,text,text,bigint) from public;
grant execute on function public.estimate_finalize_row_photo_upload_r55(uuid,uuid,text,text,text,bigint) to service_role;
revoke all on function public.estimate_tombstone_row_photo_attachment_r55(uuid,text) from public;
grant execute on function public.estimate_tombstone_row_photo_attachment_r55(uuid,text) to authenticated;
revoke all on function public.estimate_list_revision_photo_attachments_r55(uuid,boolean) from public;
grant execute on function public.estimate_list_revision_photo_attachments_r55(uuid,boolean) to authenticated, service_role;

comment on table public.estimate_revision_photo_attachment is
  'R5.5 immutable authoritative photo attachment bound to an exact estimate revision row.';
comment on table public.estimate_revision_photo_attachment_event is
  'R5.5 immutable attachment lifecycle event; deletion is a tombstone event and never rewrites history.';
comment on function public.estimate_finalize_row_photo_upload_r55(uuid,uuid,text,text,text,bigint) is
  'Service-only finalization after Edge has independently verified object bytes, SHA-256, MIME and size.';

commit;
