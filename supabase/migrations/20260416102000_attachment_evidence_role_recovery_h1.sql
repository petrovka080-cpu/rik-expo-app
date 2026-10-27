begin;

create or replace function public.proposal_attachment_actor_role_v1(
  p_fallback_role text default null
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text := nullif(lower(trim(p_fallback_role)), '');
begin
  if auth.uid() is not null then
    v_role := nullif(lower(trim(coalesce(public.get_my_role(), ''))), '');

    if v_role is null then
      select nullif(lower(trim(p.role)), '')
      into v_role
      from public.profiles p
      where p.user_id = auth.uid()
      limit 1;
    end if;

    if v_role is null then
      select nullif(lower(trim(cm.role)), '')
      into v_role
      from public.company_members cm
      where cm.user_id = auth.uid()
        and nullif(trim(cm.role), '') is not null
      order by case lower(trim(cm.role))
        when 'buyer' then 1
        when 'director' then 2
        when 'accountant' then 3
        else 99
      end
      limit 1;
    end if;
  end if;

  return v_role;
end;
$$;

comment on function public.proposal_attachment_actor_role_v1(text) is
'H1 attachment evidence recovery: resolves attachment actor/viewer role from get_my_role(), profiles.role, and company_members without changing attachment business permissions.';

grant execute on function public.proposal_attachment_actor_role_v1(text) to authenticated, service_role;

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
    v_actor_allowed := lower(coalesce(v_actor_role, '')) in ('buyer', 'accountant');

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

create or replace function public.proposal_attachment_evidence_scope_v1(
  p_proposal_id text,
  p_group_key text default null,
  p_viewer_role text default null
)
returns table (
  attachment_id text,
  proposal_id text,
  entity_type text,
  entity_id text,
  evidence_kind text,
  created_by text,
  visibility_scope text,
  file_name text,
  mime_type text,
  file_url text,
  storage_path text,
  bucket_id text,
  group_key text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_role text := nullif(lower(trim(p_viewer_role)), '');
  v_viewer_role text := null;
  v_member_role text := null;
begin
  if auth.uid() is null then
    v_viewer_role := v_requested_role;
  else
    v_viewer_role := public.proposal_attachment_actor_role_v1(null);

    if v_viewer_role is null or lower(v_viewer_role) not in ('buyer', 'director', 'accountant') then
      select nullif(lower(trim(cm.role)), '')
      into v_member_role
      from public.company_members cm
      where cm.user_id = auth.uid()
        and lower(trim(coalesce(cm.role, ''))) in ('buyer', 'director', 'accountant')
      order by case lower(trim(cm.role))
        when 'director' then 1
        when 'accountant' then 2
        when 'buyer' then 3
        else 99
      end
      limit 1;

      v_viewer_role := coalesce(v_member_role, v_viewer_role);
    end if;
  end if;

  if v_viewer_role is null or lower(v_viewer_role) not in ('buyer', 'director', 'accountant') then
    v_viewer_role := 'buyer';
  end if;

  return query
  with evidence_rows as (
    select
      pa.id::text as attachment_id,
      coalesce(pa.proposal_id::text, nullif(trim(pa.entity_id), '')) as proposal_id,
      coalesce(nullif(trim(pa.entity_type), ''), 'proposal') as entity_type,
      coalesce(nullif(trim(pa.entity_id), ''), pa.proposal_id::text) as entity_id,
      coalesce(
        nullif(trim(pa.evidence_kind), ''),
        public.proposal_attachment_evidence_kind_v1(pa.group_key)
      ) as evidence_kind,
      coalesce(
        nullif(trim(pa.created_by), ''),
        nullif(trim(p.created_by::text), '')
      ) as created_by,
      coalesce(
        nullif(trim(pa.visibility_scope), ''),
        public.proposal_attachment_visibility_scope_v1(
          coalesce(
            nullif(trim(pa.evidence_kind), ''),
            public.proposal_attachment_evidence_kind_v1(pa.group_key)
          )
        )
      ) as visibility_scope,
      pa.file_name::text as file_name,
      public.proposal_attachment_mime_type_v1(pa.file_name, pa.group_key, pa.mime_type) as mime_type,
      pa.url::text as file_url,
      pa.storage_path::text as storage_path,
      pa.bucket_id::text as bucket_id,
      pa.group_key::text as group_key,
      pa.created_at as created_at
    from public.proposal_attachments pa
    left join public.proposals p
      on p.id = pa.proposal_id
    where coalesce(nullif(trim(pa.entity_type), ''), 'proposal') = 'proposal'
      and coalesce(nullif(trim(pa.entity_id), ''), pa.proposal_id::text) = trim(p_proposal_id)
      and (
        nullif(trim(p_group_key), '') is null
        or pa.group_key = trim(p_group_key)
      )
  )
  select
    er.attachment_id,
    er.proposal_id,
    er.entity_type,
    er.entity_id,
    er.evidence_kind,
    er.created_by,
    er.visibility_scope,
    er.file_name,
    er.mime_type,
    er.file_url,
    er.storage_path,
    er.bucket_id,
    er.group_key,
    er.created_at
  from evidence_rows er
  where public.proposal_attachment_visibility_allows_v1(er.visibility_scope, v_viewer_role)
  order by er.created_at desc nulls last, er.attachment_id desc;
end;
$$;

grant execute on function public.proposal_attachment_evidence_attach_v1(
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated, service_role;

grant execute on function public.proposal_attachment_evidence_scope_v1(
  text,
  text,
  text
) to authenticated, service_role;

commit;
