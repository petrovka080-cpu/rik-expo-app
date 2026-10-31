-- SOURCE product candidate. Apply only through ROOT-reviewed owned DB/phase ledger.
-- Conservative six measured-unit groups; no new norms/unit conversion/catalog edits.
BEGIN;
DO $gox_measured_fraction$
DECLARE
 target_oid oid := pg_catalog.to_regprocedure('public.trg_request_items_qty_force_int()');
 table_oid oid := pg_catalog.to_regclass('public.request_items');
 trigger_oid oid;
 before_properties jsonb;
 before_trigger_properties jsonb;
 before_owner oid;
 before_acl aclitem[];
 after_owner oid;
 after_acl aclitem[];
 after_properties jsonb;
 after_trigger_properties jsonb;
 observed_sha text;
 trigger_sha text;
 event_columns text[];
 binding record;
 target_definition CONSTANT text := $gox_exact_qty_definition$CREATE OR REPLACE FUNCTION public.trg_request_items_qty_force_int()
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
$gox_exact_qty_definition$;
BEGIN
 IF pg_catalog.current_setting('client_encoding') <> 'UTF8' OR target_oid IS NULL OR table_oid IS NULL THEN
  RAISE EXCEPTION 'OFFICE_QTY_SOURCE_OBJECT_OR_ENCODING_HOLD';
 END IF;
 SELECT p.proowner,p.proacl,to_jsonb(p)-'prosrc',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid),'UTF8')),'hex')
 INTO STRICT before_owner,before_acl,before_properties,observed_sha FROM pg_catalog.pg_proc p
 WHERE p.oid=target_oid AND p.prokind='f' AND p.pronargs=0 AND p.prorettype='pg_catalog.trigger'::regtype;
 IF observed_sha <> 'e7035240796dfd52841f2de399f714e031a595c7c0f7d0f75d6d9ff2b3f76f1a' OR pg_catalog.pg_get_userbyid(before_owner)<>'postgres' THEN
  RAISE EXCEPTION 'OFFICE_QTY_BEFORE_DEFINITION_OWNER_DRIFT';
 END IF;
 IF NOT (SELECT count(*)=5 AND count(DISTINCT a.grantee)=5 AND bool_and(a.grantor=before_owner AND NOT a.is_grantable AND a.privilege_type='EXECUTE'
  AND (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee)::text END) IN('PUBLIC','postgres','anon','authenticated','service_role'))
  FROM pg_catalog.aclexplode(coalesce(before_acl,pg_catalog.acldefault('f',before_owner))) a) THEN
  RAISE EXCEPTION 'OFFICE_QTY_BEFORE_ACL_DRIFT';
 END IF;
 SELECT t.oid,to_jsonb(t)-'tgattr',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_triggerdef(t.oid,true),'UTF8')),'hex')
 INTO STRICT trigger_oid,before_trigger_properties,trigger_sha FROM pg_catalog.pg_trigger t
 WHERE t.tgrelid=table_oid AND t.tgname='request_items_qty_force_int' AND t.tgfoid=target_oid AND t.tgenabled='O' AND NOT t.tgisinternal;
 IF trigger_sha <> 'f0223c2c9e105baf2e90c2845cd69cadaa2dab38c9630c84304cd1b1bca8bd3c' THEN RAISE EXCEPTION 'OFFICE_QTY_BEFORE_TRIGGER_DRIFT'; END IF;
 SELECT array_agg(a.attname::text ORDER BY a.attname::text COLLATE "C") INTO event_columns
 FROM pg_catalog.pg_trigger t CROSS JOIN LATERAL unnest(t.tgattr::smallint[]) x(ordinal)
 JOIN pg_catalog.pg_attribute a ON a.attrelid=t.tgrelid AND a.attnum=x.ordinal AND NOT a.attisdropped WHERE t.oid=trigger_oid;
 IF event_columns IS DISTINCT FROM ARRAY['qty']::text[] THEN RAISE EXCEPTION 'OFFICE_QTY_BEFORE_TRIGGER_COLUMNS_DRIFT'; END IF;
 FOR binding IN SELECT * FROM (VALUES ('public.rik_items','ff5fc1369f60e5ffb0217df293cc42068d78def140bf73c5cfba690718725d3e'),('public.rik_works','2a97565a382922b6c274ba0519eafbe519f4c943b55a434413b441b47cefe5fb'),('public.rik_materials','01af3eb2961bd4ab1c2e34952ee0140b4c57e80056f4db5d4b67d73d46221d33')) x(logical_name,sha256) LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c WHERE c.oid=pg_catalog.to_regclass(binding.logical_name) AND c.relkind='v'
   AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_viewdef(c.oid,true),'UTF8')),'hex')=binding.sha256) THEN
   RAISE EXCEPTION 'OFFICE_QTY_CATALOG_VIEW_BINDING_DRIFT';
  END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=table_oid AND a.attname='qty' AND NOT a.attisdropped AND a.attnotnull
  AND pg_catalog.format_type(a.atttypid,a.atttypmod)='numeric(18,3)') THEN RAISE EXCEPTION 'OFFICE_QTY_NUMERIC_STORAGE_DRIFT'; END IF;
 EXECUTE target_definition;
 EXECUTE $gox_exact_qty_trigger$CREATE OR REPLACE TRIGGER request_items_qty_force_int BEFORE INSERT OR UPDATE OF qty, uom, unit_id, ref_id, ref_table, rik_code ON public.request_items FOR EACH ROW EXECUTE FUNCTION public.trg_request_items_qty_force_int()$gox_exact_qty_trigger$;
 SELECT p.proowner,p.proacl,to_jsonb(p)-'prosrc',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid),'UTF8')),'hex')
 INTO STRICT after_owner,after_acl,after_properties,observed_sha FROM pg_catalog.pg_proc p WHERE p.oid=target_oid;
 IF pg_catalog.to_regprocedure('public.trg_request_items_qty_force_int()')::oid IS DISTINCT FROM target_oid
  OR observed_sha IS DISTINCT FROM 'a8ab2c01238ac764e92bf1cc34e7ffe8527719088dd615f6c5d660aaadd6664b'
  OR after_owner IS DISTINCT FROM before_owner OR after_acl IS DISTINCT FROM before_acl OR after_properties IS DISTINCT FROM before_properties THEN
  RAISE EXCEPTION 'OFFICE_QTY_AFTER_DEFINITION_PROPERTIES_OWNER_ACL_DRIFT';
 END IF;
 SELECT to_jsonb(t)-'tgattr' INTO STRICT after_trigger_properties FROM pg_catalog.pg_trigger t WHERE t.oid=trigger_oid;
 IF after_trigger_properties IS DISTINCT FROM before_trigger_properties THEN RAISE EXCEPTION 'OFFICE_QTY_TRIGGER_NON_EVENT_PROPERTY_DRIFT'; END IF;
 SELECT array_agg(a.attname::text ORDER BY a.attname::text COLLATE "C") INTO event_columns
 FROM pg_catalog.pg_trigger t CROSS JOIN LATERAL unnest(t.tgattr::smallint[]) x(ordinal)
 JOIN pg_catalog.pg_attribute a ON a.attrelid=t.tgrelid AND a.attnum=x.ordinal AND NOT a.attisdropped WHERE t.oid=trigger_oid;
 IF event_columns IS DISTINCT FROM ARRAY['qty','ref_id','ref_table','rik_code','unit_id','uom']::text[] THEN
  RAISE EXCEPTION 'OFFICE_QTY_AFTER_TRIGGER_COLUMNS_DRIFT';
 END IF;
END
$gox_measured_fraction$;
COMMIT;
