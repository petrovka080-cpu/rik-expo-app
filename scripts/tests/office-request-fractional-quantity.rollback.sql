-- SOURCE ONLY: genuine seed accepted separately, real helper/trigger unchanged.
-- psql -v access_v4_fixture=<exact accepted synthetic fixture JSON> -f <this file>
-- Success explicitly ROLLBACKs; assertion/error aborts transaction. ROOT must prove client-close
-- rollback and unchanged persisted fixture afterward; no broad error-as-success handler exists.
\set ON_ERROR_STOP on
BEGIN;
SELECT pg_catalog.set_config('gox.office_fraction_fixture', :'access_v4_fixture', true);
SET LOCAL ROLE authenticated;
SELECT pg_catalog.set_config('request.jwt.claim.sub','',true);
SELECT pg_catalog.set_config('request.jwt.claim.role','',true);
SELECT pg_catalog.set_config('request.jwt.claim','',true);
SELECT pg_catalog.set_config('request.jwt.claims',(current_setting('gox.office_fraction_fixture')::jsonb->'claims')::text,true);
DO $fractional_real_helper$
DECLARE
 f jsonb:=current_setting('gox.office_fraction_fixture')::jsonb;
 ia uuid:=(f->>'itemA')::uuid; ib uuid:=(f->>'itemB')::uuid;
 ra uuid:=(f->>'requestA')::uuid; rb uuid:=(f->>'requestB')::uuid;
 a uuid:=(f->>'actorId')::uuid; u uuid:=(f->>'uomId')::uuid; w uuid:=(f->>'workId')::uuid;
 before_a public.request_items; before_b public.request_items;
 returned_a public.request_items; saved_a public.request_items; saved_b public.request_items;
 before_b_head jsonb; before_b_children jsonb; after_b_head jsonb; after_b_children jsonb;
BEGIN
 IF f->>'databaseName' IS DISTINCT FROM current_database() OR f->>'bindingReview' IS DISTINCT FROM 'ROOT_REVIEWED_DISPOSABLE_DB'
    OR current_user<>'authenticated' OR current_setting('role',true)<>'authenticated'
    OR auth.uid() IS DISTINCT FROM a OR auth.role() IS DISTINCT FROM 'authenticated'
    OR (auth.jwt()->>'sub')::uuid IS DISTINCT FROM a
    OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
    OR auth.jwt()->>'aal' IS DISTINCT FROM 'aal1' OR NOT public.office_request_mfa_ok_v2()
    OR ia IS NULL OR ib IS NULL OR ia=ib OR ra IS NULL OR rb IS NULL OR ra=rb
    OR NOT public.office_request_write_v2(ra) OR NOT public.office_request_write_v2(rb)
 THEN RAISE EXCEPTION 'STOP_FRACTIONAL_REAL_FIXTURE_AUTHORITY'; END IF;
 IF current_setting('session_replication_role')<>'origin'
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid='public.request_items'::regclass
      AND tgname='request_items_qty_force_int' AND tgenabled='O' AND NOT tgisinternal
      AND tgfoid='public.trg_request_items_qty_force_int()'::regprocedure)
 THEN RAISE EXCEPTION 'STOP_FRACTIONAL_REAL_ENABLED_TRIGGER'; END IF;
 SELECT * INTO STRICT before_a FROM public.request_items WHERE id=ia AND request_id=ra FOR UPDATE;
 SELECT * INTO STRICT before_b FROM public.request_items WHERE id=ib AND request_id=rb FOR UPDATE;
 IF before_a.qty<>1.000 OR before_b.qty<>1.000 OR before_a.uom<>'m' OR before_b.uom<>'m'
    OR before_a.rik_code IS DISTINCT FROM f->>'syntheticCode' OR before_b.rik_code IS DISTINCT FROM f->>'syntheticCode'
    OR before_a.ref_table<>'rik_works' OR before_b.ref_table<>'rik_works'
    OR before_a.ref_id IS DISTINCT FROM w OR before_b.ref_id IS DISTINCT FROM w
    OR before_a.unit_id IS DISTINCT FROM u OR before_b.unit_id IS DISTINCT FROM u
    OR before_a.price IS NOT NULL OR before_b.price IS NOT NULL
    OR NOT EXISTS(SELECT 1 FROM public.rik_works rw JOIN public.uoms uu ON uu.id=rw.unit_id
      WHERE rw.id=w AND rw.rik_code=before_a.rik_code AND uu.id=u AND uu.code='m')
 THEN RAISE EXCEPTION 'STOP_FRACTIONAL_REAL_CONTINUOUS_UNIT_BINDING'; END IF;
 SELECT to_jsonb(r) INTO STRICT before_b_head FROM public.requests r WHERE r.id=rb FOR UPDATE;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) INTO before_b_children FROM public.request_items i WHERE i.request_id=rb;
 -- Exactly one real helper call, no stub, trigger bypass, catalog exception or second invocation.
 SELECT * INTO STRICT returned_a FROM public.request_item_update_qty(ia,1.25::numeric);
 SELECT * INTO STRICT saved_a FROM public.request_items WHERE id=ia;
 SELECT * INTO STRICT saved_b FROM public.request_items WHERE id=ib;
 SELECT to_jsonb(r) INTO STRICT after_b_head FROM public.requests r WHERE r.id=rb;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) INTO after_b_children FROM public.request_items i WHERE i.request_id=rb;
 IF after_b_head IS DISTINCT FROM before_b_head OR after_b_children IS DISTINCT FROM before_b_children
    OR saved_b IS DISTINCT FROM before_b
    OR (to_jsonb(saved_a)-'qty'-'updated_at') IS DISTINCT FROM (to_jsonb(before_a)-'qty'-'updated_at')
    OR returned_a.id IS DISTINCT FROM ia OR returned_a.request_id IS DISTINCT FROM ra OR returned_a.uom<>'m'
    OR returned_a.ref_id IS DISTINCT FROM w OR returned_a.unit_id IS DISTINCT FROM u
 THEN RAISE EXCEPTION 'FRACTIONAL_IDENTITY_UNIT_OR_OTHER_PARENT_CHANGED'; END IF;
 IF returned_a.qty IS DISTINCT FROM 1.250::numeric OR saved_a.qty IS DISTINCT FROM 1.250::numeric THEN
   RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='OFFICE_FRACTIONAL_QTY_PRESERVATION_REQUIRED',
     DETAIL=jsonb_build_object('returned_qty',returned_a.qty,'saved_qty',saved_a.qty)::text;
 END IF;
END
$fractional_real_helper$;
ROLLBACK;
