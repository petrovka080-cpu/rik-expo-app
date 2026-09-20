import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.r8-compaction-boq-quality.v1";
const MASTER_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R8_ONE_CORE_BOQ_QUALITY_ANDROID_FULL_ACCEPTANCE_RU.md");
const MASTER_SHA256 = "6e1b5616f3d68ae528b4a1e681648272e5af385ac15da3a4b18246c133ed8519";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const TARGET_CATALOG_ID = "canonical-work:base:paving_roads_landscape_interior_asphalt_compact_large_area";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/r8-compaction-boq-quality");
const OFFICIAL_SOURCE_KEY = "kg_krer_27_roadworks_2015";
const OFFICIAL_SOURCE_URL = "https://minstroy.gov.kg/ru/state_program/download-pdf/no27avtomobilnyedorogi_compressed-43769083f584ff787.06841542.pdf";
const OFFICIAL_SOURCE_SHA256 = "cd3d6735d1bbdda5957945b7682f032785c76624b54a435edfe5d2ef5e107161";
const SOURCE_PATHS = [
  "scripts/estimate/r8/prepareR8CompactionBoqQualitySuccessor.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics.ts",
  "src/lib/estimate/v4/roadworks/roadworksWaveA.ts",
  "src/lib/estimate/v4/roadworks/roadworksWaveAAdmissionR6.ts",
  "src/lib/estimate/v4/roadworks/roadworksWaveAProductionBinding.ts",
  "src/features/consumerRepair/ConsumerRepairItemRow.tsx",
  "src/features/consumerRepair/ConsumerRepairProgressiveEstimatePanel.tsx",
  "src/features/consumerRepair/RequestEstimateSummaryCard.tsx",
  "src/features/consumerRepair/requestEstimateViewModel.ts",
  "src/features/requests/components/EstimateRevisionTimeline.tsx",
] as const;

const TITLE_BY_SOURCE_ROW_SUFFIX: Readonly<Record<string, string>> = Object.freeze({
  breakdown_compaction: "Предварительное уплотнение асфальта",
  intermediate_compaction: "Основное уплотнение асфальта",
  finish_compaction: "Финишное уплотнение асфальта",
  breakdown_roller: "Каток для предварительного уплотнения",
  roller: "Каток для основного уплотнения",
  finish_roller: "Каток для финишного уплотнения",
  acceptance: "Проверка плотности и качества уплотнения",
  crew_labor: "Машинисты катков и дорожные рабочие",
  work_and_quality_journal: "Журнал работ и контроля качества",
  execution_documentation: "Исполнительная документация по уплотнению",
  large_area_mechanized_execution: "Организация работы катков на большой площадке",
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
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname), `STOP_R8_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_R8_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
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

function sourceRowSuffix(resource: Json): string {
  const sourceRowId = String(resource.resource_graph?.sourceRowId ?? "");
  return sourceRowId.split(":").pop() ?? "";
}

function costTreatment(resource: Json): "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE" | "CONTROL_OR_DOCUMENT" {
  const suffix = sourceRowSuffix(resource);
  if (["breakdown_compaction", "intermediate_compaction", "finish_compaction"].includes(suffix)) {
    return "INCLUDED_IN_RESOURCE_ROWS";
  }
  if (suffix === "large_area_mechanized_execution") return "INFORMATIONAL_SCOPE";
  if (["acceptance", "work_and_quality_journal", "execution_documentation"].includes(suffix)) {
    return "CONTROL_OR_DOCUMENT";
  }
  return "OWN_COST";
}

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  parentSearchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
  consumerFields: Json[];
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
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, input.parentSearchReleaseId, input.releaseId, input.fingerprint,
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
    where source.search_release_id=$4`, [input.searchReleaseId, input.releaseId, CONTRACT, input.parentSearchReleaseId, input.fingerprint]);
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
  await client.query(`update public.estimate_search_document set required_inputs_count=$3,
      clarification_fields=$4::jsonb,
      source_provenance=source_provenance||jsonb_build_object('r8SourceManagedNormGates',5,
        'r8NoConsumerProductivityGuessing',true),
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$5,'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$2`, [
    input.searchReleaseId, TARGET_CATALOG_ID, input.consumerFields.length,
    JSON.stringify(input.consumerFields), CONTRACT,
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
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_R8_MASTER_SHA256_DRIFT");
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_R8_BRANCH_DRIFT");
  for (const path of SOURCE_PATHS) invariant(existsSync(resolve(path)), `STOP_R8_SOURCE_MISSING:${path}`);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const sourceCodeSha256 = sha256({ masterSha256: MASTER_SHA256, sourceHashes });
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false, "STOP_R8_CURRENT_PRODUCTION_ACCESS_FLAG");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r8-compaction-boq-quality-successor" });
  await client.connect();
  let receipt: Json;
  try {
    const predecessorReleaseId = String(current.definitionReleaseId);
    const predecessorSearchReleaseId = String(current.searchReleaseId);
    const predecessor = (await client.query("select * from public.estimate_definition_release where id=$1", [predecessorReleaseId])).rows[0] as Json;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 10_331,
      "STOP_R8_PREDECESSOR_RELEASE_DRIFT");
    const fingerprint = sha256({ contract: CONTRACT, masterSha256: MASTER_SHA256,
      predecessorReleaseId, predecessorSearchReleaseId, sourceHashes });
    const releaseId = uuid(`${CONTRACT}:${fingerprint}:release`);
    const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search`);
    const definitionId = uuid(`${CONTRACT}:${fingerprint}:definition:${TARGET_CATALOG_ID}`);
    const baselineId = uuid(`${CONTRACT}:${fingerprint}:baseline:${TARGET_CATALOG_ID}`);
    const releaseKey = `r4-a13-6-r8-compaction-${fingerprint.slice(0, 16)}`;
    const existing = (await client.query("select status,metadata from public.estimate_definition_release where id=$1", [releaseId])).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared", "STOP_R8_EXISTING_RELEASE_DRIFT");
      receipt = { status: "GREEN_R8_COMPACTION_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE", idempotent: true,
        successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey }, fingerprint };
    } else {
      const target = (await client.query(`select manifest.*,definition.*,
          (select count(*)::int from public.estimate_parameter_definition where definition_version_id=manifest.definition_version_id) parameters,
          (select count(*)::int from public.estimate_formula_graph where definition_version_id=manifest.definition_version_id) formulas,
          (select count(*)::int from public.estimate_resource_spec where definition_version_id=manifest.definition_version_id) resources
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
        where manifest.release_id=$1 and manifest.catalog_id=$2`, [predecessorReleaseId, TARGET_CATALOG_ID])).rows[0] as Json;
      invariant(target && Number(target.parameters) === 8 && Number(target.formulas) === 11 && Number(target.resources) === 11,
        `STOP_R8_TARGET_GEOMETRY_DRIFT:${JSON.stringify(target)}`);
      const sourceParameters = (await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as Json[];
      const sourceFormulas = (await client.query("select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id])).rows as Json[];
      const sourceResources = (await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as Json[];
      const sourceBaseline = (await client.query("select * from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id])).rows[0] as Json;
      const sourcePassport = (await client.query("select * from public.estimate_content_passport_r3 where definition_version_id=$1", [target.definition_version_id])).rows[0] as Json;
      invariant(sourceBaseline && sourcePassport, "STOP_R8_TARGET_EVIDENCE_MISSING");
      const nextDefinitionVersion = Number((await client.query(
        "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
        [TARGET_CATALOG_ID],
      )).rows[0].value);
      const parameters = sourceParameters.map((parameter): Json => {
        const truth = { ...(parameter.truth_metadata ?? {}) };
        const sourceManaged = ["NORM_REQUIRED_BUT_PROJECT_SELECTED", "MANDATORY_NORM_VALUE"]
          .includes(String(truth.value_source_role ?? ""));
        const shortTitle = String(parameter.parameter_id).includes("breakdown_roller_productivity")
          ? "Производительность катка предварительного уплотнения"
          : String(parameter.parameter_id).includes("finish_roller_productivity")
            ? "Производительность катка финишного уплотнения"
            : String(parameter.parameter_id).includes("machine_roller_productivity")
              ? "Производительность катка основного уплотнения"
              : parameter.parameter_id === "labor_productivity_m2_per_man_hour"
                ? "Норма трудозатрат бригады"
                : parameter.parameter_id === "acceptance_lot_m2"
                  ? "Размер партии для контроля качества"
                  : parameter.title_ru;
        return {
          ...parameter,
          definition_version_id: definitionId,
          title_ru: shortTitle,
          default_value: null,
          truth_metadata: {
            ...truth,
            visibility_role: sourceManaged ? "INTERNAL_ONLY" : truth.visibility_role,
            source_confirmation_required: sourceManaged || truth.source_confirmation_required === true,
            guide: truth.guide ? { ...truth.guide, guide_short_ru: shortTitle, guide_version: CONTRACT } : truth.guide,
            r8ConsumerEntryPolicy: sourceManaged ? "SOURCE_MANAGED_NOT_SCALAR_USER_INPUT" : "UNCHANGED",
            contract: CONTRACT,
          },
          approved_template_baseline_id: null,
        };
      });
      const resourceIdByRow = new Map<string, string>();
      const resources = sourceResources.map((resource): Json => {
        const suffix = sourceRowSuffix(resource);
        const treatment = costTreatment(resource);
        const id = uuid(`${CONTRACT}:${fingerprint}:resource:${resource.row_id}`);
        resourceIdByRow.set(String(resource.row_id), id);
        const sourceMetadata = {
          ...(resource.source_metadata ?? {}),
          contract: CONTRACT,
          costTreatment: treatment,
          normativeTrace: [{
            sourceId: OFFICIAL_SOURCE_KEY,
            exactLocator: "КРЕР 27-06-019/020, PDF pages 91-92",
            bindingStatus: "APPLICABILITY_ONLY_NOT_COMPACTION_PRODUCTIVITY_RATE",
            role: "Источник применимости полного устройства покрытия; не источник производительности отдельной операции уплотнения",
          }],
          r8SourceGate: treatment === "OWN_COST"
            ? "APPROVED_METHOD_STATEMENT_OR_EQUIPMENT_PASSPORT_REQUIRED"
            : "NOT_A_SEPARATELY_PAYABLE_ROW",
        };
        const resourceGraph = { ...(resource.resource_graph ?? {}), costTreatment: treatment,
          payable: treatment === "OWN_COST", r8NoDoubleCount: true };
        return {
          ...resource,
          id,
          definition_version_id: definitionId,
          title_ru: TITLE_BY_SOURCE_ROW_SUFFIX[suffix] ?? resource.title_ru,
          resource_graph: resourceGraph,
          source_metadata: sourceMetadata,
          row_sha256: sha256({ rowId: resource.row_id, formulaId: resource.formula_id,
            inclusionAst: resource.inclusion_ast, resourceGraph, sourceMetadata }),
        };
      });
      const parameterSchemaSha256 = sha256(parameters.map((parameter) => ({
        id: parameter.parameter_id, title: parameter.title_ru, valueType: parameter.value_type,
        unit: parameter.unit_id, required: parameter.required, constraints: parameter.constraints_json,
        truth: parameter.truth_metadata,
      })));
      const definitionSha256 = sha256({ contract: CONTRACT, predecessorDefinitionId: target.definition_version_id,
        parameters: parameters.map((value) => [value.parameter_id, value.truth_metadata]),
        formulas: sourceFormulas.map((value) => [value.formula_id, value.ast_sha256]),
        resources: resources.map((value) => [value.row_id, value.title_ru, value.resource_graph, value.row_sha256]) });
      const acceptanceEvidenceSha256 = sha256({ definitionSha256, parameterSchemaSha256,
        exactScope: "asphalt_compaction_large_area_120_m2", rowCount: 11, payableResourceCount: 4,
        sourceManagedParameterCount: 5, officialSourceSha256: OFFICIAL_SOURCE_SHA256 });
      const consumerFields = parameters.filter((parameter) => parameter.truth_metadata?.visibility_role === "USER_INPUT")
        .map((parameter) => ({ parameterId: parameter.parameter_id, titleRu: parameter.title_ru, unitId: parameter.unit_id }));

      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,definition_count,resource_row_count,
            metadata||$6::jsonb,$7,$8,parameter_count,formula_count
          from public.estimate_definition_release where id=$7`, [
          releaseId, releaseKey, head, tree, sha256(`${CONTRACT}:${fingerprint}:draft`),
          JSON.stringify({ contract: CONTRACT, masterSha256: MASTER_SHA256, sourceCodeSha256,
            sourceHashes, lifecycle: "DRAFT_FORWARD_ONLY", sourceFingerprint: fingerprint,
            replacedDefinitionCount: 1, targetCatalogId: TARGET_CATALOG_ID,
            sourceManagedParameterCount: 5, payableResourceCount: 4,
            activationAllowed: false, productionEligible: false }),
          predecessorReleaseId, sha256({ contract: CONTRACT, fingerprint, definitionSha256 }),
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
          JSON.stringify({ ...(target.passport ?? {}), contract: CONTRACT }),
          JSON.stringify(target.applicability ?? {}), definitionSha256,
          JSON.stringify({ ...(target.source_metadata ?? {}), contract: CONTRACT,
            predecessorDefinitionId: target.definition_version_id, parameterSchemaSha256,
            acceptanceEvidenceSha256, sourceManagedParameterCount: 5, payableResourceCount: 4 }),
        ]);
        await insertRows(client, "estimate_parameter_definition", [
          "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
          "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
        ], parameters.map((parameter) => [definitionId, parameter.parameter_id, parameter.ordinal,
          parameter.value_type, parameter.unit_id, parameter.title_ru, parameter.required, null,
          parameter.constraints_json, parameter.truth_metadata, null]));
        await insertRows(client, "estimate_formula_graph", [
          "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast", "input_parameter_ids", "ast_sha256",
        ], sourceFormulas.map((formula) => [definitionId, formula.formula_id, formula.output_unit_id,
          formula.expression_source, formula.ast, formula.input_parameter_ids, formula.ast_sha256]));
        await insertRows(client, "estimate_resource_spec", [
          "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
          "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
          "procurement_eligible", "source_metadata", "row_sha256",
        ], resources.map((resource) => [resource.id, definitionId, resource.row_id, resource.ordinal,
          resource.section, resource.category, resource.title_ru, resource.row_type, resource.unit_id,
          resource.formula_id, resource.inclusion_ast, resource.resource_graph, resource.semantic_owner,
          resource.cost_owner_id, resource.procurement_eligible, resource.source_metadata, resource.row_sha256]));
        const priceBindings = (await client.query(`select source.row_id,binding.route_id::text route_id,binding.price_key,binding.priority
          from public.estimate_resource_spec source join public.estimate_resource_price_route_binding binding
            on binding.resource_spec_id=source.id where source.definition_version_id=$1`, [target.definition_version_id])).rows as Json[];
        invariant(priceBindings.length === resources.length, `STOP_R8_PRICE_BINDING_COUNT:${priceBindings.length}`);
        await insertRows(client, "estimate_resource_price_route_binding", [
          "resource_spec_id", "route_id", "price_key", "priority",
        ], priceBindings.map((binding) => [resourceIdByRow.get(String(binding.row_id)), binding.route_id, binding.price_key, binding.priority]));
        await client.query(`insert into public.estimate_approved_template_baseline(
            id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
            input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
            normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
            acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
          values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,
            $13::jsonb,$14::jsonb,$15::jsonb,$16,$17,clock_timestamp(),$18,$19)`, [
          baselineId, `${CONTRACT}:${fingerprint.slice(0, 16)}:${TARGET_CATALOG_ID}`,
          TARGET_CATALOG_ID, definitionId, target.definition_version_id, parameterSchemaSha256,
          JSON.stringify(sourceBaseline.input_values ?? {}), JSON.stringify(sourceBaseline.input_classification ?? {}),
          JSON.stringify(sourceBaseline.uom_by_parameter ?? {}), JSON.stringify(sourceBaseline.formula_consumer_ids ?? {}),
          JSON.stringify(sourceBaseline.resource_consumer_row_ids ?? {}), JSON.stringify(sourceBaseline.normative_source_ids ?? {}),
          JSON.stringify(Object.fromEntries(parameters.map((parameter) => [parameter.parameter_id, parameter.title_ru]))),
          JSON.stringify([...(sourceBaseline.proposal_source_refs ?? []), { contract: CONTRACT, masterSha256: MASTER_SHA256 }]),
          JSON.stringify([...(sourceBaseline.validation_scenario_refs ?? []), { scenario: "R8_COMPACTION_120_BOQ_QUALITY", acceptanceEvidenceSha256 }]),
          acceptanceEvidenceSha256, releaseId, target.approved_template_baseline_id, sourceBaseline.contract_version,
        ]);
        await client.query("update public.estimate_parameter_definition set approved_template_baseline_id=$2 where definition_version_id=$1", [definitionId, baselineId]);
        await client.query(`insert into public.estimate_content_passport_r3(
            definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
            physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
            formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
          values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14::jsonb,$15,$16,$17)`, [
          definitionId, releaseId, TARGET_CATALOG_ID, sourcePassport.contract_version,
          sourcePassport.identity_mode, sourcePassport.redirect_catalog_id, sourcePassport.physical_result_ru,
          JSON.stringify(sourcePassport.included_scope_ru ?? []), JSON.stringify(sourcePassport.excluded_scope_ru ?? []),
          JSON.stringify(sourcePassport.capability_matrix ?? {}), parameters.length, sourceFormulas.length, resources.length,
          JSON.stringify({ ...(sourcePassport.decision ?? {}), allowed: true, r8BoqQuality: "GREEN" }),
          sha256({ source: sourcePassport.payload_sha256, definitionSha256, parameterSchemaSha256 }), head, tree,
        ]);
        await client.query(`insert into public.estimate_normative_source(
            id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
          values($1,$2,$3,$4,$5,$6,'2015-01-01',$7::jsonb)
          on conflict(source_key) do nothing`, [
          uuid(`${CONTRACT}:source:${OFFICIAL_SOURCE_KEY}`), OFFICIAL_SOURCE_KEY,
          "КРЕР №27 «Автомобильные дороги»", "Министерство строительства Кыргызской Республики",
          OFFICIAL_SOURCE_URL, OFFICIAL_SOURCE_SHA256,
          JSON.stringify({ verifiedAt: "2026-09-11", contract: CONTRACT,
            useRestriction: "TABLES_27_06_019_020_ARE_FULL_PAVEMENT_RATES_NOT_STANDALONE_COMPACTION_PRODUCTIVITY" }),
        ]);
        const officialSource = (await client.query("select id::text from public.estimate_normative_source where source_key=$1", [OFFICIAL_SOURCE_KEY])).rows[0] as Json;
        for (const locator of [
          { tableCode: "27-06-019", pdfPage: 91, scope: "Покрытие из горячей асфальтобетонной смеси толщиной 5 см" },
          { tableCode: "27-06-020", pdfPage: 92, scope: "Покрытие из горячей асфальтобетонной смеси толщиной 4 см" },
        ]) {
          const locatorPayload = { ...locator, documentCode: "КРЕР №27", unit: "1000 m2 pavement",
            applicability: "FULL_PAVEMENT_ONLY_NOT_STANDALONE_COMPACTION_RATE" };
          const locatorKey = sha256(locatorPayload);
          await client.query(`insert into public.estimate_normative_locator(id,source_id,locator_key,locator,excerpt_sha256)
            values($1,$2,$3,$4::jsonb,null) on conflict(source_id,locator_key) do nothing`, [
            uuid(`${CONTRACT}:locator:${locatorKey}`), officialSource.id, locatorKey, JSON.stringify(locatorPayload),
          ]);
        }
        await client.query("update public.estimate_definition_version set content_status='CANDIDATE_READY',content_gate_status='GREEN' where id=$1", [definitionId]);
        await client.query(`update public.estimate_cumulative_manifest_entry set
            definition_version_id=$3,source_batch=$4,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
            approved_template_baseline_id=$5,baseline_ready=true,scenario_ready=true,definition_hash=$6,
            entry_sha256=$7,runtime_publication_state='CANDIDATE'
          where release_id=$1 and catalog_id=$2`, [
          releaseId, TARGET_CATALOG_ID, definitionId, CONTRACT, baselineId, definitionSha256,
          sha256({ contract: CONTRACT, releaseId, catalogId: TARGET_CATALOG_ID, definitionId, baselineId, definitionSha256 }),
        ]);
        const search = await cloneSearch(client, { releaseId, searchReleaseId,
          parentSearchReleaseId: predecessorSearchReleaseId, releaseKey, head, tree, fingerprint, consumerFields });
        const audit = (await client.query(`select count(*)::int identities,
            count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced,
            encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
          from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId, TARGET_CATALOG_ID, definitionId])).rows[0] as Json;
        const targetAudit = (await client.query(`select
            count(*)::int rows,
            count(*) filter(where resource_graph->>'costTreatment'='OWN_COST')::int payable,
            count(*) filter(where resource_graph->>'costTreatment'='INCLUDED_IN_RESOURCE_ROWS')::int included_scope,
            count(*) filter(where resource_graph->>'costTreatment'='INFORMATIONAL_SCOPE')::int informational,
            count(*) filter(where resource_graph->>'costTreatment'='CONTROL_OR_DOCUMENT')::int control_documents
          from public.estimate_resource_spec where definition_version_id=$1`, [definitionId])).rows[0] as Json;
        const parameterAudit = (await client.query(`select count(*)::int parameters,
            count(*) filter(where truth_metadata->>'visibility_role'='INTERNAL_ONLY'
              and truth_metadata->>'value_source_role' in ('NORM_REQUIRED_BUT_PROJECT_SELECTED','MANDATORY_NORM_VALUE'))::int source_managed,
            count(*) filter(where default_value is not null)::int defaults
          from public.estimate_parameter_definition where definition_version_id=$1`, [definitionId])).rows[0] as Json;
        invariant(Number(audit.identities) === 10_331 && Number(audit.replaced) === 1,
          `STOP_R8_MANIFEST_AUDIT:${JSON.stringify(audit)}`);
        invariant(Number(targetAudit.rows) === 11 && Number(targetAudit.payable) === 4
          && Number(targetAudit.included_scope) === 3 && Number(targetAudit.informational) === 1
          && Number(targetAudit.control_documents) === 3, `STOP_R8_RESOURCE_AUDIT:${JSON.stringify(targetAudit)}`);
        invariant(Number(parameterAudit.parameters) === 8 && Number(parameterAudit.source_managed) === 5
          && Number(parameterAudit.defaults) === 0, `STOP_R8_PARAMETER_AUDIT:${JSON.stringify(parameterAudit)}`);
        await client.query(`update public.estimate_definition_release set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
          metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId, audit.snapshot, JSON.stringify({ lifecycle: "PREPARED_NOT_ACTIVE", searchReleaseId,
            searchSnapshotSha256: search.snapshot_sha256, sourceManagedParameterCount: 5,
            payableResourceCount: 4, noDoubleCount: true }),
        ]);
        receipt = { status: APPLY ? "GREEN_R8_COMPACTION_SUCCESSOR_PREPARED_NOT_ACTIVE" : "GREEN_R8_COMPACTION_SUCCESSOR_DRY_RUN_ROLLED_BACK",
          idempotent: false, predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId,
            definitionId: target.definition_version_id }, successor: { releaseId, searchReleaseId, definitionId,
            baselineId, releaseKey }, fingerprint, audit: { manifest: audit, target: targetAudit, parameters: parameterAudit, search,
            officialSource: { sourceKey: OFFICIAL_SOURCE_KEY, artifactSha256: OFFICIAL_SOURCE_SHA256,
              quantityRateBindingCreated: false, reason: "full pavement tables are not a standalone compaction productivity rate" } } };
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
        invariant(residue === 0, `STOP_R8_DRY_RUN_RESIDUE:${residue}`);
        receipt.dryRunResidue = residue;
      }
      if (APPLY) {
        atomicJson(CURRENT_RELEASE_PATH, { ...current, definitionReleaseId: releaseId, searchReleaseId,
          definitionReleaseStatus: "prepared", searchReleaseStatus: "draft",
          definitionSnapshotSha256: receipt.audit.manifest.snapshot,
          manifestHashChainSha256: receipt.audit.manifest.snapshot,
          searchHashChainSha256: receipt.audit.search.snapshot_sha256,
          owner: "R4_A13_6_R8_COMPACTION_BOQ_QUALITY_OWNER", productionAccessed: false, fakeGreenClaimed: false });
      }
    }
    const body = { schemaVersion: `${CONTRACT}.receipt.v1`, capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY", source: { branch: EXPECTED_BRANCH, head, tree,
        sourceCodeSha256, sourceHashes }, masterSha256: MASTER_SHA256, targetCatalogId: TARGET_CATALOG_ID,
      ...receipt!, productionAccessed: false, deployPerformed: false, activationPerformed: false };
    const sealed = { ...body, receiptSha256: sha256(body) };
    if (APPLY && !receipt!.idempotent) atomicJson(resolve(OUTPUT_ROOT, `01_R8_COMPACTION_SUCCESSOR_${head}.json`), sealed);
    process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
