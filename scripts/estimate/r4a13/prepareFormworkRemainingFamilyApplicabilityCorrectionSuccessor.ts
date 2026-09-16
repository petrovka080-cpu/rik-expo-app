import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  assertFormworkRemainingFamilyApplicabilityMatrix,
  FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX,
  FORMWORK_REMAINING_FAMILY_CONTRACTS,
} from "./formworkRemainingFamilyApplicabilityCorrection";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.formwork-remaining-family-applicability-correction.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (8).md",
);
const MASTER_SHA256 = "50687aa500c59fc01750f5982c4b152150ad1747d7ac8c607ed1e0ef3ba657f4";
const PARENT_RELEASE_ID = "74a44b9c-3ad9-5ce9-b02a-dba73065f34c";
const PARENT_SEARCH_RELEASE_ID = "8157cba9-f0e3-5a02-9645-745a3cf0389b";
const MEASUREMENT_FALLBACK_RELEASE_ID = "a06a3faf-170a-5bdd-ac5f-73b537755930";
const MEASUREMENT_FALLBACK_SEARCH_RELEASE_ID = "a5ed8a79-65d7-5cdd-86a2-e9abe068ffd0";
const ACCEPTED_PILE_CAP_CATALOG_ID =
  "canonical-work:base:concrete_foundation_interior_pile_cap_form_wet_zone";
const ACCEPTED_PILE_CAP_DEFINITION_ID = "f9f9c447-502c-5a15-84b5-4a4d40351ae2";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(
  ".release-runtime/r4a13-6/exact-physical-norm-successors/"
  + "formwork-remaining-family-applicability-correction",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const SOURCE_PATHS = [
  "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.ts",
  "scripts/estimate/r4a13/formworkRemainingFamilyApplicabilityCorrection.test.ts",
  "scripts/estimate/r4a13/prepareFormworkRemainingFamilyApplicabilityCorrectionSuccessor.ts",
  "src/lib/estimate/v4/formworkFramiXlifeProjectKitR1.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(stable(value)))
    .digest("hex");
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_FORMWORK_REMAINING_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_FORMWORK_REMAINING_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function auditState(client: Client, releaseId: string, searchReleaseId: string): Promise<Json> {
  const targetIds = FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX.map((target) => target.catalogId);
  const manifest = (await client.query(`select count(*)::int identities,
      count(*) filter(where catalog_id=any($2::text[]))::int corrected_targets,
      count(*) filter(where catalog_id=$3 and definition_version_id=$4)::int retained_accepted_pile_cap,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [
    releaseId, targetIds, ACCEPTED_PILE_CAP_CATALOG_ID, ACCEPTED_PILE_CAP_DEFINITION_ID,
  ])).rows[0] as Json;
  const targets = (await client.query(`select manifest.catalog_id,manifest.definition_version_id,
      manifest.source_batch,manifest.source_release_id,manifest.runtime_publication_state,
      definition.passport,definition.applicability,definition.source_metadata,
      passport.decision,
      (select count(*)::int from public.estimate_parameter_definition p
        where p.definition_version_id=definition.id) parameters,
      (select count(*)::int from public.estimate_formula_graph f
        where f.definition_version_id=definition.id) formulas,
      (select count(*)::int from public.estimate_resource_spec r
        where r.definition_version_id=definition.id) resources
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    left join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
    order by manifest.catalog_id`, [releaseId, targetIds])).rows as Json[];
  const search = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      count(*) filter(where catalog_id=any($2::text[])
        and source_provenance->>'fullScopeStatus'='OPEN_PER_ID_PROJECT_EVIDENCE_REQUIRED')::int corrected_targets,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [
    searchReleaseId, targetIds,
  ])).rows[0] as Json;
  return { manifest, targets, search };
}

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
}): Promise<Json> {
  const targetIds = FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX.map((target) => target.catalogId);
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','PREPARED_NOT_ACTIVE','activationAllowed',false,'productionEligible',false,
        'correctedRemainingFormworkTargetCount',$10::int,'retainedAcceptedPileCapTargetCount',1)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, PARENT_SEARCH_RELEASE_ID,
    input.releaseId, input.fingerprint, targetIds.length,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_document(
      search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
      group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
      primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
      catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
      required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
      replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
      normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
      adjudication_class,selectable,canonical_target_catalog_id,definition_version_id)
    select $1,source.catalog_id,source.domain_id,source.system_id,source.subsystem_id,source.assembly_id,
      source.work_family_id,source.group_id,source.subgroup_id,source.element_type,source.operation_kind,
      source.technology_variant,source.construction_state,source.primary_uom,source.canonical_name_ru,
      source.aliases,source.normative_classifiers,source.applicability_tags,source.publication_state,
      source.catalog_origin,$2::uuid,source.short_scope_ru,source.key_distinguishing_parameters,
      source.required_inputs_count,source.clarification_fields,source.included_boundaries,
      source.excluded_boundaries,source.replacement_catalog_id,source.normalized_catalog_id,
      source.normalized_canonical_name,source.normalized_aliases,source.normalized_search_terms,
      source.normalized_search_blob,source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,
        'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,'UTF8'),'sha256'),'hex'),
      source.adjudication_class,source.selectable,source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId, input.releaseId, CONTRACT, PARENT_SEARCH_RELEASE_ID, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [
    input.searchReleaseId, PARENT_SEARCH_RELEASE_ID,
  ]);
  await client.query(`update public.estimate_search_document target set
      domain_id=source.domain_id,system_id=source.system_id,subsystem_id=source.subsystem_id,
      assembly_id=source.assembly_id,work_family_id=source.work_family_id,group_id=source.group_id,
      subgroup_id=source.subgroup_id,element_type=source.element_type,operation_kind=source.operation_kind,
      technology_variant=source.technology_variant,construction_state=source.construction_state,
      primary_uom=source.primary_uom,canonical_name_ru=source.canonical_name_ru,aliases=source.aliases,
      normative_classifiers=source.normative_classifiers,
      applicability_tags=array_append(array_remove(source.applicability_tags,'FULL_QUANTITY_SCOPE_PRICE_PARTIAL'),
        'FULL_SCOPE_REQUIRES_PER_ID_PROJECT'),
      publication_state=source.publication_state,catalog_origin=source.catalog_origin,
      definition_release_id=$2::uuid,short_scope_ru=source.short_scope_ru,
      key_distinguishing_parameters=source.key_distinguishing_parameters,
      required_inputs_count=source.required_inputs_count,clarification_fields=source.clarification_fields,
      included_boundaries=source.included_boundaries,excluded_boundaries=source.excluded_boundaries,
      replacement_catalog_id=source.replacement_catalog_id,normalized_catalog_id=source.normalized_catalog_id,
      normalized_canonical_name=source.normalized_canonical_name,normalized_aliases=source.normalized_aliases,
      normalized_search_terms=source.normalized_search_terms,normalized_search_blob=source.normalized_search_blob,
      source_provenance=source.source_provenance||jsonb_build_object('contract',$3::text,
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,
        'restoredFromSearchReleaseId',$5::uuid::text,'sourceFingerprint',$6::text,
        'fullScopeStatus','OPEN_PER_ID_PROJECT_EVIDENCE_REQUIRED'),
      document_sha256=encode(extensions.digest(convert_to(
        source.document_sha256||':'||$3||':'||$2::uuid::text,'UTF8'),'sha256'),'hex'),
      adjudication_class=source.adjudication_class,selectable=source.selectable,
      canonical_target_catalog_id=source.canonical_target_catalog_id,
      definition_version_id=manifest.definition_version_id
    from public.estimate_search_document source, public.estimate_cumulative_manifest_entry manifest
    where target.search_release_id=$1 and target.catalog_id=source.catalog_id
      and source.search_release_id=$5 and source.catalog_id=any($7::text[])
      and manifest.release_id=$2 and manifest.catalog_id=source.catalog_id`, [
    input.searchReleaseId, input.releaseId, CONTRACT, PARENT_SEARCH_RELEASE_ID,
    MEASUREMENT_FALLBACK_SEARCH_RELEASE_ID, input.fingerprint, targetIds,
  ]);
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId,
    snapshot.snapshot_sha256,
    JSON.stringify({
      documentCount: snapshot.documents,
      visibleCount: snapshot.visible,
      correctedRemainingFormworkTargetCount: targetIds.length,
      retainedAcceptedPileCapTargetCount: 1,
      fullScopeOpenCatalogIds: targetIds,
    }),
  ]);
  return snapshot;
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  assertFormworkRemainingFamilyApplicabilityMatrix();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_FORMWORK_REMAINING_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_FORMWORK_REMAINING_MASTER_SHA256_DRIFT");
  for (const path of SOURCE_PATHS) {
    invariant(existsSync(resolve(path)), `STOP_FORMWORK_REMAINING_SOURCE_MISSING:${path}`);
    invariant(git("diff", "--name-only", "HEAD", "--", path) === "",
      `STOP_FORMWORK_REMAINING_SOURCE_UNCOMMITTED:${path}`);
  }

  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const targetIds = FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX.map((target) => target.catalogId);
  const fingerprint = sha256({
    contract: CONTRACT,
    head,
    tree,
    masterSha256: MASTER_SHA256,
    parentReleaseId: PARENT_RELEASE_ID,
    parentSearchReleaseId: PARENT_SEARCH_RELEASE_ID,
    fallbackReleaseId: MEASUREMENT_FALLBACK_RELEASE_ID,
    fallbackSearchReleaseId: MEASUREMENT_FALLBACK_SEARCH_RELEASE_ID,
    applicabilityMatrix: FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX,
    sourceHashes,
  });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const releaseKey = `${CONTRACT}:${fingerprint.slice(0, 20)}`;
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(
    (current.definitionReleaseId === PARENT_RELEASE_ID && current.searchReleaseId === PARENT_SEARCH_RELEASE_ID)
      || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    `STOP_FORMWORK_REMAINING_POINTER_DRIFT:${current.definitionReleaseId}:${current.searchReleaseId}`,
  );

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: "r4-a13-6-formwork-remaining-applicability-correction",
  });
  await client.connect();
  let receipt: Json;
  try {
    const parent = (await client.query("select * from public.estimate_definition_release where id=$1", [
      PARENT_RELEASE_ID,
    ])).rows[0] as Json | undefined;
    const fallback = (await client.query("select * from public.estimate_definition_release where id=$1", [
      MEASUREMENT_FALLBACK_RELEASE_ID,
    ])).rows[0] as Json | undefined;
    invariant(parent?.status === "prepared", "STOP_FORMWORK_REMAINING_PARENT_NOT_PREPARED");
    invariant(fallback?.status === "prepared", "STOP_FORMWORK_REMAINING_FALLBACK_NOT_PREPARED");
    const preparedRows = (await client.query(`select manifest.catalog_id,manifest.definition_version_id,
        definition.source_metadata,passport.decision,
        (select count(*)::int from public.estimate_parameter_definition p
          where p.definition_version_id=definition.id) parameters,
        (select count(*)::int from public.estimate_formula_graph f
          where f.definition_version_id=definition.id) formulas,
        (select count(*)::int from public.estimate_resource_spec r
          where r.definition_version_id=definition.id) resources
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      left join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      order by manifest.catalog_id`, [PARENT_RELEASE_ID, targetIds])).rows as Json[];
    const fallbackRows = (await client.query(`select manifest.*,
        definition.passport,definition.applicability,definition.source_metadata,passport.decision,
        (select count(*)::int from public.estimate_parameter_definition p
          where p.definition_version_id=definition.id) parameters,
        (select count(*)::int from public.estimate_formula_graph f
          where f.definition_version_id=definition.id) formulas,
        (select count(*)::int from public.estimate_resource_spec r
          where r.definition_version_id=definition.id) resources
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      left join public.estimate_content_passport_r3 passport on passport.definition_version_id=definition.id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      order by manifest.catalog_id`, [MEASUREMENT_FALLBACK_RELEASE_ID, targetIds])).rows as Json[];
    invariant(preparedRows.length === 21 && preparedRows.every((row) =>
      FORMWORK_REMAINING_FAMILY_CONTRACTS.includes(row.source_metadata?.contract)
      && row.decision?.status === "GREEN" && row.decision?.quantityScope === "FULL"
      && Number(row.parameters) === 52 && Number(row.formulas) === 20 && Number(row.resources) === 24),
    `STOP_FORMWORK_REMAINING_PREPARED_SHAPE:${JSON.stringify(preparedRows)}`);
    invariant(fallbackRows.length === 21 && fallbackRows.every((row) =>
      row.decision?.decisionKind === "GREEN_MEASUREMENT_ONLY"
      && row.decision?.fullWorkScopeComplete === false
      && Number(row.parameters) === 13 && Number(row.formulas) === 1 && Number(row.resources) === 2),
    `STOP_FORMWORK_REMAINING_FALLBACK_SHAPE:${JSON.stringify(fallbackRows)}`);
    const fallbackIds = fallbackRows.map((row) => String(row.definition_version_id));
    const nextCounts = {
      definitions: Number(parent.definition_count),
      parameters: Number(parent.parameter_count) - 21 * (52 - 13),
      formulas: Number(parent.formula_count) - 21 * (20 - 1),
      resources: Number(parent.resource_row_count) - 21 * (24 - 2),
    };
    const existing = (await client.query("select id,status from public.estimate_definition_release where id=$1", [
      releaseId,
    ])).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared", "STOP_FORMWORK_REMAINING_EXISTING_NOT_PREPARED");
      receipt = {
        status: "PARTIAL_REMAINING_FORMWORK_APPLICABILITY_CORRECTED_PREPARED_NOT_ACTIVE",
        idempotent: true,
        mutationPerformed: false,
        successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
        audit: await auditState(client, releaseId, searchReleaseId),
      };
    } else if (!APPLY) {
      receipt = {
        status: "DRY_RUN_REMAINING_FORMWORK_APPLICABILITY_CORRECTION_VALIDATED",
        idempotent: false,
        mutationPerformed: false,
        successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
        audit: {
          preparedTargets: preparedRows.map((row) => ({
            catalogId: row.catalog_id,
            definitionId: row.definition_version_id,
            shape: [Number(row.parameters), Number(row.formulas), Number(row.resources)],
          })),
          fallbackTargets: fallbackRows.map((row) => ({
            catalogId: row.catalog_id,
            definitionId: row.definition_version_id,
            shape: [Number(row.parameters), Number(row.formulas), Number(row.resources)],
          })),
        },
      };
    } else {
      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
            parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,
            metadata||$8::jsonb,$9,$10,$11,$12
          from public.estimate_definition_release where id=$9`, [
          releaseId, releaseKey, head, tree, sha256(`${CONTRACT}:${fingerprint}:draft`),
          nextCounts.definitions, nextCounts.resources,
          JSON.stringify({
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            lifecycle: "DRAFT_FORWARD_ONLY",
            correctedRemainingFormworkTargetCount: targetIds.length,
            retainedAcceptedPileCapTargetCount: 1,
            restoredFromReleaseId: MEASUREMENT_FALLBACK_RELEASE_ID,
            rejectedFamilyContracts: FORMWORK_REMAINING_FAMILY_CONTRACTS,
            activationAllowed: false,
            productionEligible: false,
            fullScopeOpenCatalogIds: targetIds,
          }),
          PARENT_RELEASE_ID, sha256({ contract: CONTRACT, fingerprint }),
          nextCounts.parameters, nextCounts.formulas,
        ]);
        await client.query(`insert into public.estimate_cumulative_manifest_entry(
            release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
            definition_hash,entry_sha256,runtime_publication_state)
          select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
            encode(extensions.digest(convert_to($2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),
            runtime_publication_state
          from public.estimate_cumulative_manifest_entry where release_id=$3`, [
          releaseId, CONTRACT, PARENT_RELEASE_ID,
        ]);
        await client.query(`update public.estimate_cumulative_manifest_entry target set
            definition_version_id=fallback.definition_version_id,source_batch=$3,
            source_release_id=fallback.source_release_id,publication_state='CANONICAL_SUCCESSOR',
            approved_template_baseline_id=fallback.approved_template_baseline_id,
            baseline_ready=fallback.baseline_ready,scenario_ready=fallback.scenario_ready,
            definition_hash=fallback.definition_hash,
            entry_sha256=encode(extensions.digest(convert_to(
              $3||':'||$1::uuid::text||':'||target.catalog_id||':'||fallback.entry_sha256,'UTF8'),'sha256'),'hex'),
            runtime_publication_state=fallback.runtime_publication_state
          from public.estimate_cumulative_manifest_entry fallback
          where target.release_id=$1 and fallback.release_id=$2
            and target.catalog_id=fallback.catalog_id and target.catalog_id=any($4::text[])`, [
          releaseId, MEASUREMENT_FALLBACK_RELEASE_ID, CONTRACT, targetIds,
        ]);
        const search = await cloneSearch(client, { releaseId, searchReleaseId, releaseKey, head, tree, fingerprint });
        const audit = await auditState(client, releaseId, searchReleaseId);
        invariant(Number(audit.manifest.identities) === nextCounts.definitions
          && Number(audit.manifest.corrected_targets) === 21
          && Number(audit.manifest.retained_accepted_pile_cap) === 1,
        `STOP_FORMWORK_REMAINING_MANIFEST_AUDIT:${JSON.stringify(audit.manifest)}`);
        invariant(audit.targets.length === 21 && audit.targets.every((row: Json) =>
          fallbackIds.includes(String(row.definition_version_id))
          && Number(row.parameters) === 13 && Number(row.formulas) === 1 && Number(row.resources) === 2
          && row.decision?.fullWorkScopeComplete === false),
        `STOP_FORMWORK_REMAINING_TARGET_AUDIT:${JSON.stringify(audit.targets)}`);
        invariant(Number(audit.search.corrected_targets) === 21
          && Number(audit.search.documents) === 10_322 && Number(audit.search.visible) === 10_322,
        `STOP_FORMWORK_REMAINING_SEARCH_AUDIT:${JSON.stringify(audit.search)}`);
        const unchanged = (await client.query(`select count(*)::int changed
          from public.estimate_cumulative_manifest_entry parent
          join public.estimate_cumulative_manifest_entry successor using(catalog_id)
          where parent.release_id=$1 and successor.release_id=$2
            and parent.catalog_id<>all($3::text[])
            and (parent.definition_version_id<>successor.definition_version_id
              or parent.source_batch<>successor.source_batch
              or parent.source_release_id<>successor.source_release_id
              or parent.approved_template_baseline_id<>successor.approved_template_baseline_id
              or parent.runtime_publication_state<>successor.runtime_publication_state)`, [
          PARENT_RELEASE_ID, releaseId, targetIds,
        ])).rows[0] as Json;
        invariant(Number(unchanged.changed) === 0,
          `STOP_FORMWORK_REMAINING_UNRELATED_MANIFEST_DRIFT:${unchanged.changed}`);
        await client.query(`update public.estimate_definition_release
          set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
            metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId,
          audit.manifest.snapshot,
          JSON.stringify({
            lifecycle: "PREPARED_NOT_ACTIVE",
            searchReleaseId,
            searchSnapshotSha256: search.snapshot_sha256,
            correctedRemainingFormworkTargetCount: 21,
            retainedAcceptedPileCapTargetCount: 1,
            applicabilityMatrixSha256: sha256(FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX),
            fullScopeOpenCatalogIds: targetIds,
          }),
        ]);
        await client.query("commit");
        receipt = {
          status: "PARTIAL_REMAINING_FORMWORK_APPLICABILITY_CORRECTED_PREPARED_NOT_ACTIVE",
          idempotent: false,
          mutationPerformed: true,
          predecessor: { releaseId: PARENT_RELEASE_ID, searchReleaseId: PARENT_SEARCH_RELEASE_ID },
          restoredMeasurementBaseline: {
            releaseId: MEASUREMENT_FALLBACK_RELEASE_ID,
            searchReleaseId: MEASUREMENT_FALLBACK_SEARCH_RELEASE_ID,
            targetDefinitionIds: fallbackIds,
          },
          successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
          audit: { ...audit, unrelatedManifestChanges: Number(unchanged.changed) },
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }

  const body = {
    schemaVersion: `${CONTRACT}.receipt.v1`,
    capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
    source: { branch: EXPECTED_BRANCH, head, tree, fingerprint, sourceHashes },
    masterSha256: MASTER_SHA256,
    rejectedFamilyContracts: FORMWORK_REMAINING_FAMILY_CONTRACTS,
    applicabilityMatrix: FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX,
    matrixSha256: sha256(FORMWORK_REMAINING_FAMILY_APPLICABILITY_MATRIX),
    acceptedFullProjectFixtureCount: 1,
    acceptedFullProjectFixtureCatalogId: ACCEPTED_PILE_CAP_CATALOG_ID,
    openFullScopeTargetCount: 21,
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
    otaPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && receipt!.mutationPerformed === true) {
    atomicJson(resolve(OUTPUT_ROOT, `01_FORMWORK_REMAINING_APPLICABILITY_${head}.json`), sealed);
    atomicJson(resolve(OUTPUT_ROOT, "acceptance.json"), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      currentRuntimeDefinitions: 10_331,
      owner: "FORMWORK_REMAINING_FAMILY_APPLICABILITY_CORRECTION_SUCCESSOR",
      productionAccessed: false,
      fakeGreenClaimed: false,
    });
  }
  process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
