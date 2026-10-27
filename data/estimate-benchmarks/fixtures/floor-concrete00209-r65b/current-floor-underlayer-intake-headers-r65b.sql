-- ROOT R65b: project only release headers; search link comes from existing publisher metadata.definitionReleaseId. All original bounds unchanged.
-- One bounded SELECT only. ROOT supplies $1=current definition UUID, $2=current linked search UUID.
-- Run under the EXISTING owned READ ONLY REPEATABLE READ guard: statement 12s, lock 2s,
-- same existing outer memory/time budgets, local db rik_r4_runtime_b5_v2 only. No DML.
-- A NULL rows field, any overflow or changed comparison hash requires STOP and ROOT review.
-- Normative raw TEXT below is diagnostic, NOT a substitute for the existing scoped-registry capture reader.
with proposed as materialized (
 select 'canonical-work:master:floor_concrete_underlayer_krer11_01_002_09'::text catalog_id,
 'floor_concrete_underlayer_krer11_01_002_09'::text work_key,
 'master-work:floor_concrete_underlayer_krer11_01_002_09'::text source_identity,
 'wg:master:floor_concrete_underlayer_krer11_01_002_09'::text group_id,
 'kg_krer11_01_002_09_floor_concrete_underlayer_r1'::text source_key,
 'krer11-01-002-09-floor-concrete-underlayer-exact'::text locator_key,
 '11-01-002-09'::text norm_id,
 'e56ef148df993609c325b7d505c54b1806e8185a4fd7a1550b15266144538223'::text artifact_sha256
), previous(catalog_id,definition_id,definition_hash) as (values
 ('canonical-work:base:concrete_foundation_interior_slab_foundation_pour_repair','d033727c-2f2e-5ebb-8c11-798998d9630c','15fde096a8cc526dca4222094f1e81e50cef5f46e0481b44dd89e9712d32c4d0'),
 ('canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard','f6e01299-4f78-5d05-8556-a68034bf8b09','73ce830d2c3315af7396e568091a89ac6ca4789763ae48b9a95ad872f4492e74'),
 ('canonical-work:base:concrete_foundation_interior_stairs_concrete_form_standard','e8b40373-c52e-5f47-a45b-f9b6f2d5e82e','b18ea15db745635ba790c752bd2c770da5a7681e7d491d637812d0d1a89bc92a'),
 ('canonical-work:expanded:bridge_asphalt','28fd1bbb-7582-5009-87bb-b153318b9a54','b144e2172de67ce86bb7ac2b1b8382ad344ed75de0ba7584dd5a9f352aab6d81'),
 ('canonical-work:expanded:foundation_pile_field','8c6ac868-557f-5856-8894-632ece8e8502','67ce8a5e4987bb959c4fc716f6e89db029fcabbf81dca336888972aaeb44f657'),
 ('canonical-work:master:ceramic_tile_up_to_10cm_cm11_ct17_indoor_cement_floor_standard','9aa2b934-057b-512c-98ef-dd177a145b59','fd6c93b988309ac68a2001fa27656a8a910727d8e7aae24488fa599d48a9ea38'),
 ('canonical-work:master:cn69_global_25kg_manual_dry_indoor_cement_floor_2_10mm_standard','fdfc25b2-28f4-5ff3-83c2-f5037e9e190c','a762cffc9e6d57b27e21bf6d163c68b58dfaf048a60c8753007a9fa86bd8c9ca'),
 ('canonical-work:master:egger_naturesense_aqua_el2240_592958_silenzio_duo_dry_unheated_room_standard','e9606e89-f95a-5ed1-a290-1ca1e3b81970','19e09677cfd621db6154e216caca6f063b029edf6679a739f619a85eb8852ae4')
), headers as materialized (
 select coalesce(i.catalog_id,s.catalog_id) catalog_id,i.work_key,i.title_ru,i.source_identity,i.retired_at,
 m.definition_version_id::text,m.definition_hash,s.group_id,s.primary_uom,s.canonical_name_ru,
 s.short_scope_ru,s.aliases,s.normative_classifiers,s.publication_state,
 d.passport->>'physicalResultRu' physical_result_ru,
 concat_ws(' ',i.work_key,i.title_ru,s.canonical_name_ru) primary_terms,
 concat_ws(' ',i.catalog_id,i.work_key,i.title_ru,i.source_identity,s.canonical_name_ru,s.short_scope_ru,
 array_to_string(s.aliases,' '),array_to_string(s.normative_classifiers,' ')) terms
 from public.estimate_work_identity i
 full join (select * from public.estimate_search_document where search_release_id=$2::uuid) s on s.catalog_id=i.catalog_id
 left join public.estimate_cumulative_manifest_entry m on m.release_id=$1::uuid and m.catalog_id=coalesce(i.catalog_id,s.catalog_id)
 left join public.estimate_definition_version d on d.id=m.definition_version_id
), matched as materialized (
 select * from headers where (primary_terms~*'(бетон|concrete)' and primary_terms~*'(пол|floor|подстил|underlayer|subfloor)')
 or terms~*'11[-_ .]*01[-_ .]*002[-_ .]*0?9'
), selected_headers as materialized (
 select * from matched order by (definition_version_id is not null) desc,catalog_id limit 33
), identity_collisions as materialized (
 select i.* from public.estimate_work_identity i cross join proposed p
 where i.catalog_id=p.catalog_id or (i.namespace='global' and i.source_identity=p.source_identity) or i.work_key=p.work_key
 order by i.catalog_id limit 9
), group_collisions as materialized (
 select g.* from public.estimate_search_group g cross join proposed p
 where g.search_release_id=$2::uuid and g.group_id=p.group_id limit 9
), source_scope as materialized (
 select s.id::text id,s.source_key,
 jsonb_set(to_jsonb(s),'{created_at}',to_jsonb(to_char(s.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')))::text raw
 from public.estimate_normative_source s cross join proposed p
 where s.artifact_sha256=p.artifact_sha256 or s.source_key=p.source_key
 or exists(select 1 from public.estimate_normative_locator l where l.source_id=s.id and
 (l.locator_key=p.locator_key or l.locator->>'exactColumn'=p.norm_id or l.locator->>'normId'=p.norm_id or l.locator->>'norm_id'=p.norm_id))
 order by s.source_key,s.id limit 17
), locator_scope as materialized (
 select l.id::text id,l.source_id::text source_id,l.locator_key,to_jsonb(l)::text raw,
 jsonb_build_array(l.locator->>'exactColumn',l.locator->>'normId',l.locator->>'norm_id') norm_ids
 from public.estimate_normative_locator l where l.source_id::text in(select id from source_scope)
 order by l.source_id,l.locator_key,l.id limit 65
), anchors as materialized (
 select p.catalog_id,p.definition_id expected_definition_id,p.definition_hash expected_definition_hash,
 m.definition_version_id::text actual_definition_id,m.definition_hash actual_definition_hash,
 d.definition_sha256,s.group_id,s.primary_uom,s.canonical_name_ru,
 coalesce(m.definition_version_id::text=p.definition_id and m.definition_hash=p.definition_hash
 and d.definition_sha256=m.definition_hash,false) unchanged
 from previous p left join public.estimate_cumulative_manifest_entry m on m.release_id=$1::uuid and m.catalog_id=p.catalog_id
 left join public.estimate_definition_version d on d.id=m.definition_version_id
 left join public.estimate_search_document s on s.search_release_id=$2::uuid and s.catalog_id=p.catalog_id
), base as materialized (
 select jsonb_build_object('parent',(select jsonb_build_object('id',r.id,'status',r.status,'source_commit',r.source_commit,'source_tree',r.source_tree,'source_manifest_sha256',r.source_manifest_sha256,'activated_at',r.activated_at,'sealed_at',r.sealed_at) from public.estimate_definition_release r where id=$1::uuid),
 'parentSearch',(select jsonb_build_object('id',r.id,'status',r.status,'source_commit',r.source_commit,'source_tree',r.source_tree,'snapshot_sha256',r.snapshot_sha256,'activated_at',r.activated_at,'sealed_at',r.sealed_at,'definition_release_id',r.metadata->>'definitionReleaseId') from public.estimate_search_index_release r where id=$2::uuid),
 'session',jsonb_build_object('db',current_database(),'host',host(inet_server_addr()),'port',inet_server_port(),
 'isolation',current_setting('transaction_isolation'),'readOnly',current_setting('transaction_read_only'),'snapshot',txid_current_snapshot()::text),
 'counts',jsonb_build_object(
 'authoredDefinitions',(select count(*)::int from public.estimate_definition_version where release_id=$1::uuid),
 'searchDocuments',(select count(*)::int from public.estimate_search_document where search_release_id=$2::uuid),
 'cumulativeMembership',(select count(*)::int from public.estimate_cumulative_manifest_entry where release_id=$1::uuid),
 'activeCompileJobs',(select count(*)::int from public.estimate_compile_job where upper(status) in('QUEUED','RUNNING','CLAIMED','RETRY_WAIT'))),
 'collisionCounts',jsonb_build_object(
 'identities',(select count(*)::int from identity_collisions),
 'definitions',(select count(*)::int from public.estimate_definition_version d cross join proposed p where d.catalog_id=p.catalog_id),
 'membership',(select count(*)::int from public.estimate_cumulative_manifest_entry m cross join proposed p where m.release_id=$1::uuid and m.catalog_id=p.catalog_id),
 'search',(select count(*)::int from public.estimate_search_document s cross join proposed p where s.search_release_id=$2::uuid and s.catalog_id=p.catalog_id),
 'groups',(select count(*)::int from group_collisions),
 'ordinal',(select count(*)::int from public.estimate_search_group_membership g cross join proposed p where g.search_release_id=$2::uuid and g.group_id=p.group_id and g.ordinal=0),
 'sourceKeys',(select count(*)::int from source_scope s cross join proposed p where s.source_key=p.source_key),
 'exactLocators',(select count(*)::int from locator_scope l cross join proposed p where l.locator_key=p.locator_key or l.norm_ids ? p.norm_id)),
 'proposed',(select to_jsonb(p) from proposed p)) payload
), bounded as materialized (
 select 'base'::text kind,'base'::text key,payload from base
 union all select 'header',catalog_id,to_jsonb(h)-'terms'-'primary_terms' from selected_headers h
 union all select 'comparison',catalog_id,to_jsonb(a) from anchors a
 union all select 'identityCollision',catalog_id,to_jsonb(i) from identity_collisions i
 union all select 'groupCollision',group_id,to_jsonb(g) from group_collisions g
 union all select 'sourceDiagnostic',id,to_jsonb(s) from source_scope s
 union all select 'locatorDiagnostic',id,to_jsonb(l) from locator_scope l
), wire as materialized (
 select kind,key,payload,octet_length(payload::text)::bigint raw_bytes,
 jsonb_build_object('kind',kind,'key',key,'payload',payload)::text wrapped from bounded
), diagnosis as materialized (
 select count(*)::int row_count,coalesce(max(raw_bytes),0)::bigint max_row_bytes,
 coalesce(max(octet_length(wrapped)),0)::bigint max_wire_row_bytes,
 coalesce(sum(octet_length(wrapped)),0)::bigint wire_bytes,
 (select count(*) from selected_headers)>32 or (select count(*) from identity_collisions)>8
 or (select count(*) from group_collisions)>8 or (select count(*) from source_scope)>16
 or (select count(*) from locator_scope)>64 overflow from wire
)
select row_count,max_row_bytes::text,max_wire_row_bytes::text,wire_bytes::text,overflow,
 coalesce((select jsonb_agg(x) from(select kind,key,raw_bytes::text from wire where raw_bytes>524288 or octet_length(wrapped)>1048576 order by raw_bytes desc limit 8)x),'[]'::jsonb) oversized_rows,
 case when not overflow and max_row_bytes<=524288 and max_wire_row_bytes<=1048576
 and wire_bytes+greatest(row_count-1,0)+2<=3145728
 then (select '['||coalesce(string_agg(wrapped,',' order by kind,key),'')||']' from wire) else null end rows_json
from diagnosis;
