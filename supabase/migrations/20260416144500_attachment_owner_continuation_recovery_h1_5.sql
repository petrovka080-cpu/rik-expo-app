begin;

create or replace function public.proposal_attachment_evidence_attach_v1(
  p_proposal_id text,
  p_bucket_id text,
  p_storage_path text,
  p_file_name text,
  p_group_key text,
  p_mime_type text default null,
  p_created_by text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal public.proposals%rowtype;
  v_attachment public.proposal_attachments%rowtype;
  v_group_key text := nullif(trim(p_group_key), '');
  v_bucket_id text := nullif(trim(p_bucket_id), '');
  v_storage_path text := nullif(trim(p_storage_path), '');
  v_file_name text := nullif(trim(p_file_name), '');
  v_entity_type text := 'proposal';
  v_entity_id text;
  v_evidence_kind text;
  v_visibility_scope text;
  v_created_by text := nullif(trim(coalesce(auth.uid()::text, p_created_by)), '');
  v_mime_type text;
  v_lock_key text;
  v_actor_role text := null;
  v_actor_allowed boolean := false;
begin
  if nullif(trim(p_proposal_id), '') is null then
    raise exception 'proposal_attachment_evidence_attach_v1: proposal_id is empty'
      using errcode = '22023';
  end if;
  if v_bucket_id is null then
    raise exception 'proposal_attachment_evidence_attach_v1: bucket_id is empty'
      using errcode = '22023';
  end if;
  if v_storage_path is null then
    raise exception 'proposal_attachment_evidence_attach_v1: storage_path is empty'
      using errcode = '22023';
  end if;
  if v_file_name is null then
    raise exception 'proposal_attachment_evidence_attach_v1: file_name is empty'
      using errcode = '22023';
  end if;
  if v_group_key is null then
    raise exception 'proposal_attachment_evidence_attach_v1: group_key is empty'
      using errcode = '22023';
  end if;

  select *
  into v_proposal
  from public.proposals
  where id::text = trim(p_proposal_id)
  limit 1;

  if not found then
    raise exception 'proposal_attachment_evidence_attach_v1: invalid proposal context'
      using errcode = 'P0001',
            detail = 'invalid_entity_context';
  end if;

  if auth.uid() is not null then
    v_actor_role := public.proposal_attachment_actor_role_v1(null);
    v_actor_allowed :=
      lower(coalesce(v_actor_role, '')) in ('buyer', 'accountant')
      or v_proposal.created_by = auth.uid();

    if not v_actor_allowed then
      select exists(
        select 1
        from public.company_members cm
        where cm.user_id = auth.uid()
          and lower(trim(coalesce(cm.role, ''))) in ('buyer', 'accountant')
      )
      into v_actor_allowed;
    end if;

    if not v_actor_allowed then
      raise exception 'proposal_attachment_evidence_attach_v1: forbidden actor role'
        using errcode = '42501',
              detail = coalesce(v_actor_role, 'unknown_role');
    end if;
  end if;

  if not exists (
    select 1
    from storage.objects so
    where so.bucket_id = v_bucket_id
      and so.name = v_storage_path
  ) then
    raise exception 'proposal_attachment_evidence_attach_v1: storage object not found'
      using errcode = 'P0001',
            detail = 'invalid_storage_context';
  end if;

  v_entity_id := v_proposal.id::text;
  v_evidence_kind := public.proposal_attachment_evidence_kind_v1(v_group_key);
  v_visibility_scope := public.proposal_attachment_visibility_scope_v1(v_evidence_kind);
  v_created_by := coalesce(v_created_by, nullif(trim(v_proposal.created_by::text), ''));
  v_mime_type := public.proposal_attachment_mime_type_v1(v_file_name, v_group_key, p_mime_type);
  v_lock_key := concat_ws('|', v_entity_type, v_entity_id, v_bucket_id, v_storage_path, v_group_key);

  perform pg_advisory_xact_lock(hashtext(v_lock_key));

  select *
  into v_attachment
  from public.proposal_attachments
  where proposal_id = v_proposal.id
    and coalesce(bucket_id, '') = v_bucket_id
    and coalesce(storage_path, '') = v_storage_path
    and group_key = v_group_key
  order by id desc
  limit 1;

  if found then
    update public.proposal_attachments
    set
      file_name = v_file_name,
      entity_type = v_entity_type,
      entity_id = v_entity_id,
      evidence_kind = v_evidence_kind,
      created_by = coalesce(v_created_by, created_by),
      visibility_scope = v_visibility_scope,
      mime_type = coalesce(v_mime_type, mime_type)
    where id = v_attachment.id
    returning *
    into v_attachment;
  else
    insert into public.proposal_attachments (
      proposal_id,
      bucket_id,
      storage_path,
      file_name,
      group_key,
      url,
      entity_type,
      entity_id,
      evidence_kind,
      created_by,
      visibility_scope,
      mime_type
    )
    values (
      v_proposal.id,
      v_bucket_id,
      v_storage_path,
      v_file_name,
      v_group_key,
      null,
      v_entity_type,
      v_entity_id,
      v_evidence_kind,
      v_created_by,
      v_visibility_scope,
      v_mime_type
    )
    returning *
    into v_attachment;
  end if;

  return jsonb_build_object(
    'attachment_id', v_attachment.id::text,
    'proposal_id', v_proposal.id::text,
    'entity_type', v_entity_type,
    'entity_id', v_entity_id,
    'evidence_kind', v_evidence_kind,
    'created_by', v_created_by,
    'visibility_scope', v_visibility_scope,
    'group_key', v_attachment.group_key,
    'file_name', v_attachment.file_name,
    'bucket_id', v_attachment.bucket_id,
    'storage_path', v_attachment.storage_path,
    'mime_type', v_attachment.mime_type,
    'source_kind', 'rpc:proposal_attachment_evidence_attach_v1'
  );
end;
$$;

comment on function public.proposal_attachment_evidence_attach_v1(text, text, text, text, text, text, text) is
'H1.5 recovery: keeps buyer/accountant attach permissions and additionally allows the authenticated creator of an existing proposal to bind its upload, preventing role-drift contractor false denies without granting access to other proposals.';

grant execute on function public.proposal_attachment_evidence_attach_v1(
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
