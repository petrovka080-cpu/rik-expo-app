begin;
create function public.office_request_creation_companies_v2()
returns table(company_id uuid,name text) language plpgsql stable security definer set search_path=''
as $choices$
begin
 if not public.office_request_mfa_ok_v2() then raise exception 'REQUEST_ACTOR_MFA_REQUIRED' using errcode='42501'; end if;
 return query select c.id,c.name::text from public.companies c
  where public.office_request_company_role_v2(c.id,array['director','foreman','engineer']::text[])
  order by c.name,c.id;
end;
$choices$;
revoke all on function public.office_request_creation_companies_v2() from public,anon,authenticated,service_role;
grant execute on function public.office_request_creation_companies_v2() to authenticated;
-- Same canonical creator/numbering contract with explicit tenant input.
create function public.request_create_draft(p_company_id uuid,p_creation_actor_id uuid,
 p_foreman_name text default null,p_need_by date default null,p_comment text default null,
 p_object_type_code text default null,p_level_code text default null,
 p_system_code text default null,p_zone_code text default null,p_request_id uuid default null)
returns public.requests language plpgsql security definer set search_path=''
as $create$
declare v_year integer:=extract(year from coalesce(p_need_by::timestamptz,now()))::int;
 v_seq integer;v_display text;v_row public.requests;
begin
 if p_creation_actor_id is distinct from auth.uid() or not public.office_request_company_role_v2(p_company_id,array['director','foreman','engineer']::text[]) then
  raise exception 'REQUEST_EXPLICIT_COMPANY_REQUIRED' using errcode='42501';
 end if;
 if p_request_id is not null then
  select r.* into v_row from public.requests r where r.id=p_request_id for update;
  if not found or v_row.company_id is distinct from p_company_id or v_row.created_by is distinct from auth.uid()
   or v_row.submitted_at is not null or lower(v_row.status::text) not in ('draft','черновик')
   or exists(select 1 from public.request_items i where i.request_id=p_request_id)
   or exists(select 1 from public.proposals p where p.request_id=p_request_id)
   or exists(select 1 from public.warehouse_issues w where w.request_id=p_request_id) then
   raise exception 'REQUEST_REUSE_TARGET_DENIED' using errcode='42501';
  end if;
  update public.requests r set foreman_name=trim(nullif(p_foreman_name,'')),need_by=p_need_by,
   comment=nullif(p_comment,''),object_type_code=nullif(p_object_type_code,''),
   level_code=nullif(p_level_code,''),system_code=nullif(p_system_code,''),zone_code=nullif(p_zone_code,'')
   where r.id=p_request_id returning r.* into v_row;
  return v_row;
 end if;
 select n.seq,n.display_no into v_seq,v_display from public.fn_next_request_number(v_year) n;
 insert into public.requests as r(id,status,year,seq,display_no,foreman_name,need_by,comment,
  object_type_code,level_code,system_code,zone_code,company_id,created_by)
 values(gen_random_uuid(),'Черновик',v_year,v_seq,v_display,trim(nullif(p_foreman_name,'')),
  p_need_by,nullif(p_comment,''),nullif(p_object_type_code,''),nullif(p_level_code,''),
  nullif(p_system_code,''),nullif(p_zone_code,''),p_company_id,auth.uid()) returning r.* into v_row;
 return v_row;
end;
$create$;
revoke all on function public.request_create_draft(uuid,uuid,text,date,text,text,text,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.request_create_draft(uuid,uuid,text,date,text,text,text,text,text,uuid) to authenticated;

create function public.request_find_reusable_empty_draft_v2(p_company_id uuid)
returns uuid language plpgsql stable security definer set search_path=''
as $reuse$
declare v_id uuid;
begin
 if not public.office_request_company_role_v2(p_company_id,array['director','foreman','engineer']::text[]) then
  raise exception 'REQUEST_EXPLICIT_COMPANY_REQUIRED' using errcode='42501';
 end if;
 select r.id into v_id from public.requests r where r.created_by=auth.uid() and r.company_id=p_company_id
  and r.submitted_at is null and lower(r.status::text) in ('draft','черновик')
  and not exists(select 1 from public.request_items i where i.request_id=r.id)
  and not exists(select 1 from public.proposals p where p.request_id=r.id)
  and not exists(select 1 from public.warehouse_issues w where w.request_id=r.id)
  and not exists(select 1 from public.proposals p join public.proposal_payments pp on pp.proposal_id=p.id where p.request_id=r.id)
 order by coalesce(r.updated_at,r.created_at) desc nulls last,r.id desc limit 1;
 return v_id;
end;
$reuse$;
revoke all on function public.request_find_reusable_empty_draft_v2(uuid) from public,anon,authenticated,service_role;
grant execute on function public.request_find_reusable_empty_draft_v2(uuid) to authenticated;

-- Private transaction ledger. No client table access, service-role policy or
-- replay endpoint. Only the canonical guarded sync may resolve an exact intent.
create table public.office_request_creation_intents_v4(
 intent_id text primary key check(length(intent_id) between 1 and 200),
 actor_id uuid not null references auth.users(id),
 company_id uuid not null references public.companies(id),
 payload jsonb not null,
 request_id uuid references public.requests(id),
 result jsonb,
 created_at timestamptz not null default now(),
 check ((request_id is null)=(result is null))
);
alter table public.office_request_creation_intents_v4 enable row level security;
revoke all on public.office_request_creation_intents_v4 from public,anon,authenticated,service_role;

create function public.request_sync_draft_v2(
  p_request_id uuid default null,
  p_submit boolean default false,
  p_foreman_name text default null,
  p_need_by date default null,
  p_comment text default null,
  p_object_type_code text default null,
  p_level_code text default null,
  p_system_code text default null,
  p_zone_code text default null,
  p_subcontract_id text default null,
  p_contractor_job_id text default null,
  p_object_name text default null,
  p_level_name text default null,
  p_system_name text default null,
  p_zone_name text default null,
  p_items jsonb default '[]'::jsonb,
  p_pending_delete_ids text[] default array[]::text[],
  p_company_id uuid default null,
  p_creation_actor_id uuid default null,
  p_creation_intent_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $request_sync_draft_v2_price_lineage$
declare
  v_request public.requests;
  v_target_company uuid;
  v_item jsonb;
  v_item_id uuid;
  v_existing_item_id uuid;
  v_subcontract_id uuid;
  v_contractor_job_id uuid;
  v_qty numeric;
  v_price numeric;
  v_has_price boolean;
  v_rik_code text;
  v_note text;
  v_app_code text;
  v_kind text;
  v_name_human text;
  v_uom text;
  v_created boolean := false;
  v_items_payload jsonb := '[]'::jsonb;
  v_consumed_item_ids uuid[] := array[]::uuid[];
  v_submit_result jsonb := null;
  v_supplied_ids uuid[] := array[]::uuid[];
  v_delete_ids uuid[] := array[]::uuid[];
  v_raw_id text;
  v_locked_id uuid;
  v_affected integer;
  v_intent public.office_request_creation_intents_v4;
  v_intent_payload jsonb;
  v_result jsonb;
begin
  if not public.office_request_mfa_ok_v2() then
    raise exception 'REQUEST_ACTOR_MFA_REQUIRED' using errcode='42501';
  end if;
  if p_request_id is null then
    if p_creation_actor_id is distinct from auth.uid() or not public.office_request_company_role_v2(p_company_id,array['director','foreman','engineer']::text[]) then
      raise exception 'REQUEST_EXPLICIT_COMPANY_REQUIRED' using errcode='42501';
    end if;
  elsif not public.office_request_write_v2(p_request_id) or
    (p_company_id is not null and not exists(select 1 from public.requests r where r.id=p_request_id and r.company_id=p_company_id)) then
    raise exception 'REQUEST_TARGET_WRITE_DENIED' using errcode='42501';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'request_sync_draft_v2: p_items must be a JSON array';
  end if;

  -- Strict parsing applies to ALL IDs, before any header or child effect.
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'REQUEST_SYNC_ITEM_CONFLICT: item must be object' using errcode='22023';
    end if;
    v_raw_id := nullif(btrim(coalesce(v_item->>'request_item_id','')), '');
    if v_raw_id is not null then
      if v_raw_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        raise exception 'REQUEST_SYNC_ITEM_CONFLICT: malformed item id' using errcode='22023';
      end if;
      v_item_id := v_raw_id::uuid;
      if v_item_id=any(v_supplied_ids) then
        raise exception 'REQUEST_SYNC_ITEM_CONFLICT: duplicate item id' using errcode='22023';
      end if;
      v_supplied_ids := array_append(v_supplied_ids,v_item_id);
    end if;
  end loop;
  foreach v_raw_id in array coalesce(p_pending_delete_ids,array[]::text[]) loop
    if v_raw_id is null or btrim(v_raw_id) !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'REQUEST_SYNC_ITEM_CONFLICT: malformed deletion id' using errcode='22023';
    end if;
    v_item_id := btrim(v_raw_id)::uuid;
    if v_item_id=any(v_delete_ids) or v_item_id=any(v_supplied_ids) then
      raise exception 'REQUEST_SYNC_ITEM_CONFLICT: duplicate/conflicting deletion id' using errcode='22023';
    end if;
    v_delete_ids := array_append(v_delete_ids,v_item_id);
  end loop;
  if p_request_id is null and cardinality(v_supplied_ids||v_delete_ids)>0 then
    raise exception 'REQUEST_SYNC_ITEM_CONFLICT: new request cannot contain existing ids' using errcode='22023';
  end if;

  if p_request_id is null then
    if nullif(btrim(p_creation_intent_id),'') is null or length(p_creation_intent_id)>200 then
      raise exception 'REQUEST_CREATION_INTENT_REQUIRED' using errcode='22023';
    end if;
    -- jsonb equality is an exact payload binding, including submit and company.
    -- A concurrent first attempt waits on this unique row in the same transaction.
    v_intent_payload := jsonb_build_object('submit',p_submit,'foreman',p_foreman_name,
      'need_by',p_need_by,'comment',p_comment,'object_type_code',p_object_type_code,
      'level_code',p_level_code,'system_code',p_system_code,'zone_code',p_zone_code,
      'subcontract_id',p_subcontract_id,'contractor_job_id',p_contractor_job_id,
      'object_name',p_object_name,'level_name',p_level_name,'system_name',p_system_name,
      'zone_name',p_zone_name,'items',p_items,'deletes',to_jsonb(p_pending_delete_ids));
    insert into public.office_request_creation_intents_v4(intent_id,actor_id,company_id,payload)
      values(p_creation_intent_id,auth.uid(),p_company_id,v_intent_payload)
      on conflict(intent_id) do nothing;
    select * into strict v_intent from public.office_request_creation_intents_v4
      where intent_id=p_creation_intent_id for update;
    if v_intent.actor_id is distinct from auth.uid() or v_intent.company_id is distinct from p_company_id
      or v_intent.payload is distinct from v_intent_payload then
      raise exception 'REQUEST_CREATION_INTENT_CONFLICT' using errcode='42501';
    end if;
    if v_intent.result is not null then
      -- Current MFA/company/action authority always precedes replay/readback.
      if not public.office_request_write_v2(v_intent.request_id)
        or not public.office_request_read_v2(v_intent.request_id) then
        raise exception 'REQUEST_CREATION_INTENT_REPLAY_DENIED' using errcode='42501';
      end if;
      return v_intent.result || jsonb_build_object('replayed',true);
    end if;
  else
    select * into v_request from public.requests where id=p_request_id for update;
    if not found or not public.office_request_write_v2(v_request.id)
      or (p_company_id is not null and v_request.company_id is distinct from p_company_id) then
      raise exception 'REQUEST_TARGET_WRITE_DENIED' using errcode='42501';
    end if;
    -- Parent first, then all supplied children in deterministic order. A child
    -- must belong to this exact locked parent even if actor can write both A/B.
    for v_locked_id in
      select i.id from public.request_items i
      where i.id=any(v_supplied_ids||v_delete_ids) order by i.id for update
    loop
      if not exists(select 1 from public.request_items i where i.id=v_locked_id and i.request_id=v_request.id) then
        raise exception 'REQUEST_SYNC_ITEM_CONFLICT: foreign parent' using errcode='22023';
      end if;
    end loop;
    if (select count(*) from public.request_items i where i.request_id=v_request.id
      and i.id=any(v_supplied_ids||v_delete_ids)) <> cardinality(v_supplied_ids||v_delete_ids) then
      raise exception 'REQUEST_SYNC_ITEM_CONFLICT: unknown item id' using errcode='22023';
    end if;
  end if;

  v_subcontract_id :=
    case
      when nullif(btrim(coalesce(p_subcontract_id, '')), '') is null then null
      when btrim(p_subcontract_id) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then btrim(p_subcontract_id)::uuid
      else null
    end;
  v_contractor_job_id :=
    case
      when nullif(btrim(coalesce(p_contractor_job_id, '')), '') is null then null
      when btrim(p_contractor_job_id) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then btrim(p_contractor_job_id)::uuid
      else null
    end;

  v_target_company := coalesce(p_company_id,(select r.company_id from public.requests r where r.id=p_request_id));
  if v_subcontract_id is not null and not exists (
    select 1 from public.subcontracts sc where sc.id=v_subcontract_id
      and to_jsonb(sc)->>'company_id'=v_target_company::text
  ) then
    raise exception 'REQUEST_LINKED_CONTRACT_COMPANY_UNPROVEN' using errcode='42501';
  end if;
  if v_contractor_job_id is not null and v_contractor_job_id is distinct from v_subcontract_id then
    raise exception 'REQUEST_LINKED_JOB_COMPANY_UNPROVEN' using errcode='42501';
  end if;
  if p_request_id is null then
    select *
      into v_request
    from public.request_create_draft(
      p_company_id => p_company_id,
      p_creation_actor_id => p_creation_actor_id,
      p_foreman_name => p_foreman_name,
      p_need_by => p_need_by,
      p_comment => p_comment,
      p_object_type_code => p_object_type_code,
      p_level_code => p_level_code,
      p_system_code => p_system_code,
      p_zone_code => p_zone_code
    );
    v_created := true;

    if p_subcontract_id is not null or p_contractor_job_id is not null or p_object_name is not null then
      update public.requests
         set subcontract_id = coalesce(v_subcontract_id, subcontract_id),
             contractor_job_id = coalesce(v_contractor_job_id, contractor_job_id),
             object_name = coalesce(nullif(btrim(coalesce(p_object_name, '')), ''), object_name)
       where id = v_request.id
       returning * into v_request;
    end if;
  else
    select *
      into v_request
    from public.requests
    where id = p_request_id
    for update;

    if not found then
      raise exception 'request_sync_draft_v2: request % not found', p_request_id;
    end if;

    if not public.request_lifecycle_is_mutable_v1(v_request.status::text, v_request.submitted_at) then
      raise exception using
        errcode = 'P0001',
        message = 'request_sync_draft_v2: stale_draft_against_submitted_request',
        detail = coalesce(v_request.id::text, ''),
        hint = 'Submitted requests are immutable; reopen or rework requires a canonical server transition.';
    end if;

    update public.requests
       set foreman_name = p_foreman_name,
           need_by = p_need_by,
           comment = p_comment,
           object_type_code = nullif(btrim(coalesce(p_object_type_code, '')), ''),
           level_code = nullif(btrim(coalesce(p_level_code, '')), ''),
           system_code = nullif(btrim(coalesce(p_system_code, '')), ''),
           zone_code = nullif(btrim(coalesce(p_zone_code, '')), ''),
           subcontract_id = coalesce(v_subcontract_id, subcontract_id),
           contractor_job_id = coalesce(v_contractor_job_id, contractor_job_id),
           object_name = coalesce(nullif(btrim(coalesce(p_object_name, '')), ''), object_name)
     where id = v_request.id
     returning * into v_request;
  end if;

  if coalesce(array_length(p_pending_delete_ids, 1), 0) > 0 then
    update public.request_items
       set status = 'cancelled',
           cancelled_at = coalesce(cancelled_at, now())
     where request_id = v_request.id
       and id = any(v_delete_ids);
    get diagnostics v_affected = row_count;
    if v_affected <> cardinality(v_delete_ids) then
      raise exception 'REQUEST_SYNC_ITEM_CONFLICT: deletion count changed' using errcode='22023';
    end if;
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items) as item(value)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'request_sync_draft_v2: every item must be an object';
    end if;

    v_item_id :=
      case
        when nullif(btrim(coalesce(v_item ->> 'request_item_id', '')), '') is null then null
        when btrim(v_item ->> 'request_item_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (v_item ->> 'request_item_id')::uuid
        else null
      end;
    v_rik_code := nullif(btrim(coalesce(v_item ->> 'rik_code', '')), '');
    v_qty := nullif(btrim(coalesce(v_item ->> 'qty', '')), '')::numeric;
    v_has_price := v_item ? 'price';
    v_price :=
      case
        when v_has_price and nullif(btrim(coalesce(v_item ->> 'price', '')), '') is not null
          then nullif(btrim(coalesce(v_item ->> 'price', '')), '')::numeric
        else null
      end;
    v_note := nullif(btrim(coalesce(v_item ->> 'note', '')), '');
    v_app_code := nullif(btrim(coalesce(v_item ->> 'app_code', '')), '');
    v_kind := nullif(btrim(coalesce(v_item ->> 'kind', v_item ->> 'item_kind', '')), '');
    v_name_human := nullif(btrim(coalesce(v_item ->> 'name_human', '')), '');
    v_uom := nullif(btrim(coalesce(v_item ->> 'uom', '')), '');

    if v_qty is null or v_qty <= 0 then
      raise exception 'request_sync_draft_v2: qty must be > 0';
    end if;

    if v_price is not null and v_price < 0 then
      raise exception 'request_sync_draft_v2: price must be >= 0';
    end if;

    if v_item_id is not null then
      perform public.request_item_update_qty(v_item_id, v_qty);
    else
      select ri.id
        into v_existing_item_id
      from public.request_items ri
      where ri.request_id = v_request.id
        and ri.cancelled_at is null
        and v_rik_code is not null
        and upper(btrim(coalesce(ri.rik_code, ''))) = upper(v_rik_code)
        and not (ri.id = any(v_consumed_item_ids))
      order by ri.position_order asc, ri.row_no asc, ri.created_at asc, ri.id asc
      limit 1
      for update;

      if v_existing_item_id is not null then
        v_item_id := v_existing_item_id;
        perform public.request_item_update_qty(v_item_id, v_qty);
      else
        if v_rik_code is null then
          raise exception 'request_sync_draft_v2: rik_code is required for new items';
        end if;

        v_item_id := nullif(
          btrim(
            public.request_item_add_or_inc(
              p_request_id => v_request.id,
              p_rik_code => v_rik_code,
              p_qty_add => v_qty
            )::text
          ),
          ''
        )::uuid;
      end if;
    end if;

    if v_item_id is null then
      raise exception 'request_sync_draft_v2: item mutation returned empty id';
    end if;

    update public.request_items
       set status = 'draft',
           price = case when v_has_price and v_price is not null then v_price else price end,
           note = v_note,
           app_code = v_app_code,
           kind = v_kind,
           item_kind = v_kind,
           name_human = coalesce(v_name_human, name_human),
           uom = coalesce(v_uom, uom)
     where id = v_item_id
       and request_id = v_request.id;
    get diagnostics v_affected = row_count;
    if v_affected <> 1 then
      raise exception 'REQUEST_SYNC_ITEM_CONFLICT: item mutation count changed' using errcode='22023';
    end if;

    v_consumed_item_ids := array_append(v_consumed_item_ids, v_item_id);
    v_existing_item_id := null;
  end loop;

  if p_submit then
    v_submit_result := public.request_submit_atomic_v1(v_request.id::text);
    if coalesce((v_submit_result ->> 'ok')::boolean, false) is not true then
      raise exception using
        errcode = 'P0001',
        message = format(
          'request_sync_draft_v2: submit_transition_failed:%s',
          coalesce(v_submit_result ->> 'failure_code', 'unknown')
        ),
        detail = coalesce(v_submit_result ->> 'failure_message', 'request submit failed'),
        hint = 'Submit requires a valid mutable draft with at least one active request item.';
    end if;
  end if;

  select *
    into v_request
  from public.requests
  where id = v_request.id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', ri.id,
               'request_id', ri.request_id,
               'rik_code', ri.rik_code,
               'name_human', ri.name_human,
               'qty', ri.qty,
               'price', ri.price,
               'uom', ri.uom,
               'status', ri.status,
               'supplier_hint', ri.supplier_hint,
               'app_code', ri.app_code,
               'note', ri.note,
               'kind', coalesce(nullif(btrim(coalesce(ri.kind, '')), ''), nullif(btrim(coalesce(ri.item_kind, '')), '')),
               'item_kind', ri.item_kind,
               'line_no', ri.row_no,
               'updated_at', ri.updated_at
             )
             order by ri.position_order asc, ri.row_no asc, ri.created_at asc, ri.id asc
           ),
           '[]'::jsonb
         )
    into v_items_payload
  from public.request_items ri
  where ri.request_id = v_request.id
    and lower(coalesce(ri.status, '')) <> 'cancelled';

  v_result := jsonb_build_object(
    'document_type', 'request_draft_sync',
    'version', 'v2',
    'generated_at', timezone('utc', now()),
    'request_payload', to_jsonb(v_request),
    'items_payload', v_items_payload,
    'submitted', p_submit,
    'request_created', v_created,
    'meta', jsonb_build_object(
      'line_count', jsonb_array_length(p_items),
      'pending_delete_count', coalesce(array_length(p_pending_delete_ids, 1), 0),
      'submit_owner', case when p_submit then 'request_submit_atomic_v1' else null end,
      'submit_path', case when p_submit then v_submit_result ->> 'submit_path' else null end,
      'submit_verification', case when p_submit then coalesce(v_submit_result -> 'verification', 'null'::jsonb) else null end,
      'kind_chain_owner', 'foreman_ai_estimate_kind_chain_v1',
      'price_lineage_owner', 'request_sync_draft_v2_price_lineage_v1'
    )
  );
  if p_request_id is null then
    update public.office_request_creation_intents_v4 set request_id=v_request.id,result=v_result
      where intent_id=p_creation_intent_id;
  end if;
  return v_result;
end;
$request_sync_draft_v2_price_lineage$;

comment on function public.request_sync_draft_v2(uuid, boolean, text, date, text, text, text, text, text, text, text, text, text, text, text, jsonb, text[], uuid, uuid, text) is
'Foreman request draft sync v2. Preserves kind/item_kind and planned item price through local draft, director submission, and downstream lineage.';

revoke all on function public.request_sync_draft_v2(uuid, boolean, text, date, text, text, text, text, text, text, text, text, text, text, text, jsonb, text[], uuid, uuid, text) from public,anon,authenticated,service_role;
grant execute on function public.request_sync_draft_v2(uuid, boolean, text, date, text, text, text, text, text, text, text, text, text, text, text, jsonb, text[], uuid, uuid, text) to authenticated;

revoke all on function public.request_sync_draft_v2(uuid, boolean, text, date, text, text, text, text, text, text, text, text, text, text, text, jsonb, text[]) from public,anon,authenticated;
revoke all on function public.request_find_reusable_empty_draft_v1(uuid) from public,anon,authenticated;
commit;
