-- SOURCE ONLY 00500: bind exact proven current authority only on a NEW integer row; no historical row repair.
BEGIN;
DO $gox_integer_new_authority$
DECLARE
 target_oid oid:=pg_catalog.to_regprocedure('public.request_item_add_or_inc(uuid,text,numeric)');
 before_properties jsonb; after_properties jsonb; before_owner oid; before_acl aclitem[];
 after_owner oid; after_acl aclitem[]; before_triggers jsonb; after_triggers jsonb; binding record;
 target_definition CONSTANT text:=$gox_exact_generic_definition$CREATE OR REPLACE FUNCTION public.request_item_add_or_inc(p_request_id uuid, p_rik_code text, p_qty_add numeric DEFAULT 1)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_code text;
  v_ref_count bigint;
  v_catalog_count bigint;
  v_ref_table text;
  v_ref_id uuid;
  v_unit_id uuid;
  v_fk_uom text;
  v_catalog_uom text;
  v_override_uom text;
  v_effective_uom text;
  v_existing public.request_items;
  v_written public.request_items;
  v_expected numeric;
  v_guard_integer_conflict boolean := false;
begin
  if p_request_id is null then
    raise exception 'request_id is null';
  end if;

  if p_qty_add is null or p_qty_add <= 0 then
    raise exception 'qty must be > 0';
  end if;

  v_code := upper(trim(p_rik_code));
  if v_code is null or v_code = '' then
    raise exception 'rik_code is empty';
  end if;

  -- One genuine source resolver for both new-row admission paths; no unit alias policy here.
  select count(*),(array_agg(r.ref_table))[1],(array_agg(r.ref_id))[1],
         (array_agg(r.unit_id))[1],(array_agg(u.code))[1]
    into v_ref_count,v_ref_table,v_ref_id,v_unit_id,v_fk_uom
  from (
    select 'rik_works'::text ref_table,w.id ref_id,w.unit_id from public.rik_works w where w.rik_code=v_code
    union all
    select 'rik_materials'::text,m.id,m.unit_id from public.rik_materials m where m.mat_code=v_code
  ) r left join public.uoms u on u.id=r.unit_id;
  select count(*),(array_agg(i.uom_code))[1],(array_agg(uo.uom_code))[1]
    into v_catalog_count,v_catalog_uom,v_override_uom
  from public.rik_items i left join public.rik_uom_overrides uo on uo.rik_code=i.rik_code
  where i.rik_code=v_code;
  if p_qty_add <> trunc(p_qty_add) then
    if v_ref_count<>1 or v_catalog_count<>1 or v_ref_id is null or v_unit_id is null
       or v_fk_uom is null or v_catalog_uom is null then
      raise exception using errcode='22023',message='OFFICE_GENERIC_FRACTIONAL_AUTHORITY_REQUIRED';
    end if;
    v_effective_uom:=coalesce(v_override_uom,v_catalog_uom);
    -- Never upgrade or overwrite an existing row's stored unit/reference authority.
    select * into v_existing from public.request_items
      where request_id=p_request_id and rik_code=v_code for update;
    if not found then
      insert into public.request_items(request_id,rik_code,qty,ref_table,ref_id,unit_id,uom)
      values(p_request_id,v_code,p_qty_add,v_ref_table,v_ref_id,v_unit_id,v_effective_uom)
      on conflict(request_id,rik_code) do nothing returning id into v_id;
      if v_id is not null then
        select * into strict v_written from public.request_items where id=v_id and request_id=p_request_id;
        if v_written.qty is distinct from p_qty_add or v_written.rik_code is distinct from v_code
           or v_written.ref_table is distinct from v_ref_table or v_written.ref_id is distinct from v_ref_id
           or v_written.unit_id is distinct from v_unit_id or v_written.uom is distinct from v_effective_uom then
          raise exception using errcode='22023',message='OFFICE_GENERIC_FRACTIONAL_PERSISTENCE_REQUIRED';
        end if;
        return v_id;
      end if;
      -- A concurrent conflicting insert is re-read and locked; no unit authority is adopted blindly.
      select * into strict v_existing from public.request_items
        where request_id=p_request_id and rik_code=v_code for update;
    end if;
    if v_existing.ref_table is distinct from v_ref_table or v_existing.ref_id is distinct from v_ref_id
       or v_existing.unit_id is distinct from v_unit_id or v_existing.uom is distinct from v_effective_uom then
      raise exception using errcode='22023',message='OFFICE_GENERIC_FRACTIONAL_EXISTING_AUTHORITY_CONFLICT';
    end if;
    v_expected:=coalesce(v_existing.qty,0)+p_qty_add;
    -- BEFORE INSERT runs the one active unit policy. Its rounded EXCLUDED quantity is never incremented.
    insert into public.request_items(request_id,rik_code,qty,ref_table,ref_id,unit_id,uom)
    values(p_request_id,v_code,p_qty_add,v_ref_table,v_ref_id,v_unit_id,v_effective_uom)
    on conflict(request_id,rik_code) do update
      set qty=coalesce(public.request_items.qty,0)+excluded.qty
      where excluded.qty=p_qty_add and public.request_items.id=v_existing.id
    returning * into v_written;
    if not found then
      raise exception using errcode='22023',message='OFFICE_GENERIC_FRACTIONAL_AUTHORITY_REQUIRED';
    end if;
    if v_written.qty is distinct from v_expected
       or (to_jsonb(v_written)-'qty'-'updated_at') is distinct from (to_jsonb(v_existing)-'qty'-'updated_at') then
      raise exception using errcode='22023',message='OFFICE_GENERIC_FRACTIONAL_PERSISTENCE_REQUIRED';
    end if;
    return v_written.id;
  end if;

  -- Bind only a genuinely NEW finite integer row with exact agreeing source unit text.
  -- This is a sufficient source-identity subset, not an alias/continuous/coarse classification.
  -- Unknown/ambiguous/conflicting sources retain the original integer path below.
  if p_qty_add = trunc(p_qty_add)
     and p_qty_add not in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)
     and v_ref_count=1 and v_catalog_count=1 and v_ref_id is not null and v_unit_id is not null
     and v_fk_uom is not null and btrim(v_fk_uom)<>'' and v_catalog_uom is not null
     and v_fk_uom collate "C" = v_catalog_uom collate "C"
     and (v_override_uom is null or v_override_uom collate "C" = v_fk_uom collate "C") then
    v_effective_uom:=coalesce(v_override_uom,v_catalog_uom);
    select * into v_existing from public.request_items
      where request_id=p_request_id and rik_code=v_code for update;
    if not found then
      insert into public.request_items(request_id,rik_code,qty,ref_table,ref_id,unit_id,uom)
      values(p_request_id,v_code,p_qty_add,v_ref_table,v_ref_id,v_unit_id,v_effective_uom)
      on conflict(request_id,rik_code) do nothing returning id into v_id;
      if v_id is not null then
        select * into strict v_written from public.request_items where id=v_id and request_id=p_request_id;
        if v_written.qty is distinct from p_qty_add or v_written.rik_code is distinct from v_code
           or v_written.ref_table is distinct from v_ref_table or v_written.ref_id is distinct from v_ref_id
           or v_written.unit_id is distinct from v_unit_id or v_written.uom is distinct from v_effective_uom then
          raise exception using errcode='22023',message='OFFICE_GENERIC_INTEGER_PERSISTENCE_REQUIRED';
        end if;
        return v_id;
      end if;
      -- Lost INSERT arbitration: new statement, actual winner locked, never rebind its authority.
      select * into strict v_existing from public.request_items
        where request_id=p_request_id and rik_code=v_code for update;
      v_expected:=coalesce(v_existing.qty,0)+p_qty_add;
      v_guard_integer_conflict:=true;
    end if;
  end if;
  insert into public.request_items (request_id, rik_code, qty)
  values (p_request_id, v_code, p_qty_add)
  on conflict (request_id, rik_code)
  do update set qty = coalesce(public.request_items.qty,0) + excluded.qty
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.request_items
    where request_id = p_request_id and rik_code = v_code
    limit 1;
  end if;

  if v_id is null then
    raise exception 'request_item_add_or_inc failed: request_id=%, rik_code=%', p_request_id, v_code;
  end if;

  -- Only the newly admitted INSERT loser uses this postcondition; no stored authority is repaired.
  if v_guard_integer_conflict then
    select * into strict v_written from public.request_items
      where id=v_id and request_id=p_request_id and rik_code=v_code;
    if v_written.id is distinct from v_existing.id or v_written.qty is distinct from v_expected
       or (to_jsonb(v_written)-'qty'-'updated_at') is distinct from (to_jsonb(v_existing)-'qty'-'updated_at') then
      raise exception using errcode='22023',message='OFFICE_GENERIC_INTEGER_CONFLICT_PERSISTENCE_REQUIRED';
    end if;
  end if;
  return v_id;
end
$function$
$gox_exact_generic_definition$;
BEGIN
 IF target_oid IS NULL THEN RAISE EXCEPTION 'GENERIC_HELPER_MISSING'; END IF;
 SELECT to_jsonb(p)-'prosrc',p.proowner,p.proacl INTO STRICT before_properties,before_owner,before_acl
 FROM pg_catalog.pg_proc p WHERE p.oid=target_oid;
 IF encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(target_oid),'UTF8')),'hex')
 <> '28c6123ebee04c81a8861afe78c454fabe6548a0eea185f3a4180fda16245e63'
 OR pg_catalog.pg_get_userbyid(before_owner)<>'postgres'
 OR before_acl IS DISTINCT FROM ARRAY['=X/postgres','postgres=X/postgres','anon=X/postgres','authenticated=X/postgres','service_role=X/postgres']::aclitem[]
 THEN RAISE EXCEPTION 'GENERIC_HELPER_BEFORE_DEFINITION_OR_OWNER_ACL_DRIFT'; END IF;
 IF encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef('public.trg_request_items_qty_force_int()'::regprocedure),'UTF8')),'hex')
 <> '9fe946ad7df4aecd1698a9a09929740b66a0720499e5b73cfc0ba0dfa5120ba0'
 OR encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef('public.fn_request_items_fill_refs()'::regprocedure),'UTF8')),'hex')
 <> '4a43177a3a0e7f6f375ba384bcd889e27afd4289c80ec9281240f50faa671b18'
 OR encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef('public.request_items_autofill()'::regprocedure),'UTF8')),'hex')
 <> 'e4a8c4628590b1bfc581873b3469fabe926e68fc6142363b1964245700ea807c'
 THEN RAISE EXCEPTION 'GENERIC_AUTHORITY_GUARD_DEPENDENCY_DRIFT'; END IF;
 IF encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_viewdef('public.rik_works'::regclass,true),'UTF8')),'hex')<>'2a97565a382922b6c274ba0519eafbe519f4c943b55a434413b441b47cefe5fb' THEN RAISE EXCEPTION 'GENERIC_VIEW_SOURCE_DRIFT_rik_works'; END IF;
 IF encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_viewdef('public.rik_materials'::regclass,true),'UTF8')),'hex')<>'01af3eb2961bd4ab1c2e34952ee0140b4c57e80056f4db5d4b67d73d46221d33' THEN RAISE EXCEPTION 'GENERIC_VIEW_SOURCE_DRIFT_rik_materials'; END IF;
 IF encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_viewdef('public.rik_items'::regclass,true),'UTF8')),'hex')<>'ff5fc1369f60e5ffb0217df293cc42068d78def140bf73c5cfba690718725d3e' THEN RAISE EXCEPTION 'GENERIC_VIEW_SOURCE_DRIFT_rik_items'; END IF;
 SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid) INTO before_triggers FROM pg_catalog.pg_trigger t
 WHERE t.tgrelid='public.request_items'::regclass;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.request_items'::regclass
  AND tgname='request_items_qty_force_int' AND tgenabled='O' AND NOT tgisinternal AND tgtype=23
  AND (SELECT array_agg(a.attname::text ORDER BY a.attname::text COLLATE "C")
   FROM pg_catalog.pg_attribute a WHERE a.attrelid=tgrelid AND a.attnum=ANY(tgattr::smallint[]))
   =ARRAY['qty','ref_id','ref_table','rik_code','unit_id','uom']::text[]
  AND tgfoid='public.trg_request_items_qty_force_int()'::regprocedure)
 THEN RAISE EXCEPTION 'GENERIC_ACTIVE_QUANTITY_TRIGGER_REQUIRED'; END IF;
 EXECUTE target_definition;
 SELECT to_jsonb(p)-'prosrc',p.proowner,p.proacl INTO STRICT after_properties,after_owner,after_acl
 FROM pg_catalog.pg_proc p WHERE p.oid=target_oid;
 SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid) INTO after_triggers FROM pg_catalog.pg_trigger t
 WHERE t.tgrelid='public.request_items'::regclass;
 IF encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(target_oid),'UTF8')),'hex')<>'ec82c67d2cb4c7d2423c1b86fb7cdc8257f5313ae32fc602ea3084935f8d7664'
 OR after_owner IS DISTINCT FROM before_owner OR after_acl IS DISTINCT FROM before_acl
 OR after_properties IS DISTINCT FROM before_properties OR after_triggers IS DISTINCT FROM before_triggers
 THEN RAISE EXCEPTION 'GENERIC_HELPER_AFTER_DEFINITION_OR_INVARIANT_DRIFT'; END IF;
END;
$gox_integer_new_authority$;
COMMIT;