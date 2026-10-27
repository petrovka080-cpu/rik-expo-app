begin;

drop function if exists public.estimate_finalize_row_photo_upload_r55(uuid,uuid,text,text,text,bigint);

create function public.estimate_finalize_row_photo_upload_r55(
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
  tenant_id uuid,
  owner_user_id uuid,
  request_id text,
  catalog_id text,
  parent_revision_id uuid,
  row_id text,
  storage_bucket text,
  storage_object_key text,
  content_sha256 text,
  mime_type text,
  size_bytes bigint,
  attachment_status text,
  created_at timestamptz,
  created_by uuid,
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
      v_attachment.tenant_id, v_attachment.owner_user_id, v_attachment.request_id,
      v_attachment.catalog_id, v_attachment.parent_revision_id, v_attachment.row_id,
      v_attachment.storage_bucket, v_attachment.storage_object_key,
      v_attachment.content_sha256, v_attachment.mime_type, v_attachment.size_bytes,
      v_event.status, v_attachment.created_at, v_attachment.created_by, false;
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
    v_attachment.tenant_id, v_attachment.owner_user_id, v_attachment.request_id,
    v_attachment.catalog_id, v_attachment.parent_revision_id, v_attachment.row_id,
    v_attachment.storage_bucket, v_attachment.storage_object_key,
    v_attachment.content_sha256, v_attachment.mime_type, v_attachment.size_bytes,
    v_event.status, v_attachment.created_at, v_attachment.created_by, true;
end;
$$;

revoke all on function public.estimate_finalize_row_photo_upload_r55(uuid,uuid,text,text,text,bigint) from public;
grant execute on function public.estimate_finalize_row_photo_upload_r55(uuid,uuid,text,text,text,bigint) to service_role;

comment on function public.estimate_finalize_row_photo_upload_r55(uuid,uuid,text,text,text,bigint) is
  'R5.5 service-only finalization returning the complete authoritative attachment identity after object verification.';

commit;
