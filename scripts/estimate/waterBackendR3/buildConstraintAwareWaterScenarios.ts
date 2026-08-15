import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { Client } from "pg";

import { evaluateFormulaGraph, type FormulaAst } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { validateCanonicalEstimateParameters } from "../../../src/lib/estimate/backendPlatform/parameterConstraints";

const ROOT = resolve(__dirname, "../../..");
const EVIDENCE_ROOT = join(ROOT, ".release-runtime", "batch006-water-backend-r3", "evidence-a2");
const PACKAGE_ROOT = resolve(process.env.BATCH006_PACKAGE_ROOT ?? join(ROOT, ".release-runtime", "batch006-water-backend-r3", "03-r6-a2-release-a"));
const PACKAGE_MANIFEST = JSON.parse(readFileSync(join(PACKAGE_ROOT, "manifest.json"), "utf8")) as JsonRecord;
const DATABASE_URL = process.env.BATCH006_DATABASE_URL ?? "";
if (!DATABASE_URL) throw new Error("BATCH006_DATABASE_URL_REQUIRED");
const EXPECTED_DATABASE = process.env.BATCH006_EXPECTED_DATABASE_NAME;
if (!EXPECTED_DATABASE || decodeURIComponent(new URL(DATABASE_URL).pathname.replace(/^\//, "")) !== EXPECTED_DATABASE
  || !/^batch006_water_r6_a2_[ab]$/.test(EXPECTED_DATABASE)) throw new Error("BATCH006_EXACT_DISPOSABLE_DATABASE_REQUIRED");
const RELEASE_ID = process.env.BATCH006_RELEASE_ID ?? String(PACKAGE_MANIFEST.releaseId);
const EXPECTED_DEFINITIONS = Number((PACKAGE_MANIFEST.waterDelta as JsonRecord).definitions);

type JsonRecord = Record<string, unknown>;
type Parameter = {
  parameter_id: string;
  value_type: "decimal" | "integer" | "boolean" | "enum" | "text";
  required: boolean;
  default_value: unknown;
  constraints_json: JsonRecord;
};
type Resource = {
  row_id: string;
  row_sha256: string;
  inclusion_ast: JsonRecord;
  ast: FormulaAst;
  formula_id: string;
};

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex");
}

function semanticNumeric(parameterId: string, integer: boolean, minimum: number | null, maximum: number | null): string {
  const exact: Readonly<Record<string, number>> = {
    route_length_m: 120,
    component_count: 4,
    process_unit_count: 2,
    project_review_count: 1,
    mobilization_count: 1,
    material_factor: 1.05,
    waste_percent: 3,
    joint_count: 24,
    fitting_count: 12,
    valve_count: 5,
    support_count: 20,
    delivery_distance_km: 15,
    delivery_mass_t_per_output: 0.02,
    crew_productivity_output_per_hour: 2,
    tool_productivity_output_per_machine_hour: 5,
    test_section_count: 2,
    documentation_set_count: 1,
    operating_pressure_mpa: 0.6,
    test_pressure_mpa: 0.9,
    start_elevation_m: 100,
    end_elevation_m: 98,
    insulation_quantity_per_output: 1.2,
    penetration_count: 4,
    demolition_quantity: 20,
    temporary_bypass_quantity: 10,
    cctv_length_m: 120,
    disinfection_water_m3_per_output: 0.05,
    trench_width_m: 1.2,
    trench_depth_m: 1.8,
    bedding_thickness_m: 0.15,
    dewatering_machine_hours: 8,
    restoration_width_m: 1.5,
    electrical_point_count: 8,
    vibration_mount_count: 4,
  };
  let selected = exact[parameterId] ?? 1;
  if (minimum != null && selected < minimum) selected = minimum;
  if (maximum != null && selected > maximum) selected = maximum;
  if (integer) selected = Math.ceil(selected);
  return String(selected);
}

function conditionMatches(raw: unknown, values: JsonRecord): boolean {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const condition = raw as JsonRecord;
  return values[String(condition.parameterId ?? "")] === condition.equals;
}

function assignValue(definition: Parameter, values: JsonRecord): void {
  if (values[definition.parameter_id] != null) return;
  if (definition.default_value != null) {
    values[definition.parameter_id] = definition.default_value;
    return;
  }
  if (definition.value_type === "boolean") values[definition.parameter_id] = false;
  else if (definition.value_type === "enum") {
    const allowed = definition.constraints_json.values;
    if (!Array.isArray(allowed) || !allowed.length) throw new Error(`ENUM_WITHOUT_VALUES:${definition.parameter_id}`);
    const sample = definition.constraints_json.admissionSampleValue;
    values[definition.parameter_id] = sample != null && allowed.includes(sample) ? sample : allowed[0];
  } else if (definition.value_type === "text") values[definition.parameter_id] = `PROJECT_CONFIRMED:${definition.parameter_id}`;
  else {
    const sample = definition.constraints_json.admissionSampleValue;
    if (sample != null) {
      values[definition.parameter_id] = definition.value_type === "integer" ? Math.ceil(Number(sample)) : String(sample);
      return;
    }
    values[definition.parameter_id] = semanticNumeric(
      definition.parameter_id,
      definition.value_type === "integer",
      definition.constraints_json.min == null ? null : Number(definition.constraints_json.min),
      definition.constraints_json.max == null ? null : Number(definition.constraints_json.max),
    );
  }
}

function completeConditionalValues(definitions: Parameter[], initial: JsonRecord): JsonRecord {
  const values = { ...initial };
  for (const definition of definitions) if (definition.required || definition.default_value != null) assignValue(definition, values);
  for (let pass = 0; pass < definitions.length; pass += 1) {
    let changed = false;
    for (const definition of definitions) {
      if (values[definition.parameter_id] == null && conditionMatches(definition.constraints_json.requiredWhen, values)) {
        assignValue(definition, values);
        changed = true;
      }
    }
    if (!changed) break;
  }
  return validateCanonicalEstimateParameters(definitions, values);
}

function merge(left: JsonRecord, right: JsonRecord): JsonRecord | null {
  const result = { ...left };
  for (const [key, value] of Object.entries(right)) {
    if (key in result && result[key] !== value) return null;
    result[key] = value;
  }
  return result;
}

function satisfyingAssignments(ast: JsonRecord): JsonRecord[] {
  const kind = String(ast.kind ?? "");
  if (kind === "literal") return ast.value === true ? [{}] : [];
  if (kind === "parameter") return [{ [String(ast.id)]: true }];
  if (kind === "equals") return [{ [String(ast.parameterId)]: ast.value }];
  if (kind === "not") {
    const operand = ast.operand as JsonRecord;
    if (operand?.kind === "parameter") return [{ [String(operand.id)]: false }];
    throw new Error(`UNSUPPORTED_NEGATED_BRANCH:${stableJson(ast)}`);
  }
  const operands = Array.isArray(ast.operands) ? ast.operands as JsonRecord[] : [];
  if (kind === "or") return operands.flatMap(satisfyingAssignments);
  if (kind === "and") {
    let combinations: JsonRecord[] = [{}];
    for (const operand of operands) {
      combinations = combinations.flatMap((base) => satisfyingAssignments(operand)
        .map((candidate) => merge(base, candidate)).filter((candidate): candidate is JsonRecord => candidate !== null));
    }
    return combinations;
  }
  throw new Error(`UNSUPPORTED_INCLUSION_AST:${stableJson(ast)}`);
}

function conditionResult(ast: JsonRecord, parameters: JsonRecord): { reached: boolean; activated: string[]; reason: string | null } {
  const kind = String(ast.kind ?? "");
  if (kind === "literal") return { reached: ast.value === true, activated: ast.value === true ? ["literal:true"] : [], reason: ast.value === true ? null : "LITERAL_FALSE" };
  if (kind === "parameter") {
    const id = String(ast.id);
    const reached = parameters[id] === true;
    return { reached, activated: reached ? [`${id}=true`] : [], reason: reached ? null : `PARAMETER_FALSE:${id}` };
  }
  if (kind === "equals") {
    const id = String(ast.parameterId);
    const reached = parameters[id] === ast.value;
    return { reached, activated: reached ? [`${id}=${String(ast.value)}`] : [], reason: reached ? null : `VALUE_MISMATCH:${id}` };
  }
  if (kind === "not") {
    const inner = conditionResult(ast.operand as JsonRecord, parameters);
    return { reached: !inner.reached, activated: !inner.reached ? [`not:${inner.reason}`] : [], reason: inner.reached ? "NEGATED_TRUE" : null };
  }
  const results = (Array.isArray(ast.operands) ? ast.operands as JsonRecord[] : []).map((operand) => conditionResult(operand, parameters));
  if (kind === "and") {
    const failure = results.find((result) => !result.reached);
    return { reached: failure == null, activated: failure ? [] : results.flatMap((result) => result.activated), reason: failure?.reason ?? null };
  }
  if (kind === "or") {
    const success = results.find((result) => result.reached);
    return { reached: success != null, activated: success?.activated ?? [], reason: success ? null : "NO_OR_BRANCH" };
  }
  throw new Error(`UNSUPPORTED_INCLUSION_AST:${stableJson(ast)}`);
}

async function main(): Promise<void> {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const client = new Client({ connectionString: DATABASE_URL, application_name: "batch006-water-scenario-builder-r3" });
  await client.connect();
  try {
    const definitions = (await client.query(`
      select v.id,v.catalog_id
      from public.estimate_definition_version v
      join public.estimate_work_identity w on w.catalog_id=v.catalog_id
      where v.release_id=$1 and w.domain='water_supply_sewerage'
      order by v.catalog_id
    `, [RELEASE_ID])).rows;
    if (definitions.length !== EXPECTED_DEFINITIONS) throw new Error(`WATER_SCENARIO_DEFINITION_COUNT_RED:${definitions.length}:${EXPECTED_DEFINITIONS}`);
    const scenarioRows: JsonRecord[] = [];
    const summaryRows: JsonRecord[] = [];
    const globallyReached = new Set<string>();
    let totalResources = 0;
    let invalidParameterCombinations = 0;
    let mutuallyExclusiveSimultaneous = 0;
    for (const [definitionIndex, definition] of definitions.entries()) {
      const parameters = (await client.query(`
        select parameter_id,value_type,required,default_value,constraints_json
        from public.estimate_parameter_definition where definition_version_id=$1 order by ordinal
      `, [definition.id])).rows as Parameter[];
      const resources = (await client.query(`
        select s.row_id,s.row_sha256,s.inclusion_ast,s.formula_id,f.ast
        from public.estimate_resource_spec s
        join public.estimate_formula_graph f on f.definition_version_id=s.definition_version_id and f.formula_id=s.formula_id
        where s.definition_version_id=$1 order by s.ordinal
      `, [definition.id])).rows as Resource[];
      totalResources += resources.length;
      const candidates = new Map<string, { kind: string; assignments: JsonRecord; parameters: JsonRecord }>();
      const addCandidate = (kind: string, assignments: JsonRecord): void => {
        try {
          const values = completeConditionalValues(parameters, assignments);
          const key = sha256(values);
          if (!candidates.has(key)) candidates.set(key, { kind, assignments, parameters: values });
        } catch {
          invalidParameterCombinations += 1;
        }
      };
      addCandidate("BASELINE_REQUIRED_SCOPE", {});
      const independentApplicability = parameters.filter((entry) => entry.value_type === "boolean"
        && entry.parameter_id.startsWith("include_")
        && entry.constraints_json.mutuallyExclusiveBooleanGroup == null);
      const allApplicable = Object.fromEntries(independentApplicability.map((entry) => [entry.parameter_id, true]));
      const enums = parameters.filter((entry) => entry.value_type === "enum");
      let enumAssignments: JsonRecord[] = [{}];
      for (const parameter of enums) {
        const allowed = parameter.constraints_json.values;
        if (!Array.isArray(allowed) || !allowed.length) throw new Error(`ENUM_VALUES_RED:${definition.catalog_id}:${parameter.parameter_id}`);
        enumAssignments = enumAssignments.flatMap((base) => allowed.map((value) => ({ ...base, [parameter.parameter_id]: value })));
      }
      for (const assignments of enumAssignments) {
        addCandidate("ALL_EXPLICITLY_APPLICABLE_COMPONENTS_PLUS_ENUM_VARIANT", { ...allApplicable, ...assignments });
      }
      if (candidates.size === 1) {
        const baseline = [...candidates.values()][0];
        candidates.set(`${sha256(baseline.parameters)}:recalculate-replay`, {
          kind: "VALIDATED_IDEMPOTENT_RECALCULATION_REPLAY",
          assignments: baseline.assignments,
          parameters: baseline.parameters,
        });
      }
      const supportedAssignmentIds = new Set([
        ...independentApplicability.map((entry) => entry.parameter_id),
        ...enums.map((entry) => entry.parameter_id),
      ]);
      for (const resource of resources) {
        for (const assignments of satisfyingAssignments(resource.inclusion_ast)) {
          const unknown = Object.keys(assignments).filter((id) => !supportedAssignmentIds.has(id));
          if (unknown.length) throw new Error(`UNMODELED_RESOURCE_BRANCH:${definition.catalog_id}:${resource.row_id}:${unknown.join(",")}`);
        }
      }
      const reachedForDefinition = new Set<string>();
      let scenarioOrdinal = 0;
      for (const candidate of candidates.values()) {
        const reached: string[] = [];
        const excluded: Array<{ rowId: string; reason: string }> = [];
        const activated = new Set<string>();
        const output: Array<{ rowId: string; quantity: string; rowSha256: string }> = [];
        const numeric = Object.fromEntries(Object.entries(candidate.parameters)
          .filter(([, value]) => typeof value === "number" || typeof value === "string")) as Record<string, string | number>;
        for (const resource of resources) {
          const condition = conditionResult(resource.inclusion_ast, candidate.parameters);
          condition.activated.forEach((entry) => activated.add(entry));
          if (!condition.reached) {
            excluded.push({ rowId: resource.row_id, reason: condition.reason ?? "NOT_REACHED" });
            continue;
          }
          const quantity = evaluateFormulaGraph(resource.ast, numeric);
          reached.push(resource.row_id);
          reachedForDefinition.add(resource.row_id);
          globallyReached.add(`${definition.catalog_id}:${resource.row_id}`);
          output.push({ rowId: resource.row_id, quantity, rowSha256: resource.row_sha256 });
        }
        const materialVariant = candidate.parameters.material_variant;
        const installationMethod = candidate.parameters.installation_method;
        if (Array.isArray(materialVariant) || Array.isArray(installationMethod)) mutuallyExclusiveSimultaneous += 1;
        scenarioRows.push({
          catalog_id: definition.catalog_id,
          scenario_id: `water:${definition.catalog_id}:${scenarioOrdinal}:${sha256(candidate.parameters).slice(0, 16)}`,
          scenario_kind: candidate.kind,
          parameter_set: candidate.parameters,
          validation_result: "GREEN",
          activated_conditions: [...activated].sort(),
          reached_row_ids: reached,
          excluded_row_ids: excluded.map((entry) => entry.rowId),
          exclusion_reasons: excluded,
          output_hash: sha256(output),
          required_assignments: candidate.assignments,
        });
        scenarioOrdinal += 1;
      }
      const unreachable = resources.filter((resource) => !reachedForDefinition.has(resource.row_id)).map((resource) => resource.row_id);
      if (unreachable.length) throw new Error(`WATER_UNREACHABLE_RESOURCE_ROWS:${definition.catalog_id}:${unreachable.join(",")}`);
      summaryRows.push({
        catalog_id: definition.catalog_id,
        parameter_count: parameters.length,
        resource_count: resources.length,
        scenario_count: candidates.size,
        reached_resource_count: reachedForDefinition.size,
        invalid_parameter_combinations: 0,
        mutually_exclusive_simultaneous: 0,
        status: "GREEN",
      });
      if ((definitionIndex + 1) % 100 === 0) process.stderr.write(`[batch006-scenarios] ${definitionIndex + 1}/${EXPECTED_DEFINITIONS}\n`);
    }
    if (invalidParameterCombinations !== 0 || mutuallyExclusiveSimultaneous !== 0 || globallyReached.size !== totalResources) {
      throw new Error(`WATER_SCENARIO_GLOBAL_RED:${JSON.stringify({ invalidParameterCombinations, mutuallyExclusiveSimultaneous, reached: globallyReached.size, totalResources })}`);
    }
    writeFileSync(join(EVIDENCE_ROOT, "WATER_CONSTRAINT_AWARE_SCENARIOS.jsonl"), `${scenarioRows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
    writeFileSync(join(EVIDENCE_ROOT, "WATER_CONSTRAINT_AWARE_SCENARIO_SUMMARY.jsonl"), `${summaryRows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
    const summary = {
      schemaVersion: "water-constraint-aware-mass-admission-scenarios.r6-a2",
      releaseId: RELEASE_ID,
      definitions: definitions.length,
      scenarios: scenarioRows.length,
      totalResources,
      reachedResources: globallyReached.size,
      invalidParameterCombinations,
      mutuallyExclusiveSimultaneous,
      unreachableRows: totalResources - globallyReached.size,
      blanketBooleanTrueStrategyForbidden: true,
      independentApplicabilityBooleansMayCoexist: true,
      scenarioPolicy: "BASELINE_REQUIRED_SCOPE_PLUS_ALL_EXPLICITLY_APPLICABLE_COMPONENTS_FOR_EACH_ENUM_CROSS_PRODUCT",
      outputSha256: sha256(scenarioRows),
      status: "GREEN",
    };
    writeFileSync(join(EVIDENCE_ROOT, "WATER_RESOURCE_BRANCH_COVERAGE.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
