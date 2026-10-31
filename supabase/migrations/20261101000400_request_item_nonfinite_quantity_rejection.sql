-- Incremental SOURCE candidate. No historical migration replay, seed or existing-data rewrite.
BEGIN;
DO $gox_nonfinite_rejection$
DECLARE
 target_oid oid:=pg_catalog.to_regprocedure('public.trg_request_items_qty_force_int()');
 before_owner oid; after_owner oid; before_acl aclitem[]; after_acl aclitem[];
 before_properties jsonb; after_properties jsonb; before_triggers jsonb; after_triggers jsonb;
 event_columns text[];
 target_definition CONSTANT text:=$gox_exact_nonfinite_definition$CREATE OR REPLACE FUNCTION public.trg_request_items_qty_force_int()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_ref_count integer;
  v_catalog_count integer;
  v_fk_uom text;
  v_catalog_uom text;
  v_override_uom text;
  v_raw text;
  v_units text[];
  v_unit text;
  v_first_unit text := null;
  v_agrees boolean := true;
begin
  -- Nonfinite input is never a physical quantity. Do not let NaN take the integral fast path.
  if new.qty = 'NaN'::numeric or new.qty = 'Infinity'::numeric or new.qty = '-Infinity'::numeric then
    raise exception using errcode='22023', message='OFFICE_REQUEST_QTY_FINITE_REQUIRED';
  end if;
  if new.qty is null or new.qty <= 0 then
    new.qty := 0;
    return new;
  end if;
  if new.qty = trunc(new.qty) then
    return new;
  end if;
  -- This trigger runs before the captured catalog autofill/ref triggers.
  -- Do not guess the unit of a fractional no-ID insert or copy their LIMIT 1 resolver.
  if tg_op = 'INSERT' and (new.ref_id is null or new.unit_id is null) then
    raise exception using errcode='22023', message='OFFICE_FRACTIONAL_QTY_UNIT_AUTHORITY_REQUIRED';
  end if;
  -- Legacy ceil is the default for unknown, discrete, missing or conflicting authorities.
  if new.ref_id is null or new.unit_id is null or new.rik_code is null
     or new.uom is null or btrim(new.uom) = '' then
    new.qty := ceil(new.qty);
    return new;
  end if;
  if new.ref_table = 'rik_works' then
    select count(*),min(u.code) into v_ref_count,v_fk_uom
    from public.rik_works w join public.uoms u on u.id=w.unit_id
    where w.id=new.ref_id and w.rik_code=new.rik_code and w.unit_id=new.unit_id;
  elsif new.ref_table = 'rik_materials' then
    select count(*),min(u.code) into v_ref_count,v_fk_uom
    from public.rik_materials m join public.uoms u on u.id=m.unit_id
    where m.id=new.ref_id and m.mat_code=new.rik_code and m.unit_id=new.unit_id;
  else
    new.qty := ceil(new.qty);
    return new;
  end if;
  -- Same genuine catalog/override sources used by request_items_autofill; no arbitrary row pick.
  select count(*),min(i.uom_code),min(uo.uom_code)
    into v_catalog_count,v_catalog_uom,v_override_uom
  from public.rik_items i left join public.rik_uom_overrides uo on uo.rik_code=i.rik_code
  where i.rik_code=new.rik_code;
  if v_ref_count <> 1 or v_catalog_count <> 1 or v_fk_uom is null or v_catalog_uom is null then
    new.qty := ceil(new.qty);
    return new;
  end if;
  v_units := array[new.uom,v_fk_uom,v_catalog_uom];
  if v_override_uom is not null then v_units := array_append(v_units,v_override_uom); end if;
  foreach v_raw in array v_units loop
    -- Finite aliases below are pinned to the existing professional/engineering source registries.
    -- Canonical grouping does not convert quantities, create units or assert precision beyond numeric(18,3).
    v_unit := case
      when lower(btrim(v_raw)) collate "C" in ('m','м','meter','metre','lm','linear_m','linear_meter','linear_metre','m.p.','м.п.','пог. м','пог.м','m_drilling_depth') then 'm'
      when lower(btrim(v_raw)) collate "C" in ('m2','m²','м2','м²','sq_m','sqm','кв.м','кв_м','квадратный метр','квадратные метры','m2_glazing','m2_roof','m2_formwork') then 'm2'
      when lower(btrim(v_raw)) collate "C" in ('m3','m³','м3','м³','cubic_m','cbm','m3_concrete') then 'm3'
      when lower(btrim(v_raw)) collate "C" in ('kg','кг','kg_rebar') then 'kg'
      when lower(btrim(v_raw)) collate "C" in ('t','т','ton','tonne','тонна','тонн') then 't'
      when lower(btrim(v_raw)) collate "C" in ('l','л','liter','litre','литр') then 'l'
      else null end;
    if v_unit is null then
      v_agrees := false;
    elsif v_first_unit is null then
      v_first_unit := v_unit;
    elsif v_unit <> v_first_unit then
      v_agrees := false;
    end if;
  end loop;
  if not v_agrees or v_first_unit is null then
    new.qty := ceil(new.qty);
  end if;
  return new;
end;
$function$
$gox_exact_nonfinite_definition$;
BEGIN
 IF target_oid IS NULL OR current_setting('client_encoding')<>'UTF8' THEN RAISE EXCEPTION 'NONFINITE_QTY_SOURCE_ENCODING_OR_OBJECT_HOLD'; END IF;
 SELECT p.proowner,p.proacl,to_jsonb(p)-'prosrc' INTO STRICT before_owner,before_acl,before_properties
 FROM pg_catalog.pg_proc p WHERE p.oid=target_oid AND p.prokind='f' AND p.pronargs=0 AND p.prorettype='pg_catalog.trigger'::regtype;
 IF pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(target_oid),'UTF8')),'hex')
  <>'a8ab2c01238ac764e92bf1cc34e7ffe8527719088dd615f6c5d660aaadd6664b'
  OR pg_catalog.pg_get_userbyid(before_owner)<>'postgres'
 THEN RAISE EXCEPTION 'NONFINITE_QTY_BEFORE_DEFINITION_OWNER_DRIFT'; END IF;
 IF NOT (SELECT count(*)=5 AND count(DISTINCT a.grantee)=5
  AND bool_and(a.grantor=before_owner AND NOT a.is_grantable AND a.privilege_type='EXECUTE'
   AND (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee)::text END)
    IN('PUBLIC','postgres','anon','authenticated','service_role'))
  FROM pg_catalog.aclexplode(coalesce(before_acl,pg_catalog.acldefault('f',before_owner))) a)
 THEN RAISE EXCEPTION 'NONFINITE_QTY_BEFORE_ACL_DRIFT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid='public.request_items'::regclass
  AND a.attname='qty' AND NOT a.attisdropped AND a.attnotnull
  AND pg_catalog.format_type(a.atttypid,a.atttypmod)='numeric(18,3)')
 THEN RAISE EXCEPTION 'NONFINITE_QTY_STORAGE_SHAPE_DRIFT'; END IF;
 SELECT array_agg(a.attname::text ORDER BY q.ord) INTO STRICT event_columns
 FROM pg_catalog.pg_trigger t CROSS JOIN LATERAL unnest(t.tgattr::smallint[])WITH ORDINALITY q(attnum,ord)
 JOIN pg_catalog.pg_attribute a ON a.attrelid=t.tgrelid AND a.attnum=q.attnum AND NOT a.attisdropped
 WHERE t.tgrelid='public.request_items'::regclass AND t.tgname='request_items_qty_force_int'
  AND t.tgfoid=target_oid AND t.tgenabled='O' AND NOT t.tgisinternal AND t.tgtype=23;
 IF event_columns IS DISTINCT FROM ARRAY['qty','uom','unit_id','ref_id','ref_table','rik_code']::text[]
 THEN RAISE EXCEPTION 'NONFINITE_QTY_EXACT_ACTIVE_TRIGGER_REQUIRED'; END IF;
 SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid) INTO before_triggers FROM pg_catalog.pg_trigger t WHERE t.tgrelid='public.request_items'::regclass;
 EXECUTE target_definition;
 SELECT p.proowner,p.proacl,to_jsonb(p)-'prosrc' INTO STRICT after_owner,after_acl,after_properties
 FROM pg_catalog.pg_proc p WHERE p.oid=target_oid;
 SELECT jsonb_agg(to_jsonb(t) ORDER BY t.oid) INTO after_triggers FROM pg_catalog.pg_trigger t WHERE t.tgrelid='public.request_items'::regclass;
 IF pg_catalog.to_regprocedure('public.trg_request_items_qty_force_int()')::oid IS DISTINCT FROM target_oid
  OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(target_oid),'UTF8')),'hex')<>'9fe946ad7df4aecd1698a9a09929740b66a0720499e5b73cfc0ba0dfa5120ba0'
  OR after_owner IS DISTINCT FROM before_owner OR after_acl IS DISTINCT FROM before_acl
  OR after_properties IS DISTINCT FROM before_properties OR after_triggers IS DISTINCT FROM before_triggers
 THEN RAISE EXCEPTION 'NONFINITE_QTY_AFTER_DEFINITION_OWNER_ACL_TRIGGER_DRIFT'; END IF;
END;
$gox_nonfinite_rejection$;
COMMIT;