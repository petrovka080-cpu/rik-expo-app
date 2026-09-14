import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { compileCanonicalEstimateCore } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { PROFESSIONAL_MATERIAL_QUANTITY_BASIS_VERSION_V1 } from
  "../../../src/lib/estimate/professionalMaterialQuantityContract";
import { CANONICAL_MATERIAL_QUANTITY_POLICY_VERSION_V1 } from
  "../../../src/lib/estimate/backendPlatform/canonicalMaterialQuantityProjection";
import {
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID,
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
  CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA,
} from "../../../src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1";
import { INTERIOR_FINISHES_DOMAIN_INVENTORY } from
  "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/inventory";
import { interiorFinishesDomainFactory } from
  "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/domainPackage";
import {
  WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID,
  WALL_PUTTY_CT127_KRER15_OFFICIAL_PAGE,
  WALL_PUTTY_CT127_KRER15_OFFICIAL_PDF,
  WALL_PUTTY_CT127_KRER15_RATE_CODE,
  WALL_PUTTY_CT127_KRER15_RATES,
  WALL_PUTTY_CT127_KRER15_SOURCE_ID,
  WALL_PUTTY_CT127_KRER15_SOURCE_PDF_SHA256,
  WALL_PUTTY_CT127_KRER15_WORK_KEY,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/wallPuttyCeresitCt127Krer15ProfessionalV1";

type Json = Record<string, any>;

const CONTRACT = "rik-expo-app.r4-a13-6.r9-wall-putty-krer15-ct127.v1";
const TARGET_CATALOG_ID = `canonical-work:base:${WALL_PUTTY_CT127_KRER15_WORK_KEY}`;
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R4_A13_6_R9_ONE_CORE_COMPLETE_ESTIMATES_FULL_ACCEPTANCE_RU (4).md",
);
const MASTER_SHA256 = "fe3b20f891c4bbda761f10939fbf991d28b9629516b8cbd372b01836b0eb7047";
const KRER15_LOCAL_PDF = resolve("C:/dev/rik-batch002-norm-sources-20260813/krer-15-finishes.pdf");
const CURRENT_RELEASE_PATH = resolve("data/estimate-benchmarks/r568-local-developer-canonical-release.json");
const OUTPUT_ROOT = resolve(".release-runtime/r4a13-6/r9-complete-estimates");
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const SOURCE_PATHS = [
  "scripts/estimate/r9/prepareR9WallPuttyKrer15Successor.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalMaterialQuantityProjection.ts",
  "src/lib/estimate/backendPlatform/formulaGraph.ts",
  "src/lib/estimate/professionalMaterialQuantityCalculator.ts",
  "src/lib/estimate/v4/domainFactory/constructionNormativeRegistryV1.ts",
  "src/lib/estimate/v4/domainFactory/professionalPhysicalNormApplicabilityV1.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/domainPackage.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/productionBinding.ts",
  "src/lib/estimate/v4/domains/interiorFinishesComplete/wallPuttyCeresitCt127Krer15ProfessionalV1.ts",
] as const;

const PUBLISHED_PARAMETER_IDS = new Set([
  "funding_source",
  "project_type",
  "area_m2",
  "surface_type",
  "product_profile_id",
  "normative_rate_code",
  "layer_thickness_mm",
  "substrate_type",
  "substrate_absorbency",
  "substrate_load_bearing_dry_clean_confirmed",
  "substrate_preparation_system",
  "selected_consumption_kg_m2",
  "dry_interior_no_permanent_humidity_confirmed",
  "application_temperature_confirmed",
  "selected_bag_size_kg",
  WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID,
]);
const MUST_BE_TRUE = new Set([
  "substrate_load_bearing_dry_clean_confirmed",
  "dry_interior_no_permanent_humidity_confirmed",
  "application_temperature_confirmed",
  WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID,
]);
const SOURCE_MANAGED = new Set([
  "product_profile_id",
  "normative_rate_code",
  "selected_consumption_kg_m2",
  "selected_bag_size_kg",
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
  invariant(["127.0.0.1", "localhost", "::1"].includes(parsed.hostname),
    `STOP_R9_DATABASE_NOT_LOOPBACK:${parsed.hostname}`);
  invariant(parsed.port === "55432" && parsed.pathname === "/rik_r4_runtime_b5_v2",
    `STOP_R9_DATABASE_NOT_CANONICAL_LOCAL:${parsed.port}:${parsed.pathname}`);
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
      invariant(row.length === columns.length, `STOP_R9_INSERT_SHAPE:${table}`);
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

function and(...operands: Json[]): Json {
  return { kind: "and", operands };
}

function or(...operands: Json[]): Json {
  return { kind: "or", operands };
}

function equals(parameterId: string, value: unknown): Json {
  return { kind: "equals", parameterId, value };
}

function oneOf(parameterId: string, values: readonly unknown[]): Json {
  return { kind: "in", parameterId, values };
}

function validSurfaceMapping(): Json {
  return or(
    and(oneOf("substrate_type", ["cement_plaster", "cement_lime_plaster"]), equals("surface_type", "CEMENT_PLASTER")),
    and(equals("substrate_type", "concrete"), equals("surface_type", "CONCRETE")),
    and(oneOf("substrate_type", ["gypsum_substrate", "gypsum_fibre_board", "plasterboard"]), equals("surface_type", "GYPSUM_BOARD")),
    and(oneOf("substrate_type", ["aerated_concrete", "silicate_block"]), equals("surface_type", "MASONRY")),
    and(oneOf("substrate_type", ["ceresit_ct126", "sound_adherent_paint_coat"]), equals("surface_type", "PROJECT_SPECIFIED")),
  );
}

function validPreparationMapping(): Json {
  const absorbentSubstrates = [
    "cement_plaster", "cement_lime_plaster", "concrete", "ceresit_ct126",
    "gypsum_substrate", "gypsum_fibre_board", "plasterboard",
  ];
  return or(
    and(oneOf("substrate_type", absorbentSubstrates), equals("substrate_absorbency", "absorbent"),
      oneOf("substrate_preparation_system", ["CERESIT_IN10", "CERESIT_CT17", "CERESIT_CT7"])),
    and(oneOf("substrate_type", ["aerated_concrete", "silicate_block"]),
      equals("substrate_absorbency", "very_absorbent"),
      oneOf("substrate_preparation_system", ["CERESIT_IN10", "CERESIT_CT17"])),
    and(oneOf("substrate_type", ["concrete", "sound_adherent_paint_coat"]),
      equals("substrate_absorbency", "non_absorbent"),
      equals("substrate_preparation_system", "CERESIT_CT19")),
  );
}

function parameterValueSourceRole(parameterId: string): string {
  if (parameterId === "area_m2") return "USER_MEASURED";
  if (parameterId === "normative_rate_code") return "MANDATORY_NORM_VALUE";
  if (parameterId === "selected_consumption_kg_m2") return "NORM_REQUIRED_BUT_PROJECT_SELECTED";
  if (parameterId === "product_profile_id" || parameterId === "selected_bag_size_kg") {
    return "MANUFACTURER_CONFIRMED";
  }
  return "PROJECT_DOCUMENTATION";
}

function parameterSource(parameterId: string): { sourceId: string; locator: string; title: string } {
  if (["normative_rate_code", WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID].includes(parameterId)) {
    return {
      sourceId: WALL_PUTTY_CT127_KRER15_SOURCE_ID,
      locator: "КРЕР-2015 №15, таблица 15-04-027, строка 15-04-027-01, стр. 191–192",
      title: "КРЕР-2015 №15",
    };
  }
  return {
    sourceId: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
    locator: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.exact_locator,
    title: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.source_title,
  };
}

function parameterConstraints(parameter: Json): Json {
  const id = String(parameter.parameter_id);
  const constraints: Json = {};
  if (parameter.minimum != null) constraints.min = parameter.minimum;
  if (parameter.maximum != null) constraints.max = parameter.maximum;
  if (Array.isArray(parameter.choices) && parameter.choices.length > 0) {
    constraints.values = parameter.choices.map((choice: Json) => choice.value);
  }
  if (id === "product_profile_id") constraints.values = [CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID];
  if (id === "normative_rate_code") constraints.values = [WALL_PUTTY_CT127_KRER15_RATE_CODE];
  if (id === "selected_bag_size_kg") constraints.values = ["20"];
  if (id === "layer_thickness_mm") constraints.max = 2;
  if (id === "selected_consumption_kg_m2") {
    constraints.min = 0.4;
    constraints.max = 1.2;
  }
  if (MUST_BE_TRUE.has(id)) constraints.forbiddenWhen = equals(id, false);
  if (id === "surface_type") constraints.forbiddenWhen = { kind: "not", operand: validSurfaceMapping() };
  if (id === "substrate_preparation_system") {
    constraints.forbiddenWhen = { kind: "not", operand: validPreparationMapping() };
  }
  if (parameter.input_type === "text" && constraints.values == null) constraints.maxLength = 500;
  return constraints;
}

function canonicalValueType(parameter: Json): string {
  if (parameter.input_type === "number") return "decimal";
  if (parameter.input_type === "choice" || ["product_profile_id", "normative_rate_code"].includes(parameter.parameter_id)) {
    return "enum";
  }
  return parameter.input_type;
}

function canonicalFormulaSource(row: Json): string {
  if (String(row.row_id).endsWith(":row:primary_material")) {
    return "area_m2 * selected_consumption_kg_m2";
  }
  return String(row.formula.expression).replace(/[×·]/gu, "*").replace(/÷/gu, "/");
}

function buildDefinitionSource(): Json {
  const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find(
    (candidate) => candidate.work_key === WALL_PUTTY_CT127_KRER15_WORK_KEY,
  );
  invariant(inventory, "STOP_R9_WALL_PUTTY_INVENTORY_MISSING");
  const technology = interiorFinishesDomainFactory.technology_by_id.get(inventory.canonical_technology_id);
  invariant(technology, "STOP_R9_WALL_PUTTY_TECHNOLOGY_MISSING");
  const schema = interiorFinishesDomainFactory.schema_by_id.get(technology.parameter_schema_id);
  const assembly = interiorFinishesDomainFactory.assembly_profile_by_id.get(technology.assembly_profile_id);
  invariant(schema && schema.schema_version === "2.0.0", "STOP_R9_WALL_PUTTY_SCHEMA_DRIFT");
  invariant(assembly && assembly.assembly_profile_version === "2.0.0", "STOP_R9_WALL_PUTTY_ASSEMBLY_DRIFT");
  const ownerRows = assembly.child_assemblies.flatMap((child) => child.rows);
  invariant(ownerRows.length === 7, `STOP_R9_WALL_PUTTY_ROW_COUNT:${ownerRows.length}`);
  const formulaIds = new Set<string>();
  const resources = ownerRows.map((row, ordinal) => {
    const expression = canonicalFormulaSource(row);
    const compiled = compileFormulaGraph(expression);
    invariant(!formulaIds.has(row.formula.formula_id), `STOP_R9_FORMULA_DUPLICATE:${row.formula.formula_id}`);
    formulaIds.add(row.formula.formula_id);
    const materialPolicy = row.row_id.endsWith(":row:primary_material")
      ? {
        professionalMaterialQuantityPolicyV1: {
          version: CANONICAL_MATERIAL_QUANTITY_POLICY_VERSION_V1,
          basisVersion: PROFESSIONAL_MATERIAL_QUANTITY_BASIS_VERSION_V1,
          materialType: "wet_mix",
          unit: "kg",
          wastePercent: 0,
          lossPercent: 0,
          procurementUnit: "kg",
          procurementPackageSize: 20,
          formula: expression,
          formulaInputs: { selected_bag_size_kg: 20 },
          sourceId: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
          citationLabel: `${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.exact_locator} (${CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.source_document_version})`,
          quantityDependsOnParams: compiled.inputParameterIds,
        },
      }
      : {};
    const normativeTrace = (row.normative_trace_v3 ?? []).map((trace) => ({
      ...trace,
      source_url: trace.source_id === WALL_PUTTY_CT127_KRER15_SOURCE_ID
        ? WALL_PUTTY_CT127_KRER15_OFFICIAL_PDF
        : CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.source_url,
    }));
    const resourceGraph = {
      contract: CONTRACT,
      sourceOwner: technology.technology_id,
      sourceAssemblyId: assembly.assembly_profile_id,
      sourceExpression: expression,
      quantityBasis: expression,
      parameterSources: compiled.inputParameterIds,
      synthetic: false,
      ...materialPolicy,
    };
    const sourceMetadata = {
      contract: CONTRACT,
      truth_contract_version: "R3",
      normativeTrace,
      synthetic: false,
      sourceOwner: technology.technology_id,
      replacedSyntheticRowCount: 59,
    };
    return {
      row,
      ordinal,
      expression,
      compiled,
      resourceGraph,
      sourceMetadata,
    };
  });
  const formulas = resources.map((resource) => ({
    formula_id: resource.row.formula.formula_id,
    output_unit_id: resource.row.formula.output_unit_id,
    expression_source: resource.compiled.source,
    ast: resource.compiled.ast,
    input_parameter_ids: resource.compiled.inputParameterIds,
    ast_sha256: sha256(resource.compiled.ast),
  }));
  const formulaConsumers = Object.fromEntries([...PUBLISHED_PARAMETER_IDS].map((parameterId) => [
    parameterId,
    formulas.filter((formula) => formula.input_parameter_ids.includes(parameterId))
      .map((formula) => formula.formula_id),
  ]));
  const rowIds = resources.map((resource) => resource.row.row_id);
  const resourceConsumers = Object.fromEntries([...PUBLISHED_PARAMETER_IDS].map((parameterId) => [
    parameterId,
    formulaConsumers[parameterId].length > 0 ? resources
      .filter((resource) => resource.compiled.inputParameterIds.includes(parameterId))
      .map((resource) => resource.row.row_id) : rowIds,
  ]));
  const parameters = schema.parameters
    .filter((parameter) => PUBLISHED_PARAMETER_IDS.has(parameter.parameter_id))
    .map((parameter, ordinal) => {
      const source = parameterSource(parameter.parameter_id);
      const constraints = parameterConstraints(parameter);
      const valueSourceRole = parameterValueSourceRole(parameter.parameter_id);
      const guideKind = parameter.parameter_id === "selected_consumption_kg_m2"
        ? "MANUFACTURER_RANGE"
        : SOURCE_MANAGED.has(parameter.parameter_id) ? "MANDATORY_NORM_VALUE" : "PROJECT_DEFINED";
      return {
        parameter_id: parameter.parameter_id,
        ordinal,
        value_type: canonicalValueType(parameter),
        unit_id: parameter.unit_id,
        title_ru: parameter.label_ru,
        required: true,
        default_value: null,
        constraints_json: constraints,
        truth_metadata: {
          contract: CONTRACT,
          semantic_parameter_key: `${TARGET_CATALOG_ID}:${parameter.parameter_id}`,
          visibility_role: "USER_INPUT",
          value_source_role: valueSourceRole,
          source_confirmation_required: SOURCE_MANAGED.has(parameter.parameter_id),
          preliminary_compilation_allowed: false,
          formula_consumers: formulaConsumers[parameter.parameter_id],
          resource_branch_consumers: resourceConsumers[parameter.parameter_id],
          allowed_range_or_options: constraints.values ?? {
            min: constraints.min ?? null,
            max: constraints.max ?? null,
          },
          guide: {
            guide_kind: guideKind,
            guide_short_ru: SOURCE_MANAGED.has(parameter.parameter_id)
              ? `Подтвердите значение из источника: ${source.title}.`
              : `Укажите фактическое значение проекта для «${parameter.label_ru}».`,
            guide_min: constraints.min ?? null,
            guide_max: constraints.max ?? null,
            guide_options: Array.isArray(constraints.values)
              ? constraints.values.map((value: unknown) => ({ value: String(value), ruleRu: "Точно допустимый вариант" }))
              : undefined,
            canonical_unit: parameter.unit_id,
            guide_validation_policy: "REJECT_OUTSIDE_SOURCE_OR_PROJECT_APPLICABILITY",
            source_role: valueSourceRole,
            source_document: source.sourceId,
            source_edition_status: "reviewed-exact-version",
            source_locator: source.locator,
            guide_version: CONTRACT,
            source_snapshot_hash: source.sourceId === WALL_PUTTY_CT127_KRER15_SOURCE_ID
              ? WALL_PUTTY_CT127_KRER15_SOURCE_PDF_SHA256
              : sha256(CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA),
            applicability: `Только ${WALL_PUTTY_CT127_KRER15_RATE_CODE} для стен и CT 127 в условиях его TDS.`,
            verified_at: "2026-09-14T00:00:00+06:00",
          },
          normative_links: [{
            sourceId: source.sourceId,
            documentTitleRu: source.title,
            editionStatus: "reviewed-exact-version",
            locator: source.locator,
            applicabilityRu: `Только для ${TARGET_CATALOG_ID}.`,
            verifiedAt: "2026-09-14T00:00:00+06:00",
            verifiedSource: valueSourceRole,
          }],
          synthetic: false,
        },
      };
    });
  invariant(parameters.length === PUBLISHED_PARAMETER_IDS.size,
    `STOP_R9_PARAMETER_OWNER_DRIFT:${parameters.length}:${PUBLISHED_PARAMETER_IDS.size}`);
  return { inventory, technology, schema, assembly, parameters, formulas, resources,
    formulaConsumers, resourceConsumers };
}

function scenarioParameters(): Json {
  return {
    funding_source: "PRIVATE_RECOMMENDED",
    project_type: "INTERIOR_FINISH_PUTTY_PROJECT",
    area_m2: 100,
    surface_type: "CEMENT_PLASTER",
    product_profile_id: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID,
    normative_rate_code: WALL_PUTTY_CT127_KRER15_RATE_CODE,
    layer_thickness_mm: 2,
    substrate_type: "cement_plaster",
    substrate_absorbency: "absorbent",
    substrate_load_bearing_dry_clean_confirmed: true,
    substrate_preparation_system: "CERESIT_CT17",
    selected_consumption_kg_m2: 0.7,
    dry_interior_no_permanent_humidity_confirmed: true,
    application_temperature_confirmed: true,
    selected_bag_size_kg: "20",
    [WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID]: true,
  };
}

async function verifyThroughExistingCore(definition: Json): Promise<Json> {
  const resourceDefinitions = definition.resources.map((resource: Json) => ({
    id: `source:${resource.row.row_id}`,
    row_id: resource.row.row_id,
    ordinal: resource.ordinal,
    section: resource.row.section,
    category: resource.row.category,
    title_ru: resource.row.title_ru,
    unit_id: resource.row.formula.output_unit_id,
    formula_id: resource.row.formula.formula_id,
    inclusion_ast: { kind: "literal", value: true },
    resource_graph: resource.resourceGraph,
    procurement_eligible: resource.row.procurement_eligible,
    cost_owner_id: resource.row.cost_owner_id,
    source_metadata: resource.sourceMetadata,
    row_sha256: sha256(resource.resourceGraph),
  }));
  const compile = () => compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.r9-wall-putty-source-check",
    catalogId: TARGET_CATALOG_ID,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: definition.parameters,
    formulaDefinitions: definition.formulas,
    resourceDefinitions,
    submittedParameters: scenarioParameters(),
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 100,
    hashJson: async (value) => sha256(value),
  });
  const first = await compile();
  const second = await compile();
  invariant(first.rows.length === 7 && first.preliminaryNeeds.length === 0,
    `STOP_R9_CORE_ROW_COUNT:${first.rows.length}:${first.preliminaryNeeds.length}`);
  invariant(first.rows.every((row) => row.unit_price == null && row.amount == null),
    "STOP_R9_CORE_UNKNOWN_PRICE_NOT_NULL");
  const quantities = new Map(first.rows.map((row) => [row.row_id, Number(row.quantity)]));
  const technologyId = definition.technology.technology_id;
  invariant(quantities.get(`${technologyId}:row:primary_material`) === 70, "STOP_R9_CORE_CT127_NET_QUANTITY");
  invariant(quantities.get(`${technologyId}:row:construction_worker_labor`) === 12.1,
    "STOP_R9_CORE_LABOR_QUANTITY");
  invariant(quantities.get(`${technologyId}:row:cargo_lift`) === 0.01, "STOP_R9_CORE_LIFT_QUANTITY");
  invariant(sha256(first) === sha256(second), "STOP_R9_CORE_NON_DETERMINISTIC");

  for (const patch of [
    { layer_thickness_mm: 2.1 },
    { substrate_preparation_system: "CERESIT_CT19" },
    { [WALL_PUTTY_CT127_KRER15_APPLICABILITY_PARAMETER_ID]: false },
  ]) {
    let rejected = false;
    try {
      await compileCanonicalEstimateCore({
        operation: "compile",
        compilerVersion: "canonical-estimate-compiler.r9-wall-putty-negative",
        catalogId: TARGET_CATALOG_ID,
        primaryMeasureParameterId: "area_m2",
        parameterDefinitions: definition.parameters,
        formulaDefinitions: definition.formulas,
        resourceDefinitions,
        submittedParameters: { ...scenarioParameters(), ...patch },
        confirmedParameters: {}, currencyCode: "KGS", priceItems: [], maximumResourceRows: 100,
        hashJson: async (value) => sha256(value),
      });
    } catch {
      rejected = true;
    }
    invariant(rejected, `STOP_R9_CORE_NEGATIVE_ACCEPTED:${JSON.stringify(patch)}`);
  }
  return {
    compilerOwner: "compileCanonicalEstimateCore",
    rows: first.rows.length,
    pricedRows: first.totals.pricedRowCount,
    unpricedRows: first.totals.unpricedRowCount,
    materialNetKg: quantities.get(`${technologyId}:row:primary_material`),
    procurementKg: 80,
    deterministicSha256: sha256(first),
    negativeCasesRejected: 3,
  };
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
        'masterSha256',$10::text,'lifecycle','FROZEN_NOT_ACTIVE',
        'activationAllowed',false,'productionEligible',false)
    from public.estimate_search_index_release where id=$7`, [
    input.searchReleaseId, `${input.releaseKey}-search`, input.head, input.tree,
    sha256(`${input.searchReleaseId}:draft`), CONTRACT, input.parentSearchReleaseId, input.releaseId,
    input.fingerprint, MASTER_SHA256,
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
  await client.query(`update public.estimate_search_document set required_inputs_count=$3,
      clarification_fields=$4::jsonb,
      short_scope_ru=$5,
      key_distinguishing_parameters=$6::jsonb,
      source_provenance=source_provenance||jsonb_build_object('r9ExactWallPuttyKrer15',true,
        'normativeRateCode',$7::text,'ct127NetVsProcurement',true),
      document_sha256=encode(extensions.digest(convert_to(document_sha256||':'||$8,'UTF8'),'sha256'),'hex')
    where search_release_id=$1 and catalog_id=$2`, [
    input.searchReleaseId, TARGET_CATALOG_ID, input.clarificationFields.length,
    JSON.stringify(input.clarificationFields),
    "Третья шпаклёвка стен по КРЕР 15-04-027-01; CT 127 с явно выбранным расходом TDS.",
    JSON.stringify(["area_m2", "surface_type", "substrate_type", "selected_consumption_kg_m2"]),
    WALL_PUTTY_CT127_KRER15_RATE_CODE, CONTRACT,
  ]);
  const snapshot = (await client.query(`select count(*)::int documents,
      count(*) filter(where selectable and adjudication_class='EFFECTIVE_WORK')::int visible,
      encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(`update public.estimate_search_index_release set snapshot_sha256=$2,
    metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
    input.searchReleaseId, snapshot.snapshot_sha256,
    JSON.stringify({ documentCount: snapshot.documents, visibleCount: snapshot.visible,
      targetCatalogId: TARGET_CATALOG_ID, requiredInputs: input.clarificationFields.length }),
  ]);
  return snapshot;
}

async function main(): Promise<void> {
  exactDatabaseGuard();
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH, "STOP_R9_BRANCH_DRIFT");
  invariant(existsSync(MASTER_PATH) && sha256(readFileSync(MASTER_PATH)) === MASTER_SHA256,
    "STOP_R9_MASTER_SHA256_DRIFT");
  invariant(existsSync(KRER15_LOCAL_PDF) && sha256(readFileSync(KRER15_LOCAL_PDF)) === WALL_PUTTY_CT127_KRER15_SOURCE_PDF_SHA256,
    "STOP_R9_KRER15_PDF_SHA256_DRIFT");
  for (const path of SOURCE_PATHS) invariant(existsSync(resolve(path)), `STOP_R9_SOURCE_MISSING:${path}`);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const sourceHashes = SOURCE_PATHS.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
  const current = JSON.parse(readFileSync(CURRENT_RELEASE_PATH, "utf8")) as Json;
  invariant(current.productionAccessed === false, "STOP_R9_CURRENT_PRODUCTION_ACCESS_FLAG");
  const definition = buildDefinitionSource();
  const coreAcceptance = await verifyThroughExistingCore(definition);
  const definitionSourceSha256 = sha256({
    parameters: definition.parameters,
    formulas: definition.formulas,
    resources: definition.resources.map((resource: Json) => ({
      row: resource.row,
      resourceGraph: resource.resourceGraph,
      sourceMetadata: resource.sourceMetadata,
    })),
  });
  const fingerprint = sha256({ contract: CONTRACT, masterSha256: MASTER_SHA256, head, tree,
    predecessor: current.definitionReleaseId, definitionSourceSha256, sourceHashes });
  const releaseId = uuid(`${CONTRACT}:${fingerprint}:definition-release`);
  const searchReleaseId = uuid(`${CONTRACT}:${fingerprint}:search-release`);
  const definitionId = uuid(`${CONTRACT}:${fingerprint}:${TARGET_CATALOG_ID}:definition`);
  const baselineId = uuid(`${CONTRACT}:${fingerprint}:${TARGET_CATALOG_ID}:baseline`);
  const releaseKey = `r4-a13-6-r9-putty-${fingerprint.slice(0, 16)}`;

  const client = new Client({ connectionString: DATABASE_URL, application_name: "r9-wall-putty-krer15-successor" });
  await client.connect();
  let receipt: Json;
  try {
    const predecessorReleaseId = String(current.definitionReleaseId);
    const predecessorSearchReleaseId = String(current.searchReleaseId);
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [predecessorReleaseId],
    )).rows[0] as Json;
    const predecessorSearch = (await client.query(
      "select * from public.estimate_search_index_release where id=$1",
      [predecessorSearchReleaseId],
    )).rows[0] as Json;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 10_331,
      "STOP_R9_PREDECESSOR_RELEASE_DRIFT");
    invariant(predecessorSearch?.status === "draft", "STOP_R9_PREDECESSOR_SEARCH_DRIFT");
    const existing = (await client.query(
      "select id,status,activated_at from public.estimate_definition_release where id=$1",
      [releaseId],
    )).rows[0] as Json;
    if (existing) {
      invariant(existing.status === "prepared" && existing.activated_at == null,
        "STOP_R9_EXISTING_SUCCESSOR_STATE_DRIFT");
      const target = (await client.query(`select m.definition_version_id,d.definition_version,
          (select count(*)::int from public.estimate_parameter_definition where definition_version_id=d.id) parameters,
          (select count(*)::int from public.estimate_formula_graph where definition_version_id=d.id) formulas,
          (select count(*)::int from public.estimate_resource_spec where definition_version_id=d.id) resources
        from public.estimate_cumulative_manifest_entry m join public.estimate_definition_version d on d.id=m.definition_version_id
        where m.release_id=$1 and m.catalog_id=$2`, [releaseId, TARGET_CATALOG_ID])).rows[0] as Json;
      receipt = { status: "GREEN_R9_WALL_PUTTY_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE", idempotent: true,
        predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId },
        successor: { releaseId, searchReleaseId, definitionId: target.definition_version_id, releaseKey },
        fingerprint, coreAcceptance, target };
    } else {
      const target = (await client.query(`select manifest.*,definition.*,
          (select count(*)::int from public.estimate_parameter_definition where definition_version_id=manifest.definition_version_id) parameters,
          (select count(*)::int from public.estimate_formula_graph where definition_version_id=manifest.definition_version_id) formulas,
          (select count(*)::int from public.estimate_resource_spec where definition_version_id=manifest.definition_version_id) resources
        from public.estimate_cumulative_manifest_entry manifest
        join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
        where manifest.release_id=$1 and manifest.catalog_id=$2`, [predecessorReleaseId, TARGET_CATALOG_ID])).rows[0] as Json;
      invariant(target && Number(target.parameters) === 1 && Number(target.formulas) === 59 && Number(target.resources) === 59,
        `STOP_R9_PREDECESSOR_TARGET_DRIFT:${JSON.stringify(target ?? null)}`);
      const sourcePassport = (await client.query(
        "select * from public.estimate_content_passport_r3 where definition_version_id=$1",
        [target.definition_version_id],
      )).rows[0] as Json;
      invariant(sourcePassport, "STOP_R9_PREDECESSOR_CONTENT_PASSPORT_MISSING");
      const nextDefinitionVersion = Number((await client.query(
        "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
        [TARGET_CATALOG_ID],
      )).rows[0].value);
      const parameterSchemaSha256 = sha256(definition.parameters.map((parameter: Json) => ({
        id: parameter.parameter_id, type: parameter.value_type, unit: parameter.unit_id,
        required: parameter.required, constraints: parameter.constraints_json, truth: parameter.truth_metadata,
      })));
      const definitionSha256 = sha256({ contract: CONTRACT, predecessorDefinitionId: target.definition_version_id,
        parameterSchemaSha256, definitionSourceSha256 });
      const acceptanceEvidenceSha256 = sha256({ definitionSha256, coreAcceptance,
        scenario: "100m2*0.7kg/m2=70kg;ceil(70/20)*20=80kg",
        krer15Sha256: WALL_PUTTY_CT127_KRER15_SOURCE_PDF_SHA256,
        ct127DefinitionSha256: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.definition_hash });
      const clarificationFields = definition.parameters.map((parameter: Json) => ({
        parameterId: parameter.parameter_id,
        titleRu: parameter.title_ru,
        unitId: parameter.unit_id,
        required: true,
        sourceManaged: SOURCE_MANAGED.has(parameter.parameter_id),
        sourceRole: parameter.truth_metadata.value_source_role,
        allowed: parameter.constraints_json.values ?? null,
      }));
      const baselineNormSources = Object.fromEntries(definition.parameters.map((parameter: Json) => [
        parameter.parameter_id,
        [parameterSource(parameter.parameter_id).sourceId],
      ]));

      await client.query("begin");
      await client.query("set local lock_timeout='5s'");
      await client.query("set local statement_timeout='600s'");
      await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT]);
      try {
        await client.query(`insert into public.estimate_definition_release(
            id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
            definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count)
          select $1,$2,schema_version,'draft',$3,$4,$5,definition_count,
            resource_row_count-$6+$7,metadata||$8::jsonb,$9,$10,parameter_count-$11+$12,formula_count-$13+$14
          from public.estimate_definition_release where id=$9`, [
          releaseId, releaseKey, head, tree, sha256(`${CONTRACT}:${fingerprint}:draft`),
          Number(target.resources), definition.resources.length,
          JSON.stringify({ contract: CONTRACT, masterSha256: MASTER_SHA256, sourceHashes,
            lifecycle: "DRAFT_FORWARD_ONLY", targetCatalogId: TARGET_CATALOG_ID,
            replacedDefinitionCount: 1, replacedSyntheticRowCount: 59,
            exactResourceRowCount: 7, activationAllowed: false, productionEligible: false }),
          predecessorReleaseId, sha256({ contract: CONTRACT, fingerprint, definitionSha256 }),
          Number(target.parameters), definition.parameters.length, Number(target.formulas), definition.formulas.length,
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
          JSON.stringify({ ...(target.passport ?? {}), contract: CONTRACT,
            canonicalWorkKey: WALL_PUTTY_CT127_KRER15_WORK_KEY,
            technologyOwner: definition.technology.technology_id,
            exactRateCode: WALL_PUTTY_CT127_KRER15_RATE_CODE }),
          JSON.stringify({ country: "KG", operationClass: "APPLY", materialSystem: "WALL_PUTTY",
            constructionStates: ["NEW", "RECONSTRUCTION"], productProfileId: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_PRODUCT_PROFILE_ID,
            exactRateCode: WALL_PUTTY_CT127_KRER15_RATE_CODE,
            workComposition: "THIRD_WALL_PUTTY_FOR_HIGH_QUALITY_PAINTING" }),
          definitionSha256,
          JSON.stringify({ contract: CONTRACT, predecessorDefinitionId: target.definition_version_id,
            parameterSchemaSha256, acceptanceEvidenceSha256, definitionSourceSha256,
            normativeSourceIds: [WALL_PUTTY_CT127_KRER15_SOURCE_ID, CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID],
            synthetic: false, netNeedSeparatedFromProcurement: true, unknownPriceIsNull: true }),
        ]);
        await insertRows(client, "estimate_parameter_definition", [
          "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
          "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
        ], definition.parameters.map((parameter: Json) => [definitionId, parameter.parameter_id, parameter.ordinal,
          parameter.value_type, parameter.unit_id, parameter.title_ru, true, null,
          parameter.constraints_json, parameter.truth_metadata, null]));
        await insertRows(client, "estimate_formula_graph", [
          "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast", "input_parameter_ids", "ast_sha256",
        ], definition.formulas.map((formula: Json) => [definitionId, formula.formula_id, formula.output_unit_id,
          formula.expression_source, formula.ast, formula.input_parameter_ids, formula.ast_sha256]));
        const resourceIds = new Map<string, string>();
        const resources = definition.resources.map((resource: Json) => {
          const id = uuid(`${CONTRACT}:${fingerprint}:resource:${resource.row.row_id}`);
          resourceIds.set(resource.row.row_id, id);
          const rowSha256 = sha256({ rowId: resource.row.row_id,
            formulaAstSha256: resource.compiled ? sha256(resource.compiled.ast) : null,
            resourceGraph: resource.resourceGraph, sourceMetadata: resource.sourceMetadata });
          return { ...resource, id, rowSha256 };
        });
        await insertRows(client, "estimate_resource_spec", [
          "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
          "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
          "procurement_eligible", "source_metadata", "row_sha256",
        ], resources.map((resource: Json) => [resource.id, definitionId, resource.row.row_id, resource.ordinal,
          resource.row.section, resource.row.category, resource.row.title_ru, resource.row.category,
          resource.row.formula.output_unit_id, resource.row.formula.formula_id,
          { kind: "literal", value: true }, resource.resourceGraph, resource.row.semantic_owner,
          resource.row.cost_owner_id, resource.row.procurement_eligible, resource.sourceMetadata, resource.rowSha256]));
        const validationFixture = scenarioParameters();
        invariant(Object.keys(validationFixture).length === definition.parameters.length,
          `STOP_R9_VALIDATION_FIXTURE_SHAPE:${Object.keys(validationFixture).length}:${definition.parameters.length}`);
        const validationFixtureClassification = Object.fromEntries(
          Object.keys(validationFixture).map((parameterId) => [parameterId, "VALIDATION_FIXTURE"]),
        );
        const validationFixtureUnits = Object.fromEntries(
          definition.parameters.map((parameter: Json) => [parameter.parameter_id, parameter.unit_id ?? null]),
        );
        await client.query(`insert into public.estimate_approved_template_baseline(
            id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
            input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
            normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
            acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version)
          values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,
            $13::jsonb,$14::jsonb,$15::jsonb,$16,$17,clock_timestamp(),$18,$19)`, [
          baselineId, `${CONTRACT}:${fingerprint.slice(0, 16)}:${TARGET_CATALOG_ID}`,
          TARGET_CATALOG_ID, definitionId, target.definition_version_id, parameterSchemaSha256,
          JSON.stringify(validationFixture), JSON.stringify(validationFixtureClassification),
          JSON.stringify(validationFixtureUnits),
          JSON.stringify(definition.formulaConsumers), JSON.stringify(definition.resourceConsumers),
          JSON.stringify(baselineNormSources),
          JSON.stringify(Object.fromEntries(definition.parameters.map((parameter: Json) => [
            parameter.parameter_id, parameter.truth_metadata.guide.guide_short_ru,
          ]))),
          JSON.stringify([{ contract: CONTRACT, masterSha256: MASTER_SHA256,
            krer15OfficialPage: WALL_PUTTY_CT127_KRER15_OFFICIAL_PAGE,
            krer15OfficialPdf: WALL_PUTTY_CT127_KRER15_OFFICIAL_PDF,
            ct127Tds: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.source_url }]),
          JSON.stringify([{ scenario: "R9_WALL_PUTTY_100_M2_CT127_0_7_NET70_BUY80",
            acceptanceEvidenceSha256, coreAcceptance }]),
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
          definitionId, releaseId, TARGET_CATALOG_ID, "real-professional-estimates-r3.content-passport.v1",
          "Третья шпаклёвка стен под высококачественную окраску, CT 127",
          JSON.stringify(["Нанесение", "Шлифование", "Труд", "Машины", "Шкурка", "Ветошь", "CT 127"]),
          JSON.stringify(["Иные слои и виды отделки", "Цены без источника", "Доставка и отходы без проекта"]),
          JSON.stringify([
            { capability: "PARAMETERS", status: "GREEN" },
            { capability: "FORMULAS", status: "GREEN" },
            { capability: "RESOURCES", status: "GREEN" },
            { capability: "PRICE_AND_PROCUREMENT", status: "GREEN_WITH_LOCAL_ACCEPTANCE_SNAPSHOT" },
          ]),
          definition.parameters.length, definition.formulas.length, definition.resources.length,
          JSON.stringify({ status: "GREEN", allowed: true,
            contract: "real-professional-estimates-r3.content-passport.v1", waveContract: CONTRACT,
            exactNormativeWave: true, activationAllowed: false, productionEligible: false }),
          sha256({ definitionSha256, parameterSchemaSha256, acceptanceEvidenceSha256 }), head, tree,
        ]);
        await client.query(`update public.estimate_definition_version
          set content_status='CANDIDATE_READY',content_gate_status='GREEN'
          where id=$1 and release_id=$2 and catalog_id=$3`, [definitionId, releaseId, TARGET_CATALOG_ID]);

        const sources = [
          {
            key: WALL_PUTTY_CT127_KRER15_SOURCE_ID,
            title: "КРЕР-2015 №15: таблица 15-04-027, строка 15-04-027-01",
            authority: "Министерство строительства Кыргызской Республики",
            url: WALL_PUTTY_CT127_KRER15_OFFICIAL_PDF,
            artifactSha256: WALL_PUTTY_CT127_KRER15_SOURCE_PDF_SHA256,
            locator: { documentCode: "КРЕР-2015 №15", tableCode: "15-04-027",
              rateCode: WALL_PUTTY_CT127_KRER15_RATE_CODE, pdfPages: [191, 192],
              measurementBasis: "100 m2", rates: WALL_PUTTY_CT127_KRER15_RATES },
          },
          {
            key: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_ID,
            title: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.source_title,
            authority: "Ceresit / Henkel",
            url: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.source_url,
            artifactSha256: null,
            locator: { documentCode: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.tds_identifier,
              exactLocator: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.exact_locator,
              rateRangeKgM2: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.rate_range_kg_m2,
              documentedBagSizeKg: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.documented_bag_size_kg,
              definitionSha256: CERESIT_CT127_DRY_INTERIOR_FINISH_PUTTY_SOURCE_METADATA.definition_hash },
          },
        ];
        for (const source of sources) {
          await client.query(`insert into public.estimate_normative_source(
              id,source_key,title_ru,authority,official_url,artifact_sha256,effective_from,metadata)
            values($1,$2,$3,$4,$5,$6,'2015-01-01',$7::jsonb)
            on conflict(source_key) do update set official_url=excluded.official_url,
              artifact_sha256=coalesce(excluded.artifact_sha256,public.estimate_normative_source.artifact_sha256),
              metadata=public.estimate_normative_source.metadata||excluded.metadata`, [
            uuid(`${CONTRACT}:source:${source.key}`), source.key, source.title, source.authority,
            source.url, source.artifactSha256,
            JSON.stringify({ contract: CONTRACT, verifiedAt: "2026-09-14", targetCatalogId: TARGET_CATALOG_ID,
              useRestriction: "EXACT_RATE_AND_APPLICABILITY_ONLY" }),
          ]);
          const sourceId = String((await client.query(
            "select id::text from public.estimate_normative_source where source_key=$1",
            [source.key],
          )).rows[0].id);
          const locatorKey = sha256(source.locator);
          await client.query(`insert into public.estimate_normative_locator(id,source_id,locator_key,locator,excerpt_sha256)
            values($1,$2,$3,$4::jsonb,$5) on conflict(source_id,locator_key) do nothing`, [
            uuid(`${CONTRACT}:locator:${source.key}:${locatorKey}`), sourceId, locatorKey,
            JSON.stringify(source.locator), sha256(source.locator),
          ]);
        }

        await client.query(`update public.estimate_cumulative_manifest_entry set
            definition_version_id=$3,source_batch=$4,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
            approved_template_baseline_id=$5,baseline_ready=true,scenario_ready=true,definition_hash=$6,
            entry_sha256=$7,runtime_publication_state='CANDIDATE'
          where release_id=$1 and catalog_id=$2`, [
          releaseId, TARGET_CATALOG_ID, definitionId, CONTRACT, baselineId, definitionSha256,
          sha256({ contract: CONTRACT, releaseId, catalogId: TARGET_CATALOG_ID, definitionId,
            baselineId, definitionSha256 }),
        ]);
        const search = await cloneSearch(client, { releaseId, searchReleaseId,
          parentSearchReleaseId: predecessorSearchReleaseId, releaseKey, head, tree, fingerprint,
          clarificationFields });
        const manifestAudit = (await client.query(`select count(*)::int identities,
            count(*) filter(where catalog_id=$2 and definition_version_id=$3)::int replaced,
            encode(extensions.digest(convert_to(string_agg(entry_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot
          from public.estimate_cumulative_manifest_entry where release_id=$1`,
        [releaseId, TARGET_CATALOG_ID, definitionId])).rows[0] as Json;
        const targetAudit = (await client.query(`select
            (select count(*)::int from public.estimate_parameter_definition where definition_version_id=$1) parameters,
            (select count(*)::int from public.estimate_parameter_definition where definition_version_id=$1 and default_value is not null) defaults,
            (select count(*)::int from public.estimate_formula_graph where definition_version_id=$1) formulas,
            (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1) resources,
            (select count(*)::int from public.estimate_resource_spec where definition_version_id=$1 and source_metadata::text like '%synthetic%true%') synthetic_rows,
            (select count(*)::int from public.estimate_resource_price_route_binding b join public.estimate_resource_spec r on r.id=b.resource_spec_id where r.definition_version_id=$1) price_bindings`,
        [definitionId])).rows[0] as Json;
        const searchTarget = (await client.query(`select definition_version_id,required_inputs_count,selectable
          from public.estimate_search_document where search_release_id=$1 and catalog_id=$2`,
        [searchReleaseId, TARGET_CATALOG_ID])).rows[0] as Json;
        invariant(Number(manifestAudit.identities) === 10_331 && Number(manifestAudit.replaced) === 1,
          `STOP_R9_MANIFEST_AUDIT:${JSON.stringify(manifestAudit)}`);
        invariant(Number(targetAudit.parameters) === PUBLISHED_PARAMETER_IDS.size && Number(targetAudit.defaults) === 0
          && Number(targetAudit.formulas) === 7 && Number(targetAudit.resources) === 7
          && Number(targetAudit.synthetic_rows) === 0 && Number(targetAudit.price_bindings) === 0,
        `STOP_R9_TARGET_AUDIT:${JSON.stringify(targetAudit)}`);
        invariant(String(searchTarget.definition_version_id) === definitionId && searchTarget.selectable === true,
          `STOP_R9_SEARCH_TARGET_AUDIT:${JSON.stringify(searchTarget)}`);
        await client.query(`update public.estimate_definition_release
          set source_manifest_sha256=$2,status='prepared',sealed_at=clock_timestamp(),
            metadata=metadata||$3::jsonb where id=$1 and status='draft'`, [
          releaseId, manifestAudit.snapshot,
          JSON.stringify({ lifecycle: "PREPARED_NOT_ACTIVE", searchReleaseId,
            searchSnapshotSha256: search.snapshot_sha256, exactResourceRowCount: 7,
            sourceCoreAcceptanceSha256: coreAcceptance.deterministicSha256 }),
        ]);
        receipt = {
          status: APPLY
            ? "GREEN_R9_WALL_PUTTY_SUCCESSOR_PREPARED_NOT_ACTIVE"
            : "GREEN_R9_WALL_PUTTY_SUCCESSOR_DRY_RUN_ROLLED_BACK",
          idempotent: false,
          predecessor: { releaseId: predecessorReleaseId, searchReleaseId: predecessorSearchReleaseId,
            definitionId: target.definition_version_id, rows: target.resources },
          successor: { releaseId, searchReleaseId, definitionId, baselineId, releaseKey,
            definitionVersion: nextDefinitionVersion },
          fingerprint, coreAcceptance,
          audit: { manifest: manifestAudit, target: targetAudit, search, searchTarget,
            exactSources: sources.map((source) => ({ sourceKey: source.key,
              artifactSha256: source.artifactSha256, locatorSha256: sha256(source.locator) })) },
        };
        if (APPLY) await client.query("commit"); else await client.query("rollback");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
      if (!APPLY) {
        const residue = Number((await client.query(`select
            (select count(*) from public.estimate_definition_release where id=$1)+
            (select count(*) from public.estimate_search_index_release where id=$2) value`,
        [releaseId, searchReleaseId])).rows[0].value);
        invariant(residue === 0, `STOP_R9_DRY_RUN_RESIDUE:${residue}`);
        receipt.dryRunResidue = residue;
      }
    }
    const body = {
      schemaVersion: `${CONTRACT}.receipt.v1`,
      capturedAt: new Date().toISOString(),
      globalStatus: "GLOBAL_STATUS=RED_NOT_PRODUCTION_READY",
      source: { branch: EXPECTED_BRANCH, head, tree, sourceHashes },
      masterSha256: MASTER_SHA256,
      targetCatalogId: TARGET_CATALOG_ID,
      ...receipt!,
      productionAccessed: false,
      deployPerformed: false,
      activationPerformed: false,
    };
    const sealed = { ...body, receiptSha256: sha256(body) };
    if (APPLY && !receipt!.idempotent) {
      atomicJson(resolve(OUTPUT_ROOT, `03_R9_WALL_PUTTY_SUCCESSOR_${head}.json`), sealed);
    }
    process.stdout.write(`${JSON.stringify(sealed, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
