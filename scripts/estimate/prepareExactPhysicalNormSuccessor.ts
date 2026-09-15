import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../../src/lib/estimate/backendPlatform/formulaGraph";
import {
  RICS_NRM2_FORMWORK_NORM_ID,
  RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS,
  RICS_NRM2_FORMWORK_SOURCE_ID,
  RICS_NRM2_FORMWORK_SOURCE_METADATA,
  resolveProfessionalPhysicalNormParameterValuesV1,
} from "../../src/lib/estimate/v4/domainFactory";
import type { ProfessionalParameterValueV4 } from "../../src/lib/estimate/v4/professionalProjectAssemblyV4";

type Json = Record<string, any>;

type ExactParameter = {
  parameterId: string;
  titleRu: string;
  valueType: "decimal" | "enum" | "text";
  unitId: string | null;
  constraints: Json;
  visibilityRole: "USER_INPUT" | "INTERNAL_ONLY";
  valueSourceRole: string;
  guideRu: string;
};

type ExactPhysicalNormProfile = {
  profileId: string;
  targetCatalogId: string;
  primaryMeasureParameterId: string;
  canonicalTitleRu: string;
  physicalResultRu: string;
  includedScopeRu: readonly string[];
  excludedScopeRu: readonly string[];
  parameters: readonly ExactParameter[];
  baselineParameters: Json;
  baselineClassification: Json;
  formulaId: string;
  expression: string;
  outputUnitId: string;
  rowId: string;
  rowTitleRu: string;
  section: string;
  category: string;
  rowType: string;
  procurementEligible: boolean;
  sourceId: string;
  normId: string;
  sourceTitle: string;
  sourceAuthority: string;
  sourceUrl: string;
  sourceVersion: string;
  sourceDefinitionHash: string;
  exactLocator: string;
  effectiveFrom: string;
  physicalBinding: Json;
  scenarioParameters: Json;
  sensitivityParameters: Json;
  negativeParameters: Json;
  expectedScenarioQuantity: number;
  expectedSensitivityQuantity: number;
  forbiddenSourceIds: readonly string[];
};

const CONTRACT = "rik-expo-app.r4-a13-6.exact-physical-norm-successor.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (5).md",
);
const MASTER_SHA256 = "acd012705f74c90c9fc7a3483dcd2b2f7b929ef090ba4be6482d059c359dedc0";
const DEFAULT_PREDECESSOR_RELEASE_ID = "90d4d971-2725-5ccd-96be-209be6d253cc";
const DEFAULT_PREDECESSOR_SEARCH_RELEASE_ID = "06820680-b6b7-5341-b549-8ee2800b40c1";
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/exact-physical-norm-successors");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");

const argValue = (name: string): string | null => {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
};

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
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_EXACT_NORM_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_EXACT_NORM_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
}

async function insertRows(
  client: Client,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `STOP_EXACT_NORM_INSERT_SHAPE:${table}`);
      return `(${row.map((value) => {
        values.push(value);
        return `$${values.length}`;
      }).join(",")})`;
    });
    if (tuples.length > 0) {
      await client.query(`insert into public.${table}(${columns.join(",")}) values ${tuples.join(",")}`, values);
    }
  }
}

function explicitValue(
  value: string | number | boolean,
  parameterId: string,
): ProfessionalParameterValueV4 {
  return {
    value,
    unit_id: parameterId.endsWith("_m2") ? "m2" : null,
    source_type: parameterId === "product_profile_id" ? "APPLICABLE_NORM" : "USER_EXPLICIT",
    source_id: `${CONTRACT}:${parameterId}`,
    captured_at: "2026-09-15T00:00:00+06:00",
    confidence: "high",
    applicability: "Exact candidate acceptance input",
  };
}

function formworkResolution(parameters: Json) {
  return resolveProfessionalPhysicalNormParameterValuesV1({
    technology_class: "FORMWORK_MEASUREMENT",
    operation_class: "MEASURE",
    material_system: "FORMWORK_CONTACT_AREA",
    scope_mode: "FULL_APPLICABLE_SCOPE",
    parameter_values: Object.fromEntries(Object.entries(parameters).map(([parameterId, value]) => [
      parameterId,
      explicitValue(value as string | number | boolean, parameterId),
    ])),
  });
}

const FORMWORK_PARAMETERS: readonly ExactParameter[] = Object.freeze([
  {
    parameterId: "product_profile_id",
    titleRu: "Профиль нормативного измерения",
    valueType: "enum",
    unitId: null,
    constraints: { values: [RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID] },
    visibilityRole: "INTERNAL_ONLY",
    valueSourceRole: "MANDATORY_NORM_VALUE",
    guideRu: "Определяется точной identity RICS NRM 2 и не подменяется пользовательским допущением.",
  },
  {
    parameterId: "measured_formwork_contact_area_m2",
    titleRu: "Измеренная площадь контакта опалубки, м²",
    valueType: "decimal",
    unitId: "m2",
    constraints: { min: 0.0001 },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "USER_MEASURED",
    guideRu: "Введите итоговую площадь всех учитываемых граней после проектных вычетов.",
  },
  {
    parameterId: "project_drawing_reference",
    titleRu: "Чертёж и ревизия обмера",
    valueType: "text",
    unitId: null,
    constraints: { maxLength: 500 },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_DOCUMENTATION",
    guideRu: "Укажите чертёж и ревизию, по которым выполнен обмер.",
  },
  {
    parameterId: "element_type",
    titleRu: "Тип бетонного элемента",
    valueType: "text",
    unitId: null,
    constraints: { maxLength: 300 },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_DOCUMENTATION",
    guideRu: "Укажите точный элемент: стена, колонна, балка, плита, фундамент или иной.",
  },
  {
    parameterId: "element_dimensions_and_face_count",
    titleRu: "Размеры и число измеряемых граней",
    valueType: "text",
    unitId: null,
    constraints: { maxLength: 1_000 },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "USER_MEASURED",
    guideRu: "Укажите размеры и число граней либо ссылку на размерную схему.",
  },
  {
    parameterId: "plain_or_special_finish",
    titleRu: "Класс отделки поверхности",
    valueType: "text",
    unitId: null,
    constraints: { maxLength: 500 },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_DOCUMENTATION",
    guideRu: "Допустимо PLAIN либо SPECIAL: с точным описанием.",
  },
  {
    parameterId: "vertical_battered_horizontal_or_curved_class",
    titleRu: "Класс геометрии",
    valueType: "text",
    unitId: null,
    constraints: { maxLength: 500 },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_DOCUMENTATION",
    guideRu: "Допустимо VERTICAL, HORIZONTAL, BATTERED:… либо CURVED:….",
  },
  {
    parameterId: "single_or_double_sided_scope",
    titleRu: "Одно- или двусторонняя опалубка",
    valueType: "enum",
    unitId: null,
    constraints: { values: ["SINGLE_SIDED", "DOUBLE_SIDED"] },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_DOCUMENTATION",
    guideRu: "Выберите фактическую измеряемую сторону конструкции.",
  },
  {
    parameterId: "openings_voids_and_deduction_rule",
    titleRu: "Проектное правило проёмов и пустот",
    valueType: "text",
    unitId: null,
    constraints: { maxLength: 1_000 },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_DOCUMENTATION",
    guideRu: "Укажите правило в формате PROJECT_RULE:….",
  },
  {
    parameterId: "permanent_or_removable_formwork",
    titleRu: "Съёмная или несъёмная опалубка",
    valueType: "enum",
    unitId: null,
    constraints: { values: ["PERMANENT", "REMOVABLE"] },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_DOCUMENTATION",
    guideRu: "Выберите фактический тип опалубки.",
  },
  {
    parameterId: "project_measurement_rule_reference",
    titleRu: "Подтверждение правила измерения RICS NRM 2",
    valueType: "text",
    unitId: null,
    constraints: { maxLength: 1_000 },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "PROJECT_DOCUMENTATION",
    guideRu: "Укажите RICS_NRM2_WS11_CONFIRMED: и проектную ревизию.",
  },
  {
    parameterId: "estimator_approval_reference",
    titleRu: "Согласование обмера сметчиком",
    valueType: "text",
    unitId: null,
    constraints: { maxLength: 500 },
    visibilityRole: "USER_INPUT",
    valueSourceRole: "ENGINEERING_DESIGN",
    guideRu: "Укажите идентификатор согласования итогового обмера.",
  },
]);

const FORMWORK_SCENARIO = Object.freeze({
  product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
  measured_formwork_contact_area_m2: 100,
  project_drawing_reference: "FW-01-REV-A",
  element_type: "WALL",
  element_dimensions_and_face_count: "50 m x 2 m x 1 measured face",
  plain_or_special_finish: "PLAIN",
  vertical_battered_horizontal_or_curved_class: "VERTICAL",
  single_or_double_sided_scope: "SINGLE_SIDED",
  openings_voids_and_deduction_rule: "PROJECT_RULE:no openings in measured scope",
  permanent_or_removable_formwork: "REMOVABLE",
  project_measurement_rule_reference: "RICS_NRM2_WS11_CONFIRMED:FW-01-REV-A",
  estimator_approval_reference: "EST-FW-01",
});

const PROFILES: Readonly<Record<string, ExactPhysicalNormProfile>> = Object.freeze({
  "formwork-rics-nrm2": {
    profileId: "formwork-rics-nrm2",
    targetCatalogId: "canonical-work:base:concrete_foundation_interior_formwork_form_standard",
    primaryMeasureParameterId: "measured_formwork_contact_area_m2",
    canonicalTitleRu: "Монтаж и демонтаж опалубки по измеренной площади контакта RICS NRM 2",
    physicalResultRu: "Опалубка бетонного элемента по утверждённой измеренной площади контакта",
    includedScopeRu: [
      "Одна точно измеренная площадь контакта с готовым бетоном после учёта граней, проёмов и пустот.",
      "Классификация элемента, геометрии, отделки, сторонности и съёмности по проекту.",
      "Количество работы в м² без автоматического коэффициента м²/м³.",
    ],
    excludedScopeRu: [
      "RICS NRM 2 не задаёт универсальный расход опалубочного материала, трудозатраты или цену.",
      "Материалы, аренда, доставка и упаковки не добавляются без отдельной применимой нормы и проектных данных.",
      "Универсальный коэффициент 2,4 м²/м³ и упаковка 50 м² запрещены.",
    ],
    parameters: FORMWORK_PARAMETERS,
    baselineParameters: { product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID },
    baselineClassification: { product_profile_id: "NORMATIVE" },
    formulaId: "rics_nrm2_formwork_measured_contact_area_v1",
    expression: "round_to(measured_formwork_contact_area_m2 * 1, 4)",
    outputUnitId: "m2",
    rowId: "formwork:rics-nrm2:measured-contact-area:work",
    rowTitleRu: "Монтаж и демонтаж опалубки по измеренной площади контакта",
    section: "Работы",
    category: "construction_work",
    rowType: "labor",
    procurementEligible: false,
    sourceId: RICS_NRM2_FORMWORK_SOURCE_ID,
    normId: RICS_NRM2_FORMWORK_NORM_ID,
    sourceTitle: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_title,
    sourceAuthority: "Royal Institution of Chartered Surveyors",
    sourceUrl: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_url,
    sourceVersion: RICS_NRM2_FORMWORK_SOURCE_METADATA.source_document_version,
    sourceDefinitionHash: RICS_NRM2_FORMWORK_SOURCE_METADATA.definition_hash,
    exactLocator: RICS_NRM2_FORMWORK_SOURCE_METADATA.exact_locator,
    effectiveFrom: "2021-12-01",
    physicalBinding: {
      technology_class: "FORMWORK_MEASUREMENT",
      operation_class: "MEASURE",
      material_system: "FORMWORK_CONTACT_AREA",
      scope_mode: "FULL_APPLICABLE_SCOPE",
      product_profile_id: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
      consumed_parameter_ids: [...RICS_NRM2_FORMWORK_REQUIRED_EXPLICIT_PARAMETER_IDS],
    },
    scenarioParameters: FORMWORK_SCENARIO,
    sensitivityParameters: { ...FORMWORK_SCENARIO, measured_formwork_contact_area_m2: 120 },
    negativeParameters: { ...FORMWORK_SCENARIO, project_measurement_rule_reference: "UNCONFIRMED" },
    expectedScenarioQuantity: 100,
    expectedSensitivityQuantity: 120,
    forbiddenSourceIds: ["src_professional_norm_pack_formwork_contact_area_m2_m3_concrete_element_v1"],
  },
});

async function verifyProfileThroughExistingCore(profile: ExactPhysicalNormProfile): Promise<Json> {
  const formula = compileFormulaGraph(profile.expression);
  const parameterDefinitions = profile.parameters.map((parameter, ordinal) => ({
    parameter_id: parameter.parameterId,
    ordinal,
    value_type: parameter.valueType,
    unit_id: parameter.unitId,
    title_ru: parameter.titleRu,
    required: true,
    default_value: null,
    constraints_json: parameter.constraints,
    truth_metadata: {
      visibility_role: parameter.visibilityRole,
      value_source_role: parameter.valueSourceRole,
      preliminary_compilation_allowed: false,
    },
  }));
  const normativeTrace = [{
    document_code: profile.sourceId,
    source_id: profile.sourceId,
    sourceId: profile.sourceId,
    norm_id: profile.normId,
    normId: profile.normId,
    source_document_version: profile.sourceVersion,
    normVersion: profile.sourceVersion,
    source_definition_hash: profile.sourceDefinitionHash,
    exact_locator: profile.exactLocator,
    source_url: profile.sourceUrl,
  }];
  const resource = {
    id: "preflight-resource",
    row_id: profile.rowId,
    ordinal: 0,
    section: profile.section,
    category: profile.category,
    title_ru: profile.rowTitleRu,
    row_type: profile.rowType,
    unit_id: profile.outputUnitId,
    formula_id: profile.formulaId,
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: {
      professionalPhysicalNormBindingV1: profile.physicalBinding,
      costTreatment: "DIRECT_PAYABLE_ROW",
    },
    semantic_owner: `physical-norm:${profile.normId}`,
    cost_owner_id: null,
    procurement_eligible: profile.procurementEligible,
    source_metadata: {
      contract: CONTRACT,
      normativeTrace,
      synthetic: false,
      originalQuantityFormula: profile.expression,
      runtimeExpressionSource: profile.expression,
    },
    row_sha256: sha256({ profileId: profile.profileId, rowId: profile.rowId }),
  };
  const compile = async (parameters: Json) => compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compile-core-r1",
    catalogId: profile.targetCatalogId,
    primaryMeasureParameterId: profile.primaryMeasureParameterId,
    parameterDefinitions,
    formulaDefinitions: [{
      formula_id: profile.formulaId,
      ast: formula.ast,
      input_parameter_ids: formula.inputParameterIds,
      ast_sha256: sha256(formula.ast),
    }],
    resourceDefinitions: [resource],
    submittedParameters: parameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceSnapshotIds: [],
    priceItems: [],
    rowOverrides: {},
    customRows: [],
    maximumResourceRows: 500,
    hashJson: async (value: unknown) => sha256(value),
  });
  const scenarioResolution = formworkResolution(profile.scenarioParameters);
  const sensitivityResolution = formworkResolution(profile.sensitivityParameters);
  const negativeResolution = formworkResolution(profile.negativeParameters);
  invariant(scenarioResolution.status === "APPLIED"
    && scenarioResolution.calculated_formwork_measured_contact_area_m2 === profile.expectedScenarioQuantity,
  `STOP_EXACT_NORM_SCENARIO_RESOLUTION:${scenarioResolution.status}`);
  invariant(sensitivityResolution.status === "APPLIED"
    && sensitivityResolution.calculated_formwork_measured_contact_area_m2 === profile.expectedSensitivityQuantity,
  `STOP_EXACT_NORM_SENSITIVITY_RESOLUTION:${sensitivityResolution.status}`);
  invariant(negativeResolution.status !== "APPLIED", "STOP_EXACT_NORM_NEGATIVE_RESOLUTION_APPLIED");
  const scenario = await compile(profile.scenarioParameters);
  const sensitivity = await compile(profile.sensitivityParameters);
  invariant(Number(scenario.rows[0]?.quantity) === profile.expectedScenarioQuantity,
    `STOP_EXACT_NORM_SCENARIO_QUANTITY:${String(scenario.rows[0]?.quantity)}`);
  invariant(Number(sensitivity.rows[0]?.quantity) === profile.expectedSensitivityQuantity,
    `STOP_EXACT_NORM_SENSITIVITY_QUANTITY:${String(sensitivity.rows[0]?.quantity)}`);
  invariant(scenario.rows[0]?.unit_price == null && scenario.rows[0]?.amount == null,
    "STOP_EXACT_NORM_UNKNOWN_PRICE_NOT_NULL");
  invariant(scenario.rows[0]?.included_in_procurement === false,
    "STOP_EXACT_NORM_NON_PROCUREMENT_ROW_INCLUDED");
  return {
    formula: { source: formula.source, astSha256: sha256(formula.ast), inputs: formula.inputParameterIds },
    scenario: { quantity: scenario.rows[0]?.quantity, rowCount: scenario.rows.length, totals: scenario.totals },
    sensitivity: { quantity: sensitivity.rows[0]?.quantity, rowCount: sensitivity.rows.length },
    negative: { status: negativeResolution.status, blockers: negativeResolution.blockers },
    physicalResolutionSha256: scenarioResolution.deterministic_hash,
  };
}

async function cloneSearch(client: Client, input: {
  profile: ExactPhysicalNormProfile;
  predecessorSearchReleaseId: string;
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  head: string;
  tree: string;
  fingerprint: string;
}): Promise<Json> {
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
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, input.predecessorSearchReleaseId,
    input.releaseId, input.fingerprint,
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
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=$2 and manifest.catalog_id=source.catalog_id
    where source.search_release_id=$4`, [
    input.searchReleaseId, input.releaseId, CONTRACT, input.predecessorSearchReleaseId, input.fingerprint,
  ]);
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
  const clarificationFields = input.profile.parameters
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .map((parameter) => ({
      parameterId: parameter.parameterId,
      titleRu: parameter.titleRu,
      unitId: parameter.unitId,
    }));
  await client.query(`update public.estimate_search_document set
      canonical_name_ru=$3,primary_uom=$4,short_scope_ru=$5,included_boundaries=$6::jsonb,
      excluded_boundaries=$7::jsonb,required_inputs_count=$8,clarification_fields=$9::jsonb,
      normative_classifiers=$10::jsonb,applicability_tags=$11::jsonb,
      source_provenance=source_provenance||jsonb_build_object('exactPhysicalNormProfile',$12::text),
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$12,'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$2`, [
    input.searchReleaseId, input.profile.targetCatalogId, input.profile.canonicalTitleRu,
    input.profile.outputUnitId, input.profile.physicalResultRu,
    JSON.stringify(input.profile.includedScopeRu), JSON.stringify(input.profile.excludedScopeRu),
    clarificationFields.length, JSON.stringify(clarificationFields),
    JSON.stringify([input.profile.normId, input.profile.sourceId]),
    JSON.stringify(["EXACT_PROJECT_MEASUREMENT", "NO_AUTOMATIC_M2_PER_M3", "NO_PACKAGE_ASSUMPTION"]),
    input.profile.profileId,
  ]);
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId, snapshot.snapshot_sha256,
    JSON.stringify({ documentCount: snapshot.documents, visibleCount: snapshot.visible,
      targetCatalogId: input.profile.targetCatalogId, exactPhysicalNormProfile: input.profile.profileId }),
  ]);
  return snapshot;
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_EXACT_NORM_MASTER_SHA256_DRIFT");
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_EXACT_NORM_BRANCH_DRIFT");
  const profileId = argValue("--profile") ?? "formwork-rics-nrm2";
  const profile = PROFILES[profileId];
  invariant(profile, `STOP_EXACT_NORM_PROFILE_UNKNOWN:${profileId}`);
  const predecessorReleaseId = argValue("--predecessor-release-id") ?? DEFAULT_PREDECESSOR_RELEASE_ID;
  const predecessorSearchReleaseId = argValue("--predecessor-search-release-id")
    ?? DEFAULT_PREDECESSOR_SEARCH_RELEASE_ID;
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourcePaths = [
    "scripts/estimate/prepareExactPhysicalNormSuccessor.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimateForemanAdapter.ts",
    "src/lib/estimate/backendPlatform/canonicalEstimatePhysicalNormProjection.ts",
    "src/lib/estimate/backendPlatform/formulaGraph.ts",
    "src/lib/estimate/professionalNormSourceAdmission.ts",
    "src/lib/estimate/v4/domainFactory/formworkRicsNrm2PhysicalNormV1.ts",
    "src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1.ts",
    "src/lib/estimate/ownedDomain/formworkRicsNrm2ProductionBindingV1.ts",
    "data/estimate-norms/professional/formwork.json",
  ];
  const sourceHashes = sourcePaths.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const coreAcceptance = await verifyProfileThroughExistingCore(profile);
  const fingerprint = sha256({
    contract: CONTRACT,
    masterSha256: MASTER_SHA256,
    profileId,
    predecessorReleaseId,
    predecessorSearchReleaseId,
    sourceHashes,
    coreAcceptance,
  });
  const releaseId = uuid(`${CONTRACT}:${profileId}:${fingerprint}:release`);
  const searchReleaseId = uuid(`${CONTRACT}:${profileId}:${fingerprint}:search`);
  const definitionId = uuid(`${CONTRACT}:${profileId}:${fingerprint}:definition:${profile.targetCatalogId}`);
  const baselineId = uuid(`${CONTRACT}:${profileId}:${fingerprint}:baseline:${profile.targetCatalogId}`);
  const resourceId = uuid(`${CONTRACT}:${profileId}:${fingerprint}:resource:${profile.rowId}`);
  const releaseKey = `r4-a13-6-exact-${profileId}-${fingerprint.slice(0, 16)}`;
  const formula = compileFormulaGraph(profile.expression);
  const parameterSchemaSha256 = sha256(profile.parameters.map((parameter) => ({
    id: parameter.parameterId,
    type: parameter.valueType,
    unit: parameter.unitId,
    constraints: parameter.constraints,
    visibilityRole: parameter.visibilityRole,
    valueSourceRole: parameter.valueSourceRole,
  })));
  const definitionSha256 = sha256({
    profileId,
    targetCatalogId: profile.targetCatalogId,
    parameters: profile.parameters,
    formula: { id: profile.formulaId, source: formula.source, ast: formula.ast },
    resource: { id: profile.rowId, sourceId: profile.sourceId, physicalBinding: profile.physicalBinding },
  });
  const acceptanceEvidenceSha256 = sha256({ coreAcceptance, parameterSchemaSha256, definitionSha256 });
  const normativeSourceSnapshotSha256 = sha256({
    sourceId: profile.sourceId,
    sourceVersion: profile.sourceVersion,
    sourceDefinitionHash: profile.sourceDefinitionHash,
    exactLocator: profile.exactLocator,
  });
  invariant(/^[0-9a-f]{64}$/u.test(normativeSourceSnapshotSha256),
    "STOP_EXACT_NORM_SOURCE_SNAPSHOT_SHA256_INVALID");
  const normativeTrace = [{
    document_code: profile.sourceId,
    source_id: profile.sourceId,
    sourceId: profile.sourceId,
    norm_id: profile.normId,
    normId: profile.normId,
    source_document_version: profile.sourceVersion,
    normVersion: profile.sourceVersion,
    source_definition_hash: profile.sourceDefinitionHash,
    exact_locator: profile.exactLocator,
    source_url: profile.sourceUrl,
    physical_norm_binding_v1: profile.physicalBinding,
  }];
  invariant(!profile.forbiddenSourceIds.some((sourceId) => JSON.stringify(normativeTrace).includes(sourceId)),
    "STOP_EXACT_NORM_FORBIDDEN_SOURCE_RETAINED");

  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: `exact-physical-norm-successor-${profile.profileId}`,
    statement_timeout: 600_000,
  });
  await client.connect();
  let receipt: Json;
  try {
    const existing = (await client.query(
      "select id::text,status,activated_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.status === "prepared" && existing.activated_at == null,
        "STOP_EXACT_NORM_EXISTING_RELEASE_DRIFT");
      const audit = (await client.query(`select count(*)::int identities,
          count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced
        from public.estimate_cumulative_manifest_entry where release_id=$1`,
      [releaseId, profile.targetCatalogId, definitionId])).rows[0] as Json;
      invariant(Number(audit.identities) === 10_331 && Number(audit.replaced) === 1,
        `STOP_EXACT_NORM_EXISTING_MANIFEST_DRIFT:${JSON.stringify(audit)}`);
      receipt = {
        status: "GREEN_EXACT_PHYSICAL_NORM_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE",
        idempotent: true,
        successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey },
        audit,
      };
    } else {
      const predecessor = (await client.query(
        "select * from public.estimate_definition_release where id=$1",
        [predecessorReleaseId],
      )).rows[0] as Json | undefined;
      const predecessorSearch = (await client.query(
        "select * from public.estimate_search_index_release where id=$1",
        [predecessorSearchReleaseId],
      )).rows[0] as Json | undefined;
      const target = (await client.query(`select manifest.*,definition.definition_version,
          (select count(*)::int from public.estimate_parameter_definition where definition_version_id=manifest.definition_version_id) parameters,
          (select count(*)::int from public.estimate_formula_graph where definition_version_id=manifest.definition_version_id) formulas,
          (select count(*)::int from public.estimate_resource_spec where definition_version_id=manifest.definition_version_id) resources
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
        where manifest.release_id=$1 and manifest.catalog_id=$2`,
      [predecessorReleaseId, profile.targetCatalogId])).rows[0] as Json | undefined;
      invariant(predecessor?.status === "prepared" && predecessor.activated_at == null
        && Number(predecessor.definition_count) === 10_331,
      "STOP_EXACT_NORM_PREDECESSOR_RELEASE_DRIFT");
      invariant(predecessorSearch?.status === "draft" && predecessorSearch.activated_at == null,
        "STOP_EXACT_NORM_PREDECESSOR_SEARCH_DRIFT");
      invariant(String(predecessorSearch.metadata?.definitionReleaseId ?? "") === predecessorReleaseId,
        "STOP_EXACT_NORM_PREDECESSOR_PAIR_MISMATCH");
      invariant(target && Number(target.parameters) > 0 && Number(target.formulas) > 0 && Number(target.resources) > 0,
        `STOP_EXACT_NORM_TARGET_MISSING:${profile.targetCatalogId}`);
      const nextDefinitionVersion = Number((await client.query(
        "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
        [profile.targetCatalogId],
      )).rows[0].value);
      const nextCounts = {
        definitions: Number(predecessor.definition_count),
        parameters: Number(predecessor.parameter_count) - Number(target.parameters) + profile.parameters.length,
        formulas: Number(predecessor.formula_count) - Number(target.formulas) + 1,
        resources: Number(predecessor.resource_row_count) - Number(target.resources) + 1,
      };
      if (!APPLY) {
        receipt = {
          status: "GREEN_EXACT_PHYSICAL_NORM_SUCCESSOR_PRECHECK_NO_MUTATION",
          idempotent: false,
          predecessor: {
            releaseId: predecessorReleaseId,
            searchReleaseId: predecessorSearchReleaseId,
            definitionId: target.definition_version_id,
            parameters: Number(target.parameters),
            formulas: Number(target.formulas),
            resources: Number(target.resources),
          },
          successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey,
            definitionVersion: nextDefinitionVersion, nextCounts },
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
            JSON.stringify({ contract: CONTRACT, masterSha256: MASTER_SHA256, profileId,
              lifecycle: "DRAFT_FORWARD_ONLY", replacedDefinitionCount: 1,
              targetCatalogId: profile.targetCatalogId, activationAllowed: false,
              productionEligible: false, forbiddenSourceIds: profile.forbiddenSourceIds }),
            predecessorReleaseId, sha256({ contract: CONTRACT, fingerprint, definitionSha256 }),
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
            from public.estimate_cumulative_manifest_entry where release_id=$3`,
          [releaseId, CONTRACT, predecessorReleaseId]);
          await client.query(`insert into public.estimate_definition_version(
              id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
              source_metadata,content_status,content_gate_status)
            values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
            definitionId, releaseId, profile.targetCatalogId, nextDefinitionVersion,
            JSON.stringify({ titleRu: profile.canonicalTitleRu, familyId: "formwork",
              estimateLevel: "SOURCE_BACKED_PROFESSIONAL_BOQ", contract: CONTRACT,
              canonicalWorkKey: "formwork_rics_nrm2_measured_contact_area",
              primaryMeasureParameterId: profile.primaryMeasureParameterId,
              normativeSourceIds: [profile.sourceId] }),
            JSON.stringify({ country: "KG", operationClass: "MEASURE",
              materialSystem: "FORMWORK_CONTACT_AREA", scopeMode: "FULL_APPLICABLE_SCOPE",
              productProfileId: RICS_NRM2_FORMWORK_PRODUCT_PROFILE_ID,
              automaticGenericBinding: false }),
            definitionSha256,
            JSON.stringify({ contract: CONTRACT, predecessorDefinitionId: target.definition_version_id,
              profileId, parameterSchemaSha256, acceptanceEvidenceSha256,
              normativeSourceIds: [profile.sourceId], synthetic: false,
              automaticM2PerM3Factor: false, automaticPackageRounding: false,
              unknownPriceIsNull: true, sourceClaimFormulaOwner: {
                sourceId: profile.sourceId, exactLocator: profile.exactLocator,
                formulaId: profile.formulaId, semanticOwner: `physical-norm:${profile.normId}`,
              } }),
          ]);
          const formulaConsumers = Object.fromEntries(profile.parameters.map((parameter) => [
            parameter.parameterId,
            formula.inputParameterIds.includes(parameter.parameterId) ? [profile.formulaId] : [],
          ]));
          const resourceConsumers = Object.fromEntries(profile.parameters.map((parameter) => [
            parameter.parameterId,
            [profile.rowId],
          ]));
          await insertRows(client, "estimate_parameter_definition", [
            "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
            "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
          ], profile.parameters.map((parameter, ordinal) => [
            definitionId, parameter.parameterId, ordinal, parameter.valueType, parameter.unitId,
            parameter.titleRu, true, null, parameter.constraints,
            { contract: CONTRACT, semantic_parameter_key: `${profile.targetCatalogId}:${parameter.parameterId}`,
              visibility_role: parameter.visibilityRole, value_source_role: parameter.valueSourceRole,
              source_confirmation_required: parameter.visibilityRole === "INTERNAL_ONLY",
              preliminary_compilation_allowed: false,
              formula_consumers: formulaConsumers[parameter.parameterId],
              resource_branch_consumers: resourceConsumers[parameter.parameterId],
              guide: { guide_kind: parameter.valueType === "enum" ? "ENUM_DECISION_RULE" : "MEASUREMENT_RULE",
                guide_short_ru: parameter.guideRu, canonical_unit: parameter.unitId,
                source_role: parameter.valueSourceRole, source_document: profile.sourceId,
                source_edition_status: "reviewed-exact-version", source_locator: profile.exactLocator,
                guide_version: CONTRACT, source_snapshot_hash: normativeSourceSnapshotSha256,
                applicability: profile.physicalResultRu, verified_at: "2026-09-15T00:00:00+06:00" },
              normative_links: [{ sourceId: profile.sourceId, documentTitleRu: profile.sourceTitle,
                editionStatus: "reviewed-exact-version", locator: profile.exactLocator,
                applicabilityRu: profile.physicalResultRu, verifiedAt: "2026-09-15T00:00:00+06:00",
                verifiedSource: parameter.valueSourceRole }], synthetic: false },
            null,
          ]));
          await insertRows(client, "estimate_formula_graph", [
            "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast",
            "input_parameter_ids", "ast_sha256",
          ], [[definitionId, profile.formulaId, profile.outputUnitId, formula.source, formula.ast,
            formula.inputParameterIds, sha256(formula.ast)]]);
          const resourceGraph = {
            contract: CONTRACT,
            professionalPhysicalNormBindingV1: profile.physicalBinding,
            quantityBasis: profile.expression,
            parameterSources: formula.inputParameterIds,
            costTreatment: "DIRECT_PAYABLE_ROW",
            synthetic: false,
          };
          const sourceMetadata = {
            contract: CONTRACT,
            normativeTrace,
            synthetic: false,
            originalQuantityFormula: profile.expression,
            runtimeExpressionSource: profile.expression,
            sourceOwner: `physical-norm:${profile.normId}`,
            rejectedPredecessorSourceIds: profile.forbiddenSourceIds,
          };
          await insertRows(client, "estimate_resource_spec", [
            "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
            "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
            "procurement_eligible", "source_metadata", "row_sha256",
          ], [[resourceId, definitionId, profile.rowId, 0, profile.section, profile.category,
            profile.rowTitleRu, profile.rowType, profile.outputUnitId, profile.formulaId,
            { kind: "literal", value: true }, resourceGraph, `physical-norm:${profile.normId}`,
            null, profile.procurementEligible, sourceMetadata,
            sha256({ contract: CONTRACT, profileId, resourceGraph, sourceMetadata })]]);
          await client.query(`insert into public.estimate_approved_template_baseline(
              id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
              input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
              normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
              acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
            values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,
              $13::jsonb,$14::jsonb,$15::jsonb,$16,$17,clock_timestamp(),$18,$19)`, [
            baselineId, `${CONTRACT}:${profileId}:${fingerprint.slice(0, 16)}:${profile.targetCatalogId}`,
            profile.targetCatalogId, definitionId, target.definition_version_id, parameterSchemaSha256,
            JSON.stringify(profile.baselineParameters), JSON.stringify(profile.baselineClassification),
            JSON.stringify(Object.fromEntries(Object.keys(profile.baselineParameters).map((id) => [id,
              profile.parameters.find((parameter) => parameter.parameterId === id)?.unitId ?? null]))),
            JSON.stringify(formulaConsumers), JSON.stringify(resourceConsumers),
            JSON.stringify([profile.sourceId]),
            JSON.stringify(Object.fromEntries(profile.parameters.map((parameter) => [parameter.parameterId, parameter.guideRu]))),
            JSON.stringify([{ contract: CONTRACT, masterSha256: MASTER_SHA256,
              sourceId: profile.sourceId, sourceUrl: profile.sourceUrl,
              exactLocator: profile.exactLocator, sourceDefinitionHash: profile.sourceDefinitionHash }]),
            JSON.stringify([{ scenario: `${profileId}:100_TO_120`, acceptanceEvidenceSha256, coreAcceptance }]),
            acceptanceEvidenceSha256, releaseId, target.approved_template_baseline_id,
            "APPROVED_TEMPLATE_BASELINE_R54_V1",
          ]);
          await client.query(
            "update public.estimate_parameter_definition set approved_template_baseline_id=$2 where definition_version_id=$1",
            [definitionId, baselineId],
          );
          await client.query(`insert into public.estimate_content_passport_r3(
              definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
              physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
              formula_count,resource_count,decision,payload_sha256,source_head,source_tree)
            values($1,$2,$3,$4,'WORK',null,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12::jsonb,$13,$14,$15)`, [
            definitionId, releaseId, profile.targetCatalogId,
            "real-professional-estimates-r3.content-passport.v1", profile.physicalResultRu,
            JSON.stringify(profile.includedScopeRu), JSON.stringify(profile.excludedScopeRu),
            JSON.stringify([
              { capability: "PARAMETERS", status: "GREEN" },
              { capability: "FORMULAS", status: "GREEN" },
              { capability: "NORMATIVE_BINDING", status: "GREEN" },
              { capability: "PRICE", status: "UNKNOWN_VISIBLE" },
              { capability: "PROCUREMENT", status: "NOT_APPLICABLE_NO_MATERIAL_ROWS" },
            ]), profile.parameters.length, 1, 1,
            JSON.stringify({ status: "GREEN", allowed: true, contract: CONTRACT,
              exactPhysicalNormProfile: profileId, activationAllowed: false, productionEligible: false }),
            sha256({ definitionSha256, parameterSchemaSha256, acceptanceEvidenceSha256 }), head, tree,
          ]);
          await client.query(`update public.estimate_definition_version
            set content_status='CANDIDATE_READY',content_gate_status='GREEN'
            where id=$1 and release_id=$2 and catalog_id=$3`,
          [definitionId, releaseId, profile.targetCatalogId]);
          await client.query(`insert into public.estimate_normative_source(
              id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
            values($1,$2,$3,$4,$5,null,$6,$7::jsonb)
            on conflict(source_key) do update set official_url=excluded.official_url,
              metadata=public.estimate_normative_source.metadata||excluded.metadata`, [
            uuid(`${CONTRACT}:source:${profile.sourceId}`), profile.sourceId, profile.sourceTitle,
            profile.sourceAuthority, profile.sourceUrl, profile.effectiveFrom,
            JSON.stringify({ contract: CONTRACT, profileId, verifiedAt: "2026-09-15",
              targetCatalogId: profile.targetCatalogId, sourceDefinitionHash: profile.sourceDefinitionHash,
              useRestriction: "EXACT_RATE_AND_APPLICABILITY_ONLY" }),
          ]);
          const storedSource = (await client.query(
            "select id::text from public.estimate_normative_source where source_key=$1",
            [profile.sourceId],
          )).rows[0] as Json;
          const locator = {
            documentCode: "RICS NRM 2, second edition",
            workSection: "11 In-situ concrete works",
            exactLocator: profile.exactLocator,
            measurementUnit: "m2",
            rate: 1,
            rateMeaning: "same-unit routing identity only",
            automaticM2PerM3Factor: false,
            automaticPackageRounding: false,
          };
          const locatorKey = sha256(locator);
          await client.query(`insert into public.estimate_normative_locator(
              id,source_id,locator_key,locator,excerpt_sha256)
            values($1,$2,$3,$4::jsonb,$5) on conflict(source_id,locator_key) do nothing`, [
            uuid(`${CONTRACT}:locator:${profile.sourceId}:${locatorKey}`), storedSource.id,
            locatorKey, JSON.stringify(locator), sha256(locator),
          ]);
          const storedLocator = (await client.query(
            "select id::text from public.estimate_normative_locator where source_id=$1 and locator_key=$2",
            [storedSource.id, locatorKey],
          )).rows[0] as Json;
          await insertRows(client, "estimate_work_normative_binding", [
            "definition_version_id", "resource_spec_id", "locator_id", "applicability",
          ], [[definitionId, resourceId, storedLocator.id, {
            ...profile.physicalBinding,
            norm_id: profile.normId,
            source_id: profile.sourceId,
            source_document_version: profile.sourceVersion,
            source_definition_hash: profile.sourceDefinitionHash,
            exact_locator: profile.exactLocator,
          }]]);
          await client.query(`update public.estimate_cumulative_manifest_entry set
              definition_version_id=$3,source_batch=$4,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
              approved_template_baseline_id=$5,baseline_ready=true,scenario_ready=true,definition_hash=$6,
              entry_sha256=$7,runtime_publication_state='CANDIDATE'
            where release_id=$1 and catalog_id=$2`, [
            releaseId, profile.targetCatalogId, definitionId, `${CONTRACT}:${profileId}`,
            baselineId, definitionSha256,
            sha256({ contract: CONTRACT, profileId, releaseId, catalogId: profile.targetCatalogId,
              definitionId, baselineId, definitionSha256 }),
          ]);
          const search = await cloneSearch(client, {
            profile, predecessorSearchReleaseId, releaseId, searchReleaseId, releaseKey,
            head, tree, fingerprint,
          });
          const manifest = (await client.query(`select count(*)::int identities,
              count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced,
              encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
            from public.estimate_cumulative_manifest_entry where release_id=$1`,
          [releaseId, profile.targetCatalogId, definitionId])).rows[0] as Json;
          const targetAudit = (await client.query(`select
              (select count(*)::int from public.estimate_parameter_definition where definition_version_id=$1) parameters,
              (select count(*)::int from public.estimate_formula_graph where definition_version_id=$1) formulas,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1) resources,
              (select count(*)::int from public.estimate_work_normative_binding where definition_version_id=$1) normalized_bindings,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1
                and source_metadata::text like '%formwork_contact_area_m2_m3_concrete_element%') forbidden_source_rows,
              (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1
                and procurement_eligible) procurement_rows`, [definitionId])).rows[0] as Json;
          const searchTarget = (await client.query(`select definition_version_id::text,required_inputs_count,
              canonical_name_ru,primary_uom,selectable
            from public.estimate_search_document where search_release_id=$1 and catalog_id=$2`,
          [searchReleaseId, profile.targetCatalogId])).rows[0] as Json;
          invariant(Number(manifest.identities) === 10_331 && Number(manifest.replaced) === 1,
            `STOP_EXACT_NORM_MANIFEST_AUDIT:${JSON.stringify(manifest)}`);
          invariant(Number(targetAudit.parameters) === profile.parameters.length
            && Number(targetAudit.formulas) === 1 && Number(targetAudit.resources) === 1
            && Number(targetAudit.normalized_bindings) === 1
            && Number(targetAudit.forbidden_source_rows) === 0
            && Number(targetAudit.procurement_rows) === 0,
          `STOP_EXACT_NORM_TARGET_AUDIT:${JSON.stringify(targetAudit)}`);
          invariant(String(searchTarget.definition_version_id) === definitionId
            && Number(searchTarget.required_inputs_count) === profile.parameters.filter(
              (parameter) => parameter.visibilityRole === "USER_INPUT").length
            && searchTarget.selectable === true,
          `STOP_EXACT_NORM_SEARCH_TARGET_AUDIT:${JSON.stringify(searchTarget)}`);
          await client.query(`update public.estimate_definition_release
            set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
              metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
            releaseId, manifest.snapshot,
            JSON.stringify({ lifecycle: "PREPARED_NOT_ACTIVE", searchReleaseId,
              searchSnapshotSha256: search.snapshot_sha256, profileId,
              exactResourceRowCount: 1, normalizedBindingCount: 1,
              sourceCoreAcceptanceSha256: sha256(coreAcceptance), activationAllowed: false }),
          ]);
          await client.query("commit");
          receipt = {
            status: "GREEN_EXACT_PHYSICAL_NORM_SUCCESSOR_PREPARED_NOT_ACTIVE",
            idempotent: false,
            predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId,
              definitionId: target.definition_version_id, parameters: Number(target.parameters),
              formulas: Number(target.formulas), resources: Number(target.resources) },
            successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey,
              definitionVersion: nextDefinitionVersion, nextCounts },
            audit: { manifest, target: targetAudit, search, searchTarget },
          };
        } catch (error) {
          await client.query("rollback");
          throw error;
        }
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
    profileId,
    targetCatalogId: profile.targetCatalogId,
    coreAcceptance,
    ...receipt!,
    productionAccessed: false,
    deployPerformed: false,
    activationPerformed: false,
    releasePerformed: false,
  };
  const sealed = { ...body, receiptSha256: sha256(body) };
  if (APPLY && !receipt!.idempotent) {
    atomicJson(resolve(OUTPUT_ROOT, `${profileId}-${releaseId}-${head}.json`), sealed);
    const previous = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
    atomicJson(CURRENT_RELEASE_PATH, {
      ...previous,
      definitionReleaseId: releaseId,
      searchReleaseId,
      definitionReleaseStatus: "prepared",
      searchReleaseStatus: "draft",
      definitionSnapshotSha256: receipt!.audit.manifest.snapshot,
      manifestHashChainSha256: receipt!.audit.manifest.snapshot,
      searchHashChainSha256: receipt!.audit.search.snapshot_sha256,
      currentRuntimeDefinitions: 10_331,
      owner: `EXACT_PHYSICAL_NORM_SUCCESSOR_${profileId.toUpperCase().replace(/-/g, "_")}`,
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
