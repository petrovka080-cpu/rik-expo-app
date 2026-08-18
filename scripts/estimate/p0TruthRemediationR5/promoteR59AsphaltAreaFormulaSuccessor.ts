import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import {
  compileFormulaGraph,
  evaluateFormulaGraph,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { evaluateInclusionGraph } from "../../../src/lib/estimate/backendPlatform/inclusionGraph";
import { compileAsphaltProfessionalEstimateV4 } from "../../../src/lib/estimate/v4/asphalt/compileAsphaltProfessionalEstimateV4";

type Json = Record<string, any>;

const SPEC_PATH = resolve("C:/Users/User/Downloads/ONE_CANONICAL_ESTIMATE_PRODUCTION_TZ_R6.md");
const SPEC_SHA256 = "4ffc00413c14458730823a90950b80d5191073e26f3bea4201f665953ed1eefa";
const EXPECTED_BRANCH = "codex/p0-one-monolith-r5";
const PREDECESSOR_RELEASE_ID = "94443669-8f5b-5cc7-b364-2f8e9f9e3506";
const ACTIVE_RELEASE_ID = "da29dc2b-1384-5487-b8da-6ee93f4e514e";
const CATALOG_ID = "built-in-ai-1000:0702";
const WORK_PREFIX = "asphalt_parking_lot:";
const CONTRACT = "one-canonical-estimate-r6-asphalt-formula-scope-successor.v1";
const RELEASE_KEY = "one-canonical-estimate-r6-asphalt-successor-4ffc0041";
const DATABASE_URL = process.env.MONOLITH_ESTIMATE_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/batch009_fire_r5_a";
const OUTPUT = resolve(
  `.release-runtime/one-canonical-estimate-r6/evidence/${process.argv.includes("--apply")
    ? "R6_ASPHALT_FORMULA_SCOPE_SUCCESSOR_APPLY.json"
    : "R6_ASPHALT_FORMULA_SCOPE_SUCCESSOR_DRY_RUN.json"}`,
);
const APPLY = process.argv.includes("--apply");

const DERIVED_PARAMETER = /(?:^quantity_|^unit_price_|(?:^|_)(?:compacted_volume|coverage_area|work_quantity|calculated|derived|consumption_total|material_m3|mass_t|labor_man_hours|machine_hours|trip_count|service_count|test_count|protocol_count|documentation_count)(?:_|$)|^total_asphalt_trip_count$|^(?:quality|asphalt_quality|asphalt_thickness)_layer_factor$)/iu;
const TECHNICAL_PARAMETER = /(?:productivity|(?:^|_)(?:rate|factor|coefficient|density|waste_percent|test_interval|control_interval|inspection_interval|machine_hours)(?:_|$))/iu;
const INTERNAL_UNITS = new Set(["document", "machine_hour", "man_hour", "person_shift", "service", "t_km", "test", "trip"]);
const STEP_ROWS = [
  "crushed_layer_1_trips",
  "asphalt_layer_1_truck_trips",
  "dump_trucks_layer_1",
  "asphalt_temperature_control",
];
const OPTIONAL_SCOPE_PARAMETERS = [
  ["curb_required", "boolean", null, "Добавить бортовой камень", false],
  ["drainage_required", "boolean", null, "Добавить водоотвод", false],
  ["road_marking_required", "boolean", null, "Добавить дорожную разметку", false],
  ["traffic_signs_required", "boolean", null, "Добавить дорожные знаки", false],
  ["lighting_required", "boolean", null, "Добавить наружное освещение", false],
  ["accessible_parking_required", "boolean", null, "Добавить доступные парковочные места", false],
] as const;

function optionalScopeParameterForRow(rowId: string): string | null {
  if (rowId.startsWith(`${WORK_PREFIX}curb:`)) return "curb_required";
  if (rowId.startsWith(`${WORK_PREFIX}drainage:`)) return "drainage_required";
  if (rowId.startsWith(`${WORK_PREFIX}marking:`)) return "road_marking_required";
  if (rowId.startsWith(`${WORK_PREFIX}sign:`)) return "traffic_signs_required";
  if (rowId.startsWith(`${WORK_PREFIX}lighting:`)) return "lighting_required";
  if (rowId.startsWith(`${WORK_PREFIX}accessible:`)) return "accessible_parking_required";
  return null;
}

function isAcceptedChildAssemblyRow(rowId: string): boolean {
  return optionalScopeParameterForRow(rowId) != null
    || rowId.startsWith(`${WORK_PREFIX}parking_geometry:`);
}

function optionalInclusionAst(parameterId: string): Json {
  return {
    kind: "or",
    operands: [
      { kind: "parameter", id: parameterId },
      { kind: "equals", parameterId: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" },
    ],
  };
}
const CONTINUOUS_ROWS = [
  "excavator",
  "wheel_loader",
  "bulldozer",
  "subgrade_roller",
  "crushed_layer_1_delivery",
  "crushed_layer_1_moistening_water",
  "grader",
  "base_roller",
  "water_truck",
  "surface_cleaner",
  "asphalt_layer_1_delivery",
  "asphalt_paver_layer_1",
  "smooth_roller_layer_1",
];

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

function stableJson(value: unknown): string {
  return JSON.stringify(stable(value));
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : stableJson(value))
    .digest("hex");
}

function deterministicUuid(seed: string): string {
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

function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

async function insertBatches(
  client: Client,
  table: string,
  columns: readonly string[],
  rows: readonly unknown[][],
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values: unknown[] = [];
    const tuples = batch.map((row) => {
      invariant(row.length === columns.length, `R59_INSERT_COLUMN_MISMATCH:${table}`);
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

function localRowId(rowId: string): string {
  invariant(rowId.startsWith(WORK_PREFIX), `R59_ROW_PREFIX:${rowId}`);
  return rowId.slice(WORK_PREFIX.length);
}

function numericParameters(values: Json): Record<string, string | number | bigint> {
  return Object.fromEntries(Object.entries(values)
    .filter(([, value]) => typeof value === "number" || typeof value === "string" || typeof value === "bigint")) as Record<string, string | number | bigint>;
}

function isUserOwnedParameter(parameter: Json): boolean {
  const id = String(parameter.parameter_id);
  const unit = String(parameter.unit_id ?? "").toLocaleLowerCase("en-US");
  if (DERIVED_PARAMETER.test(id) || TECHNICAL_PARAMETER.test(id) || INTERNAL_UNITS.has(unit)) return false;
  return /(?:^area_m2$|^length_m$|^width_m$|(?:^|_)(?:area_m2|length_m|count|thickness_mm|distance_km|required|type|mode)$)/iu.test(id);
}

function formulaMetadata(input: {
  metadata: Json;
  expression: string;
  inputParameterIds: string[];
  inputValues: Json;
  astSha256: string;
}): Json {
  const metadata = structuredClone(input.metadata ?? {});
  const accepted = metadata.acceptedTrace;
  if (accepted && typeof accepted === "object") {
    accepted.quantity_basis = input.expression;
    accepted.quantity_formula = input.expression;
    accepted.parameter_sources = input.inputParameterIds;
    accepted.calculation_trace = `${accepted.inclusion_reason_ru ?? "Расчёт выполнен каноническим backend."} Формула: ${input.expression}.`;
    if (accepted.source_parameters && typeof accepted.source_parameters === "object") {
      accepted.source_parameters.affectedBy = input.inputParameterIds;
      accepted.source_parameters.quantityBasis = input.expression;
      accepted.source_parameters.parameterSources = input.inputParameterIds;
      accepted.source_parameters.formulaInputValues = Object.fromEntries(input.inputParameterIds
        .filter((id) => Object.hasOwn(input.inputValues, id)).map((id) => [id, input.inputValues[id]]));
    }
  }
  metadata.r6FormulaScopeRepair = {
    contract: CONTRACT,
    expression: input.expression,
    inputParameterIds: input.inputParameterIds,
    astSha256: input.astSha256,
  };
  return metadata;
}

async function main(): Promise<void> {
  invariant(sha256(readFileSync(SPEC_PATH)) === SPEC_SHA256, "R59_SPEC_DRIFT");
  const branch = git(["branch", "--show-current"]);
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["rev-parse", "HEAD^{tree}"]);
  const worktreeStatus = git(["status", "--porcelain=v1"]);
  invariant(branch === EXPECTED_BRANCH, `R59_BRANCH:${branch}`);
  if (APPLY) invariant(worktreeStatus === "", "R6_APPLY_REQUIRES_CLEAN_WORKTREE");

  const releaseId = deterministicUuid(`${CONTRACT}:release:${RELEASE_KEY}`);
  const definitionId = deterministicUuid(`${CONTRACT}:definition:${CATALOG_ID}`);
  const baselineId = deterministicUuid(`${CONTRACT}:baseline:${CATALOG_ID}`);
  const client = new Client({
    connectionString: DATABASE_URL,
    application_name: APPLY ? "r6-asphalt-formula-scope-apply" : "r6-asphalt-formula-scope-dry-run",
  });
  await client.connect();
  let proof: Json;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='180s'");
    const predecessor = (await client.query(
      "select * from public.estimate_definition_release where id=$1",
      [PREDECESSOR_RELEASE_ID],
    )).rows[0] as Json | undefined;
    const active = (await client.query(
      "select id,status from public.estimate_definition_release where id=$1",
      [ACTIVE_RELEASE_ID],
    )).rows[0] as Json | undefined;
    invariant(predecessor?.status === "prepared" && Number(predecessor.definition_count) === 4_282,
      "R59_PREDECESSOR_DRIFT");
    invariant(active?.status === "active", "R59_ACTIVE_RELEASE_DRIFT");
    const existing = (await client.query(
      "select * from public.estimate_definition_release where release_key=$1",
      [RELEASE_KEY],
    )).rows[0] as Json | undefined;
    if (existing) {
      invariant(existing.id === releaseId && existing.status === "prepared"
        && existing.parent_release_id === PREDECESSOR_RELEASE_ID, "R59_EXISTING_RELEASE_DRIFT");
      const manifest = (await client.query(
        "select definition_version_id::text,approved_template_baseline_id::text from public.estimate_cumulative_manifest_entry where release_id=$1 and catalog_id=$2",
        [releaseId, CATALOG_ID],
      )).rows[0] as Json | undefined;
      invariant(manifest?.definition_version_id === definitionId && manifest?.approved_template_baseline_id === baselineId,
        "R59_EXISTING_MANIFEST_DRIFT");
      await client.query("rollback");
      proof = {
        schemaVersion: CONTRACT,
        capturedAt: new Date().toISOString(),
        source: { branch, head, tree, clean: worktreeStatus === "" },
        predecessorReleaseId: PREDECESSOR_RELEASE_ID,
        candidateReleaseId: releaseId,
        definitionId,
        baselineId,
        idempotent: true,
        activeReleaseSwitched: false,
        runtime8081Switched: false,
        status: "GREEN_R6_ASPHALT_FORMULA_SCOPE_SUCCESSOR_IDEMPOTENT_PREPARED_NOT_ACTIVE",
      };
      writeJson(OUTPUT, proof);
      process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
      return;
    }

    const manifestEntry = (await client.query(`
      select m.*,d.definition_version,d.passport,d.applicability,d.definition_sha256,d.source_metadata
      from public.estimate_cumulative_manifest_entry m
      join public.estimate_definition_version d on d.id=m.definition_version_id
      where m.release_id=$1 and m.catalog_id=$2
    `, [PREDECESSOR_RELEASE_ID, CATALOG_ID])).rows[0] as Json | undefined;
    invariant(manifestEntry, "R59_PREDECESSOR_CATALOG_MISSING");
    const predecessorDefinitionId = String(manifestEntry.definition_version_id);
    const predecessorBaselineId = String(manifestEntry.approved_template_baseline_id);
    const baselineResult = await client.query(
      "select * from public.estimate_approved_template_baseline where id=$1",
      [predecessorBaselineId],
    );
    const parameterResult = await client.query(
      "select * from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal",
      [predecessorDefinitionId],
    );
    const formulaResult = await client.query(
      "select * from public.estimate_formula_graph where definition_version_id=$1 order by formula_id",
      [predecessorDefinitionId],
    );
    const resourceResult = await client.query(
      "select * from public.estimate_resource_spec where definition_version_id=$1 order by ordinal",
      [predecessorDefinitionId],
    );
    const normativeResult = await client.query(
      "select * from public.estimate_work_normative_binding where definition_version_id=$1",
      [predecessorDefinitionId],
    );
    const priceResult = await client.query(`select b.* from public.estimate_resource_price_route_binding b
      join public.estimate_resource_spec r on r.id=b.resource_spec_id where r.definition_version_id=$1`, [predecessorDefinitionId]);
    const baseline = baselineResult.rows[0] as Json | undefined;
    const parameters = parameterResult.rows as Json[];
    const oldFormulas = formulaResult.rows as Json[];
    const resources = resourceResult.rows as Json[];
    const normativeBindings = normativeResult.rows as Json[];
    const priceBindings = priceResult.rows as Json[];
    invariant(baseline && parameters.length === 163 && oldFormulas.length === 167 && resources.length === 167,
      `R59_PREDECESSOR_COUNTS:${parameters.length}/${oldFormulas.length}/${resources.length}`);
    const candidateBaselineValues: Json = {
      ...baseline.input_values,
      estimate_scope_mode: "MINIMAL_EXPLICIT_SCOPE",
      ...Object.fromEntries(OPTIONAL_SCOPE_PARAMETERS.map(([parameterId,,,, defaultValue]) => [parameterId, defaultValue])),
    };
    const nextParameterOrdinal = parameters.reduce(
      (maximum, parameter) => Math.max(maximum, Number(parameter.ordinal)),
      -1,
    ) + 1;
    const optionalParameters: Json[] = OPTIONAL_SCOPE_PARAMETERS.map(([
      parameterId, valueType, unitId, titleRu, defaultValue,
    ], index) => ({
      definition_version_id: definitionId,
      parameter_id: parameterId,
      ordinal: nextParameterOrdinal + index,
      value_type: valueType,
      unit_id: unitId,
      title_ru: titleRu,
      required: true,
      default_value: null,
      constraints_json: {},
      truth_metadata: {
        semantic_parameter_key: parameterId,
        visibility_role: "USER_INPUT",
        value_source_role: "PROJECT_SPECIFIC_INPUT",
        description_ru: "Необязательный раздел добавляется только после явного выбора пользователя.",
        guide: {
          guide_kind: "ENUM_DECISION_RULE",
          guide_short_ru: "По умолчанию раздел не включён. Включите его только если он входит в задание или проект.",
          guide_validation_policy: "INFORMATION_ONLY",
          source_role: "PROJECT_DOCUMENTATION",
          guide_version: "ONE_CANONICAL_ESTIMATE_R6_OPTIONAL_SCOPE_V1",
          source_snapshot_hash: SPEC_SHA256,
          applicability: "Асфальтирование парковки; optional scope.",
          verified_at: "2026-08-18",
        },
        r6OptionalScope: { contract: CONTRACT, defaultIncluded: false },
      },
      approved_template_baseline_id: baselineId,
    }));
    const allParameters = [...parameters, ...optionalParameters];

    const compiled = compileAsphaltProfessionalEstimateV4({
      raw_text: "Асфальтирование парковки 120 кв метров",
      parameter_overrides: baseline.input_values,
      profile_override: "parking_full_construction",
    });
    invariant(compiled.compile_blockers.length === 0, `R59_SOURCE_COMPILE_BLOCKERS:${compiled.compile_blockers.join("|")}`);
    invariant(compiled.compiled_rows.length >= 100, `R59_SOURCE_ROW_COUNT:${compiled.compiled_rows.length}`);
    const compiledRows = new Map(compiled.compiled_rows.map((row) => [row.definition.row_id, row]));
    const sourceFormulas = new Map(compiled.passport.formulas.map((formula) => [formula.formula_id, formula]));
    const parameterIds = new Set(allParameters.map((parameter) => String(parameter.parameter_id)));
    const oldFormulaById = new Map(oldFormulas.map((formula) => [String(formula.formula_id), formula]));
    const baselineParameters = numericParameters(candidateBaselineValues);
    const correctedFormulas: Json[] = resources.map((resource) => {
      const rowId = localRowId(String(resource.row_id));
      const sourceRow = compiledRows.get(rowId);
      if (sourceRow) invariant(sourceRow.definition.unit_id === resource.unit_id, `R59_SOURCE_UNIT_DRIFT:${rowId}`);
      const oldFormula = oldFormulaById.get(String(resource.formula_id));
      invariant(oldFormula, `R59_OLD_FORMULA_MISSING:${resource.formula_id}`);
      const sourceFormula = sourceRow == null ? null : sourceFormulas.get(String(sourceRow.definition.formula_id));
      invariant(sourceRow == null || sourceFormula, `R59_SOURCE_FORMULA_MISSING:${rowId}`);
      const graph = compileFormulaGraph(sourceFormula?.expression ?? String(oldFormula.expression_source));
      invariant(sourceRow || isAcceptedChildAssemblyRow(String(resource.row_id))
        || graph.inputParameterIds.every((id) => !DERIVED_PARAMETER.test(id)),
      `R59_SOURCE_ROW_MISSING_WITH_DERIVED_INPUT:${rowId}`);
      invariant(graph.inputParameterIds.every((id) => parameterIds.has(id)),
        `R59_FORMULA_PARAMETER_MISSING:${rowId}:${graph.inputParameterIds.filter((id) => !parameterIds.has(id)).join("|")}`);
      const formulaId = String(resource.formula_id);
      const oldValue = Number(evaluateFormulaGraph(
        compileFormulaGraph(String(oldFormula.expression_source)),
        baselineParameters,
      ));
      const newValue = Number(evaluateFormulaGraph(graph, baselineParameters));
      invariant(Math.abs(oldValue - newValue) <= 0.00001,
        `R59_BASELINE_PARITY:${rowId}:${oldValue}/${newValue}`);
      return {
        definition_version_id: definitionId,
        formula_id: formulaId,
        output_unit_id: oldFormula.output_unit_id,
        expression_source: graph.source,
        ast: graph.ast,
        input_parameter_ids: graph.inputParameterIds,
        ast_sha256: sha256(graph.ast),
        baseline_quantity: newValue,
        source_owner: sourceRow == null ? "ACCEPTED_CHILD_ASSEMBLY" : "ASPHALT_V4_COMPILER",
      };
    });
    invariant(new Set(correctedFormulas.map((formula) => formula.formula_id)).size === 167,
      "R59_FORMULA_ID_COLLISION");
    const correctedById = new Map(correctedFormulas.map((formula) => [String(formula.formula_id), formula]));

    const sensitivity = (area_m2: number, rowId: string): number => {
      const resource = resources.find((row) => localRowId(String(row.row_id)) === rowId);
      invariant(resource, `R59_SENSITIVITY_ROW_MISSING:${rowId}`);
      const formula = correctedById.get(String(resource.formula_id));
      invariant(formula, `R59_SENSITIVITY_FORMULA_MISSING:${rowId}`);
      return Number(evaluateFormulaGraph(
        compileFormulaGraph(String(formula.expression_source)),
        { ...baselineParameters, area_m2 },
      ));
    };
    for (const rowId of CONTINUOUS_ROWS) {
      const small = sensitivity(50, rowId);
      const large = sensitivity(500, rowId);
      invariant(small > 0 && Math.abs(large - small * 10) <= 0.00001,
        `R59_CONTINUOUS_SENSITIVITY:${rowId}:${small}/${large}`);
    }
    for (const rowId of STEP_ROWS) {
      const small = sensitivity(50, rowId);
      const large = sensitivity(500, rowId);
      invariant(large > small, `R59_STEP_SENSITIVITY:${rowId}:${small}/${large}`);
    }
    const formulaConsumers = Object.fromEntries(allParameters.map((parameter) => {
      const id = String(parameter.parameter_id);
      return [id, correctedFormulas.filter((formula) => formula.input_parameter_ids.includes(id))
        .map((formula) => formula.formula_id).sort()];
    }));
    const resourceConsumers = Object.fromEntries(allParameters.map((parameter) => {
      const id = String(parameter.parameter_id);
      const formulaRows = resources.filter((resource) => correctedById.get(String(resource.formula_id))
        ?.input_parameter_ids.includes(id)).map((resource) => resource.row_id);
      const branchRows = id === "estimate_scope_mode"
        ? resources.filter((resource) => optionalScopeParameterForRow(String(resource.row_id))).map((resource) => resource.row_id)
        : resources.filter((resource) => optionalScopeParameterForRow(String(resource.row_id)) === id).map((resource) => resource.row_id);
      return [id, [...new Set([...formulaRows, ...branchRows])].sort()];
    }));
    const userOwnedParameterIds = allParameters
      .filter((parameter) => isUserOwnedParameter(parameter)
        && (resourceConsumers[String(parameter.parameter_id)]?.length ?? 0) > 0)
      .map((parameter) => String(parameter.parameter_id));
    invariant(userOwnedParameterIds.includes("area_m2") && userOwnedParameterIds.length > 0 && userOwnedParameterIds.length < 50,
      `R59_USER_PARAMETER_DENOMINATOR:${userOwnedParameterIds.length}`);
    const repairedParameters: Json[] = allParameters.map((parameter): Json => {
      const hasConsumers = (resourceConsumers[String(parameter.parameter_id)]?.length ?? 0) > 0;
      const userOwned = isUserOwnedParameter(parameter) && hasConsumers;
      const truth = structuredClone(parameter.truth_metadata ?? {});
      truth.semantic_parameter_key = String(parameter.parameter_id);
      truth.visibility_role = userOwned ? "USER_INPUT" : "INTERNAL_ONLY";
      truth.value_source_role = userOwned ? "PROJECT_SPECIFIC_INPUT" : "BACKEND_ASSUMPTION";
      truth.formula_consumers = formulaConsumers[parameter.parameter_id] ?? [];
      truth.resource_branch_consumers = resourceConsumers[parameter.parameter_id] ?? [];
      truth.r6FormulaScopeRepair = { contract: CONTRACT, userOwned };
      const optionalTrigger = OPTIONAL_SCOPE_PARAMETERS.find(([parameterId]) => parameterId === parameter.parameter_id)?.[0];
      const branchOwners = [...new Set((resourceConsumers[String(parameter.parameter_id)] ?? [])
        .map((rowId: string) => optionalScopeParameterForRow(rowId))
        .filter((owner: string | null): owner is string => owner != null))];
      const onlyOptionalBranchConsumer = branchOwners.length === 1
        && (resourceConsumers[String(parameter.parameter_id)] ?? []).every(
          (rowId: string) => optionalScopeParameterForRow(rowId) === branchOwners[0],
        );
      const conditionalOwner = onlyOptionalBranchConsumer ? branchOwners[0] : null;
      if (optionalTrigger) truth.conditional_section = "Можно добавить в смету";
      else if (conditionalOwner) truth.visible_when = `${conditionalOwner} == true OR estimate_scope_mode == FULL_APPLICABLE_SCOPE`;
      return {
        ...parameter,
        definition_version_id: definitionId,
        required: hasConsumers ? parameter.required : false,
        default_value: null,
        truth_metadata: truth,
        approved_template_baseline_id: baselineId,
      };
    });
    const resourceIdMap = new Map<string, string>();
    const repairedResources: Json[] = resources.map((resource): Json => {
      const formula = correctedById.get(String(resource.formula_id));
      invariant(formula, `R59_RESOURCE_FORMULA_MISSING:${resource.row_id}`);
      const id = deterministicUuid(`${CONTRACT}:resource:${resource.row_id}`);
      resourceIdMap.set(String(resource.id), id);
      const graph = structuredClone(resource.resource_graph ?? {});
      graph.quantityBasis = formula.expression_source;
      graph.parameterSources = formula.input_parameter_ids;
      const sourceMetadata = formulaMetadata({
        metadata: resource.source_metadata,
        expression: formula.expression_source,
        inputParameterIds: formula.input_parameter_ids,
        inputValues: baseline.input_values,
        astSha256: formula.ast_sha256,
      });
      const optionalScopeParameter = optionalScopeParameterForRow(String(resource.row_id));
      const inclusionAst = optionalScopeParameter
        ? optionalInclusionAst(optionalScopeParameter)
        : { kind: "literal", value: true };
      return {
        ...resource,
        id,
        definition_version_id: definitionId,
        resource_graph: graph,
        inclusion_ast: inclusionAst,
        source_metadata: sourceMetadata,
        row_sha256: sha256({
          contract: CONTRACT,
          predecessorRowSha256: resource.row_sha256,
          formulaAstSha256: formula.ast_sha256,
          resourceGraph: graph,
          sourceMetadata,
          inclusionAst,
        }),
      };
    });
    const includedResourceIds = (values: Json) => repairedResources
      .filter((resource) => evaluateInclusionGraph(resource.inclusion_ast, values))
      .map((resource) => String(resource.row_id));
    const minimalResourceIds = includedResourceIds(candidateBaselineValues);
    const optionalResourceIds = repairedResources
      .filter((resource) => optionalScopeParameterForRow(String(resource.row_id)))
      .map((resource) => String(resource.row_id));
    const fullResourceIds = includedResourceIds({
      ...candidateBaselineValues,
      estimate_scope_mode: "FULL_APPLICABLE_SCOPE",
    });
    invariant(optionalResourceIds.length > 0, "R6_OPTIONAL_SCOPE_RESOURCE_DENOMINATOR");
    invariant(minimalResourceIds.every((rowId) => !optionalResourceIds.includes(rowId)),
      "R6_MINIMAL_SCOPE_LEAK");
    invariant(fullResourceIds.length === repairedResources.length,
      `R6_FULL_SCOPE_INCOMPLETE:${fullResourceIds.length}/${repairedResources.length}`);
    for (const [parameterId] of OPTIONAL_SCOPE_PARAMETERS) {
      const expected = repairedResources
        .filter((resource) => optionalScopeParameterForRow(String(resource.row_id)) === parameterId)
        .map((resource) => String(resource.row_id));
      const actual = includedResourceIds({ ...candidateBaselineValues, [parameterId]: true });
      invariant(expected.length > 0 && expected.every((rowId) => actual.includes(rowId)),
        `R6_OPTIONAL_SCOPE_TRIGGER:${parameterId}`);
    }
    const parameterSchemaSha256 = sha256(repairedParameters.map((parameter) => [
      parameter.parameter_id,
      parameter.ordinal,
      parameter.value_type,
      parameter.unit_id,
      parameter.required,
      parameter.constraints_json,
      parameter.truth_metadata,
    ]));
    const acceptanceEvidenceSha256 = sha256({
      contract: CONTRACT,
      predecessorBaselineId,
      parameterSchemaSha256,
      formulaConsumers,
      resourceConsumers,
      sensitivity: Object.fromEntries([...CONTINUOUS_ROWS, ...STEP_ROWS].map((rowId) => [rowId, {
        q50: sensitivity(50, rowId),
        q500: sensitivity(500, rowId),
        q879: sensitivity(879, rowId),
      }])),
      scope: {
        minimalRowCount: minimalResourceIds.length,
        optionalRowCount: optionalResourceIds.length,
        fullRowCount: fullResourceIds.length,
        minimalOptionalLeakCount: minimalResourceIds.filter((rowId) => optionalResourceIds.includes(rowId)).length,
      },
    });
    const acceptedBaselineValues = Object.fromEntries(Object.entries(candidateBaselineValues)
      .filter(([parameterId]) => (resourceConsumers[parameterId]?.length ?? 0) > 0));
    const repairedBaseline: Json = {
      ...baseline,
      id: baselineId,
      baseline_key: `r6-formula-minimal-scope:${CATALOG_ID}:4ffc0041`,
      definition_version_id: definitionId,
      source_definition_version_id: predecessorDefinitionId,
      parameter_schema_sha256: parameterSchemaSha256,
      input_values: acceptedBaselineValues,
      input_classification: {
        ...(baseline.input_classification ?? {}),
        estimate_scope_mode: "ASSUMPTION",
        ...Object.fromEntries(OPTIONAL_SCOPE_PARAMETERS.map(([parameterId]) => [parameterId, "ASSUMPTION"])),
      },
      uom_by_parameter: {
        ...(baseline.uom_by_parameter ?? {}),
        ...Object.fromEntries(OPTIONAL_SCOPE_PARAMETERS.map(([parameterId,, unitId]) => [parameterId, unitId])),
      },
      normative_source_ids: {
        ...(baseline.normative_source_ids ?? {}),
        ...Object.fromEntries(OPTIONAL_SCOPE_PARAMETERS.map(([parameterId]) => [parameterId, [
          "ONE_CANONICAL_ESTIMATE_R6_EXPLICIT_SCOPE",
        ]])),
      },
      guide_provenance_ru: {
        ...(baseline.guide_provenance_ru ?? {}),
        ...Object.fromEntries(OPTIONAL_SCOPE_PARAMETERS.map(([parameterId]) => [parameterId,
          "Не включено по умолчанию; раздел добавляется только по явному заданию пользователя или подтверждённому проекту."])),
      },
      formula_consumer_ids: formulaConsumers,
      resource_consumer_row_ids: resourceConsumers,
      proposal_source_refs: [
        ...(Array.isArray(baseline.proposal_source_refs) ? baseline.proposal_source_refs : []),
        { contract: CONTRACT, specSha256: SPEC_SHA256, sourceCommit: head, sourceTree: tree },
      ],
      validation_scenario_refs: [{
        contract: CONTRACT,
        scenario: "ASPHALT_PARKING_AREA_50_500_879_MINIMAL_SCOPE",
        continuousRows: CONTINUOUS_ROWS,
        stepRows: STEP_ROWS,
      }],
      acceptance_evidence_sha256: acceptanceEvidenceSha256,
      accepted_release_id: releaseId,
      accepted_at: new Date(),
      supersedes_baseline_id: predecessorBaselineId,
    };
    const baselinePayloadIssues = Object.keys(repairedBaseline.input_values).filter((parameterId) =>
      !["ASSUMPTION", "NORMATIVE", "DERIVED"].includes(String(repairedBaseline.input_classification?.[parameterId] ?? ""))
      || !Object.hasOwn(repairedBaseline.uom_by_parameter ?? {}, parameterId)
      || !Array.isArray(repairedBaseline.formula_consumer_ids?.[parameterId])
      || !Array.isArray(repairedBaseline.resource_consumer_row_ids?.[parameterId])
      || repairedBaseline.resource_consumer_row_ids[parameterId].length === 0
      || !Array.isArray(repairedBaseline.normative_source_ids?.[parameterId])
      || !String(repairedBaseline.guide_provenance_ru?.[parameterId] ?? "").trim()
    );
    invariant(baselinePayloadIssues.length === 0,
      `R6_BASELINE_PAYLOAD_ISSUES:${baselinePayloadIssues.join("|")}`);
    const definitionSha256 = sha256({
      contract: CONTRACT,
      predecessorDefinitionSha256: manifestEntry.definition_sha256,
      parameterSchemaSha256,
      formulas: correctedFormulas.map((formula) => [formula.formula_id, formula.ast_sha256]),
      resources: repairedResources.map((resource) => [resource.row_id, resource.row_sha256]),
    });
    const nextDefinitionVersion = Number((await client.query(
      "select coalesce(max(definition_version),0)::int+1 value from public.estimate_definition_version where catalog_id=$1",
      [CATALOG_ID],
    )).rows[0].value);

    await client.query(`insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
      definition_count,resource_row_count,metadata,parent_release_id,source_package_sha256,parameter_count,formula_count
    ) values($1,$2,$3,'draft',$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13)`, [
      releaseId,
      RELEASE_KEY,
      predecessor.schema_version,
      head,
      tree,
      sha256({ contract: CONTRACT, predecessorReleaseId: PREDECESSOR_RELEASE_ID, definitionSha256 }),
      predecessor.definition_count,
      predecessor.resource_row_count,
      JSON.stringify({
        ...(predecessor.metadata ?? {}),
        r6AsphaltFormulaScopeSuccessor: {
          contract: CONTRACT,
          specSha256: SPEC_SHA256,
          predecessorReleaseId: PREDECESSOR_RELEASE_ID,
          catalogId: CATALOG_ID,
          predecessorDefinitionId,
          successorDefinitionId: definitionId,
          rowCount: 167,
          defaultIncludedRowCount: minimalResourceIds.length,
          optionalRowCount: optionalResourceIds.length,
          userOwnedParameterCount: userOwnedParameterIds.length,
          activeReleaseSwitched: false,
          searchCutover: false,
          runtime8081Switched: false,
          terminalGreenClaimed: false,
        },
      }),
      PREDECESSOR_RELEASE_ID,
      sha256({ contract: CONTRACT, head, tree, definitionSha256, acceptanceEvidenceSha256 }),
      Number(predecessor.parameter_count) + OPTIONAL_SCOPE_PARAMETERS.length,
      predecessor.formula_count,
    ]);
    await client.query(`insert into public.estimate_cumulative_manifest_entry(
      release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
      approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,entry_sha256
    ) select $1,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,publication_state,
      approved_template_baseline_id,baseline_ready,scenario_ready,definition_hash,
      encode(extensions.digest(convert_to($2||':'||catalog_id||':'||entry_sha256,'UTF8'),'sha256'),'hex')
      from public.estimate_cumulative_manifest_entry where release_id=$3`, [releaseId, CONTRACT, PREDECESSOR_RELEASE_ID]);
    await client.query(`insert into public.estimate_definition_version(
      id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
    ) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb)`, [
      definitionId,
      releaseId,
      CATALOG_ID,
      nextDefinitionVersion,
      JSON.stringify(manifestEntry.passport),
      JSON.stringify(manifestEntry.applicability),
      definitionSha256,
      JSON.stringify({
        ...(manifestEntry.source_metadata ?? {}),
        r6AsphaltFormulaScopeSuccessor: {
          contract: CONTRACT,
          predecessorDefinitionId,
          predecessorDefinitionSha256: manifestEntry.definition_sha256,
          parameterSchemaSha256,
          acceptanceEvidenceSha256,
          sourceCommit: head,
          sourceTree: tree,
        },
      }),
    ]);
    await client.query(`insert into public.estimate_approved_template_baseline(
      id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,parameter_schema_sha256,
      input_values,input_classification,uom_by_parameter,formula_consumer_ids,resource_consumer_row_ids,
      normative_source_ids,guide_provenance_ru,proposal_source_refs,validation_scenario_refs,
      acceptance_evidence_sha256,accepted_release_id,accepted_at,supersedes_baseline_id,contract_version
    ) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,
      $14::jsonb,$15::jsonb,$16,$17,$18,$19,$20)`, [
      repairedBaseline.id,
      repairedBaseline.baseline_key,
      repairedBaseline.catalog_id,
      repairedBaseline.definition_version_id,
      repairedBaseline.source_definition_version_id,
      repairedBaseline.parameter_schema_sha256,
      JSON.stringify(repairedBaseline.input_values),
      JSON.stringify(repairedBaseline.input_classification),
      JSON.stringify(repairedBaseline.uom_by_parameter),
      JSON.stringify(repairedBaseline.formula_consumer_ids),
      JSON.stringify(repairedBaseline.resource_consumer_row_ids),
      JSON.stringify(repairedBaseline.normative_source_ids),
      JSON.stringify(repairedBaseline.guide_provenance_ru),
      JSON.stringify(repairedBaseline.proposal_source_refs),
      JSON.stringify(repairedBaseline.validation_scenario_refs),
      repairedBaseline.acceptance_evidence_sha256,
      repairedBaseline.accepted_release_id,
      repairedBaseline.accepted_at,
      repairedBaseline.supersedes_baseline_id,
      repairedBaseline.contract_version,
    ]);
    await insertBatches(client, "estimate_parameter_definition", [
      "definition_version_id", "parameter_id", "ordinal", "value_type", "unit_id", "title_ru", "required",
      "default_value", "constraints_json", "truth_metadata", "approved_template_baseline_id",
    ], repairedParameters.map((parameter) => [
      parameter.definition_version_id,
      parameter.parameter_id,
      parameter.ordinal,
      parameter.value_type,
      parameter.unit_id,
      parameter.title_ru,
      parameter.required,
      parameter.default_value,
      parameter.constraints_json,
      parameter.truth_metadata,
      parameter.approved_template_baseline_id,
    ]));
    await insertBatches(client, "estimate_formula_graph", [
      "definition_version_id", "formula_id", "output_unit_id", "expression_source", "ast",
      "input_parameter_ids", "ast_sha256",
    ], correctedFormulas.map((formula) => [
      formula.definition_version_id,
      formula.formula_id,
      formula.output_unit_id,
      formula.expression_source,
      formula.ast,
      formula.input_parameter_ids,
      formula.ast_sha256,
    ]));
    await insertBatches(client, "estimate_resource_spec", [
      "id", "definition_version_id", "row_id", "ordinal", "section", "category", "title_ru", "row_type",
      "unit_id", "formula_id", "inclusion_ast", "resource_graph", "semantic_owner", "cost_owner_id",
      "procurement_eligible", "source_metadata", "row_sha256", "created_at",
    ], repairedResources.map((resource) => [
      resource.id,
      resource.definition_version_id,
      resource.row_id,
      resource.ordinal,
      resource.section,
      resource.category,
      resource.title_ru,
      resource.row_type,
      resource.unit_id,
      resource.formula_id,
      resource.inclusion_ast,
      resource.resource_graph,
      resource.semantic_owner,
      resource.cost_owner_id,
      resource.procurement_eligible,
      resource.source_metadata,
      resource.row_sha256,
      resource.created_at,
    ]));
    await insertBatches(client, "estimate_work_normative_binding", [
      "definition_version_id", "resource_spec_id", "locator_id", "applicability",
    ], normativeBindings.map((binding) => [
      definitionId,
      resourceIdMap.get(String(binding.resource_spec_id)),
      binding.locator_id,
      binding.applicability,
    ]));
    await insertBatches(client, "estimate_resource_price_route_binding", [
      "resource_spec_id", "route_id", "price_key", "priority",
    ], priceBindings.map((binding) => [
      resourceIdMap.get(String(binding.resource_spec_id)),
      binding.route_id,
      binding.price_key,
      binding.priority,
    ]));
    const beforeSha256 = sha256(oldFormulas.map((formula) => [formula.formula_id, formula.ast_sha256]));
    const afterSha256 = sha256(correctedFormulas.map((formula) => [formula.formula_id, formula.ast_sha256]));
    await client.query(`insert into public.estimate_definition_defect_record(
      id,defect_key,release_id,predecessor_release_id,catalog_id,predecessor_definition_version_id,
      successor_definition_version_id,defect_class,root_cause_ru,affected_resources,before_sha256,
      after_sha256,evidence_sha256,contract_version
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14)`, [
      deterministicUuid(`${CONTRACT}:defect:${CATALOG_ID}`),
      "r6-asphalt-area-derived-alias-freeze-and-optional-scope-leak",
      releaseId,
      PREDECESSOR_RELEASE_ID,
      CATALOG_ID,
      predecessorDefinitionId,
      definitionId,
      "R54_RESOURCE_SEMANTIC_OWNER_IDENTITY",
      "Промежуточные объёмы, массы, покрытия и число рейсов были сохранены как входные параметры baseline; optional-разделы также включались без явного выбора пользователя.",
      JSON.stringify([...CONTINUOUS_ROWS, ...STEP_ROWS]),
      beforeSha256,
      afterSha256,
      acceptanceEvidenceSha256,
      "P0_ONE_MONOLITH_R54_DEFECT_LEDGER_V1",
    ]);
    await client.query(`update public.estimate_cumulative_manifest_entry set
      definition_version_id=$3,source_release_id=$1,publication_state='CANONICAL_SUCCESSOR',
      approved_template_baseline_id=$4,baseline_ready=true,scenario_ready=true,
      definition_hash=$5,entry_sha256=$6 where release_id=$1 and catalog_id=$2`, [
      releaseId,
      CATALOG_ID,
      definitionId,
      baselineId,
      definitionSha256,
      sha256({ contract: CONTRACT, releaseId, catalogId: CATALOG_ID, definitionId, baselineId, definitionSha256 }),
    ]);
    const counts = (await client.query(`select
      count(*)::int definitions,
      count(distinct catalog_id)::int unique_catalogs,
      count(*) filter(where baseline_ready and scenario_ready and approved_template_baseline_id is not null)::int ready,
      count(*) filter(where catalog_id=$2 and definition_version_id=$3 and approved_template_baseline_id=$4)::int repaired
      from public.estimate_cumulative_manifest_entry where release_id=$1`, [releaseId, CATALOG_ID, definitionId, baselineId])).rows[0] as Json;
    invariant(counts.definitions === 4_282 && counts.unique_catalogs === 4_282 && counts.ready === 4_282 && counts.repaired === 1,
      `R59_MANIFEST_COUNTS:${stableJson(counts)}`);
    await client.query(`update public.estimate_definition_release set status='prepared',sealed_at=now(),
      metadata=metadata||$2::jsonb where id=$1 and status='draft' and sealed_at is null`, [
      releaseId,
      JSON.stringify({ lifecycle: "PREPARED_R6_ASPHALT_FORMULA_SCOPE_SUCCESSOR_NOT_ACTIVE", manifestCounts: counts }),
    ]);
    proof = {
      schemaVersion: CONTRACT,
      capturedAt: new Date().toISOString(),
      specSha256: SPEC_SHA256,
      source: { branch, head, tree, clean: worktreeStatus === "" },
      predecessorReleaseId: PREDECESSOR_RELEASE_ID,
      candidateReleaseId: releaseId,
      catalogId: CATALOG_ID,
      predecessorDefinitionId,
      successorDefinitionId: definitionId,
      predecessorBaselineId,
      successorBaselineId: baselineId,
      manifestCounts: counts,
      rowCount: resources.length,
      defaultIncludedRowCount: minimalResourceIds.length,
      optionalRowCount: optionalResourceIds.length,
      formulaCount: correctedFormulas.length,
      parameterCount: repairedParameters.length,
      userOwnedParameterCount: userOwnedParameterIds.length,
      userOwnedParameterIds,
      continuousSensitivityRows: CONTINUOUS_ROWS,
      stepSensitivityRows: STEP_ROWS,
      acceptanceEvidenceSha256,
      activeReleaseSwitched: false,
      searchCutover: false,
      runtime8081Switched: false,
      writesApplied: APPLY ? 1 : 0,
      status: APPLY
        ? "GREEN_R6_ASPHALT_FORMULA_SCOPE_SUCCESSOR_PREPARED_NOT_ACTIVE"
        : "GREEN_R6_ASPHALT_FORMULA_SCOPE_SUCCESSOR_DRY_RUN_ROLLED_BACK",
    };
    if (APPLY) await client.query("commit"); else await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
  writeJson(OUTPUT, proof!);
  process.stdout.write(`${JSON.stringify(proof!, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
