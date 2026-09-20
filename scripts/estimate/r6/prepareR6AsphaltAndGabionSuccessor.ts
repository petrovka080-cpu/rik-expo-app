import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { asphaltRelatedAdmissionPolicyR6 } from "../../../src/lib/estimate/v4/asphalt/asphaltRelatedAdmissionR6";
import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { buildRoadworksWaveAAdmissionLedgerR6 } from "../../../src/lib/estimate/v4/roadworks";
import { restoredR6AsphaltRelatedInclusionAst } from "./asphaltRelatedConditionalInclusionR6";

type Json = Record<string, any>;

type DefinitionPlan = {
  kind: "ASPHALT_WAVE_A" | "ASPHALT_RELATED" | "GABION";
  canonicalTechnologyId: string;
  targetCatalogId: string;
  sourceCatalogId: string;
  sourceDefinitionId: string;
  currentDefinitionId: string;
  currentBaselineId: string;
  definitionId: string;
  baselineId: string;
  definitionVersion: number;
};

const CONTRACT = "rik-expo-app.r4-a13-6.real-ui-canonical-calculation-full-acceptance.v1";
const MASTER_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R6_REAL_UI_CANONICAL_CALCULATION_FULL_ACCEPTANCE_RU (1).md");
const MASTER_SHA256 = "3c5cee79c113009a8ca2ded90436f24571c28ebb0ee7c368a23b0586b0b4fb82";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const R555_SOURCE_RELEASE_ID = "fe1357b1-d031-5011-8016-f03cb77916ab";
const GABION_CATALOG_ID = "canonical-work:expanded:gabion_wall";
const PRESERVED_DRAINAGE_TECHNOLOGY_ID = "paving_roads_landscape_interior_asphalt_drain_large_area";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/asphalt-gabion-successor");
const SOURCE_PATHS = [
  "scripts/estimate/r6/asphaltRelatedConditionalInclusionR6.ts",
  "scripts/estimate/r6/asphaltWaveAAdmissionSuccessorR6.ts",
  "scripts/estimate/r6/prepareR6AsphaltAndGabionSuccessor.ts",
  "scripts/estimate/r6/roadworksWaveA4035105Ledger.ts",
  "src/lib/estimate/backendPlatform/formulaGraph.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.ts",
  "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
  "src/features/consumerRepair/consumerCanonicalParameterEditor.ts",
  "src/lib/consumerRequests/consumerRequestRepository.ts",
  "src/lib/consumerRequests/consumerRequestService.ts",
  "src/lib/estimate/v4/asphalt/asphaltRelatedAdmissionR6.ts",
  "src/lib/estimate/v4/asphalt/compileAsphaltRelatedProfessionalEstimateV4.ts",
  "src/lib/estimate/v4/roadworks/roadworksWaveAAdmissionR6.ts",
  "src/lib/estimate/v4/roadworks/roadworksWaveAProductionBinding.ts",
] as const;

const GABION_FORMULA_SOURCE = Object.freeze({
  retainingWallCalculator_gabion_tie_wire_spacers_set_formula_v1:
    "is_gabion ? ceil((length_m * height_m * thickness_m) / 25) : 0",
  retainingWallCalculator_gabion_drainage_pipe_lm_formula_v1:
    "is_gabion ? length_m : 0",
  retainingWallCalculator_gabion_base_preparation_m2_formula_v1:
    "is_gabion ? length_m * (thickness_m + 0.4) : 0",
  retainingWallCalculator_gabion_backfill_compaction_m3_formula_v1:
    "is_gabion ? (length_m * height_m * thickness_m) * 0.25 : 0",
});
const GABION_ROW_IDS = new Set([
  "gabion_tie_wire_spacers_set",
  "gabion_drainage_pipe_lm",
  "gabion_base_preparation_m2",
  "gabion_backfill_compaction_m3",
]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function sha256(value: unknown): string {
  const bytes = typeof value === "string" || Buffer.isBuffer(value)
    ? value
    : JSON.stringify(stable(value));
  return createHash("sha256").update(bytes).digest("hex");
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
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname), `STOP_R6_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_R6_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function insertRows(client: Client, table: string, columns: readonly string[], rows: readonly unknown[][]): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    if (batch.length === 0) continue;
    const values: unknown[] = [];
    const tuples = batch.map((row) => `(${row.map((value) => {
      values.push(value);
      return `$${values.length}`;
    }).join(",")})`);
    await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
  }
}

function asphaltTargetCatalogId(source: Json): string {
  const technology = String(source.canonical_technology_id);
  if (technology.startsWith("paving_roads_landscape_interior_asphalt_")) {
    return `canonical-work:base:${technology}`;
  }
  if (technology === "asphalt_concrete_pavement" || technology === "bridge_asphalt") {
    return `canonical-work:expanded:${technology}`;
  }
  return String(source.catalog_id);
}

function gabionPolicy(parameterId: string): {
  visibilityRole: "USER_INPUT";
  valueSourceRole: "USER_MEASURED" | "PROJECT_DOCUMENTATION";
  guideKind: "MEASUREMENT_RULE" | "PROJECT_DEFINED" | "ENUM_DECISION_RULE";
  requiresSourceConfirmation: false;
} {
  const measured = ["length_m", "height_m", "thickness_m"].includes(parameterId);
  return {
    visibilityRole: "USER_INPUT",
    valueSourceRole: measured ? "USER_MEASURED" : "PROJECT_DOCUMENTATION",
    guideKind: parameterId === "is_gabion" ? "ENUM_DECISION_RULE" : measured ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
    requiresSourceConfirmation: false,
  };
}

function parameterPolicy(plan: DefinitionPlan, parameterId: string): Json {
  if (plan.kind === "ASPHALT_WAVE_A") {
    const policy = buildRoadworksWaveAAdmissionLedgerR6(plan.canonicalTechnologyId)
      .find((entry) => entry.parameterId === parameterId);
    invariant(policy, `STOP_R6_WAVE_A_PARAMETER_POLICY_MISSING:${plan.targetCatalogId}:${parameterId}`);
    return policy;
  }
  if (plan.kind === "ASPHALT_RELATED") return asphaltRelatedAdmissionPolicyR6(parameterId);
  return gabionPolicy(parameterId);
}

function classificationFor(plan: DefinitionPlan, parameterId: string): "DERIVED" | "VALIDATION_FIXTURE" {
  const policy = parameterPolicy(plan, parameterId);
  return policy.baselineClassification === "DERIVED" ? "DERIVED" : "VALIDATION_FIXTURE";
}

function guideTruth(input: {
  plan: DefinitionPlan;
  parameterId: string;
  titleRu: string;
  sourceTruth: Json;
  formulaConsumers: readonly string[];
  resourceConsumers: readonly string[];
  fingerprint: string;
}): Json {
  const policy = parameterPolicy(input.plan, input.parameterId);
  const visibilityRole = policy.visibilityRole ?? "USER_INPUT";
  const valueSourceRole = policy.valueSourceRole ?? "PROJECT_DOCUMENTATION";
  const guideKind = policy.guideKind ?? "PROJECT_DEFINED";
  return {
    ...input.sourceTruth,
    contract: CONTRACT,
    semantic_parameter_key: `${input.plan.targetCatalogId}:${input.parameterId}`,
    visibility_role: visibilityRole,
    value_source_role: valueSourceRole,
    preliminary_compilation_allowed: visibilityRole === "USER_INPUT",
    source_confirmation_required: policy.requiresSourceConfirmation === true,
    formula_consumers: input.formulaConsumers,
    resource_branch_consumers: input.resourceConsumers,
    guide: {
      guide_kind: guideKind,
      guide_short_ru: input.titleRu,
      guide_validation_policy: policy.requiresSourceConfirmation === true ? "PROVENANCE_REQUIRED" : "INFORMATION_ONLY",
      source_role: valueSourceRole,
      guide_version: CONTRACT,
      source_snapshot_hash: sha256({
        fingerprint: input.fingerprint,
        catalogId: input.plan.targetCatalogId,
        parameterId: input.parameterId,
        guideKind,
      }),
      applicability: input.plan.targetCatalogId,
      verified_at: "2026-09-10",
    },
    provenance: {
      ...(input.sourceTruth.provenance ?? {}),
      r6CurrentTargetDefinitionId: input.plan.currentDefinitionId,
      r6AdoptedContentDefinitionId: input.plan.sourceDefinitionId,
    },
  };
}

function appendUnique(map: Json, key: string, values: readonly string[]): void {
  map[key] = [...new Set([...(Array.isArray(map[key]) ? map[key] : []), ...values])].sort();
}

async function buildPlans(client: Client, input: {
  parentReleaseId: string;
  fingerprint: string;
}): Promise<{ plans: DefinitionPlan[]; preservedDrainage: Json; routeWrappers: Json[] }> {
  const sources = (await client.query(`select manifest.catalog_id,definition.id::text definition_id,
      coalesce(definition.passport->>'canonicalTechnologyId',definition.source_metadata->>'canonicalTechnologyId') canonical_technology_id
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    where manifest.release_id=$1 and definition.source_metadata->>'contract'='r555.single-canonical-asphalt-r63-m44-a19.v1'
    order by manifest.catalog_id`, [R555_SOURCE_RELEASE_ID])).rows as Json[];
  invariant(sources.length === 44, `STOP_R6_R555_ASPHALT_OWNER_COUNT:${sources.length}`);

  const parentRelease = (await client.query(`select metadata from public.estimate_definition_release where id=$1`, [
    input.parentReleaseId,
  ])).rows[0] as Json | undefined;
  invariant(parentRelease, `STOP_R6_PARENT_RELEASE_MISSING:${input.parentReleaseId}`);
  const parentIsR6 = parentRelease.metadata?.contract === CONTRACT;

  const asphaltSources = sources.filter((source) => source.canonical_technology_id !== PRESERVED_DRAINAGE_TECHNOLOGY_ID);
  invariant(asphaltSources.length === 43, `STOP_R6_REPLACED_ASPHALT_OWNER_COUNT:${asphaltSources.length}`);
  const targets = [...new Set([...asphaltSources.map(asphaltTargetCatalogId), GABION_CATALOG_ID])];
  invariant(targets.length === 44, `STOP_R6_MUTATED_TARGET_COUNT:${targets.length}`);
  const currentRows = (await client.query(`select manifest.catalog_id,manifest.definition_version_id::text current_definition_id,
      manifest.approved_template_baseline_id::text current_baseline_id,
      definition.definition_version,
      (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameter_count,
      (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formula_count,
      (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resource_count
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])`, [input.parentReleaseId, targets])).rows as Json[];
  invariant(currentRows.length === targets.length, `STOP_R6_CURRENT_TARGETS_MISSING:${currentRows.length}:${targets.length}`);
  const currentByCatalog = new Map(currentRows.map((row) => [String(row.catalog_id), row]));

  const plans: DefinitionPlan[] = asphaltSources.map((source) => {
    const targetCatalogId = asphaltTargetCatalogId(source);
    const current = currentByCatalog.get(targetCatalogId);
    invariant(current?.current_baseline_id, `STOP_R6_CURRENT_BASELINE_MISSING:${targetCatalogId}`);
    const technology = String(source.canonical_technology_id);
    return {
      kind: technology.startsWith("paving_roads_landscape_interior_asphalt_") ? "ASPHALT_WAVE_A" : "ASPHALT_RELATED",
      canonicalTechnologyId: technology,
      targetCatalogId,
      sourceCatalogId: parentIsR6 ? targetCatalogId : String(source.catalog_id),
      // Once an R6 candidate exists it becomes the forward-only source. This
      // keeps later definition repairs instead of regenerating from R555.
      sourceDefinitionId: parentIsR6
        ? String(current.current_definition_id)
        : String(source.definition_id),
      currentDefinitionId: String(current.current_definition_id),
      currentBaselineId: String(current.current_baseline_id),
      definitionId: uuid(`${CONTRACT}:${input.fingerprint}:definition:${targetCatalogId}`),
      baselineId: uuid(`${CONTRACT}:${input.fingerprint}:baseline:${targetCatalogId}`),
      definitionVersion: Number(current.definition_version) + 1,
    } satisfies DefinitionPlan;
  });
  const gabionCurrent = currentByCatalog.get(GABION_CATALOG_ID);
  invariant(gabionCurrent?.current_baseline_id, "STOP_R6_GABION_CURRENT_BASELINE_MISSING");
  plans.push({
    kind: "GABION",
    canonicalTechnologyId: "gabion_wall",
    targetCatalogId: GABION_CATALOG_ID,
    sourceCatalogId: GABION_CATALOG_ID,
    sourceDefinitionId: String(gabionCurrent.current_definition_id),
    currentDefinitionId: String(gabionCurrent.current_definition_id),
    currentBaselineId: String(gabionCurrent.current_baseline_id),
    definitionId: uuid(`${CONTRACT}:${input.fingerprint}:definition:${GABION_CATALOG_ID}`),
    baselineId: uuid(`${CONTRACT}:${input.fingerprint}:baseline:${GABION_CATALOG_ID}`),
    definitionVersion: Number(gabionCurrent.definition_version) + 1,
  });

  const preservedDrainage = (await client.query(`select manifest.catalog_id,manifest.definition_version_id::text definition_id,
      definition.definition_version,
      (select count(*)::int from public.estimate_parameter_definition p where p.definition_version_id=definition.id) parameter_count,
      (select count(*)::int from public.estimate_formula_graph f where f.definition_version_id=definition.id) formula_count,
      (select count(*)::int from public.estimate_resource_spec r where r.definition_version_id=definition.id) resource_count
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=$2`, [
    input.parentReleaseId,
    `canonical-work:base:${PRESERVED_DRAINAGE_TECHNOLOGY_ID}`,
  ])).rows[0] as Json | undefined;
  invariant(preservedDrainage && Number(preservedDrainage.parameter_count) === 64
    && Number(preservedDrainage.formula_count) === 38 && Number(preservedDrainage.resource_count) === 63,
  "STOP_R6_LATE_DRAINAGE_FIX_NOT_PRESERVED");
  const routeWrappers = (await client.query(`select manifest.catalog_id,manifest.definition_version_id::text definition_id
    from public.estimate_cumulative_manifest_entry manifest where manifest.release_id=$1
      and manifest.catalog_id in ('canonical-work:expanded:road_construction','canonical-work:expanded:village_road_construction')
    order by manifest.catalog_id`, [input.parentReleaseId])).rows as Json[];
  invariant(routeWrappers.length === 2, `STOP_R6_ASPHALT_ROUTE_WRAPPER_COUNT:${routeWrappers.length}`);
  return { plans: plans.sort((a, b) => a.targetCatalogId.localeCompare(b.targetCatalogId)), preservedDrainage, routeWrappers };
}

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  parentSearchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
  targetCatalogIds: readonly string[];
}): Promise<Json> {
  await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata)
    select $1,$2,'draft',taxonomy_version,group_relation_version,ranking_contract_version,
      $3,$4,$5,global_count,external_count,discovered_count,
      metadata||jsonb_build_object('contract',$6::text,'parentSearchReleaseId',$7::uuid::text,
        'definitionReleaseId',$8::uuid::text,'sourceFingerprint',$9::text,
        'lifecycle','FROZEN_NOT_ACTIVE','activationAllowed',false,'productionEligible',false)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, input.parentSearchReleaseId,
    input.releaseId, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [input.searchReleaseId, input.parentSearchReleaseId]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [input.searchReleaseId, input.parentSearchReleaseId]);
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
        'parentSearchReleaseId',$4::uuid::text,'definitionReleaseId',$2::uuid::text,'sourceFingerprint',$5::text),
      encode(extensions.digest(convert_to(source.document_sha256||':'||$3||':'||$2::uuid::text,'UTF8'),'sha256'),'hex'),
      source.adjudication_class,source.selectable,source.canonical_target_catalog_id,manifest.definition_version_id
    from public.estimate_search_document source
    join public.estimate_cumulative_manifest_entry manifest on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId, input.releaseId, CONTRACT, input.parentSearchReleaseId, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [input.searchReleaseId, input.parentSearchReleaseId]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [input.searchReleaseId, input.parentSearchReleaseId]);

  await client.query(`with parameter_cards as (
      select manifest.catalog_id,count(*) filter(where parameter.required and parameter.truth_metadata->>'visibility_role'='USER_INPUT')::int required_count,
        coalesce(jsonb_agg(jsonb_build_object('parameterId',parameter.parameter_id,'titleRu',parameter.title_ru,
          'unitId',parameter.unit_id,'required',parameter.required,'guide',parameter.truth_metadata->'guide') order by parameter.ordinal)
          filter(where parameter.truth_metadata->>'visibility_role'='USER_INPUT'),'[]'::jsonb) fields
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_parameter_definition parameter on parameter.definition_version_id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      group by manifest.catalog_id)
    update public.estimate_search_document document set required_inputs_count=parameter_cards.required_count,
      clarification_fields=parameter_cards.fields,
      source_provenance=document.source_provenance||jsonb_build_object('r6NoHiddenAsphaltInputs',true),
      document_sha256=encode(extensions.digest(convert_to(document.document_sha256||':'||parameter_cards.fields::text,'UTF8'),'sha256'),'hex')
    from parameter_cards where document.search_release_id=$3 and document.catalog_id=parameter_cards.catalog_id`, [
    input.releaseId, input.targetCatalogIds, input.searchReleaseId,
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
      asphaltCatalogRecords: 63,
      asphaltTechnologyOwners: 44,
      asphaltAliases: 19,
      currentAsphaltDefinitionEntries: 46,
      changedDefinitionEntries: input.targetCatalogIds.length,
    }),
  ]);
  return snapshot;
}

async function materializeDefinition(client: Client, input: {
  plan: DefinitionPlan;
  releaseId: string;
  fingerprint: string;
  head: string;
  tree: string;
}): Promise<{ parameterCount: number; formulaCount: number; resourceCount: number; definitionSha256: string; restoredConditionalResourceCount: number }> {
  const { plan } = input;
  const sourceDefinition = (await client.query(`select * from public.estimate_definition_version where id=$1`, [plan.sourceDefinitionId])).rows[0] as Json | undefined;
  invariant(sourceDefinition, `STOP_R6_SOURCE_DEFINITION_MISSING:${plan.sourceDefinitionId}`);
  const sourceParameters = (await client.query(`select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal`, [plan.sourceDefinitionId])).rows as Json[];
  const sourceFormulas = (await client.query(`select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id`, [plan.sourceDefinitionId])).rows as Json[];
  const sourceResources = (await client.query(`select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal,row_id`, [plan.sourceDefinitionId])).rows as Json[];
  const sourceBaseline = (await client.query(`select * from public.estimate_approved_template_baseline
    where definition_version_id=$1 order by accepted_at desc limit 1`, [plan.sourceDefinitionId])).rows[0] as Json | undefined;
  const contentPassport = (await client.query(`select * from public.estimate_content_passport_r3 where definition_version_id=$1`, [plan.sourceDefinitionId])).rows[0] as Json | undefined;
  invariant(sourceParameters.length > 0 && sourceFormulas.length > 0 && sourceResources.length > 0,
    `STOP_R6_SOURCE_CONTENT_EMPTY:${plan.targetCatalogId}`);
  invariant(sourceBaseline, `STOP_R6_SOURCE_BASELINE_MISSING:${plan.targetCatalogId}`);
  invariant(contentPassport, `STOP_R6_SOURCE_CONTENT_PASSPORT_MISSING:${plan.targetCatalogId}`);
  const operationCount = Number((await client.query(`select count(*)::int value from public.estimate_operation_definition where definition_version_id=$1`, [plan.sourceDefinitionId])).rows[0].value);
  const normativeCount = Number((await client.query(`select count(*)::int value from public.estimate_work_normative_binding where definition_version_id=$1`, [plan.sourceDefinitionId])).rows[0].value);
  invariant(operationCount === 0 && normativeCount === 0, `STOP_R6_UNCLONED_SOURCE_BINDINGS:${plan.targetCatalogId}:${operationCount}:${normativeCount}`);

  const formulas: Json[] = sourceFormulas.map((formula): Json => {
    const replacement = plan.kind === "GABION"
      ? GABION_FORMULA_SOURCE[formula.formula_id as keyof typeof GABION_FORMULA_SOURCE]
      : null;
    if (!replacement) return { ...formula };
    const compiled = compileFormulaGraph(replacement);
    return {
      ...formula,
      expression_source: replacement,
      ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: sha256(compiled.ast),
    };
  });
  const restoredConditionalByRow = new Map<string, ReturnType<typeof restoredR6AsphaltRelatedInclusionAst>>();
  const resources: Json[] = sourceResources.map((resource): Json => {
    const candidateRestored = restoredR6AsphaltRelatedInclusionAst({
      kind: plan.kind,
      applicabilityRu: resource.resource_graph?.applicabilityRu,
      inherited: resource.inclusion_ast,
    });
    const controllerExists = candidateRestored.controllingParameterId == null
      || sourceParameters.some((parameter) => parameter.parameter_id === candidateRestored.controllingParameterId);
    // The dedicated asphalt_milling owner is intrinsically the cold-milling
    // branch and therefore has no removal_method selector. Its copied
    // applicability note is descriptive, not a runtime condition.
    const intrinsicColdMilling = plan.canonicalTechnologyId === "asphalt_milling"
      && candidateRestored.controllingParameterId === "removal_method"
      && candidateRestored.expectedValue === "COLD_MILLING";
    invariant(controllerExists || intrinsicColdMilling,
      `STOP_R6_RESTORED_CONTROLLER_MISSING:${plan.targetCatalogId}:${resource.row_id}:${candidateRestored.controllingParameterId}`);
    const restored = controllerExists
      ? candidateRestored
      : { ast: resource.inclusion_ast, controllingParameterId: null, expectedValue: null };
    if (restored.controllingParameterId) restoredConditionalByRow.set(String(resource.row_id), restored);
    return {
      ...resource,
      id: uuid(`${CONTRACT}:${input.fingerprint}:resource:${plan.targetCatalogId}:${resource.row_id}`),
      definition_version_id: plan.definitionId,
      inclusion_ast: plan.kind === "GABION" && GABION_ROW_IDS.has(resource.row_id)
        ? { kind: "parameter", id: "is_gabion" }
        : restored.ast,
      source_metadata: {
        ...(resource.source_metadata ?? {}),
        contract: CONTRACT,
        sourceDefinitionId: plan.sourceDefinitionId,
        sourceCatalogId: plan.sourceCatalogId,
        targetCatalogId: plan.targetCatalogId,
        ...(restored.controllingParameterId
          ? {
            r6ConditionalDependencyRestored: {
              parameterId: restored.controllingParameterId,
              expectedValue: restored.expectedValue,
            },
          }
          : {}),
        ...(plan.kind === "GABION" && GABION_ROW_IDS.has(resource.row_id)
          ? { r6ConditionalDependencyRestored: { parameterId: "is_gabion", expectedValue: true } }
          : {}),
      },
    };
  });
  for (const resource of resources) {
    resource.row_sha256 = sha256({
      rowId: resource.row_id,
      formulaId: resource.formula_id,
      inclusionAst: resource.inclusion_ast,
      resourceGraph: resource.resource_graph,
      sourceMetadata: resource.source_metadata,
    });
  }

  const parameters: Json[] = sourceParameters.map((parameter): Json => ({ ...parameter }));
  const formulaConsumers = { ...(sourceBaseline.formula_consumer_ids ?? {}) } as Json;
  const resourceConsumers = { ...(sourceBaseline.resource_consumer_row_ids ?? {}) } as Json;
  for (const [rowId, restored] of restoredConditionalByRow) {
    invariant(sourceParameters.some((parameter) => parameter.parameter_id === restored.controllingParameterId),
      `STOP_R6_RESTORED_CONTROLLER_MISSING:${plan.targetCatalogId}:${rowId}:${restored.controllingParameterId}`);
    appendUnique(resourceConsumers, restored.controllingParameterId!, [rowId]);
  }
  if (plan.kind === "GABION") {
    for (const [formulaId, expression] of Object.entries(GABION_FORMULA_SOURCE)) {
      const compiled = compileFormulaGraph(expression);
      for (const parameterId of compiled.inputParameterIds) appendUnique(formulaConsumers, parameterId, [formulaId]);
      const rowId = resources.find((resource) => resource.formula_id === formulaId)?.row_id;
      invariant(rowId, `STOP_R6_GABION_FORMULA_RESOURCE_MISSING:${formulaId}`);
      for (const parameterId of compiled.inputParameterIds) appendUnique(resourceConsumers, parameterId, [rowId]);
    }
    appendUnique(resourceConsumers, "is_gabion", [...GABION_ROW_IDS]);
  }

  if (plan.kind === "GABION" && !parameters.some((parameter) => parameter.parameter_id === "is_gabion")) {
    parameters.push({
      definition_version_id: plan.definitionId,
      parameter_id: "is_gabion",
      ordinal: Math.max(...parameters.map((parameter) => Number(parameter.ordinal))) + 1,
      value_type: "boolean",
      unit_id: null,
      title_ru: "Выбрана габионная конструкция",
      required: true,
      default_value: null,
      constraints_json: { values: [true, false] },
      truth_metadata: {},
      approved_template_baseline_id: plan.baselineId,
    });
  }
  const parameterRows: Json[] = parameters.map((parameter): Json => {
    const truth = guideTruth({
      plan,
      parameterId: parameter.parameter_id,
      titleRu: parameter.title_ru,
      sourceTruth: parameter.truth_metadata ?? {},
      formulaConsumers: formulaConsumers[parameter.parameter_id] ?? [],
      resourceConsumers: resourceConsumers[parameter.parameter_id] ?? [],
      fingerprint: input.fingerprint,
    });
    return {
      ...parameter,
      definition_version_id: plan.definitionId,
      default_value: null,
      truth_metadata: truth,
      approved_template_baseline_id: plan.baselineId,
    };
  });

  const inputValues = { ...(sourceBaseline.input_values ?? {}) } as Json;
  if (plan.kind === "GABION") inputValues.is_gabion = true;
  const inputClassification = Object.fromEntries(Object.keys(inputValues).map((parameterId) => [
    parameterId,
    classificationFor(plan, parameterId),
  ]));
  const uomByParameter = { ...(sourceBaseline.uom_by_parameter ?? {}) } as Json;
  if (plan.kind === "GABION") uomByParameter.is_gabion = null;
  const normativeSourceIds = { ...(sourceBaseline.normative_source_ids ?? {}) } as Json;
  if (plan.kind === "GABION") normativeSourceIds.is_gabion = [CONTRACT];
  const guideProvenanceRu = { ...(sourceBaseline.guide_provenance_ru ?? {}) } as Json;
  if (plan.kind === "GABION") guideProvenanceRu.is_gabion = "Выберите «да» только для габионной стены; без выбора расчёт не выполняется.";
  const parameterSchemaSha256 = sha256(parameterRows.map((parameter) => ({
    id: parameter.parameter_id,
    valueType: parameter.value_type,
    unitId: parameter.unit_id,
    required: parameter.required,
    constraints: parameter.constraints_json,
    truth: parameter.truth_metadata,
  })));
  const definitionSha256 = sha256({
    contract: CONTRACT,
    targetCatalogId: plan.targetCatalogId,
    sourceDefinitionId: plan.sourceDefinitionId,
    parameters: parameterRows.map((parameter) => [parameter.parameter_id, parameter.value_type, parameter.required, parameter.truth_metadata]),
    formulas: formulas.map((formula) => [formula.formula_id, formula.expression_source, formula.ast, formula.input_parameter_ids]),
    resources: resources.map((resource) => [resource.row_id, resource.formula_id, resource.inclusion_ast, resource.row_sha256]),
  });
  const acceptanceEvidenceSha256 = sha256({
    definitionSha256,
    parameterSchemaSha256,
    classification: inputClassification,
    noRuntimeAssumptions: true,
  });

  await client.query(`insert into public.estimate_definition_version(
      id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
      source_metadata,content_status,content_gate_status)
    values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
    plan.definitionId,
    input.releaseId,
    plan.targetCatalogId,
    plan.definitionVersion,
    JSON.stringify({ ...(sourceDefinition.passport ?? {}), catalogId: plan.targetCatalogId, contract: CONTRACT }),
    JSON.stringify(sourceDefinition.applicability ?? {}),
    definitionSha256,
    JSON.stringify({
      ...(sourceDefinition.source_metadata ?? {}),
      contract: CONTRACT,
      r6CurrentTargetDefinitionId: plan.currentDefinitionId,
      r6AdoptedContentDefinitionId: plan.sourceDefinitionId,
      r6SourceCatalogId: plan.sourceCatalogId,
      noHiddenRuntimeAssumptions: true,
      ...(plan.kind === "GABION" ? { conditionalDependencyRestored: [...GABION_ROW_IDS] } : {}),
    }),
  ]);
  await insertRows(client, "estimate_parameter_definition", [
    "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
    "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
  ], parameterRows.map((parameter) => [
    plan.definitionId, parameter.parameter_id, parameter.ordinal, parameter.value_type, parameter.unit_id,
    parameter.title_ru, parameter.required, null, parameter.constraints_json, parameter.truth_metadata, null,
  ]));
  await insertRows(client, "estimate_formula_graph", [
    "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast", "input_parameter_ids", "ast_sha256",
  ], formulas.map((formula) => [
    plan.definitionId, formula.formula_id, formula.output_unit_id, formula.expression_source,
    formula.ast, formula.input_parameter_ids, formula.ast_sha256,
  ]));
  await insertRows(client, "estimate_resource_spec", [
    "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
    "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
    "procurement_eligible", "source_metadata", "row_sha256",
  ], resources.map((resource) => [
    resource.id, plan.definitionId, resource.row_id, resource.ordinal, resource.section, resource.category,
    resource.title_ru, resource.row_type, resource.unit_id, resource.formula_id, resource.inclusion_ast,
    resource.resource_graph, resource.semantic_owner, resource.cost_owner_id, resource.procurement_eligible,
    resource.source_metadata, resource.row_sha256,
  ]));
  const sourcePriceBindings = (await client.query(`select resource.row_id,binding.route_id::text route_id,
      binding.price_key,binding.priority from public.estimate_resource_spec resource
    join public.estimate_resource_price_route_binding binding on binding.resource_spec_id=resource.id
    where resource.definition_version_id=$1 order by resource.row_id,binding.priority`, [plan.sourceDefinitionId])).rows as Json[];
  invariant(sourcePriceBindings.length === sourceResources.length,
    `STOP_R6_PRICE_BINDING_COUNT:${plan.targetCatalogId}:${sourcePriceBindings.length}:${sourceResources.length}`);
  const resourceIdByRow = new Map(resources.map((resource) => [String(resource.row_id), String(resource.id)]));
  await insertRows(client, "estimate_resource_price_route_binding", [
    "resource_spec_id", "route_id", "price_key", "priority",
  ], sourcePriceBindings.map((binding) => [
    resourceIdByRow.get(binding.row_id), binding.route_id, binding.price_key, binding.priority,
  ]));
  await client.query(`insert into public.estimate_approved_template_baseline(
      id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
      input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
      normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
      acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
    values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,
      $13::jsonb,$14::jsonb,$15::jsonb,$16,$17,clock_timestamp(),$18,'APPROVED_TEMPLATE_BASELINE_R54_V1')`, [
    plan.baselineId,
    `${CONTRACT}:${input.fingerprint.slice(0, 16)}:${plan.targetCatalogId}`,
    plan.targetCatalogId,
    plan.definitionId,
    plan.sourceDefinitionId,
    parameterSchemaSha256,
    JSON.stringify(inputValues),
    JSON.stringify(inputClassification),
    JSON.stringify(uomByParameter),
    JSON.stringify(formulaConsumers),
    JSON.stringify(resourceConsumers),
    JSON.stringify(normativeSourceIds),
    JSON.stringify(guideProvenanceRu),
    JSON.stringify([
      ...(Array.isArray(sourceBaseline.proposal_source_refs) ? sourceBaseline.proposal_source_refs : []),
      { contract: CONTRACT, currentTargetDefinitionId: plan.currentDefinitionId, adoptedContentDefinitionId: plan.sourceDefinitionId },
    ]),
    JSON.stringify([
      ...(Array.isArray(sourceBaseline.validation_scenario_refs) ? sourceBaseline.validation_scenario_refs : []),
      { scenario: "R6_NO_HIDDEN_RUNTIME_ASSUMPTIONS", acceptanceEvidenceSha256 },
    ]),
    acceptanceEvidenceSha256,
    input.releaseId,
    plan.currentBaselineId,
  ]);
  await client.query(`update public.estimate_parameter_definition set approved_template_baseline_id=$2
    where definition_version_id=$1 and approved_template_baseline_id is null`, [plan.definitionId, plan.baselineId]);
  await client.query(`insert into public.estimate_content_passport_r3(
      definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
      physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
      formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
    values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14::jsonb,$15,$16,$17)`, [
    plan.definitionId,
    input.releaseId,
    plan.targetCatalogId,
    contentPassport.contract_version,
    contentPassport.identity_mode,
    contentPassport.redirect_catalog_id,
    contentPassport.physical_result_ru,
    JSON.stringify(contentPassport.included_scope_ru ?? []),
    JSON.stringify(contentPassport.excluded_scope_ru ?? []),
    JSON.stringify(contentPassport.capability_matrix ?? {}),
    parameterRows.length,
    formulas.length,
    resources.length,
    JSON.stringify({ ...(contentPassport.decision ?? {}), allowed: true, r6Admission: "GREEN" }),
    sha256({ source: contentPassport.payload_sha256, definitionSha256, parameterSchemaSha256 }),
    input.head,
    input.tree,
  ]);
  await client.query(`update public.estimate_definition_version set
      content_status='CANDIDATE_READY',content_gate_status='GREEN'
    where id=$1 and content_status='QUARANTINED' and content_gate_status='RED'`, [plan.definitionId]);
  await client.query(`update public.estimate_cumulative_manifest_entry set
      definition_version_id=$3,source_batch=$4,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
      approved_template_baseline_id=$5,baseline_ready=true,scenario_ready=true,definition_hash=$6,
      entry_sha256=$7,runtime_publication_state='CANDIDATE'
    where release_id=$1 and catalog_id=$2`, [
    input.releaseId,
    plan.targetCatalogId,
    plan.definitionId,
    CONTRACT,
    plan.baselineId,
    definitionSha256,
    sha256({ contract: CONTRACT, releaseId: input.releaseId, catalogId: plan.targetCatalogId, definitionId: plan.definitionId, definitionSha256 }),
  ]);
  return {
    parameterCount: parameterRows.length,
    formulaCount: formulas.length,
    resourceCount: resources.length,
    definitionSha256,
    restoredConditionalResourceCount: restoredConditionalByRow.size,
  };
}

async function auditCandidate(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  plans: readonly DefinitionPlan[];
  preservedDrainageDefinitionId: string;
}): Promise<Json> {
  const targetIds = input.plans.map((plan) => plan.targetCatalogId);
  const manifest = (await client.query(`select count(*)::int identities,
      count(*) filter(where catalog_id=any($2::text[]))::int changed,
      count(*) filter(where baseline_ready and scenario_ready)::int ready,
      encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [input.releaseId, targetIds])).rows[0] as Json;
  const parameterAudit = (await client.query(`select count(*)::int parameters,
      count(*) filter(where parameter.default_value is not null)::int defaults,
      count(*) filter(where parameter.truth_metadata->>'visibility_role'='USER_INPUT')::int user_inputs,
      count(*) filter(where parameter.truth_metadata->>'visibility_role'='USER_DERIVED_READONLY')::int derived_inputs,
      count(*) filter(where coalesce(parameter.truth_metadata->'guide'->>'guide_short_ru','')='')::int guide_gaps
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_parameter_definition parameter on parameter.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])`, [input.releaseId, targetIds])).rows[0] as Json;
  const baselineAudit = (await client.query(`select count(*)::int baselines,
      coalesce(sum((select count(*) from jsonb_each_text(baseline.input_classification)
        where value not in ('DERIVED','VALIDATION_FIXTURE'))),0)::int unauthorized_classifications,
      coalesce(sum((select count(*) from jsonb_each_text(baseline.input_classification)
        where value='VALIDATION_FIXTURE')),0)::int fixture_values,
      coalesce(sum((select count(*) from jsonb_each_text(baseline.input_classification)
        where value='DERIVED')),0)::int derived_values
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_approved_template_baseline baseline on baseline.id=manifest.approved_template_baseline_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])`, [input.releaseId, targetIds])).rows[0] as Json;
  const formulaRows = (await client.query(`select manifest.catalog_id,formula.formula_id,formula.expression_source,
      formula.ast,formula.input_parameter_ids,formula.ast_sha256
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_formula_graph formula on formula.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
    order by manifest.catalog_id,formula.formula_id`, [input.releaseId, targetIds])).rows as Json[];
  const formulaMismatches = formulaRows.flatMap((formula) => {
    const compiled = compileFormulaGraph(formula.expression_source);
    const declared = [...formula.input_parameter_ids].sort();
    return JSON.stringify(stable(compiled.ast)) === JSON.stringify(stable(formula.ast))
      && JSON.stringify(compiled.inputParameterIds) === JSON.stringify(declared)
      && sha256(formula.ast) === formula.ast_sha256
      ? []
      : [`${formula.catalog_id}:${formula.formula_id}`];
  });
  const gabion = (await client.query(`select formula.formula_id,formula.expression_source,formula.input_parameter_ids,
      resource.row_id,resource.inclusion_ast
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
    join public.estimate_formula_graph formula on formula.definition_version_id=resource.definition_version_id and formula.formula_id=resource.formula_id
    where manifest.release_id=$1 and manifest.catalog_id=$2 and resource.row_id=any($3::text[])
    order by resource.row_id`, [input.releaseId, GABION_CATALOG_ID, [...GABION_ROW_IDS]])).rows as Json[];
  const restoredAsphaltConditions = (await client.query(`select count(*)::int restored,
      count(*) filter(where resource.inclusion_ast->>'kind' in ('equals','parameter'))::int executable
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_resource_spec resource on resource.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])
      and resource.source_metadata ? 'r6ConditionalDependencyRestored'`, [input.releaseId, targetIds])).rows[0] as Json;
  const preserved = (await client.query(`select definition_version_id::text definition_id from public.estimate_cumulative_manifest_entry
    where release_id=$1 and catalog_id=$2`, [input.releaseId, `canonical-work:base:${PRESERVED_DRAINAGE_TECHNOLOGY_ID}`])).rows[0] as Json;
  const search = (await client.query(`select count(*)::int documents,
      count(*) filter(where definition_release_id=$2)::int rebound,
      count(*) filter(where catalog_id=any($3::text[]) and required_inputs_count>0)::int targets_with_questions,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId, input.releaseId, targetIds])).rows[0] as Json;
  invariant(Number(manifest.identities) === 10_331 && Number(manifest.changed) === 44 && Number(manifest.ready) === 10_331,
    `STOP_R6_MANIFEST_AUDIT:${JSON.stringify(manifest)}`);
  invariant(Number(parameterAudit.defaults) === 0 && Number(parameterAudit.guide_gaps) === 0,
    `STOP_R6_PARAMETER_AUDIT:${JSON.stringify(parameterAudit)}`);
  invariant(Number(baselineAudit.baselines) === 44 && Number(baselineAudit.unauthorized_classifications) === 0,
    `STOP_R6_BASELINE_AUDIT:${JSON.stringify(baselineAudit)}`);
  invariant(formulaMismatches.length === 0, `STOP_R6_FORMULA_AST_DEPENDENCY_MISMATCH:${formulaMismatches.slice(0, 5).join("|")}`);
  invariant(gabion.length === 4 && gabion.every((row) => row.expression_source.includes("is_gabion ?")
    && row.input_parameter_ids.includes("is_gabion")
    && row.inclusion_ast?.kind === "parameter" && row.inclusion_ast?.id === "is_gabion"),
  `STOP_R6_GABION_DEPENDENCY_AUDIT:${JSON.stringify(gabion)}`);
  invariant(Number(restoredAsphaltConditions.restored) > 4
    && Number(restoredAsphaltConditions.executable) === Number(restoredAsphaltConditions.restored),
  `STOP_R6_ASPHALT_CONDITIONAL_DEPENDENCY_AUDIT:${JSON.stringify(restoredAsphaltConditions)}`);
  invariant(preserved.definition_id === input.preservedDrainageDefinitionId, "STOP_R6_LATE_DRAINAGE_OVERWRITTEN");
  // Seven asphalt owners use the external built-in namespace and therefore
  // have canonical definitions/API routes but no row in the global 10,322
  // document index. The indexed target denominator is 35 Wave A + 2 expanded.
  invariant(Number(search.documents) === 10_322 && Number(search.rebound) === 10_322
    && Number(search.targets_with_questions) === 37,
  `STOP_R6_SEARCH_AUDIT:${JSON.stringify(search)}`);
  return { manifest, parameterAudit, baselineAudit, formulaCount: formulaRows.length, formulaMismatches, gabion, restoredAsphaltConditions, preserved, search };
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_R6_MASTER_SHA256_DRIFT");
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_R6_BRANCH_DRIFT");
  for (const path of SOURCE_PATHS) invariant(existsSync(resolve(path)), `STOP_R6_SOURCE_MISSING:${path}`);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const sourceCodeSha256 = sha256({ masterSha256: MASTER_SHA256, sourceHashes });
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false, "STOP_R6_CURRENT_PRODUCTION_ACCESS_FLAG");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r6-asphalt-gabion-successor" });
  await client.connect();
  let receipt: Json;
  let releaseId = "";
  let searchReleaseId = "";
  let releaseKey = "";
  let fingerprint = "";
  try {
    const currentRelease = (await client.query(`select id::text,status,definition_count,parameter_count,formula_count,resource_row_count,metadata
      from public.estimate_definition_release where id=$1`, [current.definitionReleaseId])).rows[0] as Json | undefined;
    const currentSearch = (await client.query(`select id::text,status,metadata from public.estimate_search_index_release where id=$1`, [current.searchReleaseId])).rows[0] as Json | undefined;
    invariant(currentRelease?.status === "prepared" && Number(currentRelease.definition_count) === 10_331,
      "STOP_R6_CURRENT_DEFINITION_RELEASE_NOT_PREPARED");
    invariant(currentSearch?.status === "draft" && currentSearch.metadata?.definitionReleaseId === current.definitionReleaseId,
      "STOP_R6_CURRENT_SEARCH_RELEASE_DRIFT");

    if (current.owner === "R4_A13_6_ASPHALT_GABION_OWNER"
      && currentRelease.metadata?.contract === CONTRACT
      && currentRelease.metadata?.sourceCodeSha256 === sourceCodeSha256) {
      releaseId = String(current.definitionReleaseId);
      searchReleaseId = String(current.searchReleaseId);
      releaseKey = String((await client.query(`select release_key from public.estimate_definition_release where id=$1`, [releaseId])).rows[0].release_key);
      fingerprint = String(currentRelease.metadata.sourceFingerprint);
      const predecessorId = String(currentRelease.metadata.r6PredecessorReleaseId);
      const plans = (await buildPlans(client, { parentReleaseId: predecessorId, fingerprint })).plans;
      const preserved = plans.length > 0
        ? (await client.query(`select definition_version_id::text definition_id from public.estimate_cumulative_manifest_entry
            where release_id=$1 and catalog_id=$2`, [predecessorId, `canonical-work:base:${PRESERVED_DRAINAGE_TECHNOLOGY_ID}`])).rows[0]
        : null;
      const audit = await auditCandidate(client, {
        releaseId,
        searchReleaseId,
        plans,
        preservedDrainageDefinitionId: String(preserved.definition_id),
      });
      receipt = { status: "GREEN_R6_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE", idempotent: true, audit };
    } else {
      const predecessorReleaseId = String(current.definitionReleaseId);
      const predecessorSearchReleaseId = String(current.searchReleaseId);
      fingerprint = sha256({
        contract: CONTRACT,
        masterSha256: MASTER_SHA256,
        predecessorReleaseId,
        predecessorSearchReleaseId,
        sourceHashes,
      });
      releaseId = uuid(`${CONTRACT}:${fingerprint}:release`);
      searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search`);
      releaseKey = `r4-a13-6-asphalt-gabion-${fingerprint.slice(0, 16)}`;
      const existing = (await client.query(`select status from public.estimate_definition_release where id=$1`, [releaseId])).rows[0] as Json | undefined;
      invariant(!existing, "STOP_R6_EXISTING_SUCCESSOR_WITH_UNPUBLISHED_CURRENT_POINTER");
      const { plans, preservedDrainage, routeWrappers } = await buildPlans(client, { parentReleaseId: predecessorReleaseId, fingerprint });

      const sourceGeometry = new Map<string, { parameters: number; formulas: number; resources: number }>();
      for (const plan of plans) {
        const row = (await client.query(`select
            (select count(*)::int from public.estimate_parameter_definition where definition_version_id=$1) parameters,
            (select count(*)::int from public.estimate_formula_graph where definition_version_id=$1) formulas,
            (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1) resources,
            exists(select 1 from public.estimate_parameter_definition where definition_version_id=$1 and parameter_id='is_gabion') has_is_gabion`, [plan.sourceDefinitionId])).rows[0];
        sourceGeometry.set(plan.targetCatalogId, {
          parameters: Number(row.parameters) + (plan.kind === "GABION" && !row.has_is_gabion ? 1 : 0),
          formulas: Number(row.formulas),
          resources: Number(row.resources),
        });
      }
      const currentTargetGeometry = (await client.query(`select
          coalesce(sum((select count(*) from public.estimate_parameter_definition p where p.definition_version_id=manifest.definition_version_id)),0)::int parameters,
          coalesce(sum((select count(*) from public.estimate_formula_graph f where f.definition_version_id=manifest.definition_version_id)),0)::int formulas,
          coalesce(sum((select count(*) from public.estimate_resource_spec r where r.definition_version_id=manifest.definition_version_id)),0)::int resources
        from public.estimate_cumulative_manifest_entry manifest where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])`, [
        predecessorReleaseId, plans.map((plan) => plan.targetCatalogId),
      ])).rows[0] as Json;
      const newGeometry = [...sourceGeometry.values()].reduce((sum, value) => ({
        parameters: sum.parameters + value.parameters,
        formulas: sum.formulas + value.formulas,
        resources: sum.resources + value.resources,
      }), { parameters: 0, formulas: 0, resources: 0 });
      const nextCounts = {
        definitions: Number(currentRelease.definition_count),
        parameters: Number(currentRelease.parameter_count) - Number(currentTargetGeometry.parameters) + newGeometry.parameters,
        formulas: Number(currentRelease.formula_count) - Number(currentTargetGeometry.formulas) + newGeometry.formulas,
        resources: Number(currentRelease.resource_row_count) - Number(currentTargetGeometry.resources) + newGeometry.resources,
      };

      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='900s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,metadata||$8::jsonb,$9,$10,$11,$12
          from public.estimate_definition_release where id=$9`, [
          releaseId,
          releaseKey,
          head,
          tree,
          sha256(`${CONTRACT}:${fingerprint}:draft`),
          nextCounts.definitions,
          nextCounts.resources,
          JSON.stringify({
            contract: CONTRACT,
            masterSha256: MASTER_SHA256,
            sourceCodeSha256,
            sourceHashes,
            lifecycle: "DRAFT_FORWARD_ONLY",
            sourceFingerprint: fingerprint,
            r6PredecessorReleaseId: predecessorReleaseId,
            r6PredecessorSearchReleaseId: predecessorSearchReleaseId,
            asphaltCatalogRecords: 63,
            asphaltTechnologyOwners: 44,
            asphaltAliases: 19,
            currentAsphaltDefinitionEntries: 46,
            replacedAsphaltOwners: 43,
            preservedLateDrainageOwners: 1,
            asphaltRouteWrappers: routeWrappers.map((row) => row.catalog_id),
            gabionDefinitionRepaired: true,
            activationAllowed: false,
            productionEligible: false,
          }),
          predecessorReleaseId,
          sha256({ contract: CONTRACT, fingerprint, sourceHashes }),
          nextCounts.parameters,
          nextCounts.formulas,
        ]);
        await client.query(`insert into public.estimate_cumulative_manifest_entry(
            release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
            definition_hash,entry_sha256,runtime_publication_state)
          select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
            publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
            encode(extensions.digest(convert_to($2||':'||$1::uuid::text||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex'),
            runtime_publication_state
          from public.estimate_cumulative_manifest_entry where release_id=$3`, [releaseId, CONTRACT, predecessorReleaseId]);

        const geometry: Json[] = [];
        for (const plan of plans) {
          geometry.push({ plan, ...(await materializeDefinition(client, { plan, releaseId, fingerprint, head, tree })) });
        }
        const search = await cloneSearch(client, {
          releaseId,
          searchReleaseId,
          parentSearchReleaseId: predecessorSearchReleaseId,
          releaseKey,
          head,
          tree,
          fingerprint,
          targetCatalogIds: plans.map((plan) => plan.targetCatalogId),
        });
        const audit = await auditCandidate(client, {
          releaseId,
          searchReleaseId,
          plans,
          preservedDrainageDefinitionId: String(preservedDrainage.definition_id),
        });
        await client.query(`update public.estimate_definition_release set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
          metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId,
          audit.manifest.snapshot,
          JSON.stringify({
            lifecycle: "PREPARED_NOT_ACTIVE",
            searchReleaseId,
            searchSnapshotSha256: search.snapshot_sha256,
            replacedDefinitionCount: plans.length,
            noHiddenRuntimeAssumptions: true,
            gabionConditionalDependencies: 4,
          }),
        ]);
        receipt = {
          status: APPLY ? "GREEN_R6_SUCCESSOR_PREPARED_NOT_ACTIVE" : "GREEN_R6_SUCCESSOR_DRY_RUN_ROLLED_BACK",
          idempotent: false,
          predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId },
          successor: { releaseId, searchReleaseId, releaseKey, nextCounts },
          inventory: {
            catalogRecordsR: 63,
            technologyOwnersM: 44,
            aliasesA: 19,
            currentDefinitionEntries: 46,
            replacedAsphaltOwners: 43,
            preservedLateDrainageOwners: 1,
            routeWrappers: routeWrappers.map((row) => row.catalog_id),
            gabionDefinitions: 1,
          },
          geometry,
          audit,
          search,
        };
        if (APPLY) await client.query("commit");
        else await client.query("rollback");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
      if (!APPLY) {
        const residue = Number((await client.query(`select
            (select count(*) from public.estimate_definition_release where id=$1)+
            (select count(*) from public.estimate_search_index_release where id=$2) value`, [releaseId, searchReleaseId])).rows[0].value);
        invariant(residue === 0, `STOP_R6_DRY_RUN_RESIDUE:${residue}`);
        receipt.dryRunResidue = residue;
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
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && !receipt!.idempotent) {
    atomicJson(resolve(OUTPUT_ROOT, `01_R6_ASPHALT_GABION_SUCCESSOR_${head}.json`), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot,
      owner: "R4_A13_6_ASPHALT_GABION_OWNER",
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
