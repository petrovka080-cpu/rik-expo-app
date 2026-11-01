-- SOURCE ONLY proposed ROOT-reviewed sequential fixture controls after00500; outer ROLLBACK mandatory. No migration/seed/trigger disabling/concurrency execution.
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_catalog.set_config('gox.office_generic_fixture', :'access_v4_fixture', true) AS gox_set_config_result \gset
SET LOCAL statement_timeout='15000ms';
SET LOCAL lock_timeout='3000ms';
SELECT pg_catalog.set_config('gox.integer_authority_review', :'integer_authority_review', true) AS gox_set_config_result \gset
DO $source_guard$
DECLARE f jsonb:=current_setting('gox.office_generic_fixture')::jsonb;
 r jsonb:=current_setting('gox.integer_authority_review')::jsonb; snapshot jsonb;
BEGIN
 IF session_user<>'supabase_admin' OR current_user<>session_user OR current_setting('session_replication_role')<>'origin'
  OR r->>'contract' IS DISTINCT FROM 'root-integer-authority-proposed-fixture-review/v1'
  OR r->'executionApproved' IS DISTINCT FROM 'true'::jsonb
  OR r->'legacyDirectSetupDmlApproved' IS DISTINCT FROM 'true'::jsonb
  OR r->'acceptedTestOnlySourceRowEditsApproved' IS DISTINCT FROM 'true'::jsonb
  OR r->'rollbackOnly' IS DISTINCT FROM 'true'::jsonb
  OR left(f->>'syntheticCode',14)<>'TEST-ONLY-A03-'
 THEN RAISE EXCEPTION 'ROOT_PROPOSED_INTEGER_FIXTURE_SCOPE_REQUIRED'; END IF;
 IF pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef('public.request_item_add_or_inc(uuid,text,numeric)'::regprocedure),'UTF8')),'hex')<>'ec82c67d2cb4c7d2423c1b86fb7cdc8257f5313ae32fc602ea3084935f8d7664'
  OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef('public.trg_request_items_qty_force_int()'::regprocedure),'UTF8')),'hex')<>'9fe946ad7df4aecd1698a9a09929740b66a0720499e5b73cfc0ba0dfa5120ba0'
  OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef('public.request_item_update_qty(uuid,numeric)'::regprocedure),'UTF8')),'hex')<>'c49b9cc583395c1d3d8ab0227eaa7f300ae48bdd3e9061ce21cedb6598221437'
  OR (SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex') FROM pg_catalog.pg_proc p
    WHERE p.oid=pg_catalog.to_regprocedure('public.request_sync_draft_v2(uuid,boolean,text,date,text,text,text,text,text,text,text,text,text,text,text,jsonb,text[],uuid,uuid,text)')) IS DISTINCT FROM 'dcbfff09f856b8f0f094012672e5a909a25c74b119c023e41844db86a799e247'
 THEN RAISE EXCEPTION 'INTEGER_CURRENT_FUNCTION_SOURCE_REQUIRED'; END IF;
 IF (SELECT count(*) FROM public.rik_works WHERE rik_code=f->>'syntheticCode' AND id=(f->>'workId')::uuid AND unit_id=(f->>'uomId')::uuid)<>1
  OR EXISTS(SELECT 1 FROM public.rik_materials WHERE mat_code=f->>'syntheticCode')
  OR (SELECT count(*) FROM public.rik_items WHERE rik_code=f->>'syntheticCode' AND id=(f->>'catalogItemId')::uuid AND uom_code='m')<>1
  OR EXISTS(SELECT 1 FROM public.rik_uom_overrides WHERE rik_code=f->>'syntheticCode')
  OR (SELECT count(*) FROM public.uoms WHERE id=(f->>'uomId')::uuid AND code='m')<>1
 THEN RAISE EXCEPTION 'EXACT_ACCEPTED_TEST_ONLY_SOURCE_AUTHORITY_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.request_items'::regclass
  AND tgname='request_items_qty_force_int' AND tgenabled='O' AND NOT tgisinternal AND tgfoid='public.trg_request_items_qty_force_int()'::regprocedure
  AND tgtype=23 AND ARRAY(SELECT a.attname::text FROM unnest(pg_trigger.tgattr::smallint[])WITH ORDINALITY x(n,ord)
   JOIN pg_catalog.pg_attribute a ON a.attrelid=pg_trigger.tgrelid AND a.attnum=x.n ORDER BY x.ord)
   =ARRAY['qty','uom','unit_id','ref_id','ref_table','rik_code']::text[])
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.request_items'::regclass
  AND tgname='aaa_office_request_child_v2' AND tgenabled='O' AND NOT tgisinternal AND tgfoid='public.office_request_child_guard_v2()'::regprocedure)
 THEN RAISE EXCEPTION 'REAL_ACTIVE_OFFICE_TRIGGERS_REQUIRED'; END IF;
 SELECT jsonb_build_object('work',(SELECT to_jsonb(w) FROM public.catalog_works w WHERE id=(f->>'workId')::uuid),
  'catalog',(SELECT to_jsonb(c) FROM public.catalog_items c WHERE id=(f->>'catalogItemId')::uuid),
  'unit',(SELECT to_jsonb(u) FROM public.uoms u WHERE id=(f->>'uomId')::uuid)) INTO snapshot;
 PERFORM pg_catalog.set_config('gox.integer_source_baseline',snapshot::text,true);
END;
$source_guard$;
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claim.role','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claim','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claims',(current_setting('gox.office_generic_fixture')::jsonb->'claims')::text,true) AS gox_set_config_result \gset
DO $gox_generic_cases$
DECLARE
 f jsonb:=current_setting('gox.office_generic_fixture')::jsonb;
 actor uuid:=(f->>'actorId')::uuid; company uuid:=(f->>'companyId')::uuid;
 rb uuid:=(f->>'requestB')::uuid; k text:=f->>'syntheticCode'; missing_code text;
 fresh public.requests; generic_parent public.requests;
 item public.request_items; original_item public.request_items; generic_item public.request_items;
 item_id uuid; repeated_id uuid; before_b jsonb; after_b jsonb; before_items jsonb; after_items jsonb;
 error_text text; caught boolean; held_before jsonb; row_count bigint;
 sync_result jsonb; replay_result jsonb; sync_payload jsonb; sync_intent text;
 sync_parent uuid; sync_item uuid; sync_saved public.request_items;
 sync_before_replay jsonb; sync_head_before_replay jsonb;
 parent_ids_before uuid[]; parent_ids_after uuid[]; parent_ids_replay uuid[];
BEGIN
 IF f->>'databaseName' IS DISTINCT FROM current_database() OR f->>'bindingReview' IS DISTINCT FROM 'ROOT_REVIEWED_DISPOSABLE_DB'
  OR current_user<>'authenticated' OR current_setting('role',true)<>'authenticated'
  OR auth.uid() IS DISTINCT FROM actor OR auth.role() IS DISTINCT FROM 'authenticated'
  OR (auth.jwt()->>'sub')::uuid IS DISTINCT FROM actor OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
  OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal1' OR NOT public.office_request_mfa_ok_v2()
  OR current_setting('session_replication_role')<>'origin' OR actor IS NULL OR company IS NULL OR rb IS NULL
  OR NOT public.office_request_write_v2(rb) THEN RAISE EXCEPTION 'GENERIC_FIXTURE_AUTHORITY_REQUIRED'; END IF;
 SELECT to_jsonb(r) INTO STRICT before_b FROM public.requests r WHERE id=rb FOR UPDATE;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) INTO before_items FROM public.request_items i WHERE request_id=rb;
 -- Genuine creator, not an invented request or direct identity/default override.
 SELECT * INTO STRICT fresh FROM public.request_create_draft(p_company_id=>company,p_creation_actor_id=>actor,p_foreman_name=>'TEST_ONLY_GENERIC_FRACTION');
 IF fresh.id IS NULL OR fresh.id=rb OR fresh.company_id IS DISTINCT FROM company OR fresh.created_by IS DISTINCT FROM actor
  OR fresh.status::text<>'Черновик' OR fresh.submitted_at IS NOT NULL OR NOT public.office_request_write_v2(fresh.id)
 THEN RAISE EXCEPTION 'GENERIC_FRESH_REQUEST_AUTHORITY_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public.request_items WHERE request_id=fresh.id) THEN RAISE EXCEPTION 'GENERIC_FRESH_REQUEST_NOT_EMPTY'; END IF;
 item_id:=public.request_item_add_or_inc(fresh.id,k,2::numeric);
 SELECT * INTO STRICT item FROM public.request_items WHERE id=item_id AND request_id=fresh.id;
 IF item.rik_code IS DISTINCT FROM k OR item.qty IS DISTINCT FROM 2.000::numeric
  OR item.ref_table IS DISTINCT FROM 'rik_works' OR item.ref_id IS DISTINCT FROM (f->>'workId')::uuid
  OR item.unit_id IS DISTINCT FROM (f->>'uomId')::uuid OR item.uom IS DISTINCT FROM 'm' OR item.price IS NOT NULL
 THEN RAISE EXCEPTION 'GENERIC_FRESH_CONTINUOUS_INSERT_REQUIRED'; END IF;
 original_item:=item;
 repeated_id:=public.request_item_add_or_inc(fresh.id,k,1.25::numeric);
 SELECT * INTO STRICT item FROM public.request_items WHERE id=item_id AND request_id=fresh.id;
 IF repeated_id IS DISTINCT FROM item_id OR item.qty IS DISTINCT FROM 3.250::numeric
  OR (to_jsonb(item)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_item)-'qty'-'updated_at')
  OR (SELECT count(*) FROM public.request_items WHERE request_id=fresh.id AND rik_code=k)<>1
 THEN RAISE EXCEPTION 'GENERIC_EXISTING_INCREMENT_IDENTITY_REQUIRED'; END IF;
 -- Real unit-only edit, preserving guard behavior: counted/conflicting row must not be silently upgraded.
 UPDATE public.request_items SET uom='pcs' WHERE id=item_id;
 SELECT to_jsonb(i) INTO STRICT held_before FROM public.request_items i WHERE id=item_id;
 IF (held_before->>'qty')::numeric<>4.000 THEN RAISE EXCEPTION 'GENERIC_COUNTED_TRANSITION_REQUIRED'; END IF;
 caught:=false;
 BEGIN
  PERFORM public.request_item_add_or_inc(fresh.id,k,1.25::numeric);
  RAISE EXCEPTION 'GENERIC_CONFLICT_UNEXPECTEDLY_ACCEPTED';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
  IF error_text<>'OFFICE_GENERIC_FRACTIONAL_EXISTING_AUTHORITY_CONFLICT' THEN RAISE; END IF;
  caught:=true;
 END;
 IF NOT caught OR (SELECT to_jsonb(i) FROM public.request_items i WHERE id=item_id) IS DISTINCT FROM held_before
 THEN RAISE EXCEPTION 'GENERIC_CONFLICT_MUTATED_ROW'; END IF;
 missing_code:=k||'-UNKNOWN';
 IF EXISTS(SELECT 1 FROM public.rik_items WHERE rik_code=missing_code)
  OR EXISTS(SELECT 1 FROM public.rik_works WHERE rik_code=missing_code)
  OR EXISTS(SELECT 1 FROM public.rik_materials WHERE mat_code=missing_code)
 THEN RAISE EXCEPTION 'GENERIC_UNKNOWN_TEST_CODE_COLLISION'; END IF;
 SELECT count(*) INTO row_count FROM public.request_items WHERE request_id=fresh.id;
 caught:=false;
 BEGIN
  PERFORM public.request_item_add_or_inc(fresh.id,missing_code,1.25::numeric);
  RAISE EXCEPTION 'GENERIC_UNKNOWN_UNEXPECTEDLY_ACCEPTED';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
  IF error_text<>'OFFICE_GENERIC_FRACTIONAL_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  caught:=true;
 END;
 IF NOT caught OR (SELECT count(*) FROM public.request_items WHERE request_id=fresh.id)<>row_count
 THEN RAISE EXCEPTION 'GENERIC_UNKNOWN_INSERTED_ROW'; END IF;
 -- Explicit ROOT-approved TEST_ONLY legacy fixture: exact pre00500 generic INSERT statement, current real triggers remain enabled. Not a post00500 new-row oracle.
 SELECT * INTO STRICT generic_parent FROM public.request_create_draft(p_company_id=>company,p_creation_actor_id=>actor,p_foreman_name=>'TEST_ONLY_INTEGER_GENERIC');
 IF generic_parent.id IS NULL OR generic_parent.id=rb OR generic_parent.id=fresh.id
  OR generic_parent.company_id IS DISTINCT FROM company OR generic_parent.created_by IS DISTINCT FROM actor
  OR NOT public.office_request_write_v2(generic_parent.id) THEN RAISE EXCEPTION 'INTEGER_GENERIC_PARENT_AUTHORITY'; END IF;
 INSERT INTO public.request_items(request_id,rik_code,qty) VALUES(generic_parent.id,k,1::numeric) RETURNING id INTO item_id;
 SELECT * INTO STRICT generic_item FROM public.request_items WHERE id=item_id AND request_id=generic_parent.id;
 IF generic_item.qty<>1.000 OR generic_item.ref_id IS NOT NULL OR generic_item.unit_id IS NOT NULL
  OR generic_item.ref_table IS DISTINCT FROM 'rik_catalog' OR generic_item.price IS NOT NULL THEN RAISE EXCEPTION 'INTEGER_GENERIC_BEHAVIOR_CHANGED'; END IF;
 repeated_id:=public.request_item_add_or_inc(generic_parent.id,k,1::numeric);
 SELECT * INTO STRICT item FROM public.request_items WHERE id=item_id AND request_id=generic_parent.id;
 IF repeated_id IS DISTINCT FROM item_id OR item.qty IS DISTINCT FROM 2.000::numeric
  OR (to_jsonb(item)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(generic_item)-'qty'-'updated_at')
 THEN RAISE EXCEPTION 'HISTORICAL_NULL_AUTHORITY_INTEGER_COMPATIBILITY_REQUIRED'; END IF;
 generic_item:=item;
 caught:=false;
 BEGIN
  PERFORM public.request_item_add_or_inc(generic_parent.id,k,1.25::numeric);
  RAISE EXCEPTION 'INTEGER_GENERIC_UNLINKED_UPGRADE_ACCEPTED';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
  IF error_text<>'OFFICE_GENERIC_FRACTIONAL_EXISTING_AUTHORITY_CONFLICT' THEN RAISE; END IF;
  caught:=true;
 END;
 IF NOT caught OR (SELECT to_jsonb(i) FROM public.request_items i WHERE id=item_id) IS DISTINCT FROM to_jsonb(generic_item)
 THEN RAISE EXCEPTION 'INTEGER_GENERIC_UPGRADE_MUTATED_ROW'; END IF;
 -- Address actual coherent71 consumer: no request ID, no item ID or injected FK, full company/actor/intent.
 -- Same-transaction exact replay models a lost acknowledgement; not a transport/provider durability claim.
 SELECT array_agg(r.id ORDER BY r.id) INTO parent_ids_before FROM public.requests r WHERE r.company_id=company;
 sync_intent:='TEST_ONLY_GENERIC_FRACTION_'||pg_catalog.gen_random_uuid()::text;
 sync_payload:=jsonb_build_array(jsonb_build_object('request_item_id',NULL,'rik_code',k,
   'qty',2::numeric,'price',NULL,'uom','m','kind','work','name_human','TEST_ONLY sync linear work'));
 sync_result:=public.request_sync_draft_v2(p_request_id=>NULL,p_submit=>false,
   p_foreman_name=>'TEST_ONLY_GENERIC_SYNC',p_items=>sync_payload,p_pending_delete_ids=>ARRAY[]::text[],
   p_company_id=>company,p_creation_actor_id=>actor,p_creation_intent_id=>sync_intent);
 IF sync_result->>'document_type' IS DISTINCT FROM 'request_draft_sync' OR sync_result->>'version' IS DISTINCT FROM 'v2'
  OR sync_result->'request_created' IS DISTINCT FROM 'true'::jsonb OR sync_result->'submitted' IS DISTINCT FROM 'false'::jsonb
  OR coalesce(sync_result->'replayed','false'::jsonb)<>'false'::jsonb
  OR jsonb_array_length(sync_result->'items_payload')<>1
 THEN RAISE EXCEPTION 'GENERIC_SYNC_NEW_REQUEST_RESULT_REQUIRED'; END IF;
 sync_parent:=(sync_result->'request_payload'->>'id')::uuid;
 sync_item:=(sync_result->'items_payload'->0->>'id')::uuid;
 IF sync_parent IS NULL OR sync_item IS NULL OR sync_parent=ANY(coalesce(parent_ids_before,ARRAY[]::uuid[]))
  OR NOT public.office_request_write_v2(sync_parent) OR NOT public.office_request_read_v2(sync_parent)
  OR (SELECT count(*) FROM public.requests r WHERE r.id=sync_parent AND r.company_id=company AND r.created_by=actor
      AND r.status::text='Черновик' AND r.submitted_at IS NULL)<>1
  OR (SELECT count(*) FROM public.request_items i WHERE i.request_id=sync_parent)<>1
 THEN RAISE EXCEPTION 'GENERIC_SYNC_NEW_PARENT_OR_ITEM_AUTHORITY_REQUIRED'; END IF;
 SELECT * INTO STRICT sync_saved FROM public.request_items WHERE id=sync_item AND request_id=sync_parent;
 IF sync_saved.rik_code IS DISTINCT FROM k OR sync_saved.qty IS DISTINCT FROM 2.000::numeric
  OR sync_saved.ref_table IS DISTINCT FROM 'rik_works' OR sync_saved.ref_id IS DISTINCT FROM (f->>'workId')::uuid
  OR sync_saved.unit_id IS DISTINCT FROM (f->>'uomId')::uuid OR sync_saved.uom IS DISTINCT FROM 'm'
  OR sync_saved.price IS NOT NULL OR sync_saved.kind IS DISTINCT FROM 'work' OR sync_saved.item_kind IS DISTINCT FROM 'work'
  OR sync_saved.name_human IS DISTINCT FROM 'TEST_ONLY sync linear work' OR sync_saved.status IS DISTINCT FROM 'draft'
  OR (sync_result->'items_payload'->0->>'qty')::numeric IS DISTINCT FROM 2.000::numeric
  OR sync_result->'items_payload'->0->>'uom' IS DISTINCT FROM 'm'
  OR sync_result->'items_payload'->0->'price' IS DISTINCT FROM 'null'::jsonb
 THEN RAISE EXCEPTION 'GENERIC_SYNC_POST_METADATA_FRACTIONAL_PERSISTENCE_REQUIRED'; END IF;
 SELECT array_agg(r.id ORDER BY r.id) INTO parent_ids_after FROM public.requests r WHERE r.company_id=company;
 IF cardinality(parent_ids_after)<>coalesce(cardinality(parent_ids_before),0)+1
  OR NOT coalesce(parent_ids_before,ARRAY[]::uuid[]) <@ parent_ids_after
 THEN RAISE EXCEPTION 'GENERIC_SYNC_EXACT_ONE_NEW_PARENT_REQUIRED'; END IF;
 -- Absolute existing-ID edit through the genuine twenty-argument successor; no prebinding or delta increment.
 replay_result:=public.request_sync_draft_v2(p_request_id=>sync_parent,p_company_id=>company,
   p_items=>jsonb_build_array(jsonb_build_object('request_item_id',sync_item,'qty',1.25::numeric,'price',NULL,'uom','m')),
   p_pending_delete_ids=>ARRAY[]::text[],p_submit=>false);
 SELECT * INTO STRICT sync_saved FROM public.request_items WHERE id=sync_item AND request_id=sync_parent;
 IF sync_saved.qty IS DISTINCT FROM 1.250::numeric OR sync_saved.ref_table IS DISTINCT FROM 'rik_works'
  OR sync_saved.ref_id IS DISTINCT FROM (f->>'workId')::uuid OR sync_saved.unit_id IS DISTINCT FROM (f->>'uomId')::uuid
  OR sync_saved.uom IS DISTINCT FROM 'm' OR sync_saved.price IS NOT NULL
  OR (SELECT count(*) FROM public.request_items WHERE request_id=sync_parent)<>1
 THEN RAISE EXCEPTION 'SYNC_INTEGER_THEN_ABSOLUTE_FRACTIONAL_EDIT_REQUIRED'; END IF;
 sync_before_replay:=to_jsonb(sync_saved);
 SELECT to_jsonb(r) INTO STRICT sync_head_before_replay FROM public.requests r WHERE id=sync_parent;
 -- Identical twenty-argument RPC payload/defaults/intent; deliberately do not pass the returned request/item IDs.
 replay_result:=public.request_sync_draft_v2(p_request_id=>NULL,p_submit=>false,
   p_foreman_name=>'TEST_ONLY_GENERIC_SYNC',p_items=>sync_payload,p_pending_delete_ids=>ARRAY[]::text[],
   p_company_id=>company,p_creation_actor_id=>actor,p_creation_intent_id=>sync_intent);
 SELECT array_agg(r.id ORDER BY r.id) INTO parent_ids_replay FROM public.requests r WHERE r.company_id=company;
 SELECT * INTO STRICT sync_saved FROM public.request_items WHERE id=sync_item AND request_id=sync_parent;
 IF replay_result IS DISTINCT FROM (sync_result||jsonb_build_object('replayed',true))
  OR (replay_result->'request_payload'->>'id')::uuid IS DISTINCT FROM sync_parent
  OR (replay_result->'items_payload'->0->>'id')::uuid IS DISTINCT FROM sync_item
  OR parent_ids_replay IS DISTINCT FROM parent_ids_after
  OR (SELECT count(*) FROM public.request_items WHERE request_id=sync_parent)<>1
  OR to_jsonb(sync_saved) IS DISTINCT FROM sync_before_replay OR sync_saved.qty IS DISTINCT FROM 1.250::numeric
  OR (SELECT to_jsonb(r) FROM public.requests r WHERE id=sync_parent) IS DISTINCT FROM sync_head_before_replay
 THEN RAISE EXCEPTION 'GENERIC_SYNC_EXACT_INTENT_REPLAY_MUST_NOT_INCREMENT'; END IF;
 -- NaN generic route remains exact universal q9fe rejection, never a source-binding bypass.
 held_before:=to_jsonb(generic_item); caught:=false;
 BEGIN
  PERFORM public.request_item_add_or_inc(generic_parent.id,k,'NaN'::numeric);
  RAISE EXCEPTION 'INTEGER_NAN_UNEXPECTED_RETURN';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS error_text=MESSAGE_TEXT;
  IF error_text<>'OFFICE_REQUEST_QTY_FINITE_REQUIRED' THEN RAISE; END IF;
  caught:=true;
 END;
 IF NOT caught OR (SELECT to_jsonb(i) FROM public.request_items i WHERE id=generic_item.id) IS DISTINCT FROM held_before
 THEN RAISE EXCEPTION 'INTEGER_NAN_REJECTION_MUTATED_ROW'; END IF;
 SELECT to_jsonb(r) INTO STRICT after_b FROM public.requests r WHERE id=rb;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) INTO after_items FROM public.request_items i WHERE request_id=rb;
 IF before_b IS DISTINCT FROM after_b OR before_items IS DISTINCT FROM after_items THEN RAISE EXCEPTION 'GENERIC_OTHER_PARENT_CHANGED'; END IF;
END;
$gox_generic_cases$;
RESET ROLE;
-- missing_unit: proposed bootstrap-only fixture source edit; actor helper itself receives no extra privileges.
SAVEPOINT missing_unit;
DO $trusted_source_setup$
DECLARE f jsonb:=current_setting('gox.office_generic_fixture')::jsonb; affected bigint;
BEGIN
 IF current_user<>session_user OR session_user<>'supabase_admin' THEN RAISE EXCEPTION 'BOOTSTRAP_SOURCE_FIXTURE_SCOPE_REQUIRED'; END IF;
 UPDATE public.catalog_works SET unit_id=NULL WHERE id=(f->>'workId')::uuid AND rik_code=f->>'syntheticCode' AND unit_id=(f->>'uomId')::uuid;
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'EXACT_ACCEPTED_TEST_ONLY_SOURCE_ROW_REQUIRED'; END IF;
END;
$trusted_source_setup$;
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claim.role','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claim','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claims',(current_setting('gox.office_generic_fixture')::jsonb->'claims')::text,true) AS gox_set_config_result \gset
DO $actor_source_case$
DECLARE f jsonb:=current_setting('gox.office_generic_fixture')::jsonb;
 parent public.requests; item public.request_items; saved jsonb; id1 uuid; caught boolean:=false; msg text;
BEGIN
 IF current_user<>'authenticated' OR auth.uid() IS DISTINCT FROM (f->>'actorId')::uuid
  OR auth.jwt()->>'sub' IS DISTINCT FROM f->>'actorId' OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
  OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal1' OR NOT public.office_request_mfa_ok_v2()
  OR current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'SOURCE_CASE_ACTOR_AUTHORITY_REQUIRED'; END IF;
 SELECT * INTO STRICT parent FROM public.request_create_draft(p_company_id=>(f->>'companyId')::uuid,
  p_creation_actor_id=>(f->>'actorId')::uuid,p_foreman_name=>'TEST_ONLY_INTEGER_missing_unit');
 IF parent.company_id IS DISTINCT FROM (f->>'companyId')::uuid OR parent.created_by IS DISTINCT FROM (f->>'actorId')::uuid
  OR parent.submitted_at IS NOT NULL OR NOT public.office_request_write_v2(parent.id)
  OR EXISTS(SELECT 1 FROM public.request_items WHERE request_id=parent.id) THEN RAISE EXCEPTION 'SOURCE_CASE_REAL_EMPTY_CREATOR_REQUIRED'; END IF;
 id1:=public.request_item_add_or_inc(parent.id,f->>'syntheticCode',2::numeric);
 SELECT * INTO STRICT item FROM public.request_items WHERE id=id1 AND request_id=parent.id;
 IF item.qty IS DISTINCT FROM 2.000::numeric OR item.price IS NOT NULL THEN RAISE EXCEPTION 'SOURCE_CASE_INTEGER_COMPATIBILITY_REQUIRED'; END IF;
 IF item.ref_table IS DISTINCT FROM 'rik_catalog' OR item.ref_id IS NOT NULL OR item.unit_id IS NOT NULL
 THEN RAISE EXCEPTION 'UNRESOLVED_SOURCE_MUST_NOT_BIND_INTEGER_AUTHORITY'; END IF;
 saved:=to_jsonb(item);
 BEGIN
  PERFORM public.request_item_add_or_inc(parent.id,f->>'syntheticCode',1.25::numeric);
  RAISE EXCEPTION 'SOURCE_CASE_UNEXPECTED_FRACTIONAL_RETURN';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
  IF msg<>'OFFICE_GENERIC_FRACTIONAL_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  caught:=true;
 END;
 IF NOT caught OR (SELECT to_jsonb(i) FROM public.request_items i WHERE id=id1) IS DISTINCT FROM saved
  OR (SELECT count(*) FROM public.request_items WHERE request_id=parent.id)<>1
 THEN RAISE EXCEPTION 'SOURCE_CASE_EXPECTED_HOLD_MUST_PRESERVE_WHOLE_ROW'; END IF;
END;
$actor_source_case$;
RESET ROLE;
ROLLBACK TO SAVEPOINT missing_unit;
RELEASE SAVEPOINT missing_unit;
-- raw_unit_conflict: proposed bootstrap-only fixture source edit; actor helper itself receives no extra privileges.
SAVEPOINT raw_unit_conflict;
DO $trusted_source_setup$
DECLARE f jsonb:=current_setting('gox.office_generic_fixture')::jsonb; affected bigint;
BEGIN
 IF current_user<>session_user OR session_user<>'supabase_admin' THEN RAISE EXCEPTION 'BOOTSTRAP_SOURCE_FIXTURE_SCOPE_REQUIRED'; END IF;
 UPDATE public.catalog_items SET uom_code='pcs' WHERE id=(f->>'catalogItemId')::uuid AND rik_code=f->>'syntheticCode' AND uom_code='m';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'EXACT_ACCEPTED_TEST_ONLY_SOURCE_ROW_REQUIRED'; END IF;
END;
$trusted_source_setup$;
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claim.role','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claim','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claims',(current_setting('gox.office_generic_fixture')::jsonb->'claims')::text,true) AS gox_set_config_result \gset
DO $actor_source_case$
DECLARE f jsonb:=current_setting('gox.office_generic_fixture')::jsonb;
 parent public.requests; item public.request_items; saved jsonb; id1 uuid; caught boolean:=false; msg text;
BEGIN
 IF current_user<>'authenticated' OR auth.uid() IS DISTINCT FROM (f->>'actorId')::uuid
  OR auth.jwt()->>'sub' IS DISTINCT FROM f->>'actorId' OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
  OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal1' OR NOT public.office_request_mfa_ok_v2()
  OR current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'SOURCE_CASE_ACTOR_AUTHORITY_REQUIRED'; END IF;
 SELECT * INTO STRICT parent FROM public.request_create_draft(p_company_id=>(f->>'companyId')::uuid,
  p_creation_actor_id=>(f->>'actorId')::uuid,p_foreman_name=>'TEST_ONLY_INTEGER_raw_unit_conflict');
 IF parent.company_id IS DISTINCT FROM (f->>'companyId')::uuid OR parent.created_by IS DISTINCT FROM (f->>'actorId')::uuid
  OR parent.submitted_at IS NOT NULL OR NOT public.office_request_write_v2(parent.id)
  OR EXISTS(SELECT 1 FROM public.request_items WHERE request_id=parent.id) THEN RAISE EXCEPTION 'SOURCE_CASE_REAL_EMPTY_CREATOR_REQUIRED'; END IF;
 id1:=public.request_item_add_or_inc(parent.id,f->>'syntheticCode',2::numeric);
 SELECT * INTO STRICT item FROM public.request_items WHERE id=id1 AND request_id=parent.id;
 IF item.qty IS DISTINCT FROM 2.000::numeric OR item.price IS NOT NULL THEN RAISE EXCEPTION 'SOURCE_CASE_INTEGER_COMPATIBILITY_REQUIRED'; END IF;
 IF item.ref_table IS DISTINCT FROM 'rik_catalog' OR item.ref_id IS NOT NULL OR item.unit_id IS NOT NULL
 THEN RAISE EXCEPTION 'UNRESOLVED_SOURCE_MUST_NOT_BIND_INTEGER_AUTHORITY'; END IF;
 saved:=to_jsonb(item);
 BEGIN
  PERFORM public.request_item_add_or_inc(parent.id,f->>'syntheticCode',1.25::numeric);
  RAISE EXCEPTION 'SOURCE_CASE_UNEXPECTED_FRACTIONAL_RETURN';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
  IF msg<>'OFFICE_GENERIC_FRACTIONAL_EXISTING_AUTHORITY_CONFLICT' THEN RAISE; END IF;
  caught:=true;
 END;
 IF NOT caught OR (SELECT to_jsonb(i) FROM public.request_items i WHERE id=id1) IS DISTINCT FROM saved
  OR (SELECT count(*) FROM public.request_items WHERE request_id=parent.id)<>1
 THEN RAISE EXCEPTION 'SOURCE_CASE_EXPECTED_HOLD_MUST_PRESERVE_WHOLE_ROW'; END IF;
END;
$actor_source_case$;
RESET ROLE;
ROLLBACK TO SAVEPOINT raw_unit_conflict;
RELEASE SAVEPOINT raw_unit_conflict;
-- discrete_source: proposed bootstrap-only fixture source edit; actor helper itself receives no extra privileges.
SAVEPOINT discrete_source;
DO $trusted_source_setup$
DECLARE f jsonb:=current_setting('gox.office_generic_fixture')::jsonb; affected bigint;
BEGIN
 IF current_user<>session_user OR session_user<>'supabase_admin' THEN RAISE EXCEPTION 'BOOTSTRAP_SOURCE_FIXTURE_SCOPE_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM public.uoms WHERE code='pcs' AND id<>(f->>'uomId')::uuid) THEN RAISE EXCEPTION 'TEST_ONLY_PCS_UNIT_CODE_COLLISION_HOLD'; END IF;
 UPDATE public.uoms SET code='pcs' WHERE id=(f->>'uomId')::uuid AND code='m';
 GET DIAGNOSTICS affected=ROW_COUNT; IF affected<>1 THEN RAISE EXCEPTION 'EXACT_TEST_ONLY_UNIT_REQUIRED'; END IF;
 UPDATE public.catalog_items SET uom_code='pcs' WHERE id=(f->>'catalogItemId')::uuid AND rik_code=f->>'syntheticCode' AND uom_code='m';
 GET DIAGNOSTICS affected=ROW_COUNT;
 IF affected<>1 THEN RAISE EXCEPTION 'EXACT_ACCEPTED_TEST_ONLY_SOURCE_ROW_REQUIRED'; END IF;
END;
$trusted_source_setup$;
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claim.role','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claim','',true) AS gox_set_config_result \gset
SELECT pg_catalog.set_config('request.jwt.claims',(current_setting('gox.office_generic_fixture')::jsonb->'claims')::text,true) AS gox_set_config_result \gset
DO $actor_source_case$
DECLARE f jsonb:=current_setting('gox.office_generic_fixture')::jsonb;
 parent public.requests; item public.request_items; saved jsonb; id1 uuid; caught boolean:=false; msg text;
BEGIN
 IF current_user<>'authenticated' OR auth.uid() IS DISTINCT FROM (f->>'actorId')::uuid
  OR auth.jwt()->>'sub' IS DISTINCT FROM f->>'actorId' OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
  OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal1' OR NOT public.office_request_mfa_ok_v2()
  OR current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'SOURCE_CASE_ACTOR_AUTHORITY_REQUIRED'; END IF;
 SELECT * INTO STRICT parent FROM public.request_create_draft(p_company_id=>(f->>'companyId')::uuid,
  p_creation_actor_id=>(f->>'actorId')::uuid,p_foreman_name=>'TEST_ONLY_INTEGER_discrete_source');
 IF parent.company_id IS DISTINCT FROM (f->>'companyId')::uuid OR parent.created_by IS DISTINCT FROM (f->>'actorId')::uuid
  OR parent.submitted_at IS NOT NULL OR NOT public.office_request_write_v2(parent.id)
  OR EXISTS(SELECT 1 FROM public.request_items WHERE request_id=parent.id) THEN RAISE EXCEPTION 'SOURCE_CASE_REAL_EMPTY_CREATOR_REQUIRED'; END IF;
 id1:=public.request_item_add_or_inc(parent.id,f->>'syntheticCode',2::numeric);
 SELECT * INTO STRICT item FROM public.request_items WHERE id=id1 AND request_id=parent.id;
 IF item.qty IS DISTINCT FROM 2.000::numeric OR item.price IS NOT NULL THEN RAISE EXCEPTION 'SOURCE_CASE_INTEGER_COMPATIBILITY_REQUIRED'; END IF;
 IF item.ref_table IS DISTINCT FROM 'rik_works' OR item.ref_id IS DISTINCT FROM (f->>'workId')::uuid
 OR item.unit_id IS DISTINCT FROM (f->>'uomId')::uuid OR item.uom IS DISTINCT FROM 'pcs'
 THEN RAISE EXCEPTION 'NEW_INTEGER_DISCRETE_AUTHORITY_REQUIRED'; END IF;
 saved:=to_jsonb(item);
 BEGIN
  PERFORM public.request_item_add_or_inc(parent.id,f->>'syntheticCode',1.25::numeric);
  RAISE EXCEPTION 'SOURCE_CASE_UNEXPECTED_FRACTIONAL_RETURN';
 EXCEPTION WHEN SQLSTATE '22023' THEN
  GET STACKED DIAGNOSTICS msg=MESSAGE_TEXT;
  IF msg<>'OFFICE_GENERIC_FRACTIONAL_AUTHORITY_REQUIRED' THEN RAISE; END IF;
  caught:=true;
 END;
 IF NOT caught OR (SELECT to_jsonb(i) FROM public.request_items i WHERE id=id1) IS DISTINCT FROM saved
  OR (SELECT count(*) FROM public.request_items WHERE request_id=parent.id)<>1
 THEN RAISE EXCEPTION 'SOURCE_CASE_EXPECTED_HOLD_MUST_PRESERVE_WHOLE_ROW'; END IF;
END;
$actor_source_case$;
RESET ROLE;
ROLLBACK TO SAVEPOINT discrete_source;
RELEASE SAVEPOINT discrete_source;
DO $source_restored$
DECLARE f jsonb:=current_setting('gox.office_generic_fixture')::jsonb; actual jsonb;
BEGIN
 SELECT jsonb_build_object('work',(SELECT to_jsonb(w) FROM public.catalog_works w WHERE id=(f->>'workId')::uuid),
  'catalog',(SELECT to_jsonb(c) FROM public.catalog_items c WHERE id=(f->>'catalogItemId')::uuid),
  'unit',(SELECT to_jsonb(u) FROM public.uoms u WHERE id=(f->>'uomId')::uuid)) INTO actual;
 IF actual IS DISTINCT FROM current_setting('gox.integer_source_baseline')::jsonb
 THEN RAISE EXCEPTION 'PROPOSED_SOURCE_FIXTURE_SAVEPOINT_RESTORATION_REQUIRED'; END IF;
END;
$source_restored$;
SELECT jsonb_build_object('contract','office-integer-authority-sequential-controls/v1','status','ASSERTIONS_COMPLETED_OUTER_ROLLBACK_PENDING',
 'newIntegerGenuineAuthority',true,'sameIdFractionalIncrement325',true,'legacyDirectSetupNoUpgrade',true,'legacyIntegerCompatibility',true,
 'unknownFractionalHold',true,'metadataUnitConflictHold',true,'genericNaNExactHold',true,'syncNoIdIntegerThenAbsoluteFraction',true,
 'syncExactIntentReplayNoIncrement',true,'missingUnitNoIntegerBinding',true,'rawUnitConflictNoIntegerBinding',true,
 'discreteIntegerNotContinuous',true,'sourceSavepointsRestored',true,'otherParentUnchanged',true,
 'concurrencyRun',false,'allTenGroupsPassed',false,'productPass',false,'sourceAdmission',false,'FULL',false);
ROLLBACK;