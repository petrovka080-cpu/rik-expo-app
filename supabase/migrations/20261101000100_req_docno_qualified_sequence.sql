-- Product SOURCE candidate only. ROOT may apply only to the independently owned disposable DB.
-- No caller search_path/default/qty/trigger/owner/ACL changes; no sequence value is read or advanced.
BEGIN;
DO $gox_req_docno_qualify$
DECLARE
 target_oid oid := pg_catalog.to_regprocedure('public.req_next_doc_no()');
 sequence_oid oid := pg_catalog.to_regclass('public.req_docno_seq');
 before_owner oid;
 before_acl aclitem[];
 before_properties jsonb;
 after_owner oid;
 after_acl aclitem[];
 after_properties jsonb;
 before_sequence jsonb;
 after_sequence jsonb;
 before_sha text;
 after_sha text;
 target_definition CONSTANT text := $gox_exact_definition$CREATE OR REPLACE FUNCTION public.req_next_doc_no()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$ select 'A-'||lpad(nextval('public.req_docno_seq')::text, 5, '0') $function$
$gox_exact_definition$;
BEGIN
 IF pg_catalog.current_setting('client_encoding') <> 'UTF8' OR target_oid IS NULL OR sequence_oid IS NULL THEN
  RAISE EXCEPTION 'REQ_DOCNO_SOURCE_OBJECT_OR_ENCODING_HOLD';
 END IF;
 SELECT p.proowner,p.proacl,to_jsonb(p)-'prosrc',
  pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid),'UTF8')),'hex')
 INTO STRICT before_owner,before_acl,before_properties,before_sha
 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace JOIN pg_catalog.pg_language l ON l.oid=p.prolang
 WHERE p.oid=target_oid AND n.nspname='public' AND p.proname='req_next_doc_no' AND p.pronargs=0 AND p.prokind='f'
  AND p.prorettype='pg_catalog.text'::regtype AND l.lanname='sql';
 IF before_sha <> '66c340ba049ca0ca5533b751b21e30a6b76ab526a5304f5f634324ec1aa76c1c'
    OR pg_catalog.pg_get_userbyid(before_owner) <> 'postgres' THEN
  RAISE EXCEPTION 'REQ_DOCNO_BEFORE_DEFINITION_OR_OWNER_DRIFT';
 END IF;
 IF NOT (SELECT count(*)=5 AND count(DISTINCT a.grantee)=5 AND bool_and(a.grantor=before_owner AND NOT a.is_grantable AND a.privilege_type='EXECUTE'
   AND (CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_catalog.pg_get_userbyid(a.grantee)::text END) IN('PUBLIC','postgres','anon','authenticated','service_role'))
   FROM pg_catalog.aclexplode(coalesce(before_acl,pg_catalog.acldefault('f',before_owner))) a) THEN
  RAISE EXCEPTION 'REQ_DOCNO_BEFORE_ACL_DRIFT';
 END IF;
 SELECT jsonb_build_object('oid',c.oid::text,'schema',n.nspname,'name',c.relname,'kind',c.relkind,'persistence',c.relpersistence,
   'owner',c.relowner::text,'ownerName',pg_catalog.pg_get_userbyid(c.relowner),'acl',to_jsonb(c.relacl),'options',to_jsonb(c.reloptions),
   'typeOid',s.seqtypid::text,'start',s.seqstart::text,'increment',s.seqincrement::text,'minimum',s.seqmin::text,'maximum',s.seqmax::text,'cache',s.seqcache::text,'cycle',s.seqcycle)
 INTO STRICT before_sequence FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_sequence s ON s.seqrelid=c.oid
 WHERE c.oid=sequence_oid AND n.nspname='public' AND c.relname='req_docno_seq' AND c.relkind='S' AND c.relpersistence='p'
  AND pg_catalog.pg_get_userbyid(c.relowner)='postgres' AND s.seqtypid='pg_catalog.int8'::regtype
  AND s.seqstart=1 AND s.seqincrement=1 AND s.seqmin=1 AND s.seqmax=9223372036854775807 AND s.seqcache=1 AND NOT s.seqcycle;
 -- Exact CREATE OR REPLACE text differs from the captured source by seven ASCII bytes only.
 EXECUTE target_definition;
 SELECT p.proowner,p.proacl,to_jsonb(p)-'prosrc',
  pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid),'UTF8')),'hex')
 INTO STRICT after_owner,after_acl,after_properties,after_sha FROM pg_catalog.pg_proc p WHERE p.oid=target_oid;
 IF pg_catalog.to_regprocedure('public.req_next_doc_no()')::oid IS DISTINCT FROM target_oid
    OR after_sha IS DISTINCT FROM '918ce160c9291ed741ce8eaf86632ea03fffc1e4917c5371a76f4ffcb383200e'
    OR after_owner IS DISTINCT FROM before_owner OR after_acl IS DISTINCT FROM before_acl
    OR after_properties IS DISTINCT FROM before_properties THEN
  RAISE EXCEPTION 'REQ_DOCNO_AFTER_DEFINITION_PROPERTIES_OWNER_ACL_DRIFT';
 END IF;
 SELECT jsonb_build_object('oid',c.oid::text,'schema',n.nspname,'name',c.relname,'kind',c.relkind,'persistence',c.relpersistence,
   'owner',c.relowner::text,'ownerName',pg_catalog.pg_get_userbyid(c.relowner),'acl',to_jsonb(c.relacl),'options',to_jsonb(c.reloptions),
   'typeOid',s.seqtypid::text,'start',s.seqstart::text,'increment',s.seqincrement::text,'minimum',s.seqmin::text,'maximum',s.seqmax::text,'cache',s.seqcache::text,'cycle',s.seqcycle)
 INTO STRICT after_sequence FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_sequence s ON s.seqrelid=c.oid WHERE c.oid=sequence_oid;
 IF pg_catalog.to_regclass('public.req_docno_seq')::oid IS DISTINCT FROM sequence_oid OR after_sequence IS DISTINCT FROM before_sequence THEN
  RAISE EXCEPTION 'REQ_DOCNO_SEQUENCE_IDENTITY_OR_METADATA_DRIFT';
 END IF;
END
$gox_req_docno_qualify$;
COMMIT;
