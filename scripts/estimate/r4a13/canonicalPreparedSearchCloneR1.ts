import type { Client } from "pg";
import { createHash } from "node:crypto";

/** Same cumulative search clone used by governed definition successors. All
 * documents resolve against the successor manifest; aliases and relationships
 * retain their existing scope. This never activates a cloud release. */
export async function cloneCanonicalPreparedSearchR1(client: Client, input: {
  contract: string; releaseId: string; searchReleaseId: string; parentSearchReleaseId: string;
  releaseKey: string; head: string; tree: string; fingerprint: string; targetCount: number;
}) {
  const hash = (text: string) => createHash("sha256").update(text).digest("hex");
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    hash(`${input.searchReleaseId}:draft`), input.contract, input.parentSearchReleaseId, input.releaseId, input.fingerprint,
  ]);
  for (const [table, columns] of [
    ["estimate_search_group", "group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition"],
    ["estimate_search_clarification_question", "question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence"],
  ] as const) {
    await client.query(`insert into public.${table}(search_release_id,${columns}) select $1,${columns} from public.${table} where search_release_id=$2`, [input.searchReleaseId, input.parentSearchReleaseId]);
  }
  const documents = await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
      primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
      catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
      required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
      replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
      normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
      adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
    select $1,s.catalog_id,s.domain_id,s.system_id,s.subsystem_id,s.assembly_id,s.work_family_id,
      s.group_id,s.subgroup_id,s.element_type,s.operation_kind,s.technology_variant,s.construction_state,
      s.primary_uom,s.canonical_name_ru,s.aliases,s.normative_classifiers,s.applicability_tags,s.publication_state,
      s.catalog_origin,$2::uuid,s.short_scope_ru,s.key_distinguishing_parameters,s.required_inputs_count,
      s.clarification_fields,s.included_boundaries,s.excluded_boundaries,s.replacement_catalog_id,
      s.normalized_catalog_id,s.normalized_canonical_name,s.normalized_aliases,s.normalized_search_terms,
      s.normalized_search_blob,s.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(s.document_sha256||':'||$3||':'||$2::uuid::text,'UTF8'),'sha256'),'hex'),
      s.adjudication_class,s.selectable,s.canonical_target_catalog_id,m.definition_version_id
    from public.estimate_search_document s join public.estimate_cumulative_manifest_entry m
      on m.release_id=$2 and m.catalog_id=s.catalog_id where s.search_release_id=$4`, [
    input.searchReleaseId, input.releaseId, input.contract, input.parentSearchReleaseId, input.fingerprint,
  ]);
  const parentCount = Number((await client.query("select count(*)::int count from public.estimate_search_document where search_release_id=$1", [input.parentSearchReleaseId])).rows[0].count);
  if (documents.rowCount !== parentCount) throw new Error("CANONICAL_SEARCH_CLONE_DOCUMENT_LOSS");
  for (const [table, columns] of [
    ["estimate_search_group_membership", "group_id,catalog_id,ordinal,independent_disposition"],
    ["estimate_search_typed_relation", "source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256"],
  ] as const) {
    await client.query(`insert into public.${table}(search_release_id,${columns}) select $1,${columns} from public.${table} where search_release_id=$2`, [input.searchReleaseId, input.parentSearchReleaseId]);
  }
  const snapshot = (await client.query(`select count(*)::int documents,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0];
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [input.searchReleaseId, snapshot.snapshot_sha256,
    JSON.stringify({ documentCount: snapshot.documents, purchaseGroupTargetCount: input.targetCount })]);
  return snapshot;
}
