-- Existing accepted synthetic fixture only. No new catalog/uom rows or normative quantities.
-- psql -v access_v4_fixture=<ROOT-pinned fixture JSON>; client must prove ROLLBACK and baseline unchanged.
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_catalog.set_config('gox.office_unit_fixture', :'access_v4_fixture', true);
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','',true);
SELECT pg_catalog.set_config('request.jwt.claim.role','',true);
SELECT pg_catalog.set_config('request.jwt.claim','',true);
SELECT pg_catalog.set_config('request.jwt.claims',(current_setting('gox.office_unit_fixture')::jsonb->'claims')::text,true);
DO $gox_qty_boundaries$
DECLARE
 f jsonb:=current_setting('gox.office_unit_fixture')::jsonb;
 ia uuid:=(f->>'itemA')::uuid; ib uuid:=(f->>'itemB')::uuid;
 ra uuid:=(f->>'requestA')::uuid; rb uuid:=(f->>'requestB')::uuid;
 actor uuid:=(f->>'actorId')::uuid; u uuid:=(f->>'uomId')::uuid; w uuid:=(f->>'workId')::uuid;
 a public.request_items; b public.request_items; original_a public.request_items; persisted_a public.request_items;
 before_b_head jsonb; before_b_children jsonb; after_b_head jsonb; after_b_children jsonb;
 observed_error text; no_id_held boolean:=false;
BEGIN
 IF f->>'databaseName' IS DISTINCT FROM current_database() OR f->>'bindingReview' IS DISTINCT FROM 'ROOT_REVIEWED_DISPOSABLE_DB'
  OR current_user<>'authenticated' OR current_setting('role',true)<>'authenticated'
  OR auth.uid() IS DISTINCT FROM actor OR auth.role() IS DISTINCT FROM 'authenticated'
  OR (auth.jwt()->>'sub')::uuid IS DISTINCT FROM actor OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
  OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal1' OR NOT public.office_request_mfa_ok_v2()
  OR ia IS NULL OR ib IS NULL OR ia=ib OR ra IS NULL OR rb IS NULL OR ra=rb
  OR NOT public.office_request_write_v2(ra) OR NOT public.office_request_write_v2(rb)
  OR current_setting('session_replication_role')<>'origin' THEN RAISE EXCEPTION 'STOP_UNIT_BOUNDARY_FIXTURE_AUTHORITY'; END IF;
 SELECT * INTO STRICT original_a FROM public.request_items WHERE id=ia AND request_id=ra FOR UPDATE;
 SELECT * INTO STRICT b FROM public.request_items WHERE id=ib AND request_id=rb FOR UPDATE;
 IF original_a.qty<>1.000 OR b.qty<>1.000 OR original_a.uom<>'m' OR b.uom<>'m'
  OR original_a.ref_table<>'rik_works' OR original_a.ref_id IS DISTINCT FROM w OR original_a.unit_id IS DISTINCT FROM u
  OR original_a.rik_code IS DISTINCT FROM f->>'syntheticCode' OR original_a.price IS NOT NULL OR b.price IS NOT NULL
  OR NOT EXISTS(SELECT 1 FROM public.rik_works rw JOIN public.uoms uu ON uu.id=rw.unit_id
    WHERE rw.id=w AND rw.rik_code=original_a.rik_code AND uu.id=u AND uu.code='m')
 THEN RAISE EXCEPTION 'STOP_UNIT_BOUNDARY_LINKED_SOURCE_BASELINE'; END IF;
 SELECT to_jsonb(r) INTO STRICT before_b_head FROM public.requests r WHERE r.id=rb FOR UPDATE;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) INTO before_b_children FROM public.request_items i WHERE i.request_id=rb;
 -- Proven continuous existing-item path, manual physical input (not a norm).
 -- Restore ONLY the already accepted original fixture tuple; INSERT-only fill_refs cannot repair UPDATE damage.
 UPDATE public.request_items SET ref_table=original_a.ref_table,ref_id=original_a.ref_id,unit_id=original_a.unit_id,
  rik_code=original_a.rik_code,uom=original_a.uom,qty=original_a.qty WHERE id=ia AND request_id=ra;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF (to_jsonb(a)-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'updated_at')
 THEN RAISE EXCEPTION 'ACCEPTED_UNIT_FIXTURE_RESTORE_MISMATCH'; END IF;
 SELECT * INTO STRICT a FROM public.request_item_update_qty(ia,1.25::numeric);
 SELECT * INTO STRICT persisted_a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF a.qty IS DISTINCT FROM 1.250::numeric OR persisted_a.qty IS DISTINCT FROM 1.250::numeric
  OR (to_jsonb(persisted_a)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'qty'-'updated_at')
 THEN RAISE EXCEPTION 'KNOWN_PRELINKED_FRACTIONAL_BASELINE_REQUIRED'; END IF;
 IF a.qty IS DISTINCT FROM 1.250::numeric THEN RAISE EXCEPTION 'UNIT_BOUNDARY_CONTINUOUS_FRACTION_NOT_PRESERVED'; END IF;
 -- Independent unit-only switch; metre FK/catalog conflicting with pcs cannot keep a fractional counted quantity.
 -- Restore ONLY the already accepted original fixture tuple; INSERT-only fill_refs cannot repair UPDATE damage.
 UPDATE public.request_items SET ref_table=original_a.ref_table,ref_id=original_a.ref_id,unit_id=original_a.unit_id,
  rik_code=original_a.rik_code,uom=original_a.uom,qty=original_a.qty WHERE id=ia AND request_id=ra;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF (to_jsonb(a)-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'updated_at')
 THEN RAISE EXCEPTION 'ACCEPTED_UNIT_FIXTURE_RESTORE_MISMATCH'; END IF;
 SELECT * INTO STRICT a FROM public.request_item_update_qty(ia,1.25::numeric);
 SELECT * INTO STRICT persisted_a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF a.qty IS DISTINCT FROM 1.250::numeric OR persisted_a.qty IS DISTINCT FROM 1.250::numeric
  OR (to_jsonb(persisted_a)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'qty'-'updated_at')
 THEN RAISE EXCEPTION 'KNOWN_PRELINKED_FRACTIONAL_BASELINE_REQUIRED'; END IF;
 UPDATE public.request_items SET uom='pcs' WHERE id=ia;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia;
 IF a.qty IS DISTINCT FROM 2.000::numeric OR a.uom IS DISTINCT FROM 'pcs' THEN RAISE EXCEPTION 'UNIT_ONLY_COUNT_TRANSITION_NOT_PROTECTED'; END IF;
 -- Independent missing-unit-ID edit; actual fill_refs is INSERT ONLY, so no implicit repair is expected.
 -- Restore ONLY the already accepted original fixture tuple; INSERT-only fill_refs cannot repair UPDATE damage.
 UPDATE public.request_items SET ref_table=original_a.ref_table,ref_id=original_a.ref_id,unit_id=original_a.unit_id,
  rik_code=original_a.rik_code,uom=original_a.uom,qty=original_a.qty WHERE id=ia AND request_id=ra;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF (to_jsonb(a)-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'updated_at')
 THEN RAISE EXCEPTION 'ACCEPTED_UNIT_FIXTURE_RESTORE_MISMATCH'; END IF;
 SELECT * INTO STRICT a FROM public.request_item_update_qty(ia,1.25::numeric);
 SELECT * INTO STRICT persisted_a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF a.qty IS DISTINCT FROM 1.250::numeric OR persisted_a.qty IS DISTINCT FROM 1.250::numeric
  OR (to_jsonb(persisted_a)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'qty'-'updated_at')
 THEN RAISE EXCEPTION 'KNOWN_PRELINKED_FRACTIONAL_BASELINE_REQUIRED'; END IF;
 UPDATE public.request_items SET unit_id=NULL WHERE id=ia;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia;
 IF a.qty IS DISTINCT FROM 2.000::numeric THEN RAISE EXCEPTION 'UNIT_ID_ONLY_UNKNOWN_AUTHORITY_NOT_PROTECTED'; END IF;
 -- Independent missing-ref-ID edit from the same proven fractional baseline.
 -- Restore ONLY the already accepted original fixture tuple; INSERT-only fill_refs cannot repair UPDATE damage.
 UPDATE public.request_items SET ref_table=original_a.ref_table,ref_id=original_a.ref_id,unit_id=original_a.unit_id,
  rik_code=original_a.rik_code,uom=original_a.uom,qty=original_a.qty WHERE id=ia AND request_id=ra;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF (to_jsonb(a)-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'updated_at')
 THEN RAISE EXCEPTION 'ACCEPTED_UNIT_FIXTURE_RESTORE_MISMATCH'; END IF;
 SELECT * INTO STRICT a FROM public.request_item_update_qty(ia,1.25::numeric);
 SELECT * INTO STRICT persisted_a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF a.qty IS DISTINCT FROM 1.250::numeric OR persisted_a.qty IS DISTINCT FROM 1.250::numeric
  OR (to_jsonb(persisted_a)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'qty'-'updated_at')
 THEN RAISE EXCEPTION 'KNOWN_PRELINKED_FRACTIONAL_BASELINE_REQUIRED'; END IF;
 UPDATE public.request_items SET ref_id=NULL WHERE id=ia;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia;
 IF a.qty IS DISTINCT FROM 2.000::numeric THEN RAISE EXCEPTION 'REF_ID_ONLY_UNKNOWN_AUTHORITY_NOT_PROTECTED'; END IF;
 -- Independent generic-reference edit from the same proven fractional baseline.
 -- Restore ONLY the already accepted original fixture tuple; INSERT-only fill_refs cannot repair UPDATE damage.
 UPDATE public.request_items SET ref_table=original_a.ref_table,ref_id=original_a.ref_id,unit_id=original_a.unit_id,
  rik_code=original_a.rik_code,uom=original_a.uom,qty=original_a.qty WHERE id=ia AND request_id=ra;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF (to_jsonb(a)-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'updated_at')
 THEN RAISE EXCEPTION 'ACCEPTED_UNIT_FIXTURE_RESTORE_MISMATCH'; END IF;
 SELECT * INTO STRICT a FROM public.request_item_update_qty(ia,1.25::numeric);
 SELECT * INTO STRICT persisted_a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF a.qty IS DISTINCT FROM 1.250::numeric OR persisted_a.qty IS DISTINCT FROM 1.250::numeric
  OR (to_jsonb(persisted_a)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'qty'-'updated_at')
 THEN RAISE EXCEPTION 'KNOWN_PRELINKED_FRACTIONAL_BASELINE_REQUIRED'; END IF;
 UPDATE public.request_items SET ref_table='rik_catalog' WHERE id=ia;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia;
 IF a.qty IS DISTINCT FROM 2.000::numeric THEN RAISE EXCEPTION 'REF_TABLE_ONLY_GENERIC_AUTHORITY_NOT_PROTECTED'; END IF;
 -- Independent blank-uom edit; real UPDATE autofill may refill uom, but refs were restored explicitly above.
 -- Restore ONLY the already accepted original fixture tuple; INSERT-only fill_refs cannot repair UPDATE damage.
 UPDATE public.request_items SET ref_table=original_a.ref_table,ref_id=original_a.ref_id,unit_id=original_a.unit_id,
  rik_code=original_a.rik_code,uom=original_a.uom,qty=original_a.qty WHERE id=ia AND request_id=ra;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF (to_jsonb(a)-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'updated_at')
 THEN RAISE EXCEPTION 'ACCEPTED_UNIT_FIXTURE_RESTORE_MISMATCH'; END IF;
 SELECT * INTO STRICT a FROM public.request_item_update_qty(ia,1.25::numeric);
 SELECT * INTO STRICT persisted_a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF a.qty IS DISTINCT FROM 1.250::numeric OR persisted_a.qty IS DISTINCT FROM 1.250::numeric
  OR (to_jsonb(persisted_a)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'qty'-'updated_at')
 THEN RAISE EXCEPTION 'KNOWN_PRELINKED_FRACTIONAL_BASELINE_REQUIRED'; END IF;
 UPDATE public.request_items SET uom='' WHERE id=ia;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia;
 IF a.qty IS DISTINCT FROM 2.000::numeric THEN RAISE EXCEPTION 'BLANK_UNIT_AUTHORITY_NOT_PROTECTED'; END IF;
 IF a.uom IS DISTINCT FROM 'm' OR a.ref_id IS DISTINCT FROM w OR a.unit_id IS DISTINCT FROM u THEN RAISE EXCEPTION 'REAL_REFILL_CONTEXT_HOLD'; END IF;
 -- Independent same-code event; no ID/code/unit is invented.
 -- Restore ONLY the already accepted original fixture tuple; INSERT-only fill_refs cannot repair UPDATE damage.
 UPDATE public.request_items SET ref_table=original_a.ref_table,ref_id=original_a.ref_id,unit_id=original_a.unit_id,
  rik_code=original_a.rik_code,uom=original_a.uom,qty=original_a.qty WHERE id=ia AND request_id=ra;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF (to_jsonb(a)-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'updated_at')
 THEN RAISE EXCEPTION 'ACCEPTED_UNIT_FIXTURE_RESTORE_MISMATCH'; END IF;
 SELECT * INTO STRICT a FROM public.request_item_update_qty(ia,1.25::numeric);
 SELECT * INTO STRICT persisted_a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF a.qty IS DISTINCT FROM 1.250::numeric OR persisted_a.qty IS DISTINCT FROM 1.250::numeric
  OR (to_jsonb(persisted_a)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'qty'-'updated_at')
 THEN RAISE EXCEPTION 'KNOWN_PRELINKED_FRACTIONAL_BASELINE_REQUIRED'; END IF;
 UPDATE public.request_items SET rik_code=rik_code WHERE id=ia;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia;
 IF a.qty IS DISTINCT FROM 1.250::numeric THEN RAISE EXCEPTION 'SAME_CODE_MEASURED_AUTHORITY_NOT_PRESERVED'; END IF;
 -- The new resolver admits only a genuine agreed continuous authority; increment keeps exact stored refs.
 IF public.request_item_add_or_inc(ra,original_a.rik_code,1.25::numeric) IS DISTINCT FROM ia
 THEN RAISE EXCEPTION 'RESOLVED_GENERIC_INCREMENT_IDENTITY_REQUIRED'; END IF;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia AND request_id=ra;
 IF a.qty IS DISTINCT FROM 2.500::numeric
  OR (to_jsonb(a)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'qty'-'updated_at')
 THEN RAISE EXCEPTION 'RESOLVED_GENERIC_INCREMENT_PERSISTENCE_REQUIRED'; END IF;
 SELECT to_jsonb(r) INTO STRICT after_b_head FROM public.requests r WHERE r.id=rb;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) INTO after_b_children FROM public.request_items i WHERE i.request_id=rb;
 SELECT * INTO STRICT a FROM public.request_items WHERE id=ia;
 IF before_b_head IS DISTINCT FROM after_b_head OR before_b_children IS DISTINCT FROM after_b_children
  OR (to_jsonb(a)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(original_a)-'qty'-'updated_at') OR a.qty IS DISTINCT FROM 2.500::numeric
 THEN RAISE EXCEPTION 'UNIT_BOUNDARY_IDENTITY_OR_OTHER_PARENT_CHANGED'; END IF;
END
$gox_qty_boundaries$;
SELECT jsonb_build_object('contract','office-unit-authority-boundaries/v2','status','ASSERTIONS_COMPLETED_ROLLBACK_PENDING',
 'continuousExistingUpdate',true,'unitOnlyCountTransition',true,'unitIdEdit',true,'refIdEdit',true,'refTableEdit',true,'blankUnitEdit',true,'sameCodeEvent',true,
 'genericFractionalInsert','RESOLVED_EXISTING_INCREMENT','otherParentUnchanged',true,'sourceAdmission',false,'FULL',false) AS unit_boundary_observation;
ROLLBACK;
