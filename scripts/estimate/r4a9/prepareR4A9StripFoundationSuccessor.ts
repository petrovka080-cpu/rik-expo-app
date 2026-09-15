import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { buildStripFoundationContentPassportR3 } from "../concreteBackendR6/buildStripFoundationContentPassportR3";
import {
  REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT,
  STRIP_FOUNDATION_FORMULAS,
  STRIP_FOUNDATION_GOLD_INPUT,
  STRIP_FOUNDATION_INPUTS,
  STRIP_FOUNDATION_ROWS,
  compileStripFoundationEstimate,
} from "../concreteBackendR6/reinforcedConcreteStripFoundationR1";
import { auditRealProfessionalRowsR1 } from "../concreteBackendR6/realProfessionalEstimateContentGateR1";
import {
  NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA,
} from "../../../src/lib/estimate/v4/domainFactory";

type Json = Record<string, any>;

const MASTER_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (5).md");
const MASTER_SHA256 = "acd012705f74c90c9fc7a3483dcd2b2f7b929ef090ba4be6482d059c359dedc0";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const DEFAULT_PARENT_RELEASE_ID = "8791b75f-683f-5e72-a56a-54abc2f82379";
const DEFAULT_PARENT_SEARCH_RELEASE_ID = "320b582e-5a6d-5354-b3bf-f801e4490303";
const TARGET_CATALOG_ID = "canonical-work:expanded:strip_foundation";
const CONTRACT = "rik-expo-app.r4-a13-6.strip-foundation-nrmca-cip31-successor.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/exact-physical-norm-successors/strip-foundation-nrmca-cip31");
const SOURCE_PATHS = [
  "scripts/estimate/concreteBackendR6/buildStripFoundationContentPassportR3.ts",
  "scripts/estimate/concreteBackendR6/reinforcedConcreteStripFoundationR1.ts",
  "src/lib/estimate/v4/reinforcedConcreteStripFoundationR1.ts",
  "src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimatePhysicalNormProjection.ts",
  "data/estimate-norms/professional/concrete.json",
  "scripts/estimate/r4a9/prepareR4A9StripFoundationSuccessor.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
] as const;

const argValue = (name: string): string | null => {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
};

const NRMCA_CIP31_RESOURCE_BINDING = Object.freeze({
  technology_class: "REINFORCED_CONCRETE_STRIP_FOUNDATION",
  operation_class: "ORDER_READY_MIX",
  material_system: "READY_MIX_CONCRETE",
  scope_mode: "FULL_APPLICABLE_SCOPE",
  product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  activation: {
    parameter_id: "product_profile_id",
    equals: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
  },
  parameter_projection_v1: {
    aliases: {
      selected_contingency_percent: "concrete_order_allowance_percent",
    },
    formulas: {
      plan_dimension_concrete_volume_m3:
        "total_axis_length_m * strip_width_m * strip_height_m",
    },
    units: {
      plan_dimension_concrete_volume_m3: "m3",
      selected_contingency_percent: "percent",
    },
  },
});

const NRMCA_CIP31_NORMATIVE_TRACE = Object.freeze({
  document_code: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  source_id: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  sourceId: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  norm_id: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  normId: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  source_title: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_title,
  source_document_version: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_document_version,
  normVersion: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_document_version,
  source_definition_hash: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.definition_hash,
  exact_locator: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.exact_locator,
  source_url: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_url,
  applicability: {
    selected_product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
    selected_contingency_percent_range: [4, 10],
    automatic_generic_binding: false,
  },
});

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
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30_000 }).trim();
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function exactDatabaseGuard(): void {
  const parsed = new URL(DATABASE_URL);
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname), `STOP_R4_A10_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_R4_A10_DATABASE_NOT_DISPOSABLE:${parsed.port}:${parsed.pathname}`);
}

async function insertRows(client: Client, table: string, columns: readonly string[], rows: readonly unknown[][]): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values: unknown[] = [];
    const tuples = batch.map((row) => `(${row.map((value) => {
      values.push(value);
      return `$${values.length}`;
    }).join(",")})`);
    if (tuples.length > 0) await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
  }
}

async function cloneSearch(client: Client, input: {
  predecessorSearchReleaseId: string; releaseId: string; searchReleaseId: string;
  releaseKey: string; head: string; tree: string; fingerprint: string;
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
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, input.predecessorSearchReleaseId, input.releaseId, input.fingerprint,
  ]);
  await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition)
    select $1,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    from public.estimate_search_group where search_release_id=$2`, [input.searchReleaseId, input.predecessorSearchReleaseId]);
  await client.query(`insert into public.estimate_search_clarification_question(
      search_release_id,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence)
    select $1,question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,
      answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence
    from public.estimate_search_clarification_question where search_release_id=$2`, [input.searchReleaseId, input.predecessorSearchReleaseId]);
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
    where source.search_release_id=$4`, [input.searchReleaseId, input.releaseId, CONTRACT, input.predecessorSearchReleaseId, input.fingerprint]);
  await client.query(`insert into public.estimate_search_group_membership(
      search_release_id,group_id,catalog_id,ordinal,independent_disposition)
    select $1,group_id,catalog_id,ordinal,independent_disposition
    from public.estimate_search_group_membership where search_release_id=$2`, [input.searchReleaseId, input.predecessorSearchReleaseId]);
  await client.query(`insert into public.estimate_search_typed_relation(
      search_release_id,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256)
    select $1,source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,
      applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256
    from public.estimate_search_typed_relation where search_release_id=$2`, [input.searchReleaseId, input.predecessorSearchReleaseId]);
  const clarificationFields = STRIP_FOUNDATION_INPUTS
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .map((parameter) => ({ parameterId: parameter.parameterId, titleRu: parameter.titleRu, unitId: parameter.unitId }));
  const content = buildStripFoundationContentPassportR3(TARGET_CATALOG_ID).passport;
  await client.query(`update public.estimate_search_document set
      canonical_name_ru=$3,primary_uom='m3',short_scope_ru=$4,included_boundaries=$5::jsonb,
      excluded_boundaries=$6::jsonb,required_inputs_count=$7,clarification_fields=$8::jsonb,
      source_provenance=source_provenance||jsonb_build_object('technologicalOwner',$9::text,
        'conditionalExactNormSourceId',$10::text),
      aliases=array(select distinct value from unnest(coalesce(aliases,'{}'::text[])||array[$11::text]) value),
      normative_classifiers=array(select distinct value from unnest(coalesce(normative_classifiers,'{}'::text[])||array[$10::text,$12::text]) value),
      applicability_tags=array(select distinct value from unnest(coalesce(applicability_tags,'{}'::text[])||array['CONDITIONAL_EXACT_NRMCA_CIP31','NO_AUTOMATIC_GENERIC_BINDING']) value),
      normalized_aliases=array(select distinct value from unnest(coalesce(normalized_aliases,'{}'::text[])||array[lower($11::text)]) value),
      normalized_search_terms=array(select distinct value from unnest(coalesce(normalized_search_terms,'{}'::text[])||array['nrmca','cip 31','ready mix concrete order']) value),
      normalized_search_blob=coalesce(normalized_search_blob,'')||chr(31)||'nrmca'||chr(31)||'cip 31'||chr(31)||'ready mix concrete order',
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$9,'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$2`, [
    input.searchReleaseId, TARGET_CATALOG_ID, REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.canonicalRuName,
    content.physicalResultRu, JSON.stringify(content.includedScopeRu), JSON.stringify(content.excludedScopeRu),
    clarificationFields.length, JSON.stringify(clarificationFields), CONTRACT,
    NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
    "NRMCA CIP 31 ready-mix concrete order",
    NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
  ]);
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId, snapshot.snapshot_sha256,
    JSON.stringify({ documentCount: snapshot.documents, visibleCount: snapshot.visible, targetCatalogId: TARGET_CATALOG_ID }),
  ]);
  return snapshot;
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_R4_A10_MASTER_SHA256_DRIFT");
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_R4_A10_BRANCH_DRIFT");
  const predecessorReleaseId = argValue("--predecessor-release-id") ?? DEFAULT_PARENT_RELEASE_ID;
  const predecessorSearchReleaseId = argValue("--predecessor-search-release-id")
    ?? DEFAULT_PARENT_SEARCH_RELEASE_ID;
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const compiledGold = compileStripFoundationEstimate(STRIP_FOUNDATION_GOLD_INPUT);
  invariant(auditRealProfessionalRowsR1(compiledGold).length === 0, "STOP_R4_A10_FOUNDATION_CONTENT_GATE_RED");
  invariant(new Set(compiledGold.map((row) => row.category)).size === 4, "STOP_R4_A10_FOUNDATION_CATEGORY_GATE_RED");
  const exactNrmcaInput = {
    ...STRIP_FOUNDATION_GOLD_INPUT,
    product_profile_id: NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
    concrete_order_allowance_percent: 8,
    plan_volume_calculation_reference: "KJ-4 axes 1-8/A-D rev.5",
    mix_design_or_project_specification_reference: "KJ-4 note 7; mix card RM-25-114",
    mixture_designation: "B25 W6 F150 P4, RM-25-114",
    placement_location: "Strip foundation axes 1-8/A-D, pour 1",
    contingency_selection_justification: "Complex formwork and pump remainder per method statement",
    delivery_schedule_and_truck_capacity: "4 trucks x 8 m3; final load confirmed before dispatch",
    producer_order_confirmation: "RM-PRODUCER-2026-0912-17",
    estimator_approval_reference: "EST-APPROVAL-2026-0912-04",
  } as const;
  const compiledExactNrmca = compileStripFoundationEstimate(exactNrmcaInput);
  const exactConcrete = compiledExactNrmca.find((row) => row.rowId === "main_concrete");
  const exactDelivery = compiledExactNrmca.find((row) => row.rowId === "concrete_delivery");
  invariant(exactConcrete?.evaluatedQuantity === "32.4"
    && exactConcrete.normSource.sourceKey === NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID
    && exactConcrete.professionalPhysicalNormApplicabilityV1?.status === "APPLIED",
  "STOP_R4_A13_6_NRMCA_EXACT_SCENARIO_RED");
  invariant(exactDelivery?.cargoQuantity === "32.4"
    && exactDelivery.professionalPhysicalNormApplicabilityV1?.source_id
      === NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  "STOP_R4_A13_6_NRMCA_DELIVERY_PROJECTION_RED");
  let formerTwoPercentRejected = false;
  try {
    compileStripFoundationEstimate({ ...exactNrmcaInput, concrete_order_allowance_percent: 2 });
  } catch (error) {
    formerTwoPercentRejected = String(error).includes("selected_contingency_percent=2");
  }
  invariant(formerTwoPercentRejected, "STOP_R4_A13_6_NRMCA_FORMER_TWO_PERCENT_ACCEPTED");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const exactNrmcaAcceptance = {
    projectVolumeM3: 30,
    selectedContingencyPercent: 8,
    orderQuantityM3: 32.4,
    deliveryQuantityM3: 32.4,
    formerTwoPercentRejected,
    sourceId: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
  };
  const fingerprint = sha256({ contract: CONTRACT, master: MASTER_SHA256,
    predecessorReleaseId, predecessorSearchReleaseId, sourceHashes, exactNrmcaAcceptance });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search`);
  const definitionId = uuid(`${CONTRACT}:${fingerprint}:definition:${TARGET_CATALOG_ID}`);
  const baselineId = uuid(`${CONTRACT}:${fingerprint}:baseline:${TARGET_CATALOG_ID}`);
  const releaseKey = `r4-a13-6-strip-foundation-nrmca-cip31-${fingerprint.slice(0, 16)}`;
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(
    (current.definitionReleaseId === predecessorReleaseId && current.searchReleaseId === predecessorSearchReleaseId)
      || (current.definitionReleaseId === releaseId && current.searchReleaseId === searchReleaseId),
    "STOP_R4_A10_CURRENT_RELEASE_DRIFT",
  );

  const { passport: contentPassport, formulaConsumers, resourceConsumers, decision } =
    buildStripFoundationContentPassportR3(TARGET_CATALOG_ID);
  invariant(decision.allowed, `STOP_R4_A10_CONTENT_PASSPORT_RED:${decision.errors.join("|")}`);
  const safeBaselineInputs = Object.fromEntries(STRIP_FOUNDATION_INPUTS.flatMap((parameter) => {
    const value = parameter.defaultValue ?? (parameter.visibilityRole === "INTERNAL_ONLY"
      ? STRIP_FOUNDATION_GOLD_INPUT[parameter.parameterId]
      : undefined);
    return value == null ? [] : [[parameter.parameterId, value]];
  }));
  const hiddenGeometry = ["total_axis_length_m", "strip_width_m", "strip_height_m", "reinforcement_mass_t"]
    .filter((parameterId) => safeBaselineInputs[parameterId] != null);
  invariant(hiddenGeometry.length === 0, `STOP_R4_A10_HIDDEN_GEOMETRY_DEFAULT:${hiddenGeometry.join(",")}`);
  const parameterSchemaSha256 = sha256(STRIP_FOUNDATION_INPUTS.map((parameter) => [
    parameter.parameterId, parameter.valueType, parameter.unitId, parameter.required, parameter.requiredWhen ?? null,
    parameter.choices ?? [], parameter.visibilityRole,
  ]));
  const acceptanceEvidenceSha256 = sha256({
    contract: CONTRACT, safeBaselineInputs, parameterSchemaSha256,
    gold: compiledGold.map((row) => [row.rowId, row.category, row.evaluatedQuantity, row.normalizedUom]),
  });
  const definitionSha256 = sha256({
    contract: CONTRACT, passport: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT,
    parameters: STRIP_FOUNDATION_INPUTS, formulas: STRIP_FOUNDATION_FORMULAS.map((formula) => formula.ast),
    resources: STRIP_FOUNDATION_ROWS,
  });

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r4-a13-6-strip-foundation-nrmca-cip31-successor" });
  await client.connect();
  let receipt: Json;
  try {
    const existing = (await client.query("select id::text,status from public.estimate_definition_release where id=$1", [releaseId])).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared", "STOP_R4_A10_EXISTING_RELEASE_DRIFT");
      const audit = (await client.query(`select count(*)::int identities,
          count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int repaired
        from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId, TARGET_CATALOG_ID, definitionId])).rows[0] as Json;
      receipt = { status: "GREEN_R4_A13_6_NRMCA_FOUNDATION_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE", idempotent: true, audit };
    } else {
      const predecessor = (await client.query("select * from public.estimate_definition_release where id=$1", [predecessorReleaseId])).rows[0] as Json;
      const target = (await client.query(`select manifest.*,definition.definition_version,
          (select count(*)::int from public.estimate_parameter_definition where definition_version_id=manifest.definition_version_id) parameters,
          (select count(*)::int from public.estimate_formula_graph where definition_version_id=manifest.definition_version_id) formulas,
          (select count(*)::int from public.estimate_resource_spec where definition_version_id=manifest.definition_version_id) resources
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
        where manifest.release_id=$1 and manifest.catalog_id=$2`, [predecessorReleaseId, TARGET_CATALOG_ID])).rows[0] as Json;
      invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 10_331, "STOP_R4_A10_PREDECESSOR_RELEASE_DRIFT");
      invariant(target && Number(target.parameters) > 0 && Number(target.formulas) > 0 && Number(target.resources) > 0, "STOP_R4_A10_PREDECESSOR_TARGET_DRIFT");
      const nextDefinitionVersion = Number((await client.query(
        "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
        [TARGET_CATALOG_ID],
      )).rows[0].value);
      const nextCounts = {
        definitions: Number(predecessor.definition_count),
        parameters: Number(predecessor.parameter_count) - Number(target.parameters) + STRIP_FOUNDATION_INPUTS.length,
        formulas: Number(predecessor.formula_count) - Number(target.formulas) + STRIP_FOUNDATION_FORMULAS.length,
        resources: Number(predecessor.resource_row_count) - Number(target.resources) + STRIP_FOUNDATION_ROWS.length,
      };
      if (!APPLY) {
        receipt = {
          status: "GREEN_R4_A13_6_NRMCA_FOUNDATION_SUCCESSOR_PRECHECK_NO_MUTATION", idempotent: false,
          predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId, definitionId: target.definition_version_id },
          successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey, nextCounts },
          technologicalCore: { parameters: STRIP_FOUNDATION_INPUTS.length, formulas: STRIP_FOUNDATION_FORMULAS.length, resources: STRIP_FOUNDATION_ROWS.length, compiledRows: compiledGold.length },
        };
      } else {
        await client.query("begin");
        await client.query("set local lock_timeout='5s'");
        await client.query("set local statement_timeout='600s'");
        await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
        try {
          await client.query(`insert into public.estimate_definition_release(
              id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
              definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count)
            select $1,$2,schema_version,'draft',$3,$4,$5,$6,$7,metadata||$8::jsonb,$9,$10,$11,$12
            from public.estimate_definition_release where id=$9`, [
            releaseId, releaseKey, head, tree, sha256(`${CONTRACT}:${fingerprint}:draft`),
            nextCounts.definitions, nextCounts.resources,
            JSON.stringify({ contract: CONTRACT, masterSha256: MASTER_SHA256,
              lifecycle: "DRAFT_FORWARD_ONLY", replacedDefinitionCount: 1, targetCatalogId: TARGET_CATALOG_ID,
              activationAllowed: false, productionEligible: false }),
            predecessorReleaseId, sha256({ contract: CONTRACT, fingerprint, definitionSha256 }), nextCounts.parameters, nextCounts.formulas,
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
          await client.query(`insert into public.estimate_definition_version(
              id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
              source_metadata,content_status,content_gate_status)
            values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
            definitionId, releaseId, TARGET_CATALOG_ID, nextDefinitionVersion,
            JSON.stringify({ ...REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT, catalogId: TARGET_CATALOG_ID }),
            JSON.stringify({ allowedScopes: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.allowedScopes,
              technologyChoices: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.technologyChoices, failClosed: true }),
            definitionSha256,
            JSON.stringify({ contract: CONTRACT, predecessorDefinitionId: target.definition_version_id,
              parameterSchemaSha256, acceptanceEvidenceSha256, noHiddenGeometryDefaults: true }),
          ]);
          const parameters = STRIP_FOUNDATION_INPUTS.map((parameter, ordinal) => [
            definitionId, parameter.parameterId, ordinal, parameter.valueType, parameter.unitId,
            parameter.titleRu, parameter.requiredWhen == null ? parameter.required : false, null,
            { ...(parameter.choices ? { values: parameter.choices } : {}), ...(parameter.requiredWhen ? { requiredWhen: parameter.requiredWhen } : {}) },
            { semantic_parameter_key: parameter.parameterId, visibility_role: parameter.visibilityRole,
              value_source_role: parameter.visibilityRole === "INTERNAL_ONLY" ? parameter.sourceRole : "PROJECT_SPECIFIC_INPUT",
              guide: { guide_kind: parameter.valueType === "enum" || parameter.valueType === "boolean" ? "ENUM_DECISION_RULE" : "MEASUREMENT_RULE",
                guide_short_ru: parameter.guideRu, source_role: parameter.sourceRole, guide_version: CONTRACT,
                source_snapshot_hash: sha256({ parameterId: parameter.parameterId, guide: parameter.guideRu }),
                applicability: REINFORCED_CONCRETE_STRIP_FOUNDATION_PASSPORT.canonicalRuName, verified_at: "2026-09-06" },
              required_when: parameter.requiredWhen ?? null,
              formula_consumers: formulaConsumers[parameter.parameterId] ?? [],
              resource_branch_consumers: resourceConsumers[parameter.parameterId] ?? [], contract: CONTRACT },
            null,
          ]);
          await insertRows(client, "estimate_parameter_definition", [
            "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
            "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
          ], parameters);
          await insertRows(client, "estimate_formula_graph", [
            "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast", "input_parameter_ids", "ast_sha256",
          ], STRIP_FOUNDATION_FORMULAS.map((formula) => [
            definitionId, formula.formulaId, formula.outputUnitId, formula.source, formula.ast, formula.inputParameterIds, sha256(formula.ast),
          ]));
          const resourceIdByRow = new Map<string, string>();
          const categorySection = { material: "Материалы", construction_work: "Работы", machine_equipment: "Машины и механизмы", delivery: "Доставка" } as const;
          const rowType = { material: "material", construction_work: "labor", machine_equipment: "equipment", delivery: "service" } as const;
          const resources = STRIP_FOUNDATION_ROWS.map((row, ordinal) => {
            const id = uuid(`${CONTRACT}:${fingerprint}:resource:${row.rowId}`);
            resourceIdByRow.set(row.rowId, id);
            const isReadyMixOrderOwner = row.rowId === "main_concrete";
            const sourceMetadata = { contract: CONTRACT, category: row.category, visibility: row.visibility,
              procurementMode: row.procurementMode, includedInParentRate: row.includedInParentRate,
              normSource: row.normSource,
              normativeTrace: isReadyMixOrderOwner
                ? [row.normSource, NRMCA_CIP31_NORMATIVE_TRACE]
                : [row.normSource],
              ...(isReadyMixOrderOwner ? {
                conditionalExactNormSourceId: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
                rejectedPredecessorSourceIds: ["src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1"],
              } : {}),
              ...(row.cargo ? { cargo: row.cargo } : {}) };
            const resourceGraph = { semanticOwnerId: row.semanticOwnerId, formulaId: row.formulaId,
              category: row.category, normalizedUom: row.normalizedUom, costOwner: row.costOwner,
              ...(isReadyMixOrderOwner ? {
                professionalPhysicalNormBindingV1: NRMCA_CIP31_RESOURCE_BINDING,
              } : {}),
              ...(row.titleSpecificationParameterIds ? { titleSpecificationParameterIds: row.titleSpecificationParameterIds } : {}),
              ...(row.titleSpecificationMode ? { titleSpecificationMode: row.titleSpecificationMode } : {}),
              ...(row.titleSpecificationSeparator ? { titleSpecificationSeparator: row.titleSpecificationSeparator } : {}),
              ...(row.cargo ? { cargo: row.cargo } : {}) };
            return [id, definitionId, row.rowId, ordinal, categorySection[row.category], row.category,
              row.canonicalRuName, rowType[row.category], row.normalizedUom, row.formulaId,
              row.applicabilityExpression, resourceGraph, row.semanticOwnerId,
              row.costOwner === "rate_item" ? `rate-item:${row.rateItemId}` : row.semanticOwnerId,
              row.category !== "construction_work" && !row.includedInParentRate, sourceMetadata,
              sha256({ contract: CONTRACT, row, sourceMetadata, resourceGraph })];
          });
          await insertRows(client, "estimate_resource_spec", [
            "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
            "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
            "procurement_eligible", "source_metadata", "row_sha256",
          ], resources);
          await client.query(`insert into public.estimate_approved_template_baseline(
              id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
              input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
              normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
              acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
            values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,
              $14::jsonb,$15::jsonb,$16,$17,clock_timestamp(),$18,'APPROVED_TEMPLATE_BASELINE_R54_V1')`, [
            baselineId, `${CONTRACT}:${fingerprint.slice(0, 16)}:${TARGET_CATALOG_ID}`, TARGET_CATALOG_ID,
            definitionId, target.definition_version_id, parameterSchemaSha256, JSON.stringify(safeBaselineInputs),
            JSON.stringify(Object.fromEntries(Object.keys(safeBaselineInputs).map((id) => [id, "ASSUMPTION"]))),
            JSON.stringify(Object.fromEntries(Object.keys(safeBaselineInputs).map((id) => [id, STRIP_FOUNDATION_INPUTS.find((item) => item.parameterId === id)?.unitId ?? null]))),
            JSON.stringify(Object.fromEntries(Object.keys(safeBaselineInputs).map((id) => [id, formulaConsumers[id] ?? []]))),
            JSON.stringify(Object.fromEntries(Object.keys(safeBaselineInputs).map((id) => [id, resourceConsumers[id] ?? []]))),
            JSON.stringify(Object.fromEntries(Object.keys(safeBaselineInputs).map((id) => [id, [STRIP_FOUNDATION_INPUTS.find((item) => item.parameterId === id)?.sourceRole ?? "PROJECT_DOCUMENTATION"]]))),
            JSON.stringify(Object.fromEntries(Object.keys(safeBaselineInputs).map((id) => [id, STRIP_FOUNDATION_INPUTS.find((item) => item.parameterId === id)?.guideRu ?? ""]))),
            JSON.stringify([{ contract: CONTRACT, masterSha256: MASTER_SHA256, sourceHashes }]),
            JSON.stringify([{ scenario: "STRIP_FOUNDATION_TECHNOLOGICAL_GOLD", acceptanceEvidenceSha256 }]),
            acceptanceEvidenceSha256, releaseId, target.approved_template_baseline_id,
          ]);
          await client.query(`update public.estimate_parameter_definition set approved_template_baseline_id=$2
            where definition_version_id=$1 and approved_template_baseline_id is null`, [definitionId, baselineId]);
          await client.query(`insert into public.estimate_content_passport_r3(
              definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
              physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
              formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
            values($1,$2,$3,$4,$5,null,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,$13::jsonb,$14,$15,$16)`, [
            definitionId, releaseId, TARGET_CATALOG_ID, contentPassport.contract, contentPassport.identityMode,
            contentPassport.physicalResultRu, JSON.stringify(contentPassport.includedScopeRu), JSON.stringify(contentPassport.excludedScopeRu),
            JSON.stringify(contentPassport.capabilityMatrix), STRIP_FOUNDATION_INPUTS.length, STRIP_FOUNDATION_FORMULAS.length,
            STRIP_FOUNDATION_ROWS.length, JSON.stringify(decision), sha256(contentPassport), head, tree,
          ]);
          await client.query(`update public.estimate_definition_version set
              content_status='CANDIDATE_READY',content_gate_status='GREEN'
            where id=$1 and content_status='QUARANTINED' and content_gate_status='RED'`, [definitionId]);
          const normative = (await client.query("select id::text from public.estimate_normative_source where source_key='krer_06_2015'")).rows[0] as Json | undefined;
          if (normative) {
            const locatorPayload = { documentCode: "КРЕР 81-02-06-2015", tableCode: "06-01-001", rateCode: "06-01-001-09",
              pdfPage: 18, exactLocator: "КРЕР №6:PDF_PAGE_18:TABLE_06-01-001:RATE_06-01-001-09" };
            const locatorKey = sha256(locatorPayload);
            const locatorId = uuid(`${CONTRACT}:locator:${locatorKey}`);
            await client.query(`insert into public.estimate_normative_locator(id,source_id,locator_key,locator,excerpt_sha256)
              values($1,$2,$3,$4::jsonb,null) on conflict(source_id,locator_key) do nothing`, [locatorId, normative.id, locatorKey, JSON.stringify(locatorPayload)]);
            const stored = (await client.query("select id::text from public.estimate_normative_locator where source_id=$1 and locator_key=$2", [normative.id, locatorKey])).rows[0] as Json;
            await insertRows(client, "estimate_work_normative_binding", ["definition_version_id", "resource_spec_id", "locator_id", "applicability"],
              STRIP_FOUNDATION_ROWS.filter((row) => row.normSource.sourceKey === "krer_06_2015").map((row) => [
                definitionId, resourceIdByRow.get(row.rowId), stored.id,
                { rateCode: row.normSource.rateCode, tableCode: row.normSource.tableCode, pdfPage: row.normSource.pdfPage },
              ]));
          }
          await client.query(`insert into public.estimate_normative_source(
              id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
            values($1,$2,$3,$4,$5,null,$6,$7::jsonb)
            on conflict(source_key) do update set official_url=excluded.official_url,
              metadata=public.estimate_normative_source.metadata||excluded.metadata`, [
            uuid(`${CONTRACT}:source:${NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID}`),
            NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
            NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_title,
            "National Ready Mixed Concrete Association",
            NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_url,
            "2021-01-01",
            JSON.stringify({ contract: CONTRACT, verifiedAt: "2026-09-15",
              targetCatalogId: TARGET_CATALOG_ID,
              sourceDefinitionHash: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.definition_hash,
              useRestriction: "EXACT_PROJECT_READY_MIX_ORDER_ONLY",
              automaticGenericBinding: false }),
          ]);
          const nrmcaSource = (await client.query(
            "select id::text from public.estimate_normative_source where source_key=$1",
            [NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID],
          )).rows[0] as Json;
          const nrmcaLocator = {
            documentCode: "NRMCA CIP 31 - Ordering Ready Mixed Concrete",
            exactLocator: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.exact_locator,
            measurementUnit: "m3 fresh unhardened concrete",
            publishedContingencyPercentRange: [4, 10],
            selectedContingencyPercentRequired: true,
            automaticGenericBinding: false,
          };
          const nrmcaLocatorKey = sha256(nrmcaLocator);
          await client.query(`insert into public.estimate_normative_locator(
              id,source_id,locator_key,locator,excerpt_sha256)
            values($1,$2,$3,$4::jsonb,$5) on conflict(source_id,locator_key) do nothing`, [
            uuid(`${CONTRACT}:locator:${NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID}:${nrmcaLocatorKey}`),
            nrmcaSource.id, nrmcaLocatorKey, JSON.stringify(nrmcaLocator), sha256(nrmcaLocator),
          ]);
          const storedNrmcaLocator = (await client.query(
            "select id::text from public.estimate_normative_locator where source_id=$1 and locator_key=$2",
            [nrmcaSource.id, nrmcaLocatorKey],
          )).rows[0] as Json;
          await insertRows(client, "estimate_work_normative_binding", [
            "definition_version_id", "resource_spec_id", "locator_id", "applicability",
          ], [[definitionId, resourceIdByRow.get("main_concrete"), storedNrmcaLocator.id, {
            ...NRMCA_CIP31_RESOURCE_BINDING,
            norm_id: NRMCA_CIP31_SELECTED_CONTINGENCY_NORM_ID,
            source_document_version: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.source_document_version,
            source_definition_hash: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.definition_hash,
            exact_locator: NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_METADATA.exact_locator,
          }]]);
          await client.query(`update public.estimate_cumulative_manifest_entry set
              definition_version_id=$3,source_batch=$4,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
              approved_template_baseline_id=$5,baseline_ready=true,scenario_ready=true,definition_hash=$6,
              entry_sha256=$7,runtime_publication_state='CANDIDATE'
            where release_id=$1 and catalog_id=$2`, [
            releaseId, TARGET_CATALOG_ID, definitionId, CONTRACT, baselineId, definitionSha256,
            sha256({ contract: CONTRACT, releaseId, catalogId: TARGET_CATALOG_ID, definitionId, baselineId, definitionSha256 }),
          ]);
          const search = await cloneSearch(client, {
            predecessorSearchReleaseId, releaseId, searchReleaseId, releaseKey, head, tree, fingerprint,
          });
          const manifest = (await client.query(`select count(*)::int identities,
              count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int repaired,
              encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
            from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId, TARGET_CATALOG_ID, definitionId])).rows[0] as Json;
          const exactNormAudit = (await client.query(`select
              (select count(*)::int from public.estimate_work_normative_binding binding
                join public.estimate_normative_locator locator on locator.id=binding.locator_id
                join public.estimate_normative_source source on source.id=locator.source_id
                where binding.definition_version_id=$1 and source.source_key=$2) normalized_bindings,
              (select count(*)::int from public.estimate_resource_spec resource
                where resource.definition_version_id=$1
                  and resource.row_id='main_concrete'
                  and resource.resource_graph#>>'{professionalPhysicalNormBindingV1,source_id}'=$2
                  and resource.resource_graph#>>'{professionalPhysicalNormBindingV1,activation,parameter_id}'='product_profile_id'
                  and resource.resource_graph#>>'{professionalPhysicalNormBindingV1,activation,equals}'=$3) conditional_owner_rows,
              (select count(*)::int from public.estimate_resource_spec resource
                where resource.definition_version_id=$1
                  and exists(select 1 from jsonb_array_elements(coalesce(resource.source_metadata->'normativeTrace','[]'::jsonb)) trace
                    where coalesce(trace->>'source_id',trace->>'sourceId',trace->>'document_code')=$4)) forbidden_legacy_rows`, [
            definitionId,
            NRMCA_CIP31_SELECTED_CONTINGENCY_SOURCE_ID,
            NRMCA_CIP31_READY_MIX_ORDER_PRODUCT_PROFILE_ID,
            "src_professional_norm_pack_concrete_ready_mix_m3_m3_placed_v1",
          ])).rows[0] as Json;
          invariant(Number(manifest.identities) === 10_331 && Number(manifest.repaired) === 1, `STOP_R4_A10_MANIFEST_AUDIT:${JSON.stringify(manifest)}`);
          invariant(Number(exactNormAudit.normalized_bindings) === 1
            && Number(exactNormAudit.conditional_owner_rows) === 1
            && Number(exactNormAudit.forbidden_legacy_rows) === 0,
          `STOP_R4_A13_6_NRMCA_CANDIDATE_AUDIT:${JSON.stringify(exactNormAudit)}`);
          await client.query(`update public.estimate_definition_release set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
            metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
            releaseId, manifest.snapshot, JSON.stringify({ lifecycle: "PREPARED_NOT_ACTIVE", searchReleaseId,
              searchSnapshotSha256: search.snapshot_sha256, technologicalRows: STRIP_FOUNDATION_ROWS.length,
              exactNrmcaCip31: exactNrmcaAcceptance, normalizedNrmcaBindingCount: 1 }),
          ]);
          await client.query("commit");
          receipt = { status: "GREEN_R4_A13_6_NRMCA_FOUNDATION_SUCCESSOR_PREPARED_NOT_ACTIVE", idempotent: false,
            predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId,
              definitionId: target.definition_version_id },
            successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey, nextCounts },
            audit: { ...manifest, search, exactNormAudit, hiddenGeometryDefaults: hiddenGeometry.length,
              safeBaselineInputs: Object.keys(safeBaselineInputs), exactNrmcaAcceptance,
              technologicalCore: { parameters: STRIP_FOUNDATION_INPUTS.length, formulas: STRIP_FOUNDATION_FORMULAS.length,
                resources: STRIP_FOUNDATION_ROWS.length, compiledRows: compiledGold.length } } };
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
      }
    }
  } finally {
    await client.end();
  }
  const body = { schemaVersion: `${CONTRACT}.receipt.v1`, capturedAt: new Date().toISOString(),
    globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY", source: { branch: EXPECTED_BRANCH, head, tree, fingerprint, sourceHashes },
    masterSha256: MASTER_SHA256, targetCatalogId: TARGET_CATALOG_ID, exactNrmcaAcceptance,
    ...receipt!, productionAccessed: false, deployPerformed: false, activationPerformed: false,
    releasePerformed: false };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && !receipt!.idempotent) {
    atomicJson(resolve(OUTPUT_ROOT, `01_FOUNDATION_SUCCESSOR_${head}.json`), sealed);
    atomicJson(CURRENT_RELEASE_PATH, {
      ...current,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.snapshot,
      manifestHashChainSha256: receipt!.audit.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      currentRuntimeDefinitions: 10_331,
      owner: "EXACT_NRMCA_CIP31_FULL_STRIP_FOUNDATION_SUCCESSOR",
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
