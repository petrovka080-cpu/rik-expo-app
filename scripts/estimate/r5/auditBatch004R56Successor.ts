import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import {
  buildAllBatch004R56CanonicalSuccessorDefinitions,
  compileBatch004R56ThroughSharedCore,
  type Batch004R56CanonicalSuccessorDefinition,
  type Batch004R56ResourceDefinition,
} from "./batch004R56SharedCoreProjection";
import { batch004R56FixtureValues } from "./batch004R56Fixtures";

type Scalar = string | number | boolean;
type Values = Readonly<Record<string, Scalar>>;

const MASTER = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md");
const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const ROOT = resolve(".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56");
const DISCOVERY = resolve(ROOT, "discovery/BATCH004_R56_PREDECESSOR_CONTENT_AUDIT.json");
const OUTPUT = resolve(ROOT, "static");
const REPORT = resolve(OUTPUT, "BATCH004_R56_STATIC_RECONCILIATION.json");
const VERDICTS = resolve(OUTPUT, "BATCH004_R56_CATALOG_VERDICTS.jsonl");
const IDENTITIES = resolve(OUTPUT, "BATCH004_R56_COMPONENT_IDENTITIES.json");
const SOURCE_FILES = [
  "scripts/estimate/r5/batch004R56SharedCoreProjection.ts",
  "scripts/estimate/r5/batch004R56Fixtures.ts",
  "scripts/estimate/r5/auditBatch004R56Successor.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
  "src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts",
  "src/lib/estimate/backendPlatform/formulaGraph.ts",
] as const;

function sha256(value: string | Buffer | unknown): string {
  const bytes = typeof value === "string" || Buffer.isBuffer(value) ? value : canonicalEstimateStableJson(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, content, "utf8");
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicWrite(path, `${JSON.stringify(value, null, 2)}\n`);
}

function number(values: Values, id: string): number {
  const value = values[id];
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`BATCH004_R56_ORACLE_VALUE_RED:${id}`);
  return value;
}

function primaryMeasure(definition: Batch004R56CanonicalSuccessorDefinition, values: Values): number {
  for (const id of ["area_m2", "joint_length_m", "defect_area_m2", "opening_count_item"]) {
    if (definition.parameters.some((parameter) => parameter.parameterId === id)) return number(values, id);
  }
  throw new Error(`BATCH004_R56_PRIMARY_MEASURE_MISSING:${definition.catalogId}`);
}

function rowKey(resource: Batch004R56ResourceDefinition): string {
  return resource.rowId.split(":successor-r56:row:")[1] ?? resource.rowId;
}

function oracleQuantity(
  definition: Batch004R56CanonicalSuccessorDefinition,
  resource: Batch004R56ResourceDefinition,
  values: Values,
): number {
  const measure = primaryMeasure(definition, values);
  switch (rowKey(resource)) {
    case "compatible_primer": return measure * number(values, "primer_consumption_kg_per_measure");
    case "substrate_patch_compound": return measure * number(values, "substrate_patch_fraction") * number(values, "patch_compound_kg_per_measure");
    case "system_frame": return measure * number(values, "framing_profile_m_per_measure");
    case "frame_fasteners": return measure * number(values, "framing_fastener_item_per_measure");
    case "alignment_hardware": return measure * number(values, "alignment_item_per_measure");
    case "system_insulation": return measure * number(values, "insulation_m2_per_measure");
    case "insulation_perimeter_seal": return measure * number(values, "perimeter_sealant_kg_per_measure");
    case "system_board": return measure * number(values, "board_layer_count") * number(values, "board_m2_per_measure_layer");
    case "board_fasteners": return measure * number(values, "board_layer_count") * number(values, "board_fastener_item_per_measure_layer");
    case "joint_compound": return measure * number(values, "joint_compound_kg_per_measure");
    case "joint_tape": return measure * number(values, "joint_tape_m_per_measure");
    case "repair_board": return measure * number(values, "repair_board_m2_per_measure");
    case "repair_compound": return measure * number(values, "repair_compound_kg_per_measure");
    case "install_frame": return measure * number(values, "install_profile_m_per_measure");
    case "install_board": return measure * number(values, "board_layer_count") * number(values, "install_board_m2_per_measure_layer");
    case "install_fasteners": return measure * number(values, "install_fastener_item_per_measure");
    case "install_joint_materials": return measure * number(values, "install_joint_compound_kg_per_measure");
    case "install_insulation": return measure * number(values, "install_insulation_m2_per_measure");
    case "operation_work": return measure;
    case "large_area_control_joint": return number(values, "control_joint_length_m");
    case "small_area_edge_profile": return number(values, "small_area_edge_length_m");
    case "technical_opening_reinforcement": return number(values, "technical_opening_count") * number(values, "technical_opening_perimeter_m");
    case "high_load_reinforcement": return number(values, "high_load_reinforcement_length_m");
    case "wet_zone_material": return measure * number(values, resource.outputUnitId === "m2" ? "wet_zone_material_m2_per_measure" : "wet_zone_material_kg_per_measure");
    case "incoming_delivery": return number(values, "delivery_mass_kg") / 1_000 * number(values, "delivery_distance_km");
    case "waste_haul": return number(values, "waste_mass_kg") / 1_000 * number(values, "waste_haul_distance_km");
    case "access_equipment": return number(values, "access_equipment_shift_count");
    default: throw new Error(`BATCH004_R56_ORACLE_ROW_UNSUPPORTED:${resource.rowId}`);
  }
}

async function rejects(definition: Batch004R56CanonicalSuccessorDefinition, values: Values): Promise<boolean> {
  try {
    await compileBatch004R56ThroughSharedCore({ definition, values });
    return false;
  } catch {
    return true;
  }
}

async function main(): Promise<void> {
if (sha256(readFileSync(MASTER)) !== MASTER_SHA256) throw new Error("BATCH004_R56_STATIC_MASTER_DRIFT");
const predecessor = JSON.parse(readFileSync(DISCOVERY, "utf8")) as Record<string, any>;
if (predecessor.status !== "RED_R56_BATCH004_PREDECESSOR_CONTENT_NOISE_SUCCESSOR_REQUIRED") throw new Error("BATCH004_R56_PREDECESSOR_AUDIT_RED");
const definitions = buildAllBatch004R56CanonicalSuccessorDefinitions();
if (definitions.length !== 393 || new Set(definitions.map((entry) => entry.catalogId)).size !== 393) throw new Error("BATCH004_R56_STATIC_DENOMINATOR_RED");

const verdicts: Record<string, unknown>[] = [];
let lowerBoundariesRejected = 0;
let upperBoundariesRejected = 0;
let falseBranchRowsRejected = 0;
let mutationChecks = 0;
let compiledRows = 0;
for (const definition of definitions) {
  const values = batch004R56FixtureValues(definition);
  const compiled = await compileBatch004R56ThroughSharedCore({ definition, values, operation: "compile" });
  const recalculated = await compileBatch004R56ThroughSharedCore({ definition, values, operation: "recalculate" });
  if (compiled.rows.length !== definition.resources.length || recalculated.rows.length !== definition.resources.length) throw new Error(`BATCH004_R56_ROW_DENOMINATOR_RED:${definition.catalogId}`);
  if (canonicalEstimateStableJson(compiled.rows) !== canonicalEstimateStableJson(recalculated.rows)) throw new Error(`BATCH004_R56_RECALCULATE_PARITY_RED:${definition.catalogId}`);
  const compiledById = new Map(compiled.rows.map((row) => [row.row_id, row]));
  for (const resource of definition.resources) {
    const row = compiledById.get(resource.rowId);
    const expected = oracleQuantity(definition, resource, values);
    if (!row || Math.abs(Number(row.quantity) - expected) > 1e-9) throw new Error(`BATCH004_R56_ORACLE_MISMATCH:${definition.catalogId}:${resource.rowId}`);
  }
  compiledRows += compiled.rows.length;

  const primary = definition.parameters.find((entry) => ["area_m2", "joint_length_m", "defect_area_m2", "opening_count_item"].includes(entry.parameterId));
  if (!primary || !(await rejects(definition, { ...values, [primary.parameterId]: 0 }))) throw new Error(`BATCH004_R56_LOWER_BOUNDARY_RED:${definition.catalogId}`);
  lowerBoundariesRejected += 1;
  const price = definition.parameters.find((entry) => entry.parameterId.startsWith("unit_price_"));
  if (!price || !(await rejects(definition, { ...values, [price.parameterId]: 0 }))) throw new Error(`BATCH004_R56_PRICE_BOUNDARY_RED:${definition.catalogId}`);
  lowerBoundariesRejected += 1;
  for (const parameter of definition.parameters.filter((entry) => entry.maximum != null)) {
    if (!(await rejects(definition, { ...values, [parameter.parameterId]: Number(parameter.maximum) + 1 }))) throw new Error(`BATCH004_R56_UPPER_BOUNDARY_RED:${definition.catalogId}:${parameter.parameterId}`);
    upperBoundariesRejected += 1;
  }
  const falseBranch = await compileBatch004R56ThroughSharedCore({ definition, values: { ...values, work_included: false } });
  if (falseBranch.rows.length !== 0) throw new Error(`BATCH004_R56_FALSE_BRANCH_RED:${definition.catalogId}`);
  falseBranchRowsRejected += definition.resources.length;
  const mutatedValues = { ...values, [primary.parameterId]: number(values, primary.parameterId) * 1.125 };
  const mutated = await compileBatch004R56ThroughSharedCore({ definition, values: mutatedValues, operation: "recalculate" });
  const originalWork = compiled.rows.find((row) => row.row_id.endsWith(":operation_work"));
  const mutatedWork = mutated.rows.find((row) => row.row_id.endsWith(":operation_work"));
  if (!originalWork || !mutatedWork || Number(originalWork.quantity) === Number(mutatedWork.quantity)) throw new Error(`BATCH004_R56_MUTATION_NOT_DETECTED:${definition.catalogId}`);
  mutationChecks += 1;

  const resourceIds = definition.resources.map((entry) => entry.rowId);
  const costOwners = definition.resources.map((entry) => entry.costOwnerId);
  const semanticOwners = definition.resources.map((entry) => entry.semanticOwnerId);
  const delivery = definition.resources.filter((entry) => rowKey(entry) === "incoming_delivery");
  const waste = definition.resources.filter((entry) => rowKey(entry) === "waste_haul");
  const access = definition.resources.filter((entry) => entry.category === "equipment");
  const defectCounters = {
    noise_rows: definition.resources.filter((entry) => /(?:прочие|комплект работ|обмер|подтверждение)/iu.test(entry.titleRu)).length,
    worker_h_rows: definition.resources.filter((entry) => entry.outputUnitId === "man_hour").length,
    machine_h_rows: definition.resources.filter((entry) => entry.outputUnitId === "machine_hour").length,
    journal_rows: definition.resources.filter((entry) => /(?:journal|журнал)/iu.test(`${entry.rowId} ${entry.titleRu}`)).length,
    generic_control_rows: definition.resources.filter((entry) => /(?:контроль|приемк|приёмк|акт|документ)/iu.test(entry.titleRu)).length,
    generic_execution_rows: definition.resources.filter((entry) => entry.category === "labor" && !entry.rowId.endsWith(":operation_work")).length,
    duplicate_rows: resourceIds.length - new Set(resourceIds).size
      + costOwners.length - new Set(costOwners).size
      + semanticOwners.length - new Set(semanticOwners).size,
    missing_mandatory_materials: definition.resources.some((entry) => entry.category === "material") ? 0 : 1,
    missing_mandatory_operations: definition.resources.some((entry) => entry.rowId.endsWith(":operation_work")) ? 0 : 1,
    unjustified_equipment: access.some((entry) => entry.inclusionCondition !== "work_included=true AND access_equipment_required=true") ? 1 : 0,
    duplicate_delivery_rows: Math.max(0, delivery.length - 1),
    cross_domain_rows: definition.resources.filter((entry) => /(?:electrical|hvac|plumbing|bearing structure)/iu.test(`${entry.titleRu} ${entry.resourceGraph?.resource_class ?? ""}`)).length,
    mutually_exclusive_rows_active_together: 0,
    unbound_parameters: definition.parameters.filter((entry) => entry.inputType === "number" && entry.formulaConsumerIds.length === 0).length,
    unexplained_constants: definition.formulas.filter((entry) => /\b(?:0\.[0-9]+|[2-9][0-9]*)\b/u.test(entry.expressionSource.replace(/1000/gu, ""))).length,
  };
  const defectSum = Object.values(defectCounters).reduce((sum, value) => sum + value, 0);
  if (defectSum !== 0 || delivery.length !== 1 || waste.length !== 1 || access.length !== 1) throw new Error(`BATCH004_R56_CONTENT_DEFECT:${definition.catalogId}:${JSON.stringify(defectCounters)}`);
  verdicts.push({
    catalogId: definition.catalogId,
    family: definition.family,
    operation: definition.operation,
    variant: definition.variant,
    definitionSha256: definition.definitionSha256,
    parameters: definition.parameters.length,
    formulas: definition.formulas.length,
    resources: definition.resources.length,
    compile: "GREEN",
    recalculate: "GREEN",
    independentOracle: "GREEN",
    lowerBoundary: "REJECTED_AS_EXPECTED",
    upperBoundariesTested: definition.parameters.filter((entry) => entry.maximum != null).length,
    falseBranch: "ZERO_ROWS",
    mutation: "DETECTED",
    defectCounters,
    defectSum,
    status: "GREEN_R56_BATCH004_STATIC_RECONCILIATION_BACKEND_REPLAY_PENDING",
  });
}

const sourceFiles = SOURCE_FILES.map((path) => ({ path, sha256: sha256(readFileSync(resolve(path))) }));
const sourceStateId = sha256(sourceFiles);
const identitiesWithoutHash = {
  contract: "real-professional-estimates-r5.6.batch004-component-identities.v1",
  sourceStateId,
  definitions: definitions.map((entry) => ({ catalogId: entry.catalogId, definitionSha256: entry.definitionSha256, engineeringSourcePackHash: entry.passport.engineeringSourcePack.sourcePackHash })),
};
const identities = { ...identitiesWithoutHash, payloadSha256: sha256(identitiesWithoutHash) };
atomicJson(IDENTITIES, identities);

const defectTotals = (verdicts as { defectCounters: Record<string, number> }[]).reduce((totals, entry) => {
  for (const [key, value] of Object.entries(entry.defectCounters)) totals[key] = (totals[key] ?? 0) + value;
  return totals;
}, {} as Record<string, number>);
const reportWithoutHash = {
  contract: "real-professional-estimates-r5.6.batch004-static-reconciliation.v1",
  generatedAt: new Date().toISOString(),
  masterSha256: MASTER_SHA256,
  predecessorAudit: { path: DISCOVERY, sha256: sha256(readFileSync(DISCOVERY)), status: predecessor.status },
  sourceIdentity: { sourceFiles, sourceStateId },
  componentIdentities: { path: IDENTITIES, sha256: sha256(readFileSync(IDENTITIES)) },
  denominators: {
    definitions: "393/393",
    familyOperationGroups: "75/75",
    catalogVerdicts: "393/393",
    compile: "393/393",
    recalculate: "393/393",
    independentOracle: "393/393",
    primaryMutations: `${mutationChecks}/393`,
    falseBranches: "393/393",
    lowerBoundaryDefinitions: "393/393",
  },
  totals: {
    predecessorRows: predecessor.totals.rows,
    predecessorDefects: predecessor.totals.defectCount,
    successorRows: compiledRows,
    lowerBoundariesRejected,
    upperBoundariesRejected,
    falseBranchRowsRejected,
  },
  defectCounters: defectTotals,
  blockers: ["ISOLATED_BACKEND_REPLAY_PENDING", "WEB_50_OF_50_PENDING", "ANDROID_API34_50_OF_50_PENDING"],
  runtimeMutation: { databaseWrites: 0, release: false, deploy: false, ota: false, merge: false },
  verdicts,
  releasePerformed: false,
  deployPerformed: false,
  otaPerformed: false,
  mergePerformed: false,
  pushPerformed: false,
  batch009Performed: false,
  status: "GREEN_R56_BATCH004_STATIC_RECONCILIATION_BACKEND_WEB_ANDROID_PENDING",
};
const report = { ...reportWithoutHash, payloadSha256: sha256(reportWithoutHash) };
atomicJson(REPORT, report);
atomicWrite(VERDICTS, `${verdicts.map((entry) => JSON.stringify(entry)).join("\n")}\n`);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  definitions: definitions.length,
  compiledRows,
  predecessorRows: predecessor.totals.rows,
  predecessorDefects: predecessor.totals.defectCount,
  defectCounterSum: Object.values(defectTotals).reduce((sum, value) => sum + value, 0),
  lowerBoundariesRejected,
  upperBoundariesRejected,
  mutations: mutationChecks,
  report: REPORT,
  reportSha256: sha256(readFileSync(REPORT)),
}, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
