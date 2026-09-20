import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { ASPHALT_RELATED_EXTRA_PROFILES_V4 } from "../../../src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.r9-bridge-asphalt-completion.v1";
const MASTER_PATH = resolve("C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (1).md");
const MASTER_SHA256 = "684d0c00e02c83acfcbaeb48a763bd68e83865fd9242903b114baa7350dccda9";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const TARGET_CATALOG_ID = "canonical-work:expanded:bridge_asphalt";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/r9-complete-estimates");
const SOURCE_PATHS = [
  "scripts/estimate/r9/prepareR9BridgeAsphaltSuccessor.ts",
  "src/features/consumerRepair/ConsumerRepairItemRow.tsx",
  "src/features/consumerRepair/consumerCanonicalBaselineCompile.ts",
  "src/features/consumerRepair/consumerCanonicalParameterEditor.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateParameterValidation.ts",
  "src/lib/estimate/backendPlatform/formulaGraph.ts",
  "src/lib/estimate/v4/asphalt/asphaltRelatedSemanticRegistryV4.ts",
  "src/lib/estimate/v4/asphalt/compileAsphaltRelatedProfessionalEstimateV4.ts",
  "src/lib/estimate/v4/asphalt/compileAsphaltRelatedThroughCoreV4.ts",
] as const;

const KRER_27 = Object.freeze({
  sourceKey: "kg_krer_27_roadworks_2015",
  titleRu: "КРЕР № 27 «Автомобильные дороги»",
  authority: "Министерство строительства Кыргызской Республики",
  officialUrl: "https://minstroy.gov.kg/ru/state_program/download-pdf/no27avtomobilnyedorogi_compressed-43769083f584ff787.06841542.pdf",
  sha256: "cd3d6735d1bbdda5957945b7682f032785c76624b54a435edfe5d2ef5e107161",
  tableCode: "27-06-020",
  pdfPages: [93, 94],
  role: "Применимость устройства асфальтобетонного покрытия; числовая норма выбирается только после подтверждения варианта таблицы",
});
const KRER_30 = Object.freeze({
  sourceKey: "kg_krer_30_bridges_and_pipes_2015",
  titleRu: "КРЕР № 30 «Мосты и трубы»",
  authority: "Министерство строительства Кыргызской Республики",
  officialUrl: "https://minstroy.gov.kg/ru/state_program/download-pdf/no30mostyitruby_compressed-621690841154de352.85435259.pdf",
  sha256: "0383ccb68b8bdc1f23ef06f8301e0567e7dcc3a03b6fc31e489eaa84ac00c2df",
  tableCode: "30-08-035",
  pdfPages: [136, 137],
  role: "Применимость водоотвода и гидроизоляции проезжей части автодорожного моста; конкретный вариант расценки требует проектного подтверждения",
});

const WATERPROOFING_BRANCH_PARAMETERS = new Set([
  "waterproofing_repair_area_m2",
  "waterproofing_primer_rate_l_m2",
  "protective_layer_thickness_mm",
  "expansion_joint_length_m",
  "waterproofing_material_kg_m2",
  "protective_layer_density_t_m3",
  "expansion_joint_sealant_kg_m",
  "bridge_waterproofing_productivity_m2_per_man_hour",
  "bridge_waterproofing_machine_productivity_m2_per_machine_hour",
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
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname), `STOP_R9_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_R9_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function insertRows(client: Client, table: string, columns: readonly string[], rows: readonly unknown[][]): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    if (batch.length === 0) continue;
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `STOP_R9_INSERT_SHAPE:${table}`);
      return `(${row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      }).join(",")})`;
    });
    await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
  }
}

function sourceRowId(resource: Json): string {
  return String(resource.resource_graph?.sourceRowId ?? "");
}

function asphaltMass(layer: "binder" | "wearing"): string {
  const thickness = layer === "binder" ? "binder_layer_thickness_mm" : "wearing_layer_thickness_mm";
  return `area_m2 * ${thickness} / 1000 * asphalt_density_t_m3 * (1 + asphalt_waste_percent / 100)`;
}

function replacementExpression(rowId: string): string | null {
  const binderMass = asphaltMass("binder");
  const wearingMass = asphaltMass("wearing");
  const suffix = rowId.replace(/^bridge_asphalt:/u, "");
  const exact: Readonly<Record<string, string>> = {
    asphalt_layer_1_material: binderMass,
    asphalt_layer_2_material: wearingMass,
    surface_cleaner: "area_m2 / surface_cleaner_productivity_m2_per_machine_hour",
    bitumen_distributor: "area_m2 * 2 / bitumen_distributor_productivity_m2_per_machine_hour",
    asphalt_paver_layer_1: "area_m2 / paver_productivity_m2_per_machine_hour",
    smooth_roller_layer_1: "area_m2 / roller_productivity_m2_per_machine_hour",
    pneumatic_roller_layer_1: "area_m2 / pneumatic_roller_productivity_m2_per_machine_hour",
    asphalt_paver_layer_2: "area_m2 / paver_productivity_m2_per_machine_hour",
    smooth_roller_layer_2: "area_m2 / roller_productivity_m2_per_machine_hour",
    pneumatic_roller_layer_2: "area_m2 / pneumatic_roller_productivity_m2_per_machine_hour",
    asphalt_layer_1_delivery: `${binderMass} * asphalt_plant_distance_km`,
    asphalt_layer_1_truck_trips: `ceil((${binderMass}) / truck_payload_t)`,
    dump_trucks_layer_1: `ceil((${binderMass}) / truck_payload_t) * (2 * asphalt_plant_distance_km / truck_average_speed_km_per_machine_hour + truck_turnaround_machine_hours)`,
    asphalt_layer_2_delivery: `${wearingMass} * asphalt_plant_distance_km`,
    asphalt_layer_2_truck_trips: `ceil((${wearingMass}) / truck_payload_t)`,
    dump_trucks_layer_2: `ceil((${wearingMass}) / truck_payload_t) * (2 * asphalt_plant_distance_km / truck_average_speed_km_per_machine_hour + truck_turnaround_machine_hours)`,
    asphalt_temperature_control: `ceil((ceil((${binderMass}) / truck_payload_t) + ceil((${wearingMass}) / truck_payload_t)) / temperature_control_trips_per_test)`,
  };
  return exact[suffix] ?? null;
}

function waterproofingCondition(): Json {
  return {
    kind: "or",
    operands: [
      { kind: "equals", parameterId: "waterproofing_condition", value: "LOCAL_REPAIR_REQUIRED" },
      { kind: "equals", parameterId: "waterproofing_condition", value: "REPLACEMENT_REQUIRED" },
    ],
  };
}

function collectConditionParameterIds(raw: unknown, result = new Set<string>()): Set<string> {
  if (!raw || typeof raw !== "object") return result;
  if (Array.isArray(raw)) {
    for (const child of raw) collectConditionParameterIds(child, result);
    return result;
  }
  const value = raw as Json;
  const id = typeof value.parameterId === "string" ? value.parameterId : typeof value.id === "string" ? value.id : "";
  if (id) result.add(id);
  for (const child of Object.values(value)) collectConditionParameterIds(child, result);
  return result;
}

function pick(source: Json, keys: ReadonlySet<string>): Json {
  return Object.fromEntries(Object.entries(source ?? {}).filter(([key]) => keys.has(key)));
}

async function cloneSearch(client: Client, input: {
  releaseId: string;
  searchReleaseId: string;
  parentSearchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
  clarificationFields: Json[];
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
      source_provenance=source_provenance||jsonb_build_object('r9BridgeFocusedSchema',true,
        'r9DerivedGeometry','length_m*width_m','r9SourceManagedInputsVisible',true),
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$5,'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$2`, [
    input.searchReleaseId, TARGET_CATALOG_ID, input.clarificationFields.length,
    JSON.stringify(input.clarificationFields), CONTRACT,
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
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256, "STOP_R9_MASTER_SHA256_DRIFT");
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_R9_BRANCH_DRIFT");
  for (const path of SOURCE_PATHS) invariant(existsSync(resolve(path)), `STOP_R9_SOURCE_MISSING:${path}`);
  const profile = ASPHALT_RELATED_EXTRA_PROFILES_V4.find((candidate) => candidate.canonicalWorkKey === "bridge_asphalt");
  invariant(profile, "STOP_R9_BRIDGE_PROFILE_MISSING");
  const keepIds = new Set([...profile.requiredParameters, ...profile.optionalParameters]);
  invariant(keepIds.size === 49 && !keepIds.has("bridge_deck_package_required") && !keepIds.has("sand_layer_required"),
    `STOP_R9_BRIDGE_SCHEMA_SOURCE_DRIFT:${keepIds.size}`);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false, "STOP_R9_CURRENT_PRODUCTION_ACCESS_FLAG");

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r9-bridge-asphalt-successor" });
  await client.connect();
  let receipt: Json;
  try {
    const predecessorReleaseId = String(current.definitionReleaseId);
    const predecessorSearchReleaseId = String(current.searchReleaseId);
    const predecessor = (await client.query("select * from public.estimate_definition_release where id=$1", [predecessorReleaseId])).rows[0] as Json;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 10_331,
      "STOP_R9_PREDECESSOR_RELEASE_DRIFT");
    const target = (await client.query(`select manifest.*,definition.*,
        (select count(*)::int from public.estimate_parameter_definition where definition_version_id=manifest.definition_version_id) parameters,
        (select count(*)::int from public.estimate_formula_graph where definition_version_id=manifest.definition_version_id) formulas,
        (select count(*)::int from public.estimate_resource_spec where definition_version_id=manifest.definition_version_id) resources
      from public.estimate_cumulative_manifest_entry manifest
      join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
      where manifest.release_id=$1 and manifest.catalog_id=$2`, [predecessorReleaseId, TARGET_CATALOG_ID])).rows[0] as Json;
    invariant(target && Number(target.parameters) === 103 && Number(target.formulas) === 51 && Number(target.resources) === 51,
      `STOP_R9_TARGET_GEOMETRY_DRIFT:${JSON.stringify(target)}`);
    const fingerprint = sha256({ contract: CONTRACT, masterSha256: MASTER_SHA256,
      predecessorReleaseId, predecessorSearchReleaseId, sourceHashes, keepIds: [...keepIds].sort() });
    const releaseId = uuid(`${CONTRACT}:${fingerprint}:release`);
    const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search`);
    const definitionId = uuid(`${CONTRACT}:${fingerprint}:definition:${TARGET_CATALOG_ID}`);
    const baselineId = uuid(`${CONTRACT}:${fingerprint}:baseline:${TARGET_CATALOG_ID}`);
    const releaseKey = `r4-a13-6-r9-bridge-${fingerprint.slice(0, 16)}`;
    const existing = (await client.query("select status from public.estimate_definition_release where id=$1", [releaseId])).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared", "STOP_R9_EXISTING_RELEASE_DRIFT");
      receipt = { status: "GREEN_R9_BRIDGE_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE", idempotent: true,
        successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey }, fingerprint };
    } else {
      const sourceParameters = (await client.query("select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as Json[];
      const sourceFormulas = (await client.query("select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id", [target.definition_version_id])).rows as Json[];
      const sourceResources = (await client.query("select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal", [target.definition_version_id])).rows as Json[];
      const sourceBaseline = (await client.query("select * from public.estimate_approved_template_baseline where id=$1", [target.approved_template_baseline_id])).rows[0] as Json;
      const sourcePassport = (await client.query("select * from public.estimate_content_passport_r3 where definition_version_id=$1", [target.definition_version_id])).rows[0] as Json;
      invariant(sourceBaseline && sourcePassport, "STOP_R9_TARGET_EVIDENCE_MISSING");
      const operations = Number((await client.query("select count(*)::int value from public.estimate_operation_definition where definition_version_id=$1", [target.definition_version_id])).rows[0].value);
      const bindings = Number((await client.query("select count(*)::int value from public.estimate_work_normative_binding where definition_version_id=$1", [target.definition_version_id])).rows[0].value);
      invariant(operations === 0 && bindings === 0, `STOP_R9_UNCLONED_CHILD_TABLE:${operations}:${bindings}`);

      const resourceByFormula = new Map(sourceResources.map((resource) => [String(resource.formula_id), resource]));
      const formulas = sourceFormulas.map((formula): Json => {
        const resource = resourceByFormula.get(String(formula.formula_id));
        invariant(resource, `STOP_R9_FORMULA_RESOURCE_MISSING:${formula.formula_id}`);
        const expression = replacementExpression(sourceRowId(resource)) ?? String(formula.expression_source);
        const compiled = compileFormulaGraph(expression);
        invariant(compiled.inputParameterIds.every((parameterId) => keepIds.has(parameterId)),
          `STOP_R9_FORMULA_PARAMETER_OUTSIDE_SCHEMA:${formula.formula_id}:${compiled.inputParameterIds.join(",")}`);
        return { ...formula, definition_version_id: definitionId, expression_source: compiled.source,
          ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds, ast_sha256: sha256(compiled.ast) };
      });
      const formulaById = new Map(formulas.map((formula) => [String(formula.formula_id), formula]));
      const resourceIdByRow = new Map<string, string>();
      const resources = sourceResources.map((resource): Json => {
        const id = uuid(`${CONTRACT}:${fingerprint}:resource:${resource.row_id}`);
        resourceIdByRow.set(String(resource.row_id), id);
        const formula = formulaById.get(String(resource.formula_id));
        invariant(formula, `STOP_R9_RESOURCE_FORMULA_MISSING:${resource.formula_id}`);
        const sourceId = sourceRowId(resource);
        const bridgeRepairRow = sourceId.startsWith("bridge_asphalt:bridge:") && !sourceId.endsWith(":deck_acceptance");
        const inclusionAst = bridgeRepairRow ? waterproofingCondition() : resource.inclusion_ast;
        invariant([...collectConditionParameterIds(inclusionAst)].every((parameterId) => keepIds.has(parameterId)),
          `STOP_R9_INCLUSION_PARAMETER_OUTSIDE_SCHEMA:${resource.row_id}`);
        const resourceGraph = {
          ...(resource.resource_graph ?? {}),
          contract: CONTRACT,
          sourceExpression: formula.expression_source,
          quantityBasis: formula.expression_source,
          parameterSources: formula.input_parameter_ids,
          visibleDerivedAssumptions: sourceId.includes("asphalt_layer_")
            ? [{ reasonRu: "Два слоя заданы обязательными параметрами мостового профиля; коэффициенты 1000 и 100 — только преобразования мм→м и %→долю." }]
            : [],
          r9BridgeFocusedSchema: true,
        };
        const sourceMetadata = {
          ...(resource.source_metadata ?? {}),
          contract: CONTRACT,
          normativeTrace: [KRER_27, KRER_30].map((source) => ({
            sourceId: source.sourceKey,
            exactLocator: `${source.tableCode}; PDF pages ${source.pdfPages.join("–")}`,
            bindingStatus: "APPLICABILITY_ONLY_EXACT_VARIANT_REQUIRED_FOR_NUMERIC_RATE",
            role: source.role,
          })),
          r9FixtureConstantsRemoved: replacementExpression(sourceId) != null,
        };
        return { ...resource, id, definition_version_id: definitionId, inclusion_ast: inclusionAst,
          resource_graph: resourceGraph, source_metadata: sourceMetadata,
          row_sha256: sha256({ rowId: resource.row_id, formulaAstSha256: formula.ast_sha256,
            inclusionAst, resourceGraph, sourceMetadata }) };
      });
      const formulaConsumers = Object.fromEntries([...keepIds].map((parameterId) => [parameterId,
        formulas.filter((formula) => formula.input_parameter_ids.includes(parameterId)).map((formula) => formula.formula_id).sort()]));
      const resourceConsumers = Object.fromEntries([...keepIds].map((parameterId) => [parameterId,
        resources.filter((resource) => formulaById.get(String(resource.formula_id))?.input_parameter_ids.includes(parameterId)
          || collectConditionParameterIds(resource.inclusion_ast).has(parameterId)).map((resource) => resource.row_id).sort()]));
      const requiredIds = new Set(profile.requiredParameters);
      const conditional = waterproofingCondition();
      const parameters = sourceParameters.filter((parameter) => keepIds.has(String(parameter.parameter_id)))
        .map((parameter, ordinal): Json => {
          const parameterId = String(parameter.parameter_id);
          const branchParameter = WATERPROOFING_BRANCH_PARAMETERS.has(parameterId);
          const truth = {
            ...(parameter.truth_metadata ?? {}),
            contract: CONTRACT,
            formula_consumers: formulaConsumers[parameterId] ?? [],
            resource_branch_consumers: resourceConsumers[parameterId] ?? [],
            ...(branchParameter ? { required_when: conditional, visible_when: conditional } : {}),
            source_confirmation_required: parameter.truth_metadata?.source_confirmation_required === true,
            r9BridgeFocusedSchema: true,
          };
          return { ...parameter, definition_version_id: definitionId, ordinal,
            required: requiredIds.has(parameterId), default_value: null,
            constraints_json: { ...(parameter.constraints_json ?? {}), ...(branchParameter ? { requiredWhen: conditional } : {}) },
            truth_metadata: truth, approved_template_baseline_id: null };
        });
      invariant(parameters.length === keepIds.size, `STOP_R9_FILTERED_PARAMETER_COUNT:${parameters.length}`);
      const nextDefinitionVersion = Number((await client.query(
        "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
        [TARGET_CATALOG_ID],
      )).rows[0].value);
      const parameterSchemaSha256 = sha256(parameters.map((parameter) => ({ id: parameter.parameter_id,
        valueType: parameter.value_type, unit: parameter.unit_id, required: parameter.required,
        constraints: parameter.constraints_json, truth: parameter.truth_metadata })));
      const definitionSha256 = sha256({ contract: CONTRACT, predecessorDefinitionId: target.definition_version_id,
        parameters: parameters.map((value) => [value.parameter_id, value.required, value.truth_metadata]),
        formulas: formulas.map((value) => [value.formula_id, value.expression_source, value.ast_sha256]),
        resources: resources.map((value) => [value.row_id, value.inclusion_ast, value.row_sha256]) });
      const acceptanceEvidenceSha256 = sha256({ definitionSha256, parameterSchemaSha256,
        scenario: "bridge_asphalt_200x32_6400_m2", sourceSha256: [KRER_27.sha256, KRER_30.sha256] });
      const clarificationFields = parameters.filter((parameter) => parameter.truth_metadata?.visibility_role === "USER_INPUT"
        && (parameter.required || (parameter.truth_metadata?.resource_branch_consumers ?? []).length > 0))
        .map((parameter) => ({ parameterId: parameter.parameter_id, titleRu: parameter.title_ru,
          unitId: parameter.unit_id, required: parameter.required, requiredWhen: parameter.truth_metadata.required_when ?? null }));
      const baselineInputIds = new Set([...keepIds].filter((parameterId) =>
        Object.prototype.hasOwnProperty.call(sourceBaseline.input_values, parameterId)
        && resourceConsumers[parameterId]?.length > 0));
      const baselineInputValues = pick(sourceBaseline.input_values, baselineInputIds);
      const baselineClassification = Object.fromEntries([...baselineInputIds]
        .map((parameterId) => [parameterId, "VALIDATION_FIXTURE"]));
      const baselineUom = pick(sourceBaseline.uom_by_parameter, baselineInputIds);

      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,definition_count,resource_row_count,
            metadata||$6::jsonb,$7,$8,parameter_count-$9+$10,formula_count
          from public.estimate_definition_release where id=$7`, [
          releaseId, releaseKey, head, tree, sha256(`${CONTRACT}:${fingerprint}:draft`),
          JSON.stringify({ contract: CONTRACT, masterSha256: MASTER_SHA256, sourceHashes,
            lifecycle: "DRAFT_FORWARD_ONLY", sourceFingerprint: fingerprint, replacedDefinitionCount: 1,
            targetCatalogId: TARGET_CATALOG_ID, activationAllowed: false, productionEligible: false }),
          predecessorReleaseId, sha256({ contract: CONTRACT, fingerprint, definitionSha256 }),
          Number(target.parameters), parameters.length,
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
          JSON.stringify({ ...(target.passport ?? {}), contract: CONTRACT, schemaFocus: "BRIDGE_ASPHALT" }),
          JSON.stringify(target.applicability ?? {}), definitionSha256,
          JSON.stringify({ ...(target.source_metadata ?? {}), contract: CONTRACT,
            predecessorDefinitionId: target.definition_version_id, parameterSchemaSha256,
            acceptanceEvidenceSha256, exactGeometryScenario: "200*32=6400 m2" }),
        ]);
        await insertRows(client, "estimate_parameter_definition", [
          "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
          "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
        ], parameters.map((parameter) => [definitionId, parameter.parameter_id, parameter.ordinal,
          parameter.value_type, parameter.unit_id, parameter.title_ru, parameter.required, null,
          parameter.constraints_json, parameter.truth_metadata, null]));
        await insertRows(client, "estimate_formula_graph", [
          "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast", "input_parameter_ids", "ast_sha256",
        ], formulas.map((formula) => [definitionId, formula.formula_id, formula.output_unit_id,
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
        invariant(priceBindings.length === resources.length, `STOP_R9_PRICE_BINDING_COUNT:${priceBindings.length}`);
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
          JSON.stringify(baselineInputValues), JSON.stringify(baselineClassification), JSON.stringify(baselineUom),
          JSON.stringify(formulaConsumers), JSON.stringify(resourceConsumers),
          JSON.stringify(Object.fromEntries([...baselineInputIds]
            .map((parameterId) => [parameterId, [KRER_27.sourceKey, KRER_30.sourceKey]]))),
          JSON.stringify(Object.fromEntries(parameters.map((parameter) => [parameter.parameter_id, parameter.title_ru]))),
          JSON.stringify([...(sourceBaseline.proposal_source_refs ?? []), { contract: CONTRACT, masterSha256: MASTER_SHA256 }]),
          JSON.stringify([...(sourceBaseline.validation_scenario_refs ?? []), {
            scenario: "R9_BRIDGE_ASPHALT_200_X_32_EQUALS_6400", acceptanceEvidenceSha256,
          }]), acceptanceEvidenceSha256, releaseId, target.approved_template_baseline_id, sourceBaseline.contract_version,
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
          JSON.stringify(sourcePassport.capability_matrix ?? {}), parameters.length, formulas.length, resources.length,
          JSON.stringify({ ...(sourcePassport.decision ?? {}), allowed: true, r9BridgeCompletion: "GREEN" }),
          sha256({ source: sourcePassport.payload_sha256, definitionSha256, parameterSchemaSha256 }), head, tree,
        ]);
        await client.query(`update public.estimate_definition_version
          set content_status='CANDIDATE_READY',content_gate_status='GREEN'
          where id=$1 and release_id=$2 and catalog_id=$3`, [definitionId, releaseId, TARGET_CATALOG_ID]);
        for (const source of [KRER_27, KRER_30]) {
          await client.query(`insert into public.estimate_normative_source(
              id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
            values($1,$2,$3,$4,$5,$6,'2015-01-01',$7::jsonb)
            on conflict(source_key) do update set official_url=excluded.official_url,
              artifact_sha256=excluded.artifact_sha256,metadata=public.estimate_normative_source.metadata||excluded.metadata`, [
            uuid(`${CONTRACT}:source:${source.sourceKey}`), source.sourceKey, source.titleRu, source.authority,
            source.officialUrl, source.sha256, JSON.stringify({ verifiedAt: "2026-09-11", contract: CONTRACT,
              useRestriction: "APPLICABILITY_ONLY_EXACT_VARIANT_REQUIRED_FOR_NUMERIC_RATE" }),
          ]);
          const sourceId = String((await client.query("select id::text from public.estimate_normative_source where source_key=$1", [source.sourceKey])).rows[0].id);
          const locator = { documentCode: source.titleRu, tableCode: source.tableCode,
            pdfPages: source.pdfPages, role: source.role, bindingStatus: "APPLICABILITY_ONLY" };
          const locatorKey = sha256(locator);
          await client.query(`insert into public.estimate_normative_locator(id,source_id,locator_key,locator,excerpt_sha256)
            values($1,$2,$3,$4::jsonb,null) on conflict(source_id,locator_key) do nothing`, [
            uuid(`${CONTRACT}:locator:${locatorKey}`), sourceId, locatorKey, JSON.stringify(locator),
          ]);
        }
        await client.query(`update public.estimate_cumulative_manifest_entry set
            definition_version_id=$3,source_batch=$4,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
            approved_template_baseline_id=$5,baseline_ready=true,scenario_ready=true,definition_hash=$6,
            entry_sha256=$7,runtime_publication_state='CANDIDATE'
          where release_id=$1 and catalog_id=$2`, [
          releaseId, TARGET_CATALOG_ID, definitionId, CONTRACT, baselineId, definitionSha256,
          sha256({ contract: CONTRACT, releaseId, catalogId: TARGET_CATALOG_ID, definitionId, baselineId, definitionSha256 }),
        ]);
        const search = await cloneSearch(client, { releaseId, searchReleaseId,
          parentSearchReleaseId: predecessorSearchReleaseId, releaseKey, head, tree, fingerprint, clarificationFields });
        const audit = (await client.query(`select count(*)::int identities,
            count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced,
            encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
          from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId, TARGET_CATALOG_ID, definitionId])).rows[0] as Json;
        const parameterAudit = (await client.query(`select count(*)::int parameters,
            count(*) filter(where required)::int required,
            count(*) filter(where truth_metadata ? 'required_when')::int conditional,
            count(*) filter(where default_value is not null)::int defaults
          from public.estimate_parameter_definition where definition_version_id=$1`, [definitionId])).rows[0] as Json;
        const formulaAudit = (await client.query(`select count(*)::int formulas,
            count(*) filter(where expression_source ~ '17\\.4276|14\\.523|120 \\* area_m2 / 120')::int fixture_expressions
          from public.estimate_formula_graph where definition_version_id=$1`, [definitionId])).rows[0] as Json;
        const resourceAudit = (await client.query(`select count(*)::int resources,
            count(*) filter(where inclusion_ast::text like '%bridge_deck_package_required%')::int obsolete_branches,
            count(*) filter(where inclusion_ast::text like '%waterproofing_condition%')::int waterproofing_branches
          from public.estimate_resource_spec where definition_version_id=$1`, [definitionId])).rows[0] as Json;
        invariant(Number(audit.identities) === 10_331 && Number(audit.replaced) === 1,
          `STOP_R9_MANIFEST_AUDIT:${JSON.stringify(audit)}`);
        invariant(Number(parameterAudit.parameters) === 49 && Number(parameterAudit.required) === profile.requiredParameters.length
          && Number(parameterAudit.conditional) === WATERPROOFING_BRANCH_PARAMETERS.size && Number(parameterAudit.defaults) === 0,
        `STOP_R9_PARAMETER_AUDIT:${JSON.stringify(parameterAudit)}`);
        invariant(Number(formulaAudit.formulas) === 51 && Number(formulaAudit.fixture_expressions) === 0,
          `STOP_R9_FORMULA_AUDIT:${JSON.stringify(formulaAudit)}`);
        invariant(Number(resourceAudit.resources) === 51 && Number(resourceAudit.obsolete_branches) === 0
          && Number(resourceAudit.waterproofing_branches) === 7,
        `STOP_R9_RESOURCE_AUDIT:${JSON.stringify(resourceAudit)}`);
        await client.query(`update public.estimate_definition_release set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
          metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId, audit.snapshot, JSON.stringify({ lifecycle: "PREPARED_NOT_ACTIVE", searchReleaseId,
            searchSnapshotSha256: search.snapshot_sha256, bridgeParameterCount: parameters.length,
            exactGeometryScenario: "200*32=6400 m2", fixtureFormulaCount: 0 }),
        ]);
        receipt = { status: APPLY ? "GREEN_R9_BRIDGE_SUCCESSOR_PREPARED_NOT_ACTIVE" : "GREEN_R9_BRIDGE_SUCCESSOR_DRY_RUN_ROLLED_BACK",
          idempotent: false, predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId,
            definitionId: target.definition_version_id }, successor: { releaseId, searchReleaseId, definitionId,
            baselineId, releaseKey }, fingerprint, audit: { manifest: audit, parameters: parameterAudit,
            formulas: formulaAudit, resources: resourceAudit, search,
            officialSources: [KRER_27, KRER_30].map((source) => ({ sourceKey: source.sourceKey,
              artifactSha256: source.sha256, numericRateBound: false })) } };
        if (APPLY) await client.query("commit"); else await client.query("rollback");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
      if (!APPLY) {
        const residue = Number((await client.query(`select
            (select count(*) from public.estimate_definition_release where id=$1)+
            (select count(*) from public.estimate_search_index_release where id=$2) value`, [releaseId, searchReleaseId])).rows[0].value);
        invariant(residue === 0, `STOP_R9_DRY_RUN_RESIDUE:${residue}`);
        receipt.dryRunResidue = residue;
      } else {
        atomicJson(CURRENT_RELEASE_PATH, { ...current, definitionReleaseId: releaseId, searchReleaseId,
          definitionReleaseStatus: "prepared", searchReleaseStatus: "draft",
          definitionSnapshotSha256: receipt.audit.manifest.snapshot,
          manifestHashChainSha256: receipt.audit.manifest.snapshot,
          searchHashChainSha256: receipt.audit.search.snapshot_sha256,
          owner: "R4_A13_6_R9_BRIDGE_ASPHALT_COMPLETION_OWNER", productionAccessed: false, fakeGreenClaimed: false });
      }
    }
    const body = { schemaVersion: `${CONTRACT}.receipt.v1`, capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY", source: { branch: EXPECTED_BRANCH, head, tree,
        sourceHashes }, masterSha256: MASTER_SHA256, targetCatalogId: TARGET_CATALOG_ID,
      ...receipt!, productionAccessed: false, deployPerformed: false, activationPerformed: false };
    const sealed = { ...body, receiptSha256: sha256(body) };
    if (APPLY && !receipt!.idempotent) atomicJson(resolve(OUTPUT_ROOT, `02_R9_BRIDGE_SUCCESSOR_${head}.json`), sealed);
    process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
