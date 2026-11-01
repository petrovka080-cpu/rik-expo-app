-- SOURCE ONLY. Four exact NaN rejection cases; genuine accepted fixture and real enabled trigger.
-- ROOT must pin current owned base/fix/source/input and prove actual outer ROLLBACK plus full fresh
-- persistence equality separately. No migration, seed, new identities, operator or Inf-policy claim.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='15000ms';
SET LOCAL lock_timeout='3000ms';
SELECT pg_catalog.set_config('gox.office_nan_fixture', :'access_v4_fixture', true);
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','',true);
SELECT pg_catalog.set_config('request.jwt.claim.role','',true);
SELECT pg_catalog.set_config('request.jwt.claim','',true);
SELECT pg_catalog.set_config('request.jwt.claims',(current_setting('gox.office_nan_fixture')::jsonb->'claims')::text,true);
DO $gox_four_nan_rejections$
DECLARE
 f jsonb:=current_setting('gox.office_nan_fixture')::jsonb;
 actor uuid:=(f->>'actorId')::uuid; company uuid:=(f->>'companyId')::uuid;
 ia uuid:=(f->>'itemA')::uuid; ib uuid:=(f->>'itemB')::uuid;
 ra uuid:=(f->>'requestA')::uuid; rb uuid:=(f->>'requestB')::uuid;
 unit_id_expected uuid:=(f->>'uomId')::uuid; work_id_expected uuid:=(f->>'workId')::uuid;
 v_synthetic_code text:=f->>'syntheticCode';
 old_a public.request_items; old_b public.request_items;
 initial_visible jsonb; after_visible jsonb;
 operation text; caught boolean; call_returned boolean;
 observed_state text; observed_message text;
 nan_rejected_count integer:=0; authority_check_count integer:=0; rollback_equality_count integer:=0;
 observations jsonb:='[]'::jsonb; output jsonb;
BEGIN
 IF f->>'databaseName' IS DISTINCT FROM current_database() OR f->>'bindingReview' IS DISTINCT FROM 'ROOT_REVIEWED_DISPOSABLE_DB'
  OR f->'sourceAdmission' IS DISTINCT FROM 'false'::jsonb OR f->'FULL' IS DISTINCT FROM 'false'::jsonb
  OR current_user<>'authenticated' OR current_setting('role',true)<>'authenticated'
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=current_user AND NOT rolsuper AND NOT rolbypassrls)
  OR auth.uid() IS DISTINCT FROM actor OR auth.role() IS DISTINCT FROM 'authenticated'
  OR (auth.jwt()->>'sub')::uuid IS DISTINCT FROM actor OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
  OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal1' OR NOT public.office_request_mfa_ok_v2()
  OR actor IS NULL OR company IS NULL OR ia IS NULL OR ib IS NULL OR ia=ib OR ra IS NULL OR rb IS NULL OR ra=rb
  OR NOT public.office_request_write_v2(ra) OR NOT public.office_request_write_v2(rb)
  OR current_setting('session_replication_role')<>'origin'
 THEN RAISE EXCEPTION 'STOP_NONFINITE_GENUINE_FIXTURE_AUTHORITY'; END IF;
 IF pg_catalog.to_regprocedure('public.request_sync_draft_v2(uuid,boolean,text,date,text,text,text,text,text,text,text,text,text,text,text,jsonb,text[],uuid,uuid,text)') IS NULL
  OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef('public.request_item_update_qty(uuid,numeric)'::regprocedure),'UTF8')),'hex')<>'c49b9cc583395c1d3d8ab0227eaa7f300ae48bdd3e9061ce21cedb6598221437'
  OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef('public.trg_request_items_qty_force_int()'::regprocedure),'UTF8')),'hex')<>'9fe946ad7df4aecd1698a9a09929740b66a0720499e5b73cfc0ba0dfa5120ba0'
  OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef('public.request_item_add_or_inc(uuid,text,numeric)'::regprocedure),'UTF8')),'hex')<>'ec82c67d2cb4c7d2423c1b86fb7cdc8257f5313ae32fc602ea3084935f8d7664'
  OR (SELECT pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex') FROM pg_catalog.pg_proc p
      WHERE p.oid='public.request_sync_draft_v2(uuid,boolean,text,date,text,text,text,text,text,text,text,text,text,text,text,jsonb,text[],uuid,uuid,text)'::regprocedure) IS DISTINCT FROM 'dcbfff09f856b8f0f094012672e5a909a25c74b119c023e41844db86a799e247'
 THEN RAISE EXCEPTION 'STOP_NONFINITE_CURRENT_FUNCTION_SOURCE_BINDING'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t WHERE t.tgrelid='public.request_items'::regclass
  AND t.tgname='request_items_qty_force_int' AND t.tgenabled='O' AND NOT t.tgisinternal
  AND t.tgfoid='public.trg_request_items_qty_force_int()'::regprocedure AND t.tgtype=23
  AND ARRAY(SELECT a.attname::text FROM unnest(t.tgattr::smallint[])WITH ORDINALITY x(n,ord)
      JOIN pg_catalog.pg_attribute a ON a.attrelid=t.tgrelid AND a.attnum=x.n ORDER BY x.ord)
      =ARRAY['qty','uom','unit_id','ref_id','ref_table','rik_code']::text[])
  OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.request_items'::regclass
   AND tgname='aaa_office_request_child_v2' AND tgenabled='O' AND NOT tgisinternal
   AND tgfoid='public.office_request_child_guard_v2()'::regprocedure)
 THEN RAISE EXCEPTION 'STOP_NONFINITE_ACTIVE_REAL_TRIGGERS'; END IF;
 SELECT * INTO STRICT old_a FROM public.request_items WHERE id=ia AND request_id=ra FOR UPDATE;
 SELECT * INTO STRICT old_b FROM public.request_items WHERE id=ib AND request_id=rb FOR UPDATE;
 IF old_a.qty IS DISTINCT FROM 1.000::numeric OR old_b.qty IS DISTINCT FROM 1.000::numeric
  OR old_a.uom IS DISTINCT FROM 'm' OR old_b.uom IS DISTINCT FROM 'm'
  OR old_a.rik_code IS DISTINCT FROM v_synthetic_code OR old_b.rik_code IS DISTINCT FROM v_synthetic_code
  OR old_a.ref_table IS DISTINCT FROM 'rik_works' OR old_b.ref_table IS DISTINCT FROM 'rik_works'
  OR old_a.ref_id IS DISTINCT FROM work_id_expected OR old_b.ref_id IS DISTINCT FROM work_id_expected
  OR old_a.unit_id IS DISTINCT FROM unit_id_expected OR old_b.unit_id IS DISTINCT FROM unit_id_expected
  OR old_a.price IS NOT NULL OR old_b.price IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM public.rik_works w JOIN public.uoms u ON u.id=w.unit_id
    WHERE w.id=work_id_expected AND w.rik_code=v_synthetic_code AND u.id=unit_id_expected AND u.code='m')
 THEN RAISE EXCEPTION 'STOP_NONFINITE_ACCEPTED_CONTINUOUS_FIXTURE_BINDING'; END IF;
 WITH r AS MATERIALIZED (
  SELECT x.* FROM public.requests x WHERE x.created_by=actor OR x.company_id=company ORDER BY x.id LIMIT 17
 ), i AS MATERIALIZED (
  SELECT x.* FROM public.request_items x WHERE x.id IN(ia,ib) OR x.rik_code=v_synthetic_code OR x.request_id IN(SELECT id FROM r) ORDER BY x.id LIMIT 65
 )
 SELECT jsonb_build_object('requests',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),'[]'::jsonb) FROM r),
  'items',(SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.id),'[]'::jsonb) FROM i))
 INTO initial_visible;
 IF jsonb_array_length(initial_visible->'requests')>16 OR jsonb_array_length(initial_visible->'items')>64
 THEN RAISE EXCEPTION 'STOP_NONFINITE_VISIBLE_FIXTURE_OVERFLOW'; END IF;
 FOREACH operation IN ARRAY ARRAY['linkedUpdate','genericIncrement','existingIdSync','directUpdate'] LOOP
  -- Each case independently establishes live role/claims/ACL/MFA, outside the expected-error catch.
  IF current_user<>'authenticated' OR current_setting('role',true)<>'authenticated'
   OR auth.uid() IS DISTINCT FROM actor OR auth.role() IS DISTINCT FROM 'authenticated'
   OR (auth.jwt()->>'sub')::uuid IS DISTINCT FROM actor OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
   OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal1' OR NOT public.office_request_mfa_ok_v2()
   OR NOT public.office_request_write_v2(ra) OR NOT public.office_request_write_v2(rb)
   OR current_setting('session_replication_role')<>'origin'
  THEN RAISE EXCEPTION 'STOP_NAN_CASE_REAL_AUTHORITY_REQUIRED'; END IF;
  authority_check_count:=authority_check_count+1;
  caught:=false;call_returned:=false;observed_state:=NULL;observed_message:=NULL;
  BEGIN
   IF operation='linkedUpdate' THEN
    PERFORM public.request_item_update_qty(ia,'NaN'::numeric);
    call_returned:=true;
   ELSIF operation='genericIncrement' THEN
    PERFORM public.request_item_add_or_inc(ra,v_synthetic_code,'NaN'::numeric);
    call_returned:=true;
   ELSIF operation='existingIdSync' THEN
    PERFORM public.request_sync_draft_v2(p_request_id=>ra,p_submit=>false,
     p_items=>jsonb_build_array(jsonb_build_object('request_item_id',ia,'rik_code',v_synthetic_code,'qty','NaN','uom','m')),
     p_pending_delete_ids=>ARRAY[]::text[],p_company_id=>company,p_creation_actor_id=>actor);
    call_returned:=true;
   ELSE
    UPDATE public.request_items SET qty='NaN'::numeric WHERE id=ia AND request_id=ra;
    call_returned:=true;
   END IF;
   -- Uncaught failure, including a silent zero-row UPDATE/no-op: never a manufactured rejection.
   RAISE EXCEPTION USING ERRCODE='P9N02',MESSAGE='OFFICE_NAN_INVOCATION_RETURNED_DEFECT_HOLD',DETAIL=operation;
  EXCEPTION WHEN SQLSTATE '22023' THEN
   GET STACKED DIAGNOSTICS observed_state=RETURNED_SQLSTATE,observed_message=MESSAGE_TEXT;
   IF call_returned OR observed_state<>'22023' OR observed_message IS DISTINCT FROM 'OFFICE_REQUEST_QTY_FINITE_REQUIRED'
   THEN RAISE; END IF;
   caught:=true;
  END;
  IF NOT caught OR call_returned THEN RAISE EXCEPTION 'STOP_NAN_EXACT_TYPED_REJECTION_REQUIRED'; END IF;
 WITH r AS MATERIALIZED (
  SELECT x.* FROM public.requests x WHERE x.created_by=actor OR x.company_id=company ORDER BY x.id LIMIT 17
 ), i AS MATERIALIZED (
  SELECT x.* FROM public.request_items x WHERE x.id IN(ia,ib) OR x.rik_code=v_synthetic_code OR x.request_id IN(SELECT id FROM r) ORDER BY x.id LIMIT 65
 )
 SELECT jsonb_build_object('requests',(SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.id),'[]'::jsonb) FROM r),
  'items',(SELECT coalesce(jsonb_agg(to_jsonb(i) ORDER BY i.id),'[]'::jsonb) FROM i))
  INTO after_visible;
  IF after_visible IS DISTINCT FROM initial_visible
   OR (SELECT to_jsonb(i) FROM public.request_items i WHERE i.id=ia AND i.request_id=ra) IS DISTINCT FROM to_jsonb(old_a)
   OR (SELECT to_jsonb(i) FROM public.request_items i WHERE i.id=ib AND i.request_id=rb) IS DISTINCT FROM to_jsonb(old_b)
  THEN RAISE EXCEPTION 'STOP_NAN_EXPECTED_ERROR_ROLLBACK_BASELINE_CHANGED'; END IF;
  nan_rejected_count:=nan_rejected_count+1;rollback_equality_count:=rollback_equality_count+1;
  observations:=observations||jsonb_build_array(jsonb_build_object('operation',operation,'inputText','NaN',
   'sqlstate',observed_state,'message',observed_message,'invocationReturned',call_returned,
   'authorityVerified',true,'perCaseErrorRollbackObserved',true,'visibleFixtureUnchanged',true));
 END LOOP;
 IF nan_rejected_count<>4 OR authority_check_count<>4 OR rollback_equality_count<>4 OR jsonb_array_length(observations)<>4
 THEN RAISE EXCEPTION 'STOP_NAN_EXACT_FOUR_CASE_COUNTERS'; END IF;
 output:=jsonb_build_object('contract','office-four-nan-rejections/v1','status','ASSERTIONS_COMPLETED_ROLLBACK_PENDING',
  'cases',observations,'nanRejectedCount',nan_rejected_count,'authorityCheckCount',authority_check_count,
  'rollbackEqualityCount',rollback_equality_count,'invocationReturnCount',0,
  'outerRollback','PENDING_ACTUAL_ROLLBACK_TAG','freshFullFixtureProbe','REQUIRED_SEPARATE_ROOT_OBSERVATION',
  'infinityPolicy','OPEN_NOT_CLAIMED','productPass',false,'sourceAdmission',false,'FULL',false);
 PERFORM pg_catalog.set_config('gox.office_nan_rejections',output::text,true);
END;
$gox_four_nan_rejections$;
SELECT current_setting('gox.office_nan_rejections')::jsonb;
ROLLBACK;
