-- One controlled rollback protocol; no catalog edits, seeded IDs or trigger disabling.
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_catalog.set_config('gox.office_generic_fixture', :'access_v4_fixture', true);
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','',true);
SELECT pg_catalog.set_config('request.jwt.claim.role','',true);
SELECT pg_catalog.set_config('request.jwt.claim','',true);
SELECT pg_catalog.set_config('request.jwt.claims',(current_setting('gox.office_generic_fixture')::jsonb->'claims')::text,true);
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
 item_id:=public.request_item_add_or_inc(fresh.id,k,1.25::numeric);
 SELECT * INTO STRICT item FROM public.request_items WHERE id=item_id AND request_id=fresh.id;
 IF item.rik_code IS DISTINCT FROM k OR item.qty IS DISTINCT FROM 1.250::numeric
  OR item.ref_table IS DISTINCT FROM 'rik_works' OR item.ref_id IS DISTINCT FROM (f->>'workId')::uuid
  OR item.unit_id IS DISTINCT FROM (f->>'uomId')::uuid OR item.uom IS DISTINCT FROM 'm' OR item.price IS NOT NULL
 THEN RAISE EXCEPTION 'GENERIC_FRESH_CONTINUOUS_INSERT_REQUIRED'; END IF;
 original_item:=item;
 repeated_id:=public.request_item_add_or_inc(fresh.id,k,1.25::numeric);
 SELECT * INTO STRICT item FROM public.request_items WHERE id=item_id AND request_id=fresh.id;
 IF repeated_id IS DISTINCT FROM item_id OR item.qty IS DISTINCT FROM 2.500::numeric
  OR (to_jsonb(item)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_item)-'qty'-'updated_at')
  OR (SELECT count(*) FROM public.request_items WHERE request_id=fresh.id AND rik_code=k)<>1
 THEN RAISE EXCEPTION 'GENERIC_EXISTING_INCREMENT_IDENTITY_REQUIRED'; END IF;
 -- Real unit-only edit, preserving guard behavior: counted/conflicting row must not be silently upgraded.
 UPDATE public.request_items SET uom='pcs' WHERE id=item_id;
 SELECT to_jsonb(i) INTO STRICT held_before FROM public.request_items i WHERE id=item_id;
 IF (held_before->>'qty')::numeric<>3.000 THEN RAISE EXCEPTION 'GENERIC_COUNTED_TRANSITION_REQUIRED'; END IF;
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
 -- Exact unchanged integer generic branch; its existing NULL authority must not be rewritten by a later fraction.
 SELECT * INTO STRICT generic_parent FROM public.request_create_draft(p_company_id=>company,p_creation_actor_id=>actor,p_foreman_name=>'TEST_ONLY_INTEGER_GENERIC');
 IF generic_parent.id IS NULL OR generic_parent.id=rb OR generic_parent.id=fresh.id
  OR generic_parent.company_id IS DISTINCT FROM company OR generic_parent.created_by IS DISTINCT FROM actor
  OR NOT public.office_request_write_v2(generic_parent.id) THEN RAISE EXCEPTION 'INTEGER_GENERIC_PARENT_AUTHORITY'; END IF;
 item_id:=public.request_item_add_or_inc(generic_parent.id,k,1::numeric);
 SELECT * INTO STRICT generic_item FROM public.request_items WHERE id=item_id AND request_id=generic_parent.id;
 IF generic_item.qty<>1.000 OR generic_item.ref_id IS NOT NULL OR generic_item.unit_id IS NOT NULL
  OR generic_item.ref_table IS DISTINCT FROM 'rik_catalog' THEN RAISE EXCEPTION 'INTEGER_GENERIC_BEHAVIOR_CHANGED'; END IF;
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
   'qty',1.25::numeric,'price',NULL,'uom','m','kind','work','name_human','TEST_ONLY sync linear work'));
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
 IF sync_saved.rik_code IS DISTINCT FROM k OR sync_saved.qty IS DISTINCT FROM 1.250::numeric
  OR sync_saved.ref_table IS DISTINCT FROM 'rik_works' OR sync_saved.ref_id IS DISTINCT FROM (f->>'workId')::uuid
  OR sync_saved.unit_id IS DISTINCT FROM (f->>'uomId')::uuid OR sync_saved.uom IS DISTINCT FROM 'm'
  OR sync_saved.price IS NOT NULL OR sync_saved.kind IS DISTINCT FROM 'work' OR sync_saved.item_kind IS DISTINCT FROM 'work'
  OR sync_saved.name_human IS DISTINCT FROM 'TEST_ONLY sync linear work' OR sync_saved.status IS DISTINCT FROM 'draft'
  OR (sync_result->'items_payload'->0->>'qty')::numeric IS DISTINCT FROM 1.250::numeric
  OR sync_result->'items_payload'->0->>'uom' IS DISTINCT FROM 'm'
  OR sync_result->'items_payload'->0->'price' IS DISTINCT FROM 'null'::jsonb
 THEN RAISE EXCEPTION 'GENERIC_SYNC_POST_METADATA_FRACTIONAL_PERSISTENCE_REQUIRED'; END IF;
 SELECT array_agg(r.id ORDER BY r.id) INTO parent_ids_after FROM public.requests r WHERE r.company_id=company;
 IF cardinality(parent_ids_after)<>coalesce(cardinality(parent_ids_before),0)+1
  OR NOT coalesce(parent_ids_before,ARRAY[]::uuid[]) <@ parent_ids_after
 THEN RAISE EXCEPTION 'GENERIC_SYNC_EXACT_ONE_NEW_PARENT_REQUIRED'; END IF;
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
 SELECT to_jsonb(r) INTO STRICT after_b FROM public.requests r WHERE id=rb;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) INTO after_items FROM public.request_items i WHERE request_id=rb;
 IF before_b IS DISTINCT FROM after_b OR before_items IS DISTINCT FROM after_items THEN RAISE EXCEPTION 'GENERIC_OTHER_PARENT_CHANGED'; END IF;
END;
$gox_generic_cases$;
SELECT jsonb_build_object('contract','office-generic-fractional-authority/v1','status','ASSERTIONS_COMPLETED_ROLLBACK_PENDING',
 'newRequestContinuousInsert',true,'existingIncrement',true,'unknownHold',true,'conflictingUnitHold',true,
 'integerGenericUnchanged',true,'noUnlinkedUpgrade',true,'syncNewNoIdFractional',true,'syncPostMetadataPersistence',true,'syncExactIntentReplay',true,'otherParentUnchanged',true,'sourceAdmission',false,'FULL',false);
ROLLBACK;