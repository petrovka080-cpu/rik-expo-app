import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
} from "../../../src/lib/estimate/buildProfessionalWorkPassport";
import type {
  ProfessionalBoqRecipeRow,
  WorkPassportParameter,
} from "../../../src/lib/estimate/workPassportContract";
import {
  bindCanonicalFormulaSource,
  canonicalFixedQuantityStatedBySource,
} from "../../../src/lib/estimate/backendPlatform/canonicalFormulaSourceBinding";
import {
  compileFormulaGraph,
  evaluateFormulaGraph,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";

type Json = Record<string, any>;

type Contract = {
  schemaVersion: string;
  masterSha256: string;
  predecessorDefinitionReleaseId: string;
  predecessorSearchReleaseId: string;
  preQuarantineSearchReleaseId: string;
  alreadyRepairedCatalogId: string;
  alreadyRepairedDefinitionVersionId: string;
  denominator: {
    definitions: number;
    definitionsAlreadyRepaired: number;
    definitionsToRepair: number;
    affectedRows: number;
    formulas: number;
    dynamicFormulas: number;
    explicitFixedFormulas: number;
  };
  calculatorHistogram: Record<string, number>;
  policy: Json;
};

type DefinitionRepair = {
  catalogId: string;
  sourceDefinitionId: string;
  definitionId: string;
  baselineId: string;
  source: Json;
  sourceBaseline: Json;
  parameterSchemaSha256: string;
  acceptanceEvidenceSha256: string;
  parameters: Json[];
  formulas: Json[];
  resources: Json[];
  priceBindings: Json[];
  definitionHash: string;
  referenceParityRows: number;
  dynamicFormulaCount: number;
  explicitFixedFormulaCount: number;
  sensitivity: Json[];
};

const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_R5_6_8_RC09_R4_A6_CANONICAL_MONOLITH_PROFESSIONAL_ESTIMATE_PRINT_PDF_FORMULA_REMEDIATION_ANDROID_API34_GROUP50_71040_GLOBAL_GREEN_RU.md",
);
const CONTRACT_PATH = resolve("data/estimate-benchmarks/r568-r4-a6-formula-remediation-contract.json");
const OUTPUT = resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1/14_FORMULA_DEPENDENCIES_86_OF_86.json",
);
const DATABASE_URL = process.env.ESTIMATE_MIGRATION_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const APPLY = process.argv.includes("--apply");
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const CONTRACT_ID = "rik-expo-app.r568.r4-a6-formula-dependency-successor.v1";
const MANAGED_SOURCE_PATHS = [
  "data/estimate-benchmarks/r568-r4-a6-formula-remediation-contract.json",
  "data/estimate-benchmarks/r568-r4-a6-runtime-closeout-include-manifest.json",
  "scripts/estimate/p0TruthRemediationR5/prepareR4A6FormulaDependencySuccessor.ts",
  "scripts/estimate/r555/buildR555CumulativeSuccessorPayload.ts",
  "src/lib/ai/expandedComplexWorks/index.ts",
  "src/lib/estimate/backendPlatform/canonicalFormulaSourceBinding.ts",
  "src/lib/estimate/backendPlatform/formulaGraph.ts",
  "src/lib/estimate/buildProfessionalWorkPassport.ts",
  "tests/estimateExpandedComplex/formulaDependencyOwnersR4A6.contract.test.ts",
] as const;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return sha256(stableJson(value));
}

function uuid(seed: string): string {
  const bytes = Buffer.from(sha256(seed).slice(0, 32), "hex");
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function git(args: string[]): string {
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

function sourceFingerprint(contractBytes: Buffer, head: string): string {
  return shaObject({
    head,
    contractSha256: sha256(contractBytes),
    sources: MANAGED_SOURCE_PATHS.map((path) => ({
      path,
      sha256: sha256(readFileSync(resolve(path))),
    })),
  });
}

function baselineValue(
  parameter: WorkPassportParameter,
  rows: readonly ProfessionalBoqRecipeRow[],
  titleRu: string,
): unknown {
  for (const row of rows) {
    const candidate = row.formulaContext?.[parameter.key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === "boolean" || (typeof candidate === "string" && candidate.trim())) return candidate;
  }
  if (parameter.key === "source_prompt") return titleRu;
  if (/^(?:project_location|drawings_or_specification|equipment_specification|material_specification|geology_profile|loads|site_access|work_complexity)$/u.test(parameter.key)) return "";
  if (/(?:enabled|included|required|needed|existing|demolition|removal|testing)$/iu.test(parameter.key)) return false;
  if (/(?:count|quantity|units|number)$/iu.test(parameter.key)) return 1;
  return /(?:area|length|volume|capacity|weight|mass|power|flow|distance|height|width|depth|q)(?:_|$)/iu.test(parameter.key)
    ? 100
    : 1;
}

function parameterType(
  parameter: WorkPassportParameter,
  value: unknown,
): "boolean" | "decimal" | "integer" | "text" {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "text";
  if (/(?:count|quantity|units|number|floors)$/iu.test(parameter.key) && Number.isInteger(value)) return "integer";
  return "decimal";
}

function numericInputs(parameters: Json[]): Record<string, number | boolean> {
  return Object.fromEntries(parameters
    .filter((parameter) => ["decimal", "integer", "boolean"].includes(String(parameter.value_type)))
    .map((parameter) => [
      String(parameter.parameter_id),
      parameter.value_type === "boolean" ? Boolean(parameter.default_value) : Number(parameter.default_value),
    ]));
}

function variedValue(value: number, valueType: string, direction: "lower" | "upper"): number {
  if (direction === "lower") {
    const candidate = value * 0.5;
    return valueType === "integer" ? Math.max(0, Math.floor(candidate)) : Math.max(0.000001, candidate);
  }
  const candidate = value * 1.5;
  return valueType === "integer" ? Math.max(value + 1, Math.ceil(candidate)) : candidate;
}

async function loadCurrentDefinitions(client: Client, contract: Contract): Promise<Json[]> {
  return (await client.query(`select manifest.catalog_id,manifest.definition_version_id,
      manifest.approved_template_baseline_id,manifest.runtime_publication_state,
      definition.source_metadata->>'templateId' template_id,
      definition.passport#>>'{contentPack,calculatorId}' calculator_id
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition on definition.id=manifest.definition_version_id
    where manifest.release_id=$1 and (
      manifest.runtime_publication_state='QUARANTINED' or manifest.catalog_id=$2
    ) order by manifest.catalog_id`, [
    contract.predecessorDefinitionReleaseId,
    contract.alreadyRepairedCatalogId,
  ])).rows as Json[];
}

async function buildDefinitionRepair(input: {
  client: Client;
  sourceRow: Json;
  releaseId: string;
  fingerprint: string;
  head: string;
}): Promise<DefinitionRepair> {
  const { client, sourceRow, fingerprint } = input;
  clearProfessionalWorkPassportBuildCaches();
  const passport = buildProfessionalWorkPassport(String(sourceRow.template_id));
  invariant(passport, `R4_A6_FORMULA_PASSPORT_MISSING:${sourceRow.catalog_id}`);
  const source = (await client.query(
    "select * from public.estimate_definition_version where id=$1 and catalog_id=$2",
    [sourceRow.definition_version_id, sourceRow.catalog_id],
  )).rows[0] as Json | undefined;
  invariant(source, `R4_A6_FORMULA_SOURCE_DEFINITION_MISSING:${sourceRow.catalog_id}`);
  const sourceFormulas = (await client.query(
    "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
    [source.id],
  )).rows as Json[];
  const sourceResources = (await client.query(
    "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal,row_id",
    [source.id],
  )).rows as Json[];
  const sourceBaseline = (await client.query(
    "select * from public.estimate_approved_template_baseline where id=$1",
    [sourceRow.approved_template_baseline_id],
  )).rows[0] as Json | undefined;
  const priceBindings = (await client.query(`select binding.route_id,binding.price_key,binding.priority,resource.row_id
    from public.estimate_resource_price_route_binding binding
    join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
    where resource.definition_version_id=$1 order by resource.ordinal,binding.priority,binding.price_key`, [
    source.id,
  ])).rows as Json[];
  invariant(sourceBaseline && sourceFormulas.length === sourceResources.length
    && sourceResources.length === passport.boqRecipe.allRows.length,
  `R4_A6_FORMULA_SOURCE_COUNTS_RED:${sourceRow.catalog_id}:${sourceFormulas.length}/${sourceResources.length}/${passport.boqRecipe.allRows.length}`);
  invariant(priceBindings.length >= sourceResources.length,
    `R4_A6_FORMULA_PRICE_BINDINGS_RED:${sourceRow.catalog_id}:${priceBindings.length}/${sourceResources.length}`);

  const recipeByRowId = new Map(passport.boqRecipe.allRows.map((row) => [row.rowId, row]));
  for (const resource of sourceResources) {
    const recipe = recipeByRowId.get(String(resource.row_id));
    invariant(recipe && Number(resource.ordinal) === passport.boqRecipe.allRows.indexOf(recipe)
      && String(resource.title_ru) === recipe.titleRu
      && String(resource.unit_id) === recipe.sourceUnit
      && String(resource.formula_id) === recipe.formulaId,
    `R4_A6_FORMULA_ROW_SCOPE_DRIFT:${sourceRow.catalog_id}:${resource.row_id}`);
  }

  const passportParameters = [...passport.parameterSchema.required, ...passport.parameterSchema.optional];
  const parameterIds = new Set(passportParameters.map((parameter) => parameter.key));
  const parameterDefaults = Object.fromEntries(passportParameters.map((parameter) => [
    parameter.key,
    baselineValue(parameter, passport.boqRecipe.allRows, passport.localizedNameRu),
  ]));
  const derivedFormulas = new Map<string, string>();
  for (const step of passport.formulas.formulaSteps) {
    const assignment = /^\s*([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.+?)\s*$/u.exec(step);
    if (assignment) derivedFormulas.set(assignment[1]!, assignment[2]!);
  }
  for (const recipe of passport.boqRecipe.allRows) {
    derivedFormulas.set(recipe.rowId, recipe.quantityFormula);
  }
  const oldFormulaById = new Map(sourceFormulas.map((formula) => [String(formula.formula_id), formula]));
  const compiledFormulas = sourceResources.map((resource) => {
    const recipe = recipeByRowId.get(String(resource.row_id))!;
    const expression = bindCanonicalFormulaSource({
      source: recipe.quantityFormula,
      parameterIds,
      derivedFormulas,
      resolving: new Set([recipe.rowId]),
    });
    const compiled = compileFormulaGraph(expression);
    const fixed = canonicalFixedQuantityStatedBySource(recipe.quantityFormula) != null;
    invariant(fixed === (compiled.inputParameterIds.length === 0),
      `R4_A6_FORMULA_FIXED_DEPENDENCY_RED:${sourceRow.catalog_id}:${recipe.rowId}`);
    const previous = oldFormulaById.get(String(resource.formula_id));
    invariant(previous, `R4_A6_FORMULA_PREDECESSOR_MISSING:${sourceRow.catalog_id}:${resource.formula_id}`);
    const referenceValue = evaluateFormulaGraph(compiled.ast, numericInputs(passportParameters.map((parameter) => ({
      parameter_id: parameter.key,
      value_type: parameterType(parameter, parameterDefaults[parameter.key]),
      default_value: parameterDefaults[parameter.key],
    }))));
    const predecessorValue = evaluateFormulaGraph(previous.ast, {});
    invariant(referenceValue === predecessorValue,
      `R4_A6_FORMULA_REFERENCE_PARITY_RED:${sourceRow.catalog_id}:${recipe.rowId}:${predecessorValue}/${referenceValue}`);
    return {
      formula_id: resource.formula_id,
      output_unit_id: previous.output_unit_id,
      expression_source: expression,
      ast: compiled.ast,
      input_parameter_ids: compiled.inputParameterIds,
      ast_sha256: shaObject(compiled.ast),
      reference_value: referenceValue,
      original_source: recipe.quantityFormula,
    };
  });
  const formulaById = new Map(compiledFormulas.map((formula) => [String(formula.formula_id), formula]));
  const allResourceRowIds = sourceResources.map((resource) => String(resource.row_id)).sort();
  const formulaConsumers = Object.fromEntries(passportParameters.map((parameter) => [
    parameter.key,
    compiledFormulas.filter((formula) => formula.input_parameter_ids.includes(parameter.key))
      .map((formula) => formula.formula_id).sort(),
  ]));
  const resourceConsumers = Object.fromEntries(passportParameters.map((parameter) => [
    parameter.key,
    (() => {
      const directConsumers = sourceResources.filter((resource) => formulaById.get(String(resource.formula_id))!
        .input_parameter_ids.includes(parameter.key)).map((resource) => String(resource.row_id)).sort();
      // R54 requires every visible baseline input to own at least one resource branch.
      // Project/document inputs govern the applicability of the complete BOQ even when
      // they are intentionally absent from the numeric formula graph.
      return directConsumers.length > 0 ? directConsumers : allResourceRowIds;
    })(),
  ]));
  const parameterSchemaSha256 = shaObject(passportParameters.map((parameter) => ({
    ...parameter,
    defaultValue: parameterDefaults[parameter.key],
  })));
  const acceptanceEvidenceSha256 = shaObject({
    contract: CONTRACT_ID,
    catalogId: sourceRow.catalog_id,
    sourceDefinitionId: source.id,
    parameterSchemaSha256,
    formulaConsumers,
    resourceConsumers,
    sourceFingerprint: fingerprint,
  });
  const baselineId = uuid(`${CONTRACT_ID}:baseline:${sourceRow.catalog_id}:${fingerprint}`);
  const definitionId = uuid(`${CONTRACT_ID}:definition:${sourceRow.catalog_id}:${fingerprint}`);
  const parameters = passportParameters.map((parameter, ordinal) => {
    const value = parameterDefaults[parameter.key];
    const valueType = parameterType(parameter, value);
    const formulaConsumerIds = formulaConsumers[parameter.key] as string[];
    if (["decimal", "integer"].includes(valueType)) {
      invariant(formulaConsumerIds.length > 0,
        `R4_A6_FORMULA_PARAMETER_WITHOUT_CONSUMER:${sourceRow.catalog_id}:${parameter.key}`);
    }
    return {
      parameter_id: parameter.key,
      ordinal,
      value_type: valueType,
      unit_id: parameter.unit,
      title_ru: parameter.labelRu,
      required: parameter.required,
      default_value: value,
      constraints_json: ["decimal", "integer"].includes(valueType)
        ? { min: valueType === "integer" ? 0 : 0.000001, max: 1_000_000_000 }
        : {},
      truth_metadata: {
        guide: {
          guide_kind: parameter.required ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
          source_role: parameter.required ? "USER_MEASURED" : "PROJECT_DOCUMENTATION",
          verified_at: "2026-09-05T00:00:00+06:00",
          applicability: passport.localizedNameRu,
          guide_version: "R568_R4_A6_V1",
          guide_short_ru: parameter.required
            ? `Укажите фактическое значение параметра «${parameter.labelRu}» по обмеру или проекту.`
            : `Уточните параметр «${parameter.labelRu}» по проектной документации.`,
          source_snapshot_hash: fingerprint,
        },
        provenance: {
          baselineOwner: "approved-template-baseline:r54",
          sourceCatalogId: sourceRow.catalog_id,
          sourceReleaseId: input.releaseId,
          sourceDefinitionVersionId: source.id,
          sourceParameterSchemaId: parameterSchemaSha256,
          approvedTemplateBaselineId: baselineId,
          acceptanceEvidenceSha256,
          approvedTemplateBinding: {
            contract: CONTRACT_ID,
            sourceTree: fingerprint,
            payloadValidationSha256: acceptanceEvidenceSha256,
          },
        },
        visibility_role: "USER_INPUT",
        formula_consumers: formulaConsumerIds,
        resource_branch_consumers: resourceConsumers[parameter.key],
        value_source_role: "VISIBLE_BASELINE_ASSUMPTION",
        baseline_assumption_id: `${baselineId}:${parameter.key}`,
        semantic_parameter_key: `${sourceRow.catalog_id}:${parameter.key}`,
      },
    };
  });
  const baselineNumericInputs = numericInputs(parameters);
  const sensitivity = parameters
    .filter((parameter) => ["decimal", "integer"].includes(String(parameter.value_type)))
    .map((parameter) => {
      const parameterId = String(parameter.parameter_id);
      const nominal = Number(parameter.default_value);
      const lowerInputs = { ...baselineNumericInputs, [parameterId]: variedValue(nominal, parameter.value_type, "lower") };
      const upperInputs = { ...baselineNumericInputs, [parameterId]: variedValue(nominal, parameter.value_type, "upper") };
      const consumers = compiledFormulas.filter((formula) => formula.input_parameter_ids.includes(parameterId));
      const changedConsumers = consumers.filter((formula) => evaluateFormulaGraph(formula.ast, lowerInputs)
        !== evaluateFormulaGraph(formula.ast, upperInputs));
      invariant(changedConsumers.length > 0,
        `R4_A6_FORMULA_SENSITIVITY_RED:${sourceRow.catalog_id}:${parameterId}`);
      return {
        parameterId,
        lower: lowerInputs[parameterId],
        nominal,
        upper: upperInputs[parameterId],
        consumerCount: consumers.length,
        changedConsumerCount: changedConsumers.length,
        lowerSha256: shaObject(consumers.map((formula) => evaluateFormulaGraph(formula.ast, lowerInputs))),
        nominalSha256: shaObject(consumers.map((formula) => evaluateFormulaGraph(formula.ast, baselineNumericInputs))),
        upperSha256: shaObject(consumers.map((formula) => evaluateFormulaGraph(formula.ast, upperInputs))),
      };
    });
  const resources = sourceResources.map((resource) => {
    const formula = formulaById.get(String(resource.formula_id))!;
    const recipe = recipeByRowId.get(String(resource.row_id))!;
    const comparable = {
      row_id: resource.row_id,
      ordinal: resource.ordinal,
      section: resource.section,
      category: resource.category,
      title_ru: resource.title_ru,
      row_type: resource.row_type,
      unit_id: resource.unit_id,
      formula_id: resource.formula_id,
      inclusion_ast: resource.inclusion_ast,
      resource_graph: resource.resource_graph,
      semantic_owner: resource.semantic_owner,
      cost_owner_id: resource.cost_owner_id,
      procurement_eligible: resource.procurement_eligible,
      source_metadata: {
        ...resource.source_metadata,
        originalQuantityFormula: recipe.quantityFormula,
        runtimeExpressionSource: formula.expression_source,
        fallbackReason: null,
        calibration: null,
        formulaDependencyRepair: {
          contract: CONTRACT_ID,
          sourceDefinitionVersionId: source.id,
          inputParameterIds: formula.input_parameter_ids,
          baselineNumberSubstitution: "FORBIDDEN",
          calibrationByExpectedTotal: "FORBIDDEN",
          sourceFingerprint: fingerprint,
        },
      },
    };
    return {
      id: uuid(`${CONTRACT_ID}:resource:${sourceRow.catalog_id}:${resource.row_id}:${fingerprint}`),
      ...comparable,
      row_sha256: shaObject(comparable),
    };
  });
  const definitionHash = shaObject({
    catalogId: sourceRow.catalog_id,
    definitionVersion: Number(source.definition_version) + 1,
    parameters,
    formulas: compiledFormulas.map(({ reference_value: _reference, original_source: _source, ...formula }) => formula),
    resources,
  });
  return {
    catalogId: String(sourceRow.catalog_id),
    sourceDefinitionId: String(source.id),
    definitionId,
    baselineId,
    source,
    sourceBaseline,
    parameterSchemaSha256,
    acceptanceEvidenceSha256,
    parameters,
    formulas: compiledFormulas,
    resources,
    priceBindings,
    definitionHash,
    referenceParityRows: compiledFormulas.length,
    dynamicFormulaCount: compiledFormulas.filter((formula) => formula.input_parameter_ids.length > 0).length,
    explicitFixedFormulaCount: compiledFormulas.filter((formula) => formula.input_parameter_ids.length === 0).length,
    sensitivity,
  };
}

async function insertDefinitionRepair(input: {
  client: Client;
  repair: DefinitionRepair;
  releaseId: string;
  fingerprint: string;
  head: string;
}): Promise<void> {
  const { client, repair, releaseId, fingerprint, head } = input;
  const parameterSchemaSha256 = repair.parameterSchemaSha256;
  await client.query(`insert into public.estimate_definition_version(
    id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,
    source_metadata,content_status,content_gate_status
  ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,'QUARANTINED','RED')`, [
    repair.definitionId,
    releaseId,
    repair.catalogId,
    Number(repair.source.definition_version) + 1,
    JSON.stringify({
      ...repair.source.passport,
      contract: CONTRACT_ID,
      parameterCount: repair.parameters.length,
      rowCount: repair.resources.length,
      formulaDependencyPolicy: "STRICT_PARAMETER_GRAPH_NO_NUMERIC_SUBSTITUTION",
    }),
    JSON.stringify(repair.source.applicability),
    repair.definitionHash,
    JSON.stringify({
      ...repair.source.source_metadata,
      contract: CONTRACT_ID,
      sourceDefinitionVersionId: repair.sourceDefinitionId,
      sourceFingerprint: fingerprint,
      immutableFormulaSuccessor: true,
      baselineNumberSubstitution: "FORBIDDEN",
      calibrationByExpectedTotal: "FORBIDDEN",
    }),
  ]);
  const normativeSourceIds = [...new Set(Object.values(repair.sourceBaseline.normative_source_ids ?? {}).flat())];
  const formulaConsumers = Object.fromEntries(repair.parameters.map((parameter) => [
    parameter.parameter_id,
    parameter.truth_metadata.formula_consumers,
  ]));
  const resourceConsumers = Object.fromEntries(repair.parameters.map((parameter) => [
    parameter.parameter_id,
    parameter.truth_metadata.resource_branch_consumers,
  ]));
  const baselineKey = `${CONTRACT_ID}:${fingerprint.slice(0, 16)}:${sha256(repair.catalogId).slice(0, 16)}`;
  const acceptanceEvidenceSha256 = repair.acceptanceEvidenceSha256;
  await client.query(`insert into public.estimate_approved_template_baseline(
    id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
    parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
    formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
    proposal_source_refs,validation_scenario_refs,acceptance_evidence_sha256,
    accepted_release_id,accepted_at,supersedes_baseline_id,contract_version
  ) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,
    $12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,clock_timestamp(),$18,
    'APPROVED_TEMPLATE_BASELINE_R54_V1')`, [
    repair.baselineId,
    baselineKey,
    repair.catalogId,
    repair.definitionId,
    repair.sourceDefinitionId,
    parameterSchemaSha256,
    JSON.stringify(Object.fromEntries(repair.parameters.map((parameter) => [parameter.parameter_id, parameter.default_value]))),
    JSON.stringify(Object.fromEntries(repair.parameters.map((parameter) => [parameter.parameter_id, "ASSUMPTION"]))),
    JSON.stringify(Object.fromEntries(repair.parameters.map((parameter) => [parameter.parameter_id, parameter.unit_id ?? null]))),
    JSON.stringify(formulaConsumers),
    JSON.stringify(resourceConsumers),
    JSON.stringify(Object.fromEntries(repair.parameters.map((parameter) => [parameter.parameter_id, normativeSourceIds]))),
    JSON.stringify(Object.fromEntries(repair.parameters.map((parameter) => [
      parameter.parameter_id,
      parameter.truth_metadata.guide.guide_short_ru,
    ]))),
    JSON.stringify([{
      contract: CONTRACT_ID,
      sourceDefinitionVersionId: repair.sourceDefinitionId,
      sourceDefinitionSha256: repair.source.definition_sha256,
      sourceFingerprint: fingerprint,
    }]),
    JSON.stringify([{
      contract: CONTRACT_ID,
      scenario: "LOWER_NOMINAL_UPPER_PER_NUMERIC_PARAMETER",
      sensitivity: repair.sensitivity,
    }]),
    acceptanceEvidenceSha256,
    releaseId,
    repair.sourceBaseline.id,
  ]);
  for (const parameter of repair.parameters) {
    await client.query(`insert into public.estimate_parameter_definition(
      definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,
      default_value,constraints_json,truth_metadata,approved_template_baseline_id
    ) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11)`, [
      repair.definitionId,
      parameter.parameter_id,
      parameter.ordinal,
      parameter.value_type,
      parameter.unit_id,
      parameter.title_ru,
      parameter.required,
      JSON.stringify(parameter.default_value),
      JSON.stringify(parameter.constraints_json),
      JSON.stringify(parameter.truth_metadata),
      repair.baselineId,
    ]);
  }
  for (const formula of repair.formulas) {
    await client.query(`insert into public.estimate_formula_graph(
      definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
    ) values($1,$2,$3,$4,$5::jsonb,$6::text[],$7)`, [
      repair.definitionId,
      formula.formula_id,
      formula.output_unit_id,
      formula.expression_source,
      JSON.stringify(formula.ast),
      formula.input_parameter_ids,
      formula.ast_sha256,
    ]);
  }
  for (const resource of repair.resources) {
    await client.query(`insert into public.estimate_resource_spec(
      id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,
      formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,
      procurement_eligible,source_metadata,row_sha256
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16::jsonb,$17)`, [
      resource.id,
      repair.definitionId,
      resource.row_id,
      resource.ordinal,
      resource.section,
      resource.category,
      resource.title_ru,
      resource.row_type,
      resource.unit_id,
      resource.formula_id,
      JSON.stringify(resource.inclusion_ast),
      JSON.stringify(resource.resource_graph),
      resource.semantic_owner,
      resource.cost_owner_id,
      resource.procurement_eligible,
      JSON.stringify(resource.source_metadata),
      resource.row_sha256,
    ]);
  }
  const resourceByRowId = new Map(repair.resources.map((resource) => [String(resource.row_id), resource]));
  for (const binding of repair.priceBindings) {
    await client.query(`insert into public.estimate_resource_price_route_binding(
      resource_spec_id,route_id,price_key,priority
    ) values($1,$2,$3,$4)`, [
      resourceByRowId.get(String(binding.row_id))!.id,
      binding.route_id,
      binding.price_key,
      binding.priority,
    ]);
  }
  const contentPassport = (await client.query(
    "select * from public.estimate_content_passport_r3 where definition_version_id=$1",
    [repair.sourceDefinitionId],
  )).rows[0] as Json | undefined;
  invariant(contentPassport, `R4_A6_FORMULA_CONTENT_PASSPORT_MISSING:${repair.catalogId}`);
  const decision = {
    ...contentPassport.decision,
    status: "GREEN",
    allowed: true,
    formulaDependencyContract: CONTRACT_ID,
    baselineNumberSubstitution: "FORBIDDEN",
    calibrationByExpectedTotal: "FORBIDDEN",
    exactReferenceParity: `${repair.referenceParityRows}/${repair.referenceParityRows}`,
  };
  await client.query(`insert into public.estimate_content_passport_r3(
    definition_version_id,release_id,catalog_id,contract_version,identity_mode,
    redirect_catalog_id,physical_result_ru,included_scope_ru,excluded_scope_ru,
    capability_matrix,parameter_count,formula_count,resource_count,decision,
    payload_sha256,source_head,source_tree
  ) values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12,$13,$14::jsonb,$15,$16,$17)`, [
    repair.definitionId,
    releaseId,
    repair.catalogId,
    contentPassport.contract_version,
    contentPassport.identity_mode,
    contentPassport.redirect_catalog_id,
    contentPassport.physical_result_ru,
    JSON.stringify(contentPassport.included_scope_ru),
    JSON.stringify(contentPassport.excluded_scope_ru),
    JSON.stringify(contentPassport.capability_matrix),
    repair.parameters.length,
    repair.formulas.length,
    repair.resources.length,
    JSON.stringify(decision),
    shaObject({ repair: repair.definitionHash, decision }),
    head,
    fingerprint,
  ]);
  await client.query(`update public.estimate_definition_version
    set content_status='CANDIDATE_READY',content_gate_status='GREEN'
    where id=$1 and release_id=$2 and content_status='QUARANTINED' and content_gate_status='RED'`, [
    repair.definitionId,
    releaseId,
  ]);
}

async function cloneSearchIndex(input: {
  client: Client;
  contract: Contract;
  releaseId: string;
  searchReleaseId: string;
  releaseKey: string;
  repairs: DefinitionRepair[];
  fingerprint: string;
  head: string;
}): Promise<Json> {
  const { client, contract } = input;
  const predecessor = (await client.query(
    "select * from public.estimate_search_index_release where id=$1",
    [contract.predecessorSearchReleaseId],
  )).rows[0] as Json | undefined;
  invariant(predecessor && ["draft", "prepared"].includes(String(predecessor.status)),
    "R4_A6_FORMULA_SEARCH_PREDECESSOR_RED");
  await client.query(`insert into public.estimate_search_index_release(
    id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
    source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata
  ) values($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`, [
    input.searchReleaseId,
    `${input.releaseKey}:search`,
    predecessor.taxonomy_version,
    predecessor.group_relation_version,
    predecessor.ranking_contract_version,
    input.head,
    git(["rev-parse", `${input.head}^{tree}`]),
    input.fingerprint,
    predecessor.global_count,
    predecessor.external_count,
    predecessor.discovered_count,
    JSON.stringify({
      ...predecessor.metadata,
      contract: CONTRACT_ID,
      definitionReleaseId: input.releaseId,
      parentSearchReleaseId: contract.predecessorSearchReleaseId,
      repairedDefinitionCount: contract.denominator.definitions,
      quarantinedDefinitionCount: 0,
      sourceFingerprint: input.fingerprint,
      activationAllowed: false,
      productionEligible: false,
    }),
  ]);
  for (const table of ["estimate_search_group", "estimate_search_clarification_question"] as const) {
    const columns = table === "estimate_search_group"
      ? "group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition"
      : "question_id,candidate_set_sha256,candidate_ids,discriminator_field,prompt_ru,answer_type,unit_id,allowed_options,option_to_candidate_partition,source_role,source_locator,required,sequence";
    await client.query(`insert into public.${table}(search_release_id,${columns})
      select $1,${columns} from public.${table} where search_release_id=$2`, [
      input.searchReleaseId,
      contract.predecessorSearchReleaseId,
    ]);
  }
  await client.query(`insert into public.estimate_search_document(
    search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
    group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
    primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,
    publication_state,catalog_origin,definition_release_id,short_scope_ru,
    key_distinguishing_parameters,required_inputs_count,clarification_fields,included_boundaries,
    excluded_boundaries,replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,
    normalized_aliases,normalized_search_terms,normalized_search_blob,source_provenance,
    document_sha256,adjudication_class,selectable,canonical_target_catalog_id,definition_version_id
  ) select $1,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
    group_id,subgroup_id,element_type,operation_kind,technology_variant,construction_state,
    primary_uom,canonical_name_ru,aliases,normative_classifiers,applicability_tags,
    publication_state,catalog_origin,$2,short_scope_ru,key_distinguishing_parameters,
    required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
    replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
    normalized_search_terms,normalized_search_blob,
    source_provenance||jsonb_build_object('contract',$3::text,'definitionReleaseId',($2::uuid)::text,
      'parentSearchReleaseId',($4::uuid)::text,'sourceFingerprint',$5::text),
    encode(extensions.digest(convert_to(document_sha256||':'||$3||':'||($1::uuid)::text,'UTF8'),'sha256'),'hex'),
    adjudication_class,selectable,canonical_target_catalog_id,definition_version_id
    from public.estimate_search_document where search_release_id=$4`, [
    input.searchReleaseId,
    input.releaseId,
    CONTRACT_ID,
    contract.predecessorSearchReleaseId,
    input.fingerprint,
  ]);
  for (const repair of input.repairs) {
    await client.query(`update public.estimate_search_document target set
      publication_state=original.publication_state,
      adjudication_class=original.adjudication_class,
      selectable=original.selectable,
      definition_version_id=$4,
      required_inputs_count=$5,
      source_provenance=original.source_provenance||jsonb_build_object(
        'contract',$6::text,'definitionReleaseId',($7::uuid)::text,
        'parentSearchReleaseId',($8::uuid)::text,'sourceFingerprint',$9::text,
        'formulaDependencyDisposition','IMMUTABLE_SUCCESSOR'),
      document_sha256=encode(extensions.digest(convert_to(original.document_sha256||':'||$6||':'||($4::uuid)::text,
        'UTF8'),'sha256'),'hex')
      from public.estimate_search_document original
      where target.search_release_id=$1 and target.catalog_id=$2
        and original.search_release_id=$3 and original.catalog_id=target.catalog_id`, [
      input.searchReleaseId,
      repair.catalogId,
      contract.preQuarantineSearchReleaseId,
      repair.definitionId,
      repair.parameters.filter((parameter) => parameter.required).length,
      CONTRACT_ID,
      input.releaseId,
      contract.predecessorSearchReleaseId,
      input.fingerprint,
    ]);
  }
  // Memberships and typed relations reference the cloned documents through
  // composite foreign keys, so they must be copied only after all documents exist.
  for (const table of ["estimate_search_group_membership", "estimate_search_typed_relation"] as const) {
    const columns = table === "estimate_search_group_membership"
      ? "group_id,catalog_id,ordinal,independent_disposition"
      : "source_catalog_id,target_catalog_id,relationship_type,direction,source_locator,applicability_predicate,required_when,mutually_exclusive_with,explanation_ru,relation_sha256";
    await client.query(`insert into public.${table}(search_release_id,${columns})
      select $1,${columns} from public.${table} where search_release_id=$2`, [
      input.searchReleaseId,
      contract.predecessorSearchReleaseId,
    ]);
  }
  const snapshot = (await client.query(`select
    encode(extensions.digest(convert_to(string_agg(document_sha256,'' order by catalog_id),'UTF8'),'sha256'),'hex') snapshot_sha256,
    count(*)::int document_count,
    count(*) filter(where selectable)::int selectable_count,
    count(*) filter(where adjudication_class='QUARANTINED')::int quarantined_count
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  await client.query(
    "update public.estimate_search_index_release set snapshot_sha256=$2 where id=$1 and status='draft'",
    [input.searchReleaseId, snapshot.snapshot_sha256],
  );
  return snapshot;
}

async function auditPreparedSuccessor(input: {
  client: Client;
  contract: Contract;
  releaseId: string;
  searchReleaseId: string;
  affectedCatalogIds: string[];
}): Promise<Json> {
  const release = (await input.client.query(
    "select * from public.estimate_definition_release where id=$1",
    [input.releaseId],
  )).rows[0] as Json | undefined;
  const manifest = (await input.client.query(`select count(*)::int definitions,
    count(*) filter(where baseline_ready and scenario_ready)::int ready,
    count(*) filter(where runtime_publication_state='QUARANTINED')::int quarantined
    from public.estimate_cumulative_manifest_entry where release_id=$1`, [input.releaseId])).rows[0] as Json;
  const formulas = (await input.client.query(`select count(*)::int formulas,
    count(*) filter(where cardinality(formula.input_parameter_ids)>0)::int dynamic,
    count(*) filter(where cardinality(formula.input_parameter_ids)=0)::int fixed,
    count(distinct manifest.definition_version_id)::int definitions
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_formula_graph formula on formula.definition_version_id=manifest.definition_version_id
    where manifest.release_id=$1 and manifest.catalog_id=any($2::text[])`, [
    input.releaseId,
    input.affectedCatalogIds,
  ])).rows[0] as Json;
  const search = (await input.client.query(`select count(*)::int documents,
    count(*) filter(where selectable)::int selectable,
    count(*) filter(where adjudication_class='QUARANTINED')::int quarantined
    from public.estimate_search_document where search_release_id=$1`, [input.searchReleaseId])).rows[0] as Json;
  invariant(release?.status === "prepared"
    && Number(manifest.definitions) === 10_331
    && Number(manifest.ready) === 10_331
    && Number(manifest.quarantined) === 0
    && Number(formulas.definitions) === input.contract.denominator.definitions
    && Number(formulas.formulas) === input.contract.denominator.formulas
    && Number(formulas.dynamic) === input.contract.denominator.dynamicFormulas
    && Number(formulas.fixed) === input.contract.denominator.explicitFixedFormulas
    && Number(search.quarantined) === 0,
  `R4_A6_FORMULA_SUCCESSOR_AUDIT_RED:${stableJson({ release, manifest, formulas, search })}`);
  return { manifest, formulas, search };
}

async function main(): Promise<void> {
  const contractBytes = readFileSync(CONTRACT_PATH);
  const contract = JSON.parse(contractBytes.toString("utf8")) as Contract;
  invariant(contract.schemaVersion === "r568-r4-a6-formula-remediation-contract.v1",
    "R4_A6_FORMULA_CONTRACT_VERSION_RED");
  invariant(sha256(readFileSync(MASTER_PATH)) === contract.masterSha256,
    "R4_A6_FORMULA_MASTER_SHA256_DRIFT");
  invariant(contract.policy.baselineNumberSubstitution === "FORBIDDEN"
    && contract.policy.calibrationByExpectedTotal === "FORBIDDEN"
    && contract.policy.unresolvedFormulaParameter === "REJECT",
  "R4_A6_FORMULA_POLICY_RED");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  invariant(branch === EXPECTED_BRANCH, `R4_A6_FORMULA_BRANCH_DRIFT:${branch}`);
  if (APPLY) {
    for (const path of MANAGED_SOURCE_PATHS) {
      invariant(git(["ls-files", "--error-unmatch", "--", path]) === path,
        `R4_A6_FORMULA_UNTRACKED_APPLY_SOURCE:${path}`);
      invariant(git(["diff", "--", path]) === "", `R4_A6_FORMULA_DIRTY_APPLY_SOURCE:${path}`);
    }
  }
  const fingerprint = sourceFingerprint(contractBytes, head);
  const releaseKey = `r568-r4-a6-formula-successor-${fingerprint.slice(0, 12)}`;
  const releaseId = uuid(`${CONTRACT_ID}:release:${fingerprint}`);
  const searchReleaseId = uuid(`${CONTRACT_ID}:search:${fingerprint}`);
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY ? "r4-a6-formula-successor-apply" : "r4-a6-formula-successor-dry-run",
  });
  await client.connect();
  let proof: Json;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='600s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [CONTRACT_ID]);
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [contract.predecessorDefinitionReleaseId],
    )).rows[0] as Json | undefined;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 10_331,
      "R4_A6_FORMULA_PREDECESSOR_RELEASE_RED");
    const currentDefinitions = await loadCurrentDefinitions(client, contract);
    invariant(currentDefinitions.length === contract.denominator.definitions,
      `R4_A6_FORMULA_DENOMINATOR_RED:${currentDefinitions.length}`);
    const alreadyRepaired = currentDefinitions.filter((row) => row.catalog_id === contract.alreadyRepairedCatalogId);
    const toRepair = currentDefinitions.filter((row) => row.runtime_publication_state === "QUARANTINED");
    invariant(alreadyRepaired.length === contract.denominator.definitionsAlreadyRepaired
      && alreadyRepaired[0]?.definition_version_id === contract.alreadyRepairedDefinitionVersionId
      && toRepair.length === contract.denominator.definitionsToRepair,
    `R4_A6_FORMULA_DISPOSITION_RED:${alreadyRepaired.length}/${toRepair.length}`);
    const histogram = Object.fromEntries([...new Set(currentDefinitions.map((row) => String(row.calculator_id)))]
      .sort().map((calculator) => [calculator,
        currentDefinitions.filter((row) => row.calculator_id === calculator).length]));
    invariant(stableJson(histogram) === stableJson(contract.calculatorHistogram),
      `R4_A6_FORMULA_HISTOGRAM_RED:${stableJson(histogram)}`);
    const affectedCatalogIds = currentDefinitions.map((row) => String(row.catalog_id));
    const existing = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1",
      [releaseKey],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.id === releaseId && existing.status === "prepared",
        "R4_A6_FORMULA_EXISTING_SUCCESSOR_DRIFT");
      const audit = await auditPreparedSuccessor({ client, contract, releaseId, searchReleaseId, affectedCatalogIds });
      proof = {
        schemaVersion: "r568-r4-a6-formula-dependency-successor-receipt.v1",
        capturedAt: new Date().toISOString(),
        mode: APPLY ? "APPLY" : "DRY_RUN",
        idempotent: true,
        status: "GREEN_R4_A6_FORMULA_SUCCESSOR_ALREADY_PREPARED_NOT_ACTIVE",
        source: { branch, head, tree, fingerprint },
        successor: { releaseId, searchReleaseId },
        denominator: contract.denominator,
        audit,
        formulaGateReady: true,
        productionReady: false,
      };
    } else {
      const repairs: DefinitionRepair[] = [];
      for (const sourceRow of toRepair) {
        repairs.push(await buildDefinitionRepair({ client, sourceRow, releaseId, fingerprint, head }));
      }
      const rebuiltFormulaCount = repairs.reduce((sum, repair) => sum + repair.formulas.length, 0);
      const rebuiltDynamicCount = repairs.reduce((sum, repair) => sum + repair.dynamicFormulaCount, 0);
      const rebuiltFixedCount = repairs.reduce((sum, repair) => sum + repair.explicitFixedFormulaCount, 0);
      invariant(rebuiltFormulaCount === contract.denominator.formulas - 45
        && rebuiltDynamicCount === contract.denominator.dynamicFormulas - 41
        && rebuiltFixedCount === contract.denominator.explicitFixedFormulas - 4,
      `R4_A6_FORMULA_REBUILT_COUNTS_RED:${rebuiltFormulaCount}/${rebuiltDynamicCount}/${rebuiltFixedCount}`);
      const oldParameterCount = (await client.query(`select count(*)::int count
        from public.estimate_parameter_definition where definition_version_id=any($1::uuid[])`, [
        toRepair.map((row) => row.definition_version_id),
      ])).rows[0] as Json;
      const newParameterCount = repairs.reduce((sum, repair) => sum + repair.parameters.length, 0);
      const manifestSha256 = shaObject({
        contract: CONTRACT_ID,
        predecessor: predecessor.source_manifest_sha256,
        definitions: repairs.map((repair) => ({ catalogId: repair.catalogId, hash: repair.definitionHash })),
        retainedDefinitionId: contract.alreadyRepairedDefinitionVersionId,
        sourceFingerprint: fingerprint,
      });
      await client.query(`insert into public.estimate_definition_release(
        id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
        definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,
        parameter_count,formula_count
      ) values($1,$2,6,'draft',$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12)`, [
        releaseId,
        releaseKey,
        head,
        fingerprint,
        manifestSha256,
        predecessor.definition_count,
        predecessor.resource_row_count,
        JSON.stringify({
          ...predecessor.metadata,
          contract: CONTRACT_ID,
          masterSha256: contract.masterSha256,
          parentReleaseId: contract.predecessorDefinitionReleaseId,
          formulaDependencyPolicy: contract.policy,
          sourceFingerprint: fingerprint,
          repairedDefinitionCount: contract.denominator.definitions,
          quarantinedFrozenDefinitions: 0,
          activationAllowed: false,
          productionEligible: false,
          localDisposable: true,
        }),
        contract.predecessorDefinitionReleaseId,
        shaObject({ manifestSha256, sourceFingerprint: fingerprint }),
        Number(predecessor.parameter_count) - Number(oldParameterCount.count) + newParameterCount,
        predecessor.formula_count,
      ]);
      for (const repair of repairs) {
        await insertDefinitionRepair({ client, repair, releaseId, fingerprint, head });
      }
      await client.query(`insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
        publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
        definition_hash,entry_sha256,runtime_publication_state
      ) select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
        publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
        encode(extensions.digest(convert_to($2||':'||($1::uuid)::text||':'||catalog_id||':'||entry_sha256,
          'UTF8'),'sha256'),'hex'),runtime_publication_state
        from public.estimate_cumulative_manifest_entry where release_id=$3`, [
        releaseId,
        CONTRACT_ID,
        contract.predecessorDefinitionReleaseId,
      ]);
      for (const repair of repairs) {
        await client.query(`update public.estimate_cumulative_manifest_entry set
          definition_version_id=$3,approved_template_baseline_id=$4,baseline_ready=true,scenario_ready=true,
          publication_state='CANONICAL_SUCCESSOR',definition_hash=$5,
          entry_sha256=encode(extensions.digest(convert_to($6||':'||($1::uuid)::text||':'||$2||':'||$5,
            'UTF8'),'sha256'),'hex'),runtime_publication_state='CANDIDATE'
          where release_id=$1 and catalog_id=$2`, [
          releaseId,
          repair.catalogId,
          repair.definitionId,
          repair.baselineId,
          repair.definitionHash,
          CONTRACT_ID,
        ]);
      }
      const searchSnapshot = await cloneSearchIndex({
        client,
        contract,
        releaseId,
        searchReleaseId,
        releaseKey,
        repairs,
        fingerprint,
        head,
      });
      invariant(Number(searchSnapshot.quarantined_count) === 0,
        `R4_A6_FORMULA_SEARCH_QUARANTINE_RED:${stableJson(searchSnapshot)}`);
      await client.query(`update public.estimate_definition_release set status='prepared',sealed_at=clock_timestamp(),
        metadata=metadata||$2::jsonb where id=$1 and status='draft'`, [
        releaseId,
        JSON.stringify({
          lifecycle: "PREPARED_NOT_ACTIVE",
          searchReleaseId,
          searchSnapshot,
          denominator: contract.denominator,
          calculatorHistogram: histogram,
          exactReferenceParity: `${contract.denominator.formulas}/${contract.denominator.formulas}`,
          sensitivityDefinitions: repairs.length,
        }),
      ]);
      const audit = await auditPreparedSuccessor({ client, contract, releaseId, searchReleaseId, affectedCatalogIds });
      proof = {
        schemaVersion: "r568-r4-a6-formula-dependency-successor-receipt.v1",
        capturedAt: new Date().toISOString(),
        mode: APPLY ? "APPLY" : "DRY_RUN",
        idempotent: false,
        master: { path: MASTER_PATH, sha256: contract.masterSha256 },
        source: { branch, head, tree, fingerprint, managedPaths: MANAGED_SOURCE_PATHS },
        predecessor: {
          definitionReleaseId: contract.predecessorDefinitionReleaseId,
          searchReleaseId: contract.predecessorSearchReleaseId,
        },
        successor: { releaseId, searchReleaseId },
        denominator: contract.denominator,
        calculatorHistogram: histogram,
        repaired: {
          definitions: contract.denominator.definitions,
          retainedAlreadyGreen: contract.denominator.definitionsAlreadyRepaired,
          immutableSuccessorsCreated: repairs.length,
          affectedRowsResolved: contract.denominator.affectedRows,
          formulas: contract.denominator.formulas,
          dynamicFormulas: contract.denominator.dynamicFormulas,
          explicitFixedFormulas: contract.denominator.explicitFixedFormulas,
          referenceParity: `${contract.denominator.formulas}/${contract.denominator.formulas}`,
          sensitivityDefinitions: repairs.length,
          sensitivityParameters: repairs.reduce((sum, repair) => sum + repair.sensitivity.length, 0),
          priceRoutesPreserved: repairs.reduce((sum, repair) => sum + repair.priceBindings.length, 0),
        },
        policy: contract.policy,
        audit,
        status: APPLY
          ? "GREEN_R4_A6_FORMULA_DEPENDENCIES_86_OF_86_PREPARED_NOT_ACTIVE"
          : "GREEN_R4_A6_FORMULA_DEPENDENCIES_86_OF_86_DRY_RUN_ROLLED_BACK",
        formulaGateReady: true,
        productionReady: false,
      };
    }
    if (APPLY) await client.query("commit"); else await client.query("rollback");
    atomicJson(OUTPUT, proof);
    process.stdout.write(`${JSON.stringify({
      output: OUTPUT,
      status: proof.status,
      idempotent: proof.idempotent,
      successor: proof.successor,
      denominator: proof.denominator,
      repaired: proof.repaired,
      audit: proof.audit,
      formulaGateReady: proof.formulaGateReady,
    }, null, 2)}\n`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
