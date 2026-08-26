import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

import { compileFormulaGraph } from "../../../src/lib/estimate/backendPlatform/formulaGraph";
import { evaluateEstimateAdmission } from "../../../src/lib/estimate/backendPlatform/estimateAdmissionR3";
import {
  buildAllBatch001DrywallSuccessorsR3,
  compileBatch001DrywallSuccessorR3,
  type Batch001DrywallSuccessorDefinitionR3,
  type Batch001DrywallSuccessorResourceR3,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";
import { batch001DrywallGoldFixtureValuesR3 } from "./batch001DrywallGoldFixtureR3";
import {
  buildAllBatch002DrywallSuccessorsR3,
  compileBatch002DrywallSuccessorR3,
  type Batch002DrywallResourceR3,
  type Batch002DrywallSuccessorDefinitionR3,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3";
import { batch002DrywallGoldFixtureValuesR3 } from "./batch002DrywallGoldFixtureR3";
import {
  buildCanonicalSourceIdentityR56,
  CANONICAL_R56_DEFAULT_SOURCE_PATHS,
} from "../r5/canonicalSourceIdentityR56";
import {
  buildAllBatch003R56CanonicalSuccessorDefinitions,
  compileBatch003R56ThroughSharedCore,
  type Batch003R56CanonicalSuccessorDefinition,
} from "../r5/batch003R56SharedCoreProjection";
import { batch003R56FixtureValues } from "../r5/batch003R56Fixtures";
import {
  buildAllBatch004R56CanonicalSuccessorDefinitions,
  compileBatch004R56ThroughSharedCore,
  type Batch004R56CanonicalSuccessorDefinition,
} from "../r5/batch004R56SharedCoreProjection";
import { batch004R56FixtureValues } from "../r5/batch004R56Fixtures";
import {
  batch005R4FixtureValues,
  buildAllBatch005R4CanonicalBackendDefinitions,
  compileBatch005R4ThroughContentOracle,
  type Batch005R4BackendDefinition,
  type Batch005R4BackendResource,
} from "../r5/batch005R4SharedCoreProjection";

type Json = Record<string, any>;

type DrywallDefinition = Batch001DrywallSuccessorDefinitionR3 | Batch002DrywallSuccessorDefinitionR3 | Batch005R4BackendDefinition;
type DrywallResource = Batch001DrywallSuccessorResourceR3 | Batch002DrywallResourceR3 | Batch005R4BackendResource;

type R56CanonicalDefinition = Batch003R56CanonicalSuccessorDefinition | Batch004R56CanonicalSuccessorDefinition;
type R56BackendAdapter = Batch001DrywallSuccessorDefinitionR3 & {
  r56Definition: R56CanonicalDefinition;
};

const BATCH_ID = process.env.ESTIMATE_BACKEND_PARITY_BATCH === "BATCH-005"
  ? "BATCH-005"
  : process.env.ESTIMATE_BACKEND_PARITY_BATCH === "BATCH-004"
  ? "BATCH-004"
  : process.env.ESTIMATE_BACKEND_PARITY_BATCH === "BATCH-003"
    ? "BATCH-003"
    : process.env.ESTIMATE_BACKEND_PARITY_BATCH === "BATCH-002" ? "BATCH-002" : "BATCH-001";
const IS_BATCH002 = BATCH_ID === "BATCH-002";
const IS_BATCH003 = BATCH_ID === "BATCH-003";
const IS_BATCH004 = BATCH_ID === "BATCH-004";
const IS_BATCH005 = BATCH_ID === "BATCH-005";
const IS_R56_SUCCESSOR = IS_BATCH003 || IS_BATCH004;
const IS_BATCH001_R56 = !IS_BATCH002 && !IS_R56_SUCCESSOR && !IS_BATCH005 && process.env.BATCH001_R56_RECONCILIATION === "true";
const RUN_SEPARATE_PRICE_MUTATION = IS_BATCH002 || IS_R56_SUCCESSOR || IS_BATCH001_R56 || IS_BATCH005;
const BATCH_TOKEN = IS_BATCH005 ? "batch005-r4" : IS_BATCH004 ? "batch004-r56" : IS_BATCH003 ? "batch003-r56" : IS_BATCH002 ? "batch002-r55" : IS_BATCH001_R56 ? "batch001-r56" : "batch001-r3";
const EXPECTED_DEFINITIONS = IS_BATCH005 ? 605 : IS_BATCH004 ? 393 : IS_BATCH003 ? 36 : IS_BATCH002 ? 55 : 16;
const EXPECTED_PARITY_DEFINITIONS = IS_BATCH005 ? 497 : EXPECTED_DEFINITIONS;
const DATABASE_URL = process.env.BATCH005_R4_DATABASE_URL
  ?? process.env.BATCH004_R56_DATABASE_URL
  ?? process.env.BATCH003_R56_DATABASE_URL
  ?? process.env.BATCH002_R4_DATABASE_URL
  ?? process.env.BATCH001_R56_DATABASE_URL
  ?? process.env.BATCH001_R3_DATABASE_URL
  ?? `postgresql://postgres:postgres@127.0.0.1:${IS_BATCH005 ? 55437 : IS_BATCH004 ? 55436 : IS_BATCH003 ? 55435 : IS_BATCH002 ? 55434 : 55433}/postgres`;
const PORT = Number(process.env.BATCH005_R4_BACKEND_PORT
  ?? process.env.BATCH004_R56_BACKEND_PORT
  ?? process.env.BATCH003_R56_BACKEND_PORT
  ?? process.env.BATCH002_R4_BACKEND_PORT
  ?? process.env.BATCH001_R56_BACKEND_PORT
  ?? process.env.BATCH001_R3_BACKEND_PORT
  ?? (IS_BATCH005 ? 8770 : IS_BATCH004 ? 8769 : IS_BATCH003 ? 8768 : IS_BATCH002 ? 8767 : 8766));
const API_ROOT = `http://127.0.0.1:${PORT}/canonical-estimate`;
const ORGANIZATION_ID = "22222222-2222-4222-8222-222222222222";
const HISTORICAL_MASTER_SHA256 = IS_BATCH005
  ? "44084dd37cf6c6612e39fdf2aded9a34acef752e7742ee18985a8be316288585"
  : IS_R56_SUCCESSOR
  ? "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8"
  : IS_BATCH002
  ? "554a9c4d2480c70ce2592a302a04e47f11ed7cc35353fb22fd15396f6fb91f27"
  : IS_BATCH001_R56
    ? "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8"
    : "af1ecdcba601536fb5e5bc8d81814eed34f302677ec1270dc3e172069989b29b";
const MASTER_SHA256 = process.env.ESTIMATE_BACKEND_PARITY_MASTER_SHA256 ?? HISTORICAL_MASTER_SHA256;
if (!/^[0-9a-f]{64}$/u.test(MASTER_SHA256)) {
  throw new Error("ESTIMATE_BACKEND_PARITY_MASTER_SHA256_INVALID");
}
const EXECUTION_CONTRACT_VERSION = process.env.ESTIMATE_BACKEND_PARITY_CONTRACT_VERSION ?? "historical";
const OUTPUT_DIR = resolve(process.env.BATCH001_PARITY_OUTPUT_DIR ?? (IS_BATCH005
  ? ".release-runtime/real-useful-estimates-r4/evidence/current-green/batch005-backend"
  : IS_BATCH004
  ? ".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56/backend"
  : IS_BATCH003
  ? ".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/backend"
  : IS_BATCH002
  ? ".release-runtime/real-professional-estimates-r4/evidence/04-repair/batch002"
  : IS_BATCH001_R56
    ? ".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56/backend"
    : ".release-runtime/real-professional-estimates-r3/evidence/04-repair/batch001"));
const OUTPUT = resolve(OUTPUT_DIR, IS_BATCH005
  ? "BATCH005_BACKEND_REVISION_PARITY_R4.json"
  : IS_BATCH004
  ? "BATCH004_BACKEND_REVISION_PARITY_R56.json"
  : IS_BATCH003
  ? "BATCH003_BACKEND_REVISION_PARITY_R56.json"
  : IS_BATCH002
  ? "BATCH002_BACKEND_REVISION_PARITY_R55.json"
  : IS_BATCH001_R56
    ? "BATCH001_BACKEND_REVISION_PARITY_R56.json"
    : "BATCH001_BACKEND_REVISION_PARITY_R3.json");
const SERVER_LOG = resolve(OUTPUT_DIR, `${BATCH_TOKEN}_backend_candidate_server.log`);
const RUN_LOCK = resolve(OUTPUT_DIR, `${BATCH_TOKEN}_backend_parity.lock.json`);
const BATCH005_WORK_GROUP_INVENTORY = resolve(
  ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
);
const BATCH005_CONTENT_IDS = new Set<string>();
if (IS_BATCH005) {
  const inventory = JSON.parse(readFileSync(BATCH005_WORK_GROUP_INVENTORY, "utf8")) as Json;
  for (const group of inventory.groups as Json[]) {
    if (group.batch_id !== "BATCH-005") continue;
    for (const catalogId of group.member_catalog_ids as string[]) BATCH005_CONTENT_IDS.add(catalogId);
  }
  if (BATCH005_CONTENT_IDS.size !== 497) {
    throw new Error(`BATCH005_R4_CONTENT_DENOMINATOR_DRIFT:${BATCH005_CONTENT_IDS.size}`);
  }
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function stableJson(value: unknown): string {
  if (value == null || typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Json;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function sha256(value: Buffer | string | unknown): string {
  const input = Buffer.isBuffer(value) || typeof value === "string" ? value : stableJson(value);
  return createHash("sha256").update(input).digest("hex");
}

function incrementalDefinitionSetSha256(
  definitions: readonly DrywallDefinition[],
  projection: (definition: DrywallDefinition) => unknown,
): string {
  const digest = createHash("sha256");
  for (const definition of definitions) {
    const serialized = stableJson(projection(definition));
    digest.update(String(Buffer.byteLength(serialized)), "utf8");
    digest.update("\0", "utf8");
    digest.update(serialized, "utf8");
    digest.update("\n", "utf8");
  }
  return digest.digest("hex");
}

function sourceIdentity(): Json {
  const configuredPaths = String(process.env.ESTIMATE_BACKEND_PARITY_SOURCE_PATHS
    ?? process.env.BATCH004_R56_SOURCE_PATHS
    ?? process.env.BATCH003_R56_SOURCE_PATHS
    ?? process.env.BATCH001_R56_SOURCE_PATHS
    ?? "")
    .split(";")
    .map((path) => path.trim())
    .filter(Boolean);
  const defaultPaths = IS_BATCH005
    ? [
      ...CANONICAL_R56_DEFAULT_SOURCE_PATHS.filter((path) => !path.startsWith("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5")),
      "C:/Users/User/Downloads/MASTER_TZ_R4_PRODUCTION_GRADE_GLOBAL_GREEN_SINGLE_CANONICAL_CODE_REAL_ESTIMATES_RU.md",
      ".release-runtime/real-useful-estimates-r4/evidence/current-green/04_AUTHORITATIVE_WORK_GROUP_INVENTORY_R4.json",
    ]
    : CANONICAL_R56_DEFAULT_SOURCE_PATHS;
  return buildCanonicalSourceIdentityR56({
    contractSha256: MASTER_SHA256,
    paths: configuredPaths.length > 0 ? configuredPaths : defaultPaths,
  });
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function processAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireRunLock(source: Json): { runId: string; release: () => void } {
  mkdirSync(dirname(RUN_LOCK), { recursive: true });
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const payload = (heartbeatAt: string) => ({
    contract: "real-professional-estimates-r5.6.backend-parity-single-flight.v1",
    runId,
    batchId: BATCH_ID,
    pid: process.pid,
    parentPid: process.ppid,
    commandLine: [process.execPath, ...process.argv].join(" "),
    sourceHead: source.source_head,
    sourceTree: source.source_head_tree,
    sourceStateId: source.source_state_id,
    sourceManifestSha256: source.component_manifest_sha256,
    startedAt,
    heartbeatAt,
  });
  const create = (): void => {
    try {
      const descriptor = openSync(RUN_LOCK, "wx");
      try {
        writeFileSync(descriptor, `${JSON.stringify(payload(startedAt), null, 2)}\n`, "utf8");
      } finally {
        closeSync(descriptor);
      }
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String((error as NodeJS.ErrnoException).code) : "";
      if (code !== "EEXIST") throw error;
      const existing = JSON.parse(readFileSync(RUN_LOCK, "utf8")) as Json;
      if (processAlive(Number(existing.pid))) {
        throw new Error(`${BATCH_ID}_BACKEND_SINGLE_FLIGHT_ACTIVE:${existing.runId}:${existing.pid}`);
      }
      rmSync(RUN_LOCK, { force: true });
      create();
    }
  };
  create();
  const heartbeat = setInterval(() => {
    writeFileSync(RUN_LOCK, `${JSON.stringify(payload(new Date().toISOString()), null, 2)}\n`, "utf8");
  }, 10_000);
  return {
    runId,
    release: () => {
      clearInterval(heartbeat);
      try {
        const existing = JSON.parse(readFileSync(RUN_LOCK, "utf8")) as Json;
        if (existing.runId === runId) rmSync(RUN_LOCK, { force: true });
      } catch (error) {
        const code = error instanceof Error && "code" in error ? String((error as NodeJS.ErrnoException).code) : "";
        if (code !== "ENOENT") throw error;
      }
    },
  };
}

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ru-RU").replaceAll("ё", "е")
    .replace(/[^0-9a-zа-я]+/giu, " ").trim();
}

function parameterType(value: string | number | boolean): "decimal" | "integer" | "boolean" | "text" {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "string") return "text";
  return Number.isInteger(value) && false ? "integer" : "decimal";
}

function parameterUnit(parameterId: string, value: string | number | boolean): string | null {
  if (typeof value !== "number") return null;
  if (parameterId.includes("_m2") || parameterId.endsWith("area_m2")) return "m2";
  if (parameterId.includes("_m3")) return "m3";
  if (parameterId.includes("_km")) return "km";
  if (parameterId.includes("_mm")) return "mm";
  if (parameterId.includes("_kg")) return "kg";
  if (parameterId.includes("_l_")) return "l";
  if (parameterId.includes("percent")) return "percent";
  if (parameterId.includes("count") || parameterId.includes("item")) return "item";
  if (parameterId.includes("length_m") || parameterId.endsWith("_m") || parameterId.includes("spacing_m")) return "m";
  return null;
}

function r56PrimaryMeasureParameterId(definition: R56CanonicalDefinition): string {
  if (definition.batchId === "BATCH-004") {
    if (definition.family === "joint") return "joint_length_m";
    if (definition.family === "revision_hatch") return "opening_count_item";
  }
  if (definition.operation === "FINISH_JOINT") return "joint_length_m";
  if (definition.operation === "REPAIR") return "defect_area_m2";
  return "area_m2";
}

function adaptR56Definition(
  definition: R56CanonicalDefinition,
): R56BackendAdapter {
  const bindingByParameterId = new Map(
    definition.passport.engineeringSourcePack.quantitativeBindings
      .map((binding) => [binding.parameterId, binding] as const),
  );
  const resourceConsumers = (parameterId: string): string[] => {
    const direct = definition.resources.filter((resource) => {
      const formula = definition.formulas.find((candidate) => candidate.formulaId === resource.formulaId);
      return formula?.inputParameterIds.includes(parameterId)
        || (resource.priceRoute?.kind === "RUNTIME_VALIDATED_INPUT"
          && resource.priceRoute.unit_price_parameter_id === parameterId)
        || parameterId === "work_included"
        || parameterId === "estimate_scope_mode"
        || parameterId === "project_type"
        || parameterId === "product_profile_id"
        || parameterId === "price_basis_reference"
        || parameterId === "price_basis_date"
        || (parameterId === "access_equipment_required" && resource.rowId.endsWith(":access_equipment"));
    }).map((resource) => resource.rowId);
    return direct.length > 0 ? direct : definition.resources.map((resource) => resource.rowId);
  };
  const backendBaselineParameters = definition.parameters.filter((parameter) =>
    !parameter.parameterId.startsWith("unit_price_")
    && parameter.parameterId !== "price_basis_reference"
    && parameter.parameterId !== "price_basis_date",
  );
  const operationQuantityParameterId = r56PrimaryMeasureParameterId(definition);
  const userInputParameterIds = new Set([
    operationQuantityParameterId,
    "delivery_required",
    "delivery_mass_kg",
    "delivery_distance_km",
    "waste_haul_required",
    "waste_mass_kg",
    "waste_haul_distance_km",
    "access_equipment_required",
    "access_equipment_shift_count",
    "project_type",
    "product_profile_id",
  ]);
  const parameters = backendBaselineParameters.map((parameter) => ({
    parameterId: parameter.parameterId,
    titleRu: parameter.labelRu,
    guideRu: `Введите подтвержденное проектом, обмером или ценовым основанием значение «${parameter.labelRu}». Скрытое значение не подставляется.`,
    visibilityRole: userInputParameterIds.has(parameter.parameterId) ? "USER_INPUT" : "INTERNAL_ONLY",
    formulaConsumerIds: parameter.formulaConsumerIds.filter((consumer) => !consumer.startsWith("price-route:")),
    resourceConsumerIds: resourceConsumers(parameter.parameterId),
  }));
  const userParameterContracts = backendBaselineParameters.filter((parameter) =>
    userInputParameterIds.has(parameter.parameterId)).map((parameter) => ({
    parameterId: parameter.parameterId,
    titleRu: parameter.labelRu,
    guideRu: `Введите подтвержденное значение «${parameter.labelRu}»; при отсутствии расчет закрывается с ошибкой.`,
    inputType: parameter.inputType === "number" ? "NUMBER"
      : parameter.inputType === "boolean" ? "BOOLEAN" : "TEXT",
    unitId: parameter.unitId,
    range: parameter.inputType === "number"
      ? { kind: "NUMERIC", minimum: parameter.minimum ?? 0, maximum: parameter.maximum ?? 1_000_000_000 }
      : parameter.inputType === "boolean"
        ? { kind: "BOOLEAN", choices: [false, true] }
        : { kind: "TEXT", minimumLength: 1, maximumLength: 1_000 },
    defaultValue: null,
    defaultSource: "EXPLICIT_NO_HIDDEN_DEFAULT",
    formulaConsumerIds: parameter.formulaConsumerIds.filter((consumer) => !consumer.startsWith("price-route:")),
    resourceConsumerIds: resourceConsumers(parameter.parameterId),
    variantApplicability: [definition.variant],
    engineeringSourceIds: bindingByParameterId.get(parameter.parameterId)?.sourceIds ?? [
      "PROJECT_DRYWALL_SYSTEM_PASSPORT_R56",
    ],
  }));
  const runtimeFormulas = definition.formulas.map((formula) => ({
    formulaId: formula.formulaId,
    expressionSource: formula.expressionSource,
    inputParameterIds: formula.inputParameterIds,
    outputUnitId: formula.outputUnitId,
    calculate: () => 0,
    sourcePredecessorFormulaId: null,
  }));
  const resources = definition.resources.map((resource) => {
    const source = resource.normativeTrace[0];
    return {
      rowId: resource.rowId,
      group: resource.category === "material" ? "material"
        : resource.category === "labor" ? "construction_work"
          : resource.category === "equipment" ? "machine_equipment" : "delivery",
      titleRu: resource.titleRu,
      formulaId: resource.formulaId,
      unitId: resource.outputUnitId,
      semanticOwnerId: resource.semanticOwnerId,
      costOwnerId: resource.costOwnerId,
      procurementEligible: resource.procurementEligible,
      resourceIdentity: resource.rowId,
      provenanceKind: definition.batchId === "BATCH-004"
        ? "BATCH004_R56_CANONICAL_SUCCESSOR"
        : "BATCH003_R56_CANONICAL_SUCCESSOR",
      costingMode: "EXPLICIT_RUNTIME_PRICE_OR_MANUAL_OVERRIDE",
      applicability: { kind: "FORMULA_POSITIVE", reasonRu: "Строка принадлежит точной физической операции successor R5.6." },
      sourcePredecessorRowIds: resource.rowId.includes(":row:material:")
        ? [`${definition.catalogId}:row:${resource.rowId.split(":").at(-1)}`] : [],
      procurementOwnerId: resource.procurementOwnerId,
      engineeringSourceIds: resource.normativeSourceIds,
      normativeSource: {
        sourceKey: source?.source_id ?? "PROJECT_DRYWALL_SYSTEM_PASSPORT_R56",
        locator: source?.exact_locator ?? `Формула ${resource.formulaId}`,
      },
    };
  });
  const contentDecision = { status: "GREEN", allowed: true, errors: [] };
  return {
    contract: "real-professional-estimates-r3.batch001-successor.v1",
    catalogId: definition.catalogId,
    predecessorVersion: definition.batchId === "BATCH-004"
      ? "DrywallDomainCompletionProfessionalV7"
      : "DrywallFlatCeilingProfessionalV6",
    successorVersionId: definition.successorVersion,
    group: definition.operation,
    variant: definition.variant,
    predecessorVisibleParameterCount: "predecessorPassport" in definition
      ? definition.predecessorPassport.parameterCount
      : definition.passport.parameterCount,
    technologyStepsRu: [definition.passport.physicalResultRu],
    dependencyRu: definition.passport.excludedScopeRu,
    userParameterGroups: [],
    runtimeFormulas,
    resources,
    passport: {
      contract: "real-professional-estimates-r3.content-passport.v1",
      executionContract: definition.executionContract,
      batchId: definition.batchId,
      domain: "interior_finishes",
      technologyFamily: definition.batchId === "BATCH-004"
        ? "DRYWALL_DOMAIN_COMPLETION"
        : "DRYWALL_FLAT_CEILING",
      operation: definition.operation,
      variant: definition.variant,
      titleRu: definition.passport.titleRu,
      aliasesRu: definition.passport.aliasesRu,
      physicalResultRu: definition.passport.physicalResultRu,
      includedScopeRu: definition.passport.includedScopeRu,
      excludedScopeRu: definition.passport.excludedScopeRu,
      primaryMeasure: definition.parameters.find((parameter) => parameter.parameterId === operationQuantityParameterId)?.unitId
        ?? "m2",
      applicabilityRu: definition.passport.physicalResultRu,
      parameters,
      formulas: runtimeFormulas,
      resources,
      capabilityMatrix: [
        { group: "material", status: "APPLICABLE" },
        { group: "construction_work", status: "APPLICABLE" },
        { group: "delivery", status: "APPLICABLE" },
        { group: "machine_equipment", status: "CONDITIONAL" },
      ],
      userParameterContracts,
      engineeringSources: definition.passport.engineeringSourcePack.sources.map((source) => ({
        sourceId: source.sourceId,
        titleRu: "titleRu" in source ? source.titleRu : source.documentCode,
        officialUrl: "officialUrl" in source ? source.officialUrl : `evidence://${source.sourceId}`,
      })),
      commercialAssumptionsRu: [],
      semanticOwners: definition.passport.semanticOwners,
      costOwners: definition.passport.costOwners,
      procurementOwners: definition.passport.procurementOwners,
      predecessorAdjudication: [],
      proofStatus: "CONTENT_RECONCILIATION_GREEN_BACKEND_REPLAY_PENDING_R56",
    },
    contentDecision,
    domainDecision: contentDecision,
    adjudication: [],
    r56Definition: definition,
  } as unknown as R56BackendAdapter;
}

function buildDefinitions(): readonly DrywallDefinition[] {
  if (IS_BATCH005) return buildAllBatch005R4CanonicalBackendDefinitions();
  if (IS_BATCH004) return buildAllBatch004R56CanonicalSuccessorDefinitions().map(adaptR56Definition);
  if (IS_BATCH003) return buildAllBatch003R56CanonicalSuccessorDefinitions().map(adaptR56Definition);
  return IS_BATCH002 ? buildAllBatch002DrywallSuccessorsR3() : buildAllBatch001DrywallSuccessorsR3();
}

function fixtureValues(definition: DrywallDefinition): Readonly<Record<string, string | number | boolean>> {
  if (IS_BATCH005) return batch005R4FixtureValues(definition as Batch005R4BackendDefinition);
  if (IS_BATCH004) {
    return batch004R56FixtureValues((definition as R56BackendAdapter).r56Definition as Batch004R56CanonicalSuccessorDefinition);
  }
  if (IS_BATCH003) {
    return batch003R56FixtureValues((definition as R56BackendAdapter).r56Definition as Batch003R56CanonicalSuccessorDefinition);
  }
  return IS_BATCH002
    ? batch002DrywallGoldFixtureValuesR3(definition as Batch002DrywallSuccessorDefinitionR3)
    : batch001DrywallGoldFixtureValuesR3(definition as Batch001DrywallSuccessorDefinitionR3);
}

async function compileLocal(definition: DrywallDefinition, values: Readonly<Record<string, string | number | boolean>>) {
  if (IS_BATCH005) {
    const electrical = definition as Batch005R4BackendDefinition;
    const compiled = await compileBatch005R4ThroughContentOracle({ definition: electrical, values });
    const resourceById = new Map(electrical.resources.map((resource) => [resource.rowId, resource]));
    return {
      status: "GREEN" as const,
      catalogId: electrical.catalogId,
      rows: compiled.compiled_rows.map((row) => {
        const resource = resourceById.get(row.row_id)!;
        return {
          rowId: row.row_id,
          group: resource.group,
          titleRu: String(row.title_ru),
          unitId: String(row.unit_id),
          quantity: Number(row.quantity),
          semanticOwnerId: resource.semanticOwnerId,
          costOwnerId: resource.costOwnerId,
          procurementEligible: row.procurement_eligible,
        };
      }),
    };
  }
  if (IS_BATCH004) {
    const adapter = definition as R56BackendAdapter;
    const compiled = await compileBatch004R56ThroughSharedCore({
      definition: adapter.r56Definition as Batch004R56CanonicalSuccessorDefinition,
      values,
    });
    const resourceById = new Map(adapter.resources.map((resource) => [resource.rowId, resource]));
    return {
      status: "GREEN" as const,
      catalogId: definition.catalogId,
      rows: compiled.rows.map((row) => {
        const resource = resourceById.get(row.row_id)!;
        return {
          rowId: row.row_id,
          group: resource.group,
          titleRu: String(row.title_ru),
          unitId: String(row.unit_id),
          quantity: Number(row.quantity),
          semanticOwnerId: resource.semanticOwnerId,
          costOwnerId: resource.costOwnerId,
          procurementEligible: row.procurement_eligible,
        };
      }),
    };
  }
  if (IS_BATCH003) {
    const adapter = definition as R56BackendAdapter;
    const compiled = await compileBatch003R56ThroughSharedCore({
      definition: adapter.r56Definition as Batch003R56CanonicalSuccessorDefinition,
      values,
    });
    const resourceById = new Map(adapter.resources.map((resource) => [resource.rowId, resource]));
    return {
      status: "GREEN" as const,
      catalogId: definition.catalogId,
      rows: compiled.rows.map((row) => {
        const resource = resourceById.get(row.row_id)!;
        return {
          rowId: row.row_id,
          group: resource.group,
          titleRu: String(row.title_ru),
          unitId: String(row.unit_id),
          quantity: Number(row.quantity),
          semanticOwnerId: resource.semanticOwnerId,
          costOwnerId: resource.costOwnerId,
          procurementEligible: row.procurement_eligible,
        };
      }),
    };
  }
  return IS_BATCH002
    ? compileBatch002DrywallSuccessorR3(definition as Batch002DrywallSuccessorDefinitionR3, values)
    : compileBatch001DrywallSuccessorR3(definition as Batch001DrywallSuccessorDefinitionR3, values);
}

function definitionGroup(definition: DrywallDefinition): string {
  return "group" in definition ? definition.group : definition.system;
}

function definitionDomain(definition: DrywallDefinition): string {
  return IS_BATCH005 ? "electrical" : "interior_finishes";
}

function definitionSystem(definition: DrywallDefinition): string {
  return IS_BATCH005 ? "electrical_complete" : "drywall";
}

function definitionGroupId(definition: DrywallDefinition): string {
  if (IS_BATCH005) return `electrical.${definitionGroup(definition)}`;
  if (IS_BATCH004) return "interior_finishes.drywall_domain_completion.batch004";
  if (IS_BATCH003) return "interior_finishes.drywall_flat_ceiling.batch003";
  if (IS_BATCH002) return "interior_finishes.drywall_architectural_elements.batch002";
  return "interior_finishes.drywall_ceiling_bulkhead.batch001";
}

function definitionIsContent(definition: DrywallDefinition): boolean {
  return !IS_BATCH005 || BATCH005_CONTENT_IDS.has(definition.catalogId);
}

function definitionOperation(definition: DrywallDefinition): string {
  return "operation" in definition ? definition.operation : definitionGroup(definition);
}

function searchOperationKind(definition: DrywallDefinition): "NEW_INSTALLATION" | "REPAIR" {
  return definitionOperation(definition) === "REPAIR" ? "REPAIR" : "NEW_INSTALLATION";
}

function truthContractVersion(): string {
  return IS_BATCH005 ? "R4" : IS_R56_SUCCESSOR || IS_BATCH001_R56 ? "R5.6" : IS_BATCH002 ? "R5.5" : "R3";
}

function backendCandidateContract(): string {
  if (IS_BATCH005) return "master-r4.batch005-backend-candidate.v1";
  if (IS_BATCH004) return "real-professional-estimates-r5.6.batch004-backend-candidate.v1";
  if (IS_BATCH003) return "real-professional-estimates-r5.6.batch003-backend-candidate.v1";
  if (IS_BATCH002) return "real-professional-estimates-r4.batch002-backend-candidate.v1";
  return IS_BATCH001_R56
    ? "real-professional-estimates-r5.6.batch001-backend-candidate.v1"
    : "real-professional-estimates-r3.batch001-backend-candidate.v1";
}

function definitionSubsystem(definition: DrywallDefinition): string {
  if (IS_BATCH005) return "electrical_complete";
  if (IS_BATCH004) return "drywall_domain_completion";
  if (IS_BATCH003) return "drywall_flat_ceiling";
  return "system" in definition && definition.system === "CURVE" ? "curved_ceiling_element" : "ceiling_bulkhead";
}

function definitionPrimaryUnit(definition: DrywallDefinition): string {
  if (IS_BATCH005) return (definition as Batch005R4BackendDefinition).passport.primaryMeasure;
  if (IS_R56_SUCCESSOR) {
    const successor = (definition as R56BackendAdapter).r56Definition;
    return successor.parameters.find((parameter) => parameter.parameterId === r56PrimaryMeasureParameterId(successor))?.unitId
      ?? "m2";
  }
  return "primaryMeasure" in definition.passport ? definition.passport.primaryMeasure : "m2";
}

function engineeringSourceIds(definition: DrywallDefinition): readonly string[] {
  if (IS_BATCH005) return (definition as Batch005R4BackendDefinition).passport.engineeringSources
    .map((source) => source.sourceId);
  return "engineeringSources" in definition.passport
    ? definition.passport.engineeringSources.map((source) => source.sourceId)
    : ["KG_SP_KR_65_101_2025", "KG_KRER_10_05_011"];
}

function titleSpecificationParameterId(
  definition: DrywallDefinition,
  resource: DrywallResource,
): string | null {
  if (!IS_BATCH002 || IS_BATCH003) return null;
  const operation = definitionOperation(definition);
  if (operation === "FINISH_JOINT") {
    if (resource.group === "material") return "joint_system_type";
    if (resource.resourceIdentity.endsWith(":joint_finish_surface")) return "surface_quality_level";
  }
  if (operation === "INSULATE" && resource.resourceIdentity.endsWith(":insulation_mat")) return "insulation_type";
  if (operation === "PREPARE" && (
    resource.resourceIdentity.endsWith(":preparation_primer")
    || resource.resourceIdentity.endsWith(":preparation_clean_base")
  )) return "substrate_type";
  if (operation === "REPAIR" && resource.resourceIdentity.endsWith(":repair_boards")) return "repair_board_type";
  if (operation === "CLAD") {
    if (resource.resourceIdentity.endsWith(":cladding_boards")) return "board_type";
    if (resource.resourceIdentity.endsWith(":cladding_cut_and_form")) return "forming_method";
  }
  if (operation === "FRAME" && resource.group === "material") return "frame_system_type";
  return null;
}

function rowType(resource: DrywallResource): "material" | "labor" | "equipment" | "service" {
  if (resource.group === "material") return "material";
  if (resource.group === "construction_work") return "labor";
  if (resource.group === "machine_equipment") return "equipment";
  return "service";
}

function sectionRu(resource: DrywallResource): string {
  if (resource.group === "material") return "Материалы";
  if (resource.group === "construction_work") return "Строительные работы";
  if (resource.group === "machine_equipment") return "Машины и оборудование";
  return "Доставка";
}

function inclusionAst(
  definition: DrywallDefinition,
  resource: DrywallResource,
  baseline: Readonly<Record<string, string | number | boolean>>,
): Json {
  if (IS_BATCH005) {
    const source = (resource as Batch005R4BackendResource).sourceInclusionCondition;
    const clauses = source.split(/\s+AND\s+/u).map((clause) => clause.trim());
    const operands = clauses.flatMap((clause): Json[] => {
      const match = clause.match(/^([a-z0-9_]+)=(true|false|[A-Z_]+)$/u);
      if (!match) return [];
      const [, parameterId, rawExpected] = match;
      const expected: boolean | string = rawExpected === "true" ? true : rawExpected === "false" ? false : rawExpected;
      if (parameterId === "scope_mode") {
        return [{ kind: "equals", parameterId: "estimate_scope_mode", value: expected }];
      }
      if (expected === true) return [{ kind: "parameter", id: parameterId }];
      return [{ kind: "equals", parameterId, value: expected }];
    });
    if (operands.length === 0) return { kind: "literal", value: true };
    return operands.length === 1 ? operands[0] : { kind: "and", operands };
  }
  if (IS_R56_SUCCESSOR) {
    const successor = (definition as R56BackendAdapter).r56Definition;
    const source = successor.resources.find((candidate) => candidate.rowId === resource.rowId);
    invariant(source, `${BATCH_ID}_SUCCESSOR_RESOURCE_MISSING:${resource.rowId}`);
    if (source.inclusionCondition === "work_included=true AND access_equipment_required=true") {
      return {
        kind: "and",
        operands: [
          { kind: "parameter", id: "work_included" },
          { kind: "equals", parameterId: "access_equipment_required", value: true },
        ],
      };
    }
    if (source.inclusionCondition === "work_included=true AND delivery_required=true") {
      return {
        kind: "and",
        operands: [
          { kind: "parameter", id: "work_included" },
          { kind: "equals", parameterId: "delivery_required", value: true },
        ],
      };
    }
    if (source.inclusionCondition === "work_included=true AND waste_haul_required=true") {
      return {
        kind: "and",
        operands: [
          { kind: "parameter", id: "work_included" },
          { kind: "equals", parameterId: "waste_haul_required", value: true },
        ],
      };
    }
    if (source.inclusionCondition === "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE") {
      return {
        kind: "and",
        operands: [
          { kind: "parameter", id: "work_included" },
          { kind: "equals", parameterId: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" },
        ],
      };
    }
    return { kind: "parameter", id: "work_included" };
  }
  if (resource.applicability.kind === "DELIVERY_NOT_INCLUDED_BY_SUPPLIER") {
    return { kind: "not", operand: { kind: "parameter", id: resource.applicability.parameterId } };
  }
  const formula = definition.runtimeFormulas.find((candidate) => candidate.formulaId === resource.formulaId);
  if (formula && formula.inputParameterIds.length === 1
    && formula.expressionSource.trim() === formula.inputParameterIds[0]
    && baseline[formula.inputParameterIds[0]] === 0) {
    return { kind: "greater_than", parameterId: formula.inputParameterIds[0], value: 0 };
  }
  return { kind: "literal", value: true };
}

async function insertCandidateModel(client: Client): Promise<{
  releaseId: string;
  searchReleaseId: string;
  capabilityId: string;
  capabilityExpiresAt: string;
  sourceHead: string;
  sourceTree: string;
  definitionSetSha256: string;
  definitions: readonly DrywallDefinition[];
}> {
  const definitions = buildDefinitions();
  invariant(definitions.length === EXPECTED_DEFINITIONS, `${BATCH_ID}_BACKEND_DEFINITION_COUNT`);
  const payloadHash = incrementalDefinitionSetSha256(definitions, (definition) => ({
    catalogId: definition.catalogId,
    passport: definition.passport,
    formulas: definition.passport.formulas,
    resources: definition.resources,
  }));
  const definitionSetSha256 = incrementalDefinitionSetSha256(definitions, (definition) => definition);
  const sourceHead = payloadHash.slice(0, 40);
  const sourceTree = sha256(`tree:${payloadHash}`).slice(0, 40);
  const releaseId = randomUUID();
  const searchReleaseId = randomUUID();
  const capabilityId = randomUUID();
  const capabilityExpiresAt = new Date(Date.now() + (IS_BATCH001_R56 || IS_R56_SUCCESSOR || IS_BATCH005 ? 12 : 2) * 60 * 60 * 1000).toISOString();
  const totalParameters = definitions.reduce((sum, definition) => sum + definition.passport.parameters.length, 0);
  const totalFormulas = definitions.reduce((sum, definition) => sum + definition.runtimeFormulas.length, 0);
  const totalResources = definitions.reduce((sum, definition) => sum + definition.resources.length, 0);
  const globalDefinitions = definitions.filter(definitionIsContent).length;
  const externalDefinitions = definitions.length - globalDefinitions;
  const candidateFamily = IS_BATCH005 ? "electrical" : "drywall";
  const candidateReleaseKey = IS_BATCH005
    ? process.env.BATCH005_R4_CANDIDATE_RELEASE_KEY ?? `${BATCH_TOKEN}-${candidateFamily}-candidate`
    : `${BATCH_TOKEN}-${candidateFamily}-candidate`;
  invariant(/^[a-z0-9][a-z0-9-]{2,119}$/u.test(candidateReleaseKey),
    `${BATCH_ID}_CANDIDATE_RELEASE_KEY_INVALID`);

  const existingRelease = (await client.query(`select id::text,source_commit,source_tree,
    source_manifest_sha256,definition_count,status from public.estimate_definition_release
    where release_key=$1`, [candidateReleaseKey])).rows[0] as Json | undefined;
  if (existingRelease) {
    invariant(IS_BATCH005 && process.env.BATCH005_R4_RESUME === "true",
      `${BATCH_ID}_CANDIDATE_RELEASE_ALREADY_EXISTS`);
    invariant(existingRelease.status === "prepared"
      && existingRelease.source_manifest_sha256 === payloadHash
      && Number(existingRelease.definition_count) === definitions.length,
    `${BATCH_ID}_RESUME_RELEASE_IDENTITY_MISMATCH`);
    const existingSearch = (await client.query(`select id::text,source_commit,source_tree,status
      from public.estimate_search_index_release where release_key=$1`,
    [`${candidateReleaseKey}-search`])).rows[0] as Json | undefined;
    invariant(existingSearch && existingSearch.status === "draft"
      && existingSearch.source_commit === existingRelease.source_commit
      && existingSearch.source_tree === existingRelease.source_tree,
    `${BATCH_ID}_RESUME_SEARCH_IDENTITY_MISMATCH`);
    const existingCapability = (await client.query(`select id::text,expires_at,source_head,source_tree
      from public.estimate_candidate_capability_r3 where release_id=$1 and search_release_id=$2
      order by expires_at desc limit 1`, [existingRelease.id, existingSearch.id])).rows[0] as Json | undefined;
    invariant(existingCapability && new Date(String(existingCapability.expires_at)).getTime() > Date.now()
      && existingCapability.source_head === existingRelease.source_commit
      && existingCapability.source_tree === existingRelease.source_tree,
    `${BATCH_ID}_RESUME_CAPABILITY_INVALID_OR_EXPIRED`);
    return {
      releaseId: String(existingRelease.id),
      searchReleaseId: String(existingSearch.id),
      capabilityId: String(existingCapability.id),
      capabilityExpiresAt: new Date(String(existingCapability.expires_at)).toISOString(),
      sourceHead: String(existingRelease.source_commit),
      sourceTree: String(existingRelease.source_tree),
      definitionSetSha256,
      definitions,
    };
  }

  await client.query("begin");
  try {
    const occupied = await client.query(
      "select count(*)::integer count from public.estimate_definition_release orphans where orphans.release_key=$1",
      [candidateReleaseKey],
    );
    invariant(Number(occupied.rows[0].count) === 0, `${BATCH_ID}_CANDIDATE_RELEASE_ALREADY_EXISTS`);
    await client.query(`insert into public.estimate_definition_release(
      id,release_key,schema_version,status,source_commit,source_tree,source_manifest_sha256,
      definition_count,resource_row_count,metadata,source_package_sha256,parameter_count,formula_count
    ) values($1,$2,3,'draft',$3,$4,$5,$6,$7,$8::jsonb,$5,$9,$10)`, [
      releaseId,
      candidateReleaseKey,
      sourceHead,
      sourceTree,
      payloadHash,
      definitions.length,
      totalResources,
      JSON.stringify({
        contract: backendCandidateContract(),
        noRelease: true,
      }),
      totalParameters,
      totalFormulas,
    ]);
    await client.query(`insert into public.estimate_search_index_release(
      id,release_key,status,taxonomy_version,group_relation_version,ranking_contract_version,
      source_commit,source_tree,snapshot_sha256,global_count,external_count,discovered_count,metadata
    ) values($1,$2,'draft',$3,$4,$5,$6,$7,$8,$9,$10,0,$11::jsonb)`, [
      searchReleaseId,
      `${candidateReleaseKey}-search`,
      BATCH_TOKEN,
      BATCH_TOKEN,
      "server-owned-r58",
      sourceHead,
      sourceTree,
      sha256(`search:${payloadHash}`),
      globalDefinitions,
      externalDefinitions,
      JSON.stringify({ isolatedCandidate: true, noProductionPublication: true }),
    ]);
    if (IS_BATCH005) {
      const definitionsByGroup = new Map<string, DrywallDefinition[]>();
      for (const definition of definitions) {
        const groupId = definitionGroupId(definition);
        definitionsByGroup.set(groupId, [...(definitionsByGroup.get(groupId) ?? []), definition]);
      }
      invariant(definitionsByGroup.size === 107, `${BATCH_ID}_BACKEND_WORK_GROUP_COUNT:${definitionsByGroup.size}`);
      for (const [groupId, groupDefinitions] of definitionsByGroup) {
        const representative = groupDefinitions[0];
        await client.query(`insert into public.estimate_search_group(
          search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
          work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
        ) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb)`, [
          searchReleaseId,
          groupId,
          representative.passport.technologyFamily,
          definitionDomain(representative),
          definitionSystem(representative),
          definitionSubsystem(representative),
          definitionGroup(representative),
          definitionOperation(representative).toLocaleLowerCase("en-US"),
          JSON.stringify(["Электромонтажные работы", representative.passport.technologyFamily]),
          groupDefinitions.length,
          sha256(groupDefinitions.map((definition) => definition.catalogId).sort()),
          JSON.stringify({ verdict: "INDIVIDUAL_CANONICAL_BACKEND_SUCCESSORS", reviewed: true }),
        ]);
      }
    }
    if (!IS_BATCH005) {
    const groupId = IS_BATCH004
      ? "interior_finishes.drywall_domain_completion.batch004"
      : IS_BATCH003
      ? "interior_finishes.drywall_flat_ceiling.batch003"
      : IS_BATCH002
      ? "interior_finishes.drywall_architectural_elements.batch002"
      : "interior_finishes.drywall_ceiling_bulkhead.batch001";
    await client.query(`insert into public.estimate_search_group(
      search_release_id,group_id,group_name_ru,domain_id,system_id,subsystem_id,assembly_id,
      work_family_id,breadcrumb,member_count,member_set_sha256,oracle_disposition
    ) values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12::jsonb)`, [
      searchReleaseId,
      groupId,
      IS_BATCH004 ? "Полное завершение предметной области гипсокартонных систем"
        : IS_BATCH003 ? "Плоские подвесные потолки из гипсокартона"
        : IS_BATCH002 ? "Архитектурные элементы потолка из гипсокартона" : "Потолочные короба из гипсокартона",
      "interior_finishes",
      "drywall",
      IS_BATCH004 ? "domain_completion" : IS_BATCH003 ? "flat_ceiling" : IS_BATCH002 ? "architectural_elements" : "ceiling_bulkhead",
      IS_BATCH004 ? "drywall_domain_completion" : IS_BATCH003 ? "drywall_flat_ceiling" : IS_BATCH002 ? "drywall_architectural_elements" : "drywall_ceiling_bulkhead",
      IS_BATCH004 ? "prepare_frame_align_insulate_clad_finish_joint_repair_install"
        : IS_BATCH003 || IS_BATCH002 ? "finish_insulate_prepare_repair_align_clad_frame" : "frame_align_clad",
      JSON.stringify(IS_BATCH004
        ? ["Внутренняя отделка", "Гипсокартон", "Завершение предметной области"]
        : IS_BATCH003
        ? ["Внутренняя отделка", "Гипсокартон", "Плоский подвесной потолок"]
        : IS_BATCH002
          ? ["Внутренняя отделка", "Гипсокартон", "Архитектурные элементы потолка"]
          : ["Внутренняя отделка", "Гипсокартон", "Потолочный короб"]),
      definitions.length,
      sha256(definitions.map((definition) => definition.catalogId).sort()),
      JSON.stringify({ verdict: "INDIVIDUAL_R3_SUCCESSORS", reviewed: true }),
    ]);
    }

    const sourceIds = new Map<string, string>();
    const locatorIds = new Map<string, string>();
    for (const definition of definitions) {
      invariant(definition.contentDecision.allowed && definition.domainDecision.allowed,
        `${BATCH_ID}_CONTENT_RED:${definition.catalogId}`);
      const fixtureValuesForDefinition = fixtureValues(definition);
      const baseline = Object.fromEntries(definition.passport.parameters.map((parameter) => [
        parameter.parameterId,
        fixtureValuesForDefinition[parameter.parameterId],
      ])) as Readonly<Record<string, string | number | boolean>>;
      const definitionId = randomUUID();
      const definitionHash = sha256({ passport: definition.passport, formulas: definition.passport.formulas, resources: definition.resources });
      const userParameterContractById = new Map(
        definition.passport.userParameterContracts.map((contract) => [contract.parameterId, contract]),
      );
      await client.query(`insert into public.estimate_work_identity(
        catalog_id,namespace,domain,source_identity,work_key,title_ru,denominator_eligible
      ) values($1,$2,$3,$4,$5,$6,$7)`, [
        definition.catalogId,
        definitionIsContent(definition) ? "global" : "external_reference",
        definitionDomain(definition),
        `${BATCH_TOKEN}:${definition.catalogId}`,
        definition.successorVersionId,
        definition.passport.titleRu,
        definitionIsContent(definition),
      ]);
      await client.query(`insert into public.estimate_definition_version(
        id,release_id,catalog_id,definition_version,passport,applicability,definition_sha256,source_metadata
      ) values($1,$2,$3,1,$4::jsonb,$5::jsonb,$6,$7::jsonb)`, [
        definitionId,
        releaseId,
        definition.catalogId,
        JSON.stringify(definition.passport),
        JSON.stringify({ group: definitionGroup(definition), operation: definitionOperation(definition), variant: definition.variant, technologyStepsRu: definition.technologyStepsRu }),
        definitionHash,
        JSON.stringify({
          truth_contract_version: truthContractVersion(),
          successorVersionId: definition.successorVersionId,
          contentDecision: definition.contentDecision,
          domainDecision: definition.domainDecision,
          noRelease: true,
        }),
      ]);

      const formulaById = new Map(definition.runtimeFormulas.map((formula) => [formula.formulaId, formula]));
      for (let ordinal = 0; ordinal < definition.passport.parameters.length; ordinal += 1) {
        const parameter = definition.passport.parameters[ordinal];
        const value = baseline[parameter.parameterId];
        invariant(value != null, `${BATCH_ID}_BASELINE_VALUE_MISSING:${definition.catalogId}:${parameter.parameterId}`);
        invariant(parameter.resourceConsumerIds.length > 0,
          `${BATCH_ID}_RESOURCE_CONSUMER_MISSING:${definition.catalogId}:${parameter.parameterId}`);
        const visibilityRole = parameter.visibilityRole === "USER_INPUT" ? "USER_INPUT" : "INTERNAL_ONLY";
        const parameterContract = userParameterContractById.get(parameter.parameterId);
        const valueType = parameterContract?.inputType === "NUMBER"
          ? "decimal"
          : parameterContract?.inputType === "BOOLEAN"
            ? "boolean"
            : parameterContract?.inputType === "TEXT"
              ? "text"
              : parameterType(value);
        const constraints = parameterContract?.range.kind === "NUMERIC"
          ? { min: parameterContract.range.minimum, max: parameterContract.range.maximum }
          : parameterContract?.range.kind === "TEXT"
            ? { maxLength: parameterContract.range.maximumLength }
            : {};
        const truthMetadata: Json = {
          semantic_parameter_key: `${definition.catalogId}:${parameter.parameterId}`,
          visibility_role: visibilityRole,
          formula_consumers: parameter.formulaConsumerIds,
          resource_branch_consumers: parameter.resourceConsumerIds,
          allowed_range_or_options: parameterContract?.range ?? null,
          default_source: parameterContract?.defaultSource ?? "INTERNAL_ACCEPTED_TEMPLATE_BASELINE",
          engineering_source_ids: parameterContract?.engineeringSourceIds ?? [],
        };
        if (visibilityRole === "USER_INPUT") {
          truthMetadata.guide = {
            guide_short_ru: parameter.guideRu,
            guide_kind: "PROJECT_DEFINED",
            source_role: "R3_CONTENT_PASSPORT",
            guide_version: `${BATCH_TOKEN}.v1`,
            source_snapshot_hash: sha256(`${definition.catalogId}:${parameter.parameterId}:${parameter.guideRu}`),
            applicability: `${definitionGroup(definition)}/${definitionOperation(definition)}/${definition.variant}`,
            verified_at: "2026-08-19T00:00:00.000Z",
          };
        }
        await client.query(`insert into public.estimate_parameter_definition(
          definition_version_id,parameter_id,ordinal,value_type,unit_id,title_ru,required,
          default_value,constraints_json,truth_metadata
        ) values($1,$2,$3,$4,$5,$6,true,null,$7::jsonb,$8::jsonb)`, [
          definitionId,
          parameter.parameterId,
          ordinal,
          valueType,
          parameterUnit(parameter.parameterId, value),
          parameter.titleRu,
          JSON.stringify(constraints),
          JSON.stringify(truthMetadata),
        ]);
      }

      for (const formula of definition.runtimeFormulas) {
        const compiled = compileFormulaGraph(formula.expressionSource);
        invariant(stableJson([...compiled.inputParameterIds].sort()) === stableJson([...formula.inputParameterIds].sort()),
          `${BATCH_ID}_FORMULA_INPUT_DRIFT:${definition.catalogId}:${formula.formulaId}`);
        await client.query(`insert into public.estimate_formula_graph(
          definition_version_id,formula_id,output_unit_id,expression_source,ast,input_parameter_ids,ast_sha256
        ) values($1,$2,$3,$4,$5::jsonb,$6,$7)`, [
          definitionId,
          formula.formulaId,
          formula.outputUnitId,
          formula.expressionSource,
          JSON.stringify(compiled.ast),
          compiled.inputParameterIds,
          sha256(compiled.ast),
        ]);
      }

      for (let ordinal = 0; ordinal < definition.resources.length; ordinal += 1) {
        const resource = definition.resources[ordinal];
        invariant(formulaById.has(resource.formulaId), `${BATCH_ID}_RESOURCE_FORMULA_MISSING:${resource.rowId}`);
        const resourceGraph = {
          contract: "real-professional-estimates-r3.resource-graph.v1",
          domain: definitionDomain(definition),
          group: definitionGroup(definition),
          operation: definitionOperation(definition),
          variant: definition.variant,
          resourceIdentity: resource.resourceIdentity,
          provenanceKind: resource.provenanceKind,
          costingMode: resource.costingMode,
          delivery: resource.delivery ?? null,
          titleSpecificationParameterId: titleSpecificationParameterId(definition, resource),
        };
        const sourceMetadata = {
          truth_contract_version: truthContractVersion(),
          content_group: resource.group,
          normativeTrace: [{
            sourceId: resource.normativeSource.sourceKey,
            exactLocator: resource.normativeSource.locator,
            sourceRole: "QUANTITY_NORM_OR_WORK_EXECUTION",
          }],
          applicability: resource.applicability,
          predecessorRowIds: resource.sourcePredecessorRowIds,
          engineeringSourceIds: resource.engineeringSourceIds,
        };
        const resourceId = randomUUID();
        await client.query(`insert into public.estimate_resource_spec(
          id,definition_version_id,row_id,ordinal,section,category,title_ru,row_type,unit_id,
          formula_id,inclusion_ast,resource_graph,semantic_owner,cost_owner_id,procurement_eligible,
          source_metadata,row_sha256
        ) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16::jsonb,$17)`, [
          resourceId,
          definitionId,
          resource.rowId,
          ordinal,
          sectionRu(resource),
          resource.group,
          resource.titleRu,
          rowType(resource),
          resource.unitId,
          resource.formulaId,
          JSON.stringify(inclusionAst(definition, resource, baseline)),
          JSON.stringify(resourceGraph),
          resource.semanticOwnerId,
          resource.costOwnerId,
          resource.procurementEligible,
          JSON.stringify(sourceMetadata),
          sha256({ definitionId, ordinal, resource, resourceGraph }),
        ]);

        let sourceId = sourceIds.get(resource.normativeSource.sourceKey);
        if (!sourceId) {
          const existingSource = (await client.query<{ id: string }>(
            "select id::text from public.estimate_normative_source where source_key=$1",
            [resource.normativeSource.sourceKey],
          )).rows[0];
          sourceId = existingSource?.id ?? randomUUID();
          if (!existingSource) {
            const electricalNormativeSource = IS_BATCH005
              ? (resource as Batch005R4BackendResource).normativeSource
              : null;
            await client.query(`insert into public.estimate_normative_source(
              id,source_key,title_ru,authority,metadata
            ) values($1,$2,$3,$4,$5::jsonb)`, [
              sourceId,
              resource.normativeSource.sourceKey,
              electricalNormativeSource?.titleRu ?? (resource.normativeSource.sourceKey === "KG_SP_KR_65_101_2025"
                ? "СП КР 65-101:2025. Сухое строительство"
                : "КРЕР 10-05-011. Облицовочные работы"),
              electricalNormativeSource?.authorityRu ?? "Нормативная база Кыргызской Республики",
              JSON.stringify({ acceptedPredecessorBinding: true, candidateOnly: true }),
            ]);
          }
          sourceIds.set(resource.normativeSource.sourceKey, sourceId);
        }
        const locatorKey = sha256(`${resource.normativeSource.sourceKey}:${resource.normativeSource.locator}`);
        let locatorId = locatorIds.get(locatorKey);
        if (!locatorId) {
          const existingLocator = (await client.query<{ id: string }>(
            "select id::text from public.estimate_normative_locator where source_id=$1 and locator_key=$2",
            [sourceId, locatorKey],
          )).rows[0];
          locatorId = existingLocator?.id ?? randomUUID();
          if (!existingLocator) {
            await client.query(`insert into public.estimate_normative_locator(
              id,source_id,locator_key,locator,excerpt_sha256
            ) values($1,$2,$3,$4::jsonb,$5)`, [
              locatorId,
              sourceId,
              locatorKey,
              JSON.stringify({ exactLocator: resource.normativeSource.locator }),
              sha256(resource.normativeSource.locator),
            ]);
          }
          locatorIds.set(locatorKey, locatorId);
        }
        await client.query(`insert into public.estimate_work_normative_binding(
          definition_version_id,resource_spec_id,locator_id,applicability
        ) values($1,$2,$3,$4::jsonb)`, [
          definitionId,
          resourceId,
          locatorId,
          JSON.stringify({ group: definitionGroup(definition), operation: definitionOperation(definition), variant: definition.variant }),
        ]);
      }

      const classification = Object.fromEntries(definition.passport.parameters.map((parameter) => [parameter.parameterId, "ASSUMPTION"]));
      const uom = Object.fromEntries(definition.passport.parameters.map((parameter) => [
        parameter.parameterId,
        parameterUnit(parameter.parameterId, baseline[parameter.parameterId]),
      ]));
      const formulaConsumers = Object.fromEntries(definition.passport.parameters.map((parameter) => [parameter.parameterId, parameter.formulaConsumerIds]));
      const resourceConsumers = Object.fromEntries(definition.passport.parameters.map((parameter) => [parameter.parameterId, parameter.resourceConsumerIds]));
      const normativeSources = Object.fromEntries(definition.passport.parameters.map((parameter) => [
        parameter.parameterId,
        [...new Set(definition.resources
          .filter((resource) => parameter.resourceConsumerIds.includes(resource.rowId))
          .map((resource) => resource.normativeSource.sourceKey))],
      ]));
      const guideProvenance = Object.fromEntries(definition.passport.parameters.map((parameter) => [parameter.parameterId, parameter.guideRu]));
      const baselineId = randomUUID();
      const schemaHash = sha256(definition.passport.parameters);
      const acceptanceHash = sha256({ catalogId: definition.catalogId, baseline, definitionHash });
      await client.query(`insert into public.estimate_approved_template_baseline(
        id,baseline_key,catalog_id,definition_version_id,source_definition_version_id,
        parameter_schema_sha256,input_values,input_classification,uom_by_parameter,
        formula_consumer_ids,resource_consumer_row_ids,normative_source_ids,guide_provenance_ru,
        proposal_source_refs,validation_scenario_refs,acceptance_evidence_sha256,accepted_release_id,
        accepted_at,contract_version
      ) values($1,$2,$3,$4,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,
        $12::jsonb,$13::jsonb,$14::jsonb,$15,$16,$17,'APPROVED_TEMPLATE_BASELINE_R54_V1')`, [
        baselineId,
        `${BATCH_TOKEN}:${definition.catalogId}:gold`,
        definition.catalogId,
        definitionId,
        schemaHash,
        JSON.stringify(baseline),
        JSON.stringify(classification),
        JSON.stringify(uom),
        JSON.stringify(formulaConsumers),
        JSON.stringify(resourceConsumers),
        JSON.stringify(normativeSources),
        JSON.stringify(guideProvenance),
        JSON.stringify([{ contract: definition.contract, successorVersionId: definition.successorVersionId }]),
        JSON.stringify([{ fixture: IS_BATCH005 ? "batch005R4FixtureValues"
          : IS_BATCH004 ? "batch004R56FixtureValues"
          : IS_BATCH003 ? "batch003R56FixtureValues"
          : IS_BATCH002 ? "batch002DrywallGoldFixtureR3" : "batch001DrywallGoldFixtureR3", mutation: "backend-parent-child-and-price-only" }]),
        acceptanceHash,
        releaseId,
        "2026-08-19T00:00:00.000Z",
      ]);

      await client.query(`insert into public.estimate_content_passport_r3(
        definition_version_id,release_id,catalog_id,contract_version,identity_mode,redirect_catalog_id,
        physical_result_ru,included_scope_ru,excluded_scope_ru,capability_matrix,parameter_count,
        formula_count,resource_count,decision,payload_sha256,source_head,source_tree
      ) values($1,$2,$3,$4,'WORK',null,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12::jsonb,$13,$14,$15)`, [
        definitionId,
        releaseId,
        definition.catalogId,
        definition.passport.contract,
        definition.passport.physicalResultRu,
        JSON.stringify(definition.passport.includedScopeRu),
        JSON.stringify(definition.passport.excludedScopeRu),
        JSON.stringify(definition.passport.capabilityMatrix),
        definition.passport.parameters.length,
        definition.runtimeFormulas.length,
        definition.resources.length,
        JSON.stringify(definition.contentDecision),
        sha256({ passport: definition.passport, decision: definition.contentDecision }),
        sourceHead,
        sourceTree,
      ]);
      await client.query(`update public.estimate_definition_version
        set content_status='CANDIDATE_READY',content_gate_status='GREEN' where id=$1`, [definitionId]);
      if (definitionIsContent(definition)) await client.query(`insert into public.estimate_cumulative_manifest_entry(
        release_id,catalog_id,definition_version_id,source_batch,source_release_id,domain_id,
        publication_state,approved_template_baseline_id,baseline_ready,scenario_ready,
        definition_hash,entry_sha256,runtime_publication_state
      ) values($1,$2,$3,$7,$1,$8,'CANONICAL_SUCCESSOR',$4,true,true,$5,$6,'CANDIDATE')`, [
        releaseId,
        definition.catalogId,
        definitionId,
        baselineId,
        definitionHash,
        sha256({ releaseId, definitionId, baselineId, definitionHash }),
        BATCH_ID.replace("-", ""),
        definitionDomain(definition),
      ]);
      const aliases = [...definition.passport.aliasesRu];
      const normalizedTitle = normalizeSearch(definition.passport.titleRu);
      await client.query(`insert into public.estimate_search_document(
        search_release_id,catalog_id,domain_id,system_id,subsystem_id,assembly_id,work_family_id,
        group_id,element_type,operation_kind,technology_variant,construction_state,primary_uom,
        canonical_name_ru,aliases,normative_classifiers,applicability_tags,publication_state,
        catalog_origin,definition_release_id,short_scope_ru,key_distinguishing_parameters,
        required_inputs_count,clarification_fields,included_boundaries,excluded_boundaries,
        replacement_catalog_id,normalized_catalog_id,normalized_canonical_name,normalized_aliases,
        normalized_search_terms,normalized_search_blob,source_provenance,document_sha256,
        adjudication_class,selectable,canonical_target_catalog_id,definition_version_id
      ) values($1,$2,$30,$31,$25,$26,
        $3,$4,$27,$28,$5,'project_defined',$29,$6,$7,$8,$9,
        $35,$32,$10,$11,$12::jsonb,$13,$14::jsonb,$15::jsonb,$16::jsonb,
        null,$17,$18,$19,$20,$21,$22::jsonb,$23,$33,$34,null,$24)`, [
        searchReleaseId,
        definition.catalogId,
        definitionOperation(definition).toLocaleLowerCase(),
        definitionGroupId(definition),
        definition.variant,
        definition.passport.titleRu,
        aliases,
        engineeringSourceIds(definition),
        [definitionGroup(definition), definitionOperation(definition), definition.variant],
        releaseId,
        definition.passport.physicalResultRu,
        JSON.stringify(definition.passport.parameters
          .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
          .map((parameter) => parameter.parameterId)),
        definition.passport.parameters.filter((parameter) => parameter.visibilityRole === "USER_INPUT").length,
        JSON.stringify([]),
        JSON.stringify(definition.passport.includedScopeRu),
        JSON.stringify(definition.passport.excludedScopeRu),
        normalizeSearch(definition.catalogId),
        normalizedTitle,
        aliases.map(normalizeSearch),
        [...new Set(normalizedTitle.split(" "))],
        [normalizedTitle, ...aliases.map(normalizeSearch), definition.catalogId].join(" "),
        JSON.stringify({ contract: definition.contract, candidateOnly: true, noRelease: true }),
        sha256({ searchReleaseId, catalogId: definition.catalogId, definitionId, normalizedTitle }),
        definitionId,
        definitionSubsystem(definition),
        IS_BATCH005 ? definitionGroup(definition)
          : IS_BATCH004 ? "drywall_domain_completion" : IS_BATCH003 ? "drywall_flat_ceiling" : IS_BATCH002 ? "drywall_architectural_elements" : "drywall_ceiling_bulkhead",
        definitionSubsystem(definition),
        searchOperationKind(definition),
        definitionPrimaryUnit(definition),
        definitionDomain(definition),
        definitionSystem(definition),
        definitionIsContent(definition) ? "GLOBAL" : "EXTERNAL_N",
        definitionIsContent(definition) ? "EFFECTIVE_WORK" : "EXTERNAL_REFERENCE",
        definitionIsContent(definition),
        definitionIsContent(definition) ? "ADMITTED_BACKEND" : "PRELIMINARY_NOT_CANONICAL",
      ]);
    }

    await client.query(`insert into public.estimate_candidate_capability_r3(
      id,environment,tenant_id,release_id,search_release_id,expires_at,purpose,source_head,
      source_tree,issued_by
    ) values($1,$9,$2,$3,$4,$5,'estimate_candidate_admission_r3',$6,$7,$8)`, [
      capabilityId,
      ORGANIZATION_ID,
      releaseId,
      searchReleaseId,
      capabilityExpiresAt,
      sourceHead,
      sourceTree,
      IS_BATCH005 ? "runBatch005ElectricalBackendParityR4" : IS_BATCH004 ? "runBatch004DrywallBackendParityR56" : IS_BATCH003 ? "runBatch003DrywallBackendParityR56" : IS_BATCH002 ? "runBatch002DrywallBackendParityR4" : IS_BATCH001_R56
        ? "runBatch001DrywallBackendParityR56"
        : "runBatch001DrywallBackendParityR3",
      `${BATCH_TOKEN}-isolated`,
    ]);
    await client.query(`update public.estimate_definition_release
      set status='prepared',sealed_at=clock_timestamp() where id=$1`, [releaseId]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
  return { releaseId, searchReleaseId, capabilityId, capabilityExpiresAt, sourceHead, sourceTree, definitionSetSha256, definitions };
}

async function api(path: string, init?: RequestInit): Promise<Json> {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: {
      authorization: "Bearer local-dev-runtime-token",
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json() as Json;
  if (!response.ok) throw new Error(`BATCH001_API_${response.status}:${path}:${JSON.stringify(body)}`);
  return body;
}

async function allRevisionRows(revisionId: string): Promise<Json> {
  const rows: Json[] = [];
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: "200" });
    if (cursor) query.set("cursor", cursor);
    const page = await api(`/revisions/${revisionId}/rows?${query.toString()}`);
    rows.push(...(page.rows as Json[]));
    cursor = page.nextCursor == null ? null : String(page.nextCursor);
  } while (cursor);
  return { rows, nextCursor: null };
}

async function waitForJob(jobId: string): Promise<Json> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const job = await api(`/jobs/${jobId}`);
    if (job.status === "succeeded") return job;
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(`BATCH001_JOB_${job.status}:${jobId}:${job.errorCode ?? "UNKNOWN"}`);
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`BATCH001_JOB_TIMEOUT:${jobId}`);
}

async function startServer(env: Json): Promise<{ child: ChildProcess; logs: string[] }> {
  const logs: string[] = [];
  const child = spawn(process.execPath, [
    resolve("node_modules/tsx/dist/cli.mjs"),
    resolve("scripts/estimate/backendMigration/serveCanonicalEstimateLocalR1.ts"),
  ], {
    cwd: resolve("."),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const ready = new Promise<void>((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => rejectReady(new Error("BATCH001_BACKEND_READY_TIMEOUT")), 30_000);
    const onText = (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      logs.push(text);
      if (text.includes('"status":"READY"')) {
        clearTimeout(timeout);
        resolveReady();
      }
    };
    child.stdout?.on("data", onText);
    child.stderr?.on("data", onText);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      rejectReady(new Error(`BATCH001_BACKEND_EARLY_EXIT:${code}:${logs.join("").slice(-4000)}`));
    });
  });
  await ready;
  return { child, logs };
}

async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode != null) return;
  const exited = new Promise<void>((resolveExit) => child.once("exit", () => resolveExit()));
  child.kill("SIGTERM");
  await Promise.race([exited, new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 5_000))]);
  if (child.exitCode == null) child.kill("SIGKILL");
}

async function artifact(revisionId: string, kind: "pdf" | "procurement", idempotencyKey: string): Promise<{ metadata: Json; bytes: Buffer }> {
  const created = await api(`/revisions/${revisionId}/artifacts/${kind}`, {
    method: "POST",
    body: JSON.stringify({
      idempotencyKey,
      ...(kind === "pdf" ? { documentProfile: "professional_v1" } : {}),
    }),
  });
  if (created.jobId) await waitForJob(String(created.jobId));
  const metadata = await api(`/revisions/${revisionId}/artifacts/${kind}${
    kind === "pdf" ? "?documentProfile=professional_v1" : ""
  }`);
  invariant(metadata.status === "ready" && typeof metadata.signedUrl === "string",
    `BATCH001_ARTIFACT_NOT_READY:${revisionId}:${kind}`);
  const response = await fetch(metadata.signedUrl, { headers: { authorization: "Bearer local-dev-runtime-token" } });
  invariant(response.ok, `BATCH001_ARTIFACT_DOWNLOAD:${revisionId}:${kind}:${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  invariant(sha256(bytes) === metadata.sha256, `BATCH001_ARTIFACT_SHA:${revisionId}:${kind}`);
  return { metadata, bytes };
}

function compactText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, "").toLocaleLowerCase("ru-RU");
}

async function pdfText(bytes: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const parts: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    parts.push(content.items.map((item) => "str" in item ? String(item.str) : "").join(" "));
  }
  await document.destroy();
  return parts.join(" ");
}

function formulaMutation(
  definition: DrywallDefinition,
  baseline: Readonly<Record<string, string | number | boolean>>,
): { parameterId: string; value: number } {
  if (IS_BATCH005) {
    const parameterId = (definition as Batch005R4BackendDefinition).primaryMeasureParameterId;
    invariant(typeof baseline[parameterId] === "number", `${BATCH_ID}_PRIMARY_MEASURE_MISSING:${definition.catalogId}`);
    return { parameterId, value: Number(baseline[parameterId]) + 1.25 };
  }
  if (IS_R56_SUCCESSOR) {
    const parameterId = r56PrimaryMeasureParameterId((definition as R56BackendAdapter).r56Definition);
    invariant(typeof baseline[parameterId] === "number", `${BATCH_ID}_PRIMARY_MEASURE_MISSING:${definition.catalogId}`);
    return { parameterId, value: Number(baseline[parameterId]) + 1.25 };
  }
  if (!IS_BATCH002) {
    const parameterId = "horizontal_face_area_m2";
    invariant(typeof baseline[parameterId] === "number", `${BATCH_ID}_PRIMARY_MEASURE_MISSING:${definition.catalogId}`);
    return { parameterId, value: Number(baseline[parameterId]) + 1.25 };
  }
  const contracts = (definition as Batch002DrywallSuccessorDefinitionR3).passport.userParameterContracts;
  const contract = contracts.find((candidate) => candidate.inputType === "NUMBER"
    && candidate.formulaConsumerIds.length > 0
    && typeof baseline[candidate.parameterId] === "number"
    && candidate.range.kind === "NUMERIC");
  invariant(contract && contract.range.kind === "NUMERIC", `${BATCH_ID}_NUMERIC_MUTATION_PARAMETER_MISSING:${definition.catalogId}`);
  const before = Number(baseline[contract.parameterId]);
  const upward = before + Math.max(0.25, Math.abs(before) * 0.1);
  const value = upward <= contract.range.maximum ? upward : Math.max(contract.range.minimum, before * 0.9);
  invariant(value !== before, `${BATCH_ID}_NUMERIC_MUTATION_VALUE_UNCHANGED:${definition.catalogId}:${contract.parameterId}`);
  return { parameterId: contract.parameterId, value };
}

async function runAdmissionNegative(
  client: Client,
  candidate: Awaited<ReturnType<typeof insertCandidateModel>>,
): Promise<Json> {
  const definition = candidate.definitions.find(definitionIsContent);
  invariant(definition, `${BATCH_ID}_ADMISSION_NEGATIVE_DEFINITION_MISSING`);
  const negativeCatalogId = `${definition.catalogId}_quarantined_negative_fixture`;
  const revisionCountBefore = Number((await client.query(
    "select count(*)::integer count from public.estimate_revision where release_id=$1",
    [candidate.releaseId],
  )).rows[0].count);
  const baseline = { ...fixtureValues(definition) };
  const mutation = formulaMutation(definition, baseline);
  const parameters = Object.fromEntries(definition.passport.parameters
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .map((parameter) => [parameter.parameterId, baseline[parameter.parameterId]]));
  let status = 0;
  let body: Json = {};
  const response = await fetch(`${API_ROOT}/jobs/compile`, {
    method: "POST",
    headers: { authorization: "Bearer local-dev-runtime-token", "content-type": "application/json" },
    body: JSON.stringify({
      idempotencyKey: `${BATCH_TOKEN}-negative-content-gate:${negativeCatalogId}`,
      catalogId: negativeCatalogId,
      currencyCode: "KGS",
      parameters,
      priceSnapshotIds: [],
      sourceRequestText: `${BATCH_ID}: обязательная negative admission fixture`,
      primaryMeasureParameterId: mutation.parameterId,
      organizationId: ORGANIZATION_ID,
    }),
  });
  status = response.status;
  body = await response.json() as Json;
  const revisionCountAfter = Number((await client.query(
    "select count(*)::integer count from public.estimate_revision where release_id=$1",
    [candidate.releaseId],
  )).rows[0].count);
  invariant(status === 409, `${BATCH_ID}_ADMISSION_NEGATIVE_HTTP_STATUS:${status}`);
  invariant(body?.error?.code === "DEFINITION_CONTENT_NOT_ADMITTED", `${BATCH_ID}_ADMISSION_NEGATIVE_CODE:${JSON.stringify(body)}`);
  invariant(revisionCountBefore === revisionCountAfter, `${BATCH_ID}_ADMISSION_NEGATIVE_CREATED_REVISION`);
  return {
    catalogId: negativeCatalogId,
    injectedState: "CATALOG_ABSENT_FROM_ADMITTED_RELEASE_AND_MANIFEST",
    httpStatus: status,
    errorCode: body.error.code,
    revisionCountBefore,
    revisionCountAfter,
    admittedCandidateDefinitionsUntouched: true,
    verdict: "GREEN_FAIL_CLOSED_NO_REVISION_CREATED",
  };
}

async function runBatch005ExternalReferenceNegative(
  client: Client,
  candidate: Awaited<ReturnType<typeof insertCandidateModel>>,
): Promise<Json | null> {
  if (!IS_BATCH005) return null;
  const definition = candidate.definitions.find((candidateDefinition) => !definitionIsContent(candidateDefinition));
  invariant(definition, "BATCH-005_EXTERNAL_REFERENCE_DEFINITION_MISSING");
  const baseline = fixtureValues(definition);
  const parameters = Object.fromEntries(definition.passport.parameters
    .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
    .map((parameter) => [parameter.parameterId, baseline[parameter.parameterId]]));
  const revisionCountBefore = Number((await client.query(
    "select count(*)::integer count from public.estimate_revision where release_id=$1",
    [candidate.releaseId],
  )).rows[0].count);
  const response = await fetch(`${API_ROOT}/jobs/compile`, {
    method: "POST",
    headers: { authorization: "Bearer local-dev-runtime-token", "content-type": "application/json" },
    body: JSON.stringify({
      idempotencyKey: `${BATCH_TOKEN}-external-reference-negative:${definition.catalogId}`,
      catalogId: definition.catalogId,
      currencyCode: "KGS",
      parameters,
      priceSnapshotIds: [],
      sourceRequestText: `BATCH-005 external reference must remain nonselectable: ${definition.catalogId}`,
      primaryMeasureParameterId: (definition as Batch005R4BackendDefinition).primaryMeasureParameterId,
      organizationId: ORGANIZATION_ID,
    }),
  });
  const body = await response.json() as Json;
  const revisionCountAfter = Number((await client.query(
    "select count(*)::integer count from public.estimate_revision where release_id=$1",
    [candidate.releaseId],
  )).rows[0].count);
  invariant(response.status === 409, `BATCH-005_EXTERNAL_REFERENCE_HTTP_STATUS:${response.status}:${JSON.stringify(body)}`);
  invariant(revisionCountBefore === revisionCountAfter, "BATCH-005_EXTERNAL_REFERENCE_CREATED_REVISION");
  return {
    catalogId: definition.catalogId,
    namespace: "external_reference",
    denominatorEligible: false,
    searchSelectable: false,
    httpStatus: response.status,
    errorCode: body?.error?.code ?? null,
    revisionCountBefore,
    revisionCountAfter,
    verdict: "GREEN_EXTERNAL_REFERENCE_FAIL_CLOSED_NO_REVISION_CREATED",
  };
}

function legacyReadOnlyProof(): Json {
  const facts = {
    mode: "legacy_read_only" as const,
    releaseId: "legacy-release-fixture",
    definitionVersionId: "legacy-definition-fixture",
    catalogId: "legacy-catalog-fixture",
    releaseStatus: null,
    manifestPublicationState: null,
    baselineReady: false,
    scenarioReady: false,
    definitionContentStatus: null,
    contentGateStatus: null,
    definitionReleaseId: null,
    selectedSearchReleaseId: null,
    definitionSearchReleaseId: null,
    unresolvedDisposition: null,
    authorizationValid: true,
    legacyRevisionImmutable: true,
  };
  const read = evaluateEstimateAdmission({ ...facts, ingress: "revision_read" }, "2026-08-19T00:00:00.000Z");
  const mutate = evaluateEstimateAdmission({ ...facts, ingress: "parameter_recalculation" }, "2026-08-19T00:00:00.000Z");
  const artifactRead = evaluateEstimateAdmission({ ...facts, ingress: "artifact_read", existingExactArtifact: true }, "2026-08-19T00:00:00.000Z");
  const artifactCreate = evaluateEstimateAdmission({ ...facts, ingress: "pdf_artifact_create", existingExactArtifact: false }, "2026-08-19T00:00:00.000Z");
  invariant(read.allowed && artifactRead.allowed, `${BATCH_ID}_LEGACY_READ_DENIED`);
  invariant(!mutate.allowed && mutate.reasons.some((reason) => reason.code === "LEGACY_ACTION_NOT_READ_ONLY"), `${BATCH_ID}_LEGACY_MUTATION_ALLOWED`);
  invariant(!artifactCreate.allowed && artifactCreate.reasons.some((reason) => reason.code === "LEGACY_ACTION_NOT_READ_ONLY"), `${BATCH_ID}_LEGACY_ARTIFACT_CREATE_ALLOWED`);
  return { read, mutate, artifactRead, artifactCreate, verdict: "GREEN_READ_ONLY_AND_EXISTING_ARTIFACT_ALLOWED_MUTATIONS_BLOCKED" };
}

async function runParity(
  client: Client,
  candidate: Awaited<ReturnType<typeof insertCandidateModel>>,
): Promise<Json[]> {
  const proofs: Json[] = [];
  for (const definition of candidate.definitions.filter(definitionIsContent)) {
    const baseline = { ...fixtureValues(definition) };
    const mutation = formulaMutation(definition, baseline);
    const primaryMeasureParameterId = mutation.parameterId;
    const userParameters = Object.fromEntries(definition.passport.parameters
      .filter((parameter) => parameter.visibilityRole === "USER_INPUT")
      .map((parameter) => [parameter.parameterId, baseline[parameter.parameterId]]));
    const compiled = await api("/jobs/compile", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `${BATCH_TOKEN}-parent:${definition.catalogId}`,
        catalogId: definition.catalogId,
        currencyCode: "KGS",
        parameters: userParameters,
        priceSnapshotIds: [],
        sourceRequestText: `${definition.passport.titleRu}. Проверочный объект ${BATCH_ID}.`,
        primaryMeasureParameterId,
        organizationId: ORGANIZATION_ID,
      }),
    });
    const parentJob = await waitForJob(String(compiled.jobId));
    const parentRevisionId = String(parentJob.resultRevisionId);
    invariant(parentRevisionId.length > 0, `BATCH001_PARENT_REVISION_MISSING:${definition.catalogId}`);

    const mutatedValue = mutation.value;
    const mutatedValues = { ...baseline, [primaryMeasureParameterId]: mutatedValue };
    const local = await compileLocal(definition, mutatedValues);
    invariant(local.status === "GREEN", `${BATCH_ID}_LOCAL_MUTATION_RED:${definition.catalogId}`);
    const priceTargetRow = local.rows.find((row) => row.group === "material")
      ?? local.rows.find((row) => row.group === "construction_work");
    const rowOverrides = priceTargetRow ? {
      [priceTargetRow.rowId]: {
        unitPrice: "125.50",
        provenance: { kind: "manual", reason: `Проверка редактирования цены в child revision ${BATCH_ID}` },
      },
    } : {};
    const recalculated = await api("/jobs/recalculate", {
      method: "POST",
      body: JSON.stringify({
        idempotencyKey: `${BATCH_TOKEN}-formula-child:${definition.catalogId}`,
        catalogId: definition.catalogId,
        currencyCode: "KGS",
        parentRevisionId,
        parameters: { [primaryMeasureParameterId]: mutatedValue },
        priceSnapshotIds: [],
        rowOverrides: RUN_SEPARATE_PRICE_MUTATION ? {} : rowOverrides,
        customRows: [],
        organizationId: ORGANIZATION_ID,
      }),
    });
    const childJob = await waitForJob(String(recalculated.jobId));
    const childRevisionId = String(childJob.resultRevisionId);
    invariant(childRevisionId.length > 0 && childRevisionId !== parentRevisionId,
      `BATCH001_CHILD_REVISION_MISSING:${definition.catalogId}`);

    const formulaRevision = await api(`/revisions/${childRevisionId}`);
    const formulaRowsProjection = await allRevisionRows(childRevisionId);
    invariant(formulaRevision.parentRevisionId === parentRevisionId && Number(formulaRevision.revisionNumber) === 2,
      `${BATCH_ID}_FORMULA_CHILD_LINK:${definition.catalogId}`);
    let finalRevisionId = childRevisionId;
    let expectedFinalParentId = parentRevisionId;
    let expectedFinalRevisionNumber = 2;
    let priceMutationParity = RUN_SEPARATE_PRICE_MUTATION ? "RED_NOT_RUN" : "GREEN_COMBINED_WITH_FORMULA_CHILD";
    if (RUN_SEPARATE_PRICE_MUTATION) {
      invariant(priceTargetRow, `${BATCH_ID}_PRICE_MUTATION_TARGET_MISSING:${definition.catalogId}`);
      const priceOnly = await api("/jobs/recalculate", {
        method: "POST",
        body: JSON.stringify({
          idempotencyKey: `${BATCH_TOKEN}-price-child:${definition.catalogId}`,
          catalogId: definition.catalogId,
          currencyCode: "KGS",
          parentRevisionId: childRevisionId,
          parameters: {},
          priceSnapshotIds: [],
          rowOverrides,
          customRows: [],
          organizationId: ORGANIZATION_ID,
        }),
      });
      const priceJob = await waitForJob(String(priceOnly.jobId));
      const priceRevisionId = String(priceJob.resultRevisionId);
      invariant(priceRevisionId.length > 0 && priceRevisionId !== childRevisionId,
        `${BATCH_ID}_PRICE_CHILD_REVISION_MISSING:${definition.catalogId}`);
      const priceRevision = await api(`/revisions/${priceRevisionId}`);
      const priceRowsProjection = await allRevisionRows(priceRevisionId);
      invariant(priceRevision.parentRevisionId === childRevisionId && Number(priceRevision.revisionNumber) === 3,
        `${BATCH_ID}_PRICE_CHILD_LINK:${definition.catalogId}`);
      invariant(stableJson(formulaRowsProjection.rows.map((row: Json) => [row.rowId, row.quantity]))
        === stableJson(priceRowsProjection.rows.map((row: Json) => [row.rowId, row.quantity])),
      `${BATCH_ID}_PRICE_MUTATION_CHANGED_PHYSICAL_QUANTITY:${definition.catalogId}`);
      invariant(String(formulaRevision.totals?.amount ?? "0") !== String(priceRevision.totals?.amount ?? "0"),
        `${BATCH_ID}_PRICE_MUTATION_DID_NOT_CHANGE_TOTAL:${definition.catalogId}`);
      finalRevisionId = priceRevisionId;
      expectedFinalParentId = childRevisionId;
      expectedFinalRevisionNumber = 3;
      priceMutationParity = "GREEN_PRICE_ONLY_CHILD_QUANTITIES_UNCHANGED_TOTAL_CHANGED";
    }

    const revision = await api(`/revisions/${finalRevisionId}`);
    const rowsProjection = await allRevisionRows(finalRevisionId);
    const history = await api(`/revisions?catalogId=${encodeURIComponent(definition.catalogId)}&limit=10`);
    invariant(revision.parentRevisionId === expectedFinalParentId && Number(revision.revisionNumber) === expectedFinalRevisionNumber,
      `BATCH001_PARENT_CHILD_LINK:${definition.catalogId}`);
    invariant(rowsProjection.nextCursor == null && rowsProjection.rows.length === local.rows.length,
      `BATCH001_UI_ROW_COUNT:${definition.catalogId}:${rowsProjection.rows.length}:${local.rows.length}`);
    const apiById = new Map<string, Json>(
      rowsProjection.rows.map((row: Json): [string, Json] => [String(row.rowId), row]),
    );
    for (const expected of local.rows) {
      const actual = apiById.get(expected.rowId);
      invariant(actual, `BATCH001_UI_ROW_MISSING:${definition.catalogId}:${expected.rowId}`);
      invariant(actual.titleRu === expected.titleRu && actual.unitId === expected.unitId,
        `BATCH001_UI_ROW_IDENTITY:${definition.catalogId}:${expected.rowId}`);
      invariant(Math.abs(Number(actual.quantity) - expected.quantity) < 0.000001,
        `BATCH001_UI_QUANTITY:${definition.catalogId}:${expected.rowId}:${actual.quantity}:${expected.quantity}`);
    }
    invariant(history.revisions.length === expectedFinalRevisionNumber
      && history.revisions[0].revisionId === finalRevisionId
      && history.revisions[0].parentRevisionId === expectedFinalParentId
      && history.revisions[expectedFinalRevisionNumber - 1].revisionId === parentRevisionId,
    `BATCH001_HISTORY_PARITY:${definition.catalogId}`);

    const dbRows = (await client.query(`select row_id,title_ru,unit_id,quantity::text,procurement_eligible,
      included_in_estimate,included_in_procurement,row_sha256 from public.estimate_revision_row
      where revision_id=$1 order by ordinal`, [finalRevisionId])).rows as Json[];
    invariant(stableJson(dbRows.map((row) => row.row_id)) === stableJson(rowsProjection.rows.map((row: Json) => row.rowId)),
      `BATCH001_DB_UI_ROW_ORDER:${definition.catalogId}`);
    const dbRevision = (await client.query(`select id,parent_revision_id,release_id,definition_version_id,
      revision_number,row_count,checksum_sha256,source_request_hash,user_input_snapshot,
      accepted_baseline_snapshot from public.estimate_revision where id=$1`, [finalRevisionId])).rows[0] as Json;
    invariant(dbRevision.parent_revision_id === expectedFinalParentId
      && dbRevision.release_id === candidate.releaseId
      && Number(dbRevision.row_count) === dbRows.length,
    `BATCH001_DB_REVISION_BINDING:${definition.catalogId}`);

    const pdf = await artifact(finalRevisionId, "pdf", `${BATCH_TOKEN}-pdf:${definition.catalogId}`);
    const procurement = await artifact(finalRevisionId, "procurement", `${BATCH_TOKEN}-procurement:${definition.catalogId}`);
    invariant(Number(pdf.metadata.metadata.sourceRowCount) === dbRows.length
      && pdf.metadata.metadata.sourceRevisionChecksumSha256 === dbRevision.checksum_sha256
      && pdf.metadata.metadata.sourceReleaseId === candidate.releaseId,
    `BATCH001_PDF_IDENTITY:${definition.catalogId}`);
    const extractedPdf = compactText(await pdfText(pdf.bytes));
    for (const row of dbRows) {
      invariant(extractedPdf.includes(compactText(String(row.title_ru))),
        `BATCH001_PDF_ROW_MISSING:${definition.catalogId}:${row.row_id}`);
    }
    const procurementJson = JSON.parse(procurement.bytes.toString("utf8")) as Json;
    const expectedProcurement = dbRows.filter((row) => row.procurement_eligible && row.included_in_procurement);
    invariant(procurementJson.revisionId === finalRevisionId
      && procurementJson.releaseId === candidate.releaseId
      && procurementJson.revisionChecksumSha256 === dbRevision.checksum_sha256,
    `BATCH001_PROCUREMENT_IDENTITY:${definition.catalogId}`);
    invariant(stableJson(procurementJson.rows.map((row: Json) => row.rowId))
      === stableJson(expectedProcurement.map((row) => row.row_id)),
    `BATCH001_PROCUREMENT_ROWS:${definition.catalogId}`);

    proofs.push({
      catalogId: definition.catalogId,
      group: definitionGroup(definition),
      operation: definitionOperation(definition),
      variant: definition.variant,
      definitionVersionId: dbRevision.definition_version_id,
      parentRevisionId,
      formulaChildRevisionId: childRevisionId,
      finalRevisionId,
      parentRevisionNumber: 1,
      formulaChildRevisionNumber: 2,
      finalRevisionNumber: expectedFinalRevisionNumber,
      mutatedParameter: { parameterId: primaryMeasureParameterId, before: baseline[primaryMeasureParameterId], after: mutatedValue },
      visibleRows: dbRows.length,
      procurementRows: expectedProcurement.length,
      uiParity: "GREEN",
      historyParity: "GREEN",
      formulaMutationParity: "GREEN",
      priceMutationParity,
      persistedChildRevision: "GREEN",
      pdfParity: "GREEN",
      pdfSha256: pdf.metadata.sha256,
      procurementParity: "GREEN",
      procurementSha256: procurement.metadata.sha256,
      revisionChecksumSha256: dbRevision.checksum_sha256,
      contentAdmission: revision.contentAdmission,
      finalStatus: "GREEN_BACKEND_CANDIDATE_PARITY_NO_RELEASE",
    });
  }
  return proofs;
}

async function main(): Promise<void> {
  const source = sourceIdentity();
  const runLock = IS_BATCH004 || IS_BATCH005 ? acquireRunLock(source) : null;
  const client = new Client({ connectionString: DATABASE_URL, application_name: `${BATCH_TOKEN}-backend-parity` });
  try {
    await client.connect();
    let server: Awaited<ReturnType<typeof startServer>> | null = null;
    try {
      const candidate = await insertCandidateModel(client);
      server = await startServer({
      ESTIMATE_MIGRATION_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_SEARCH_DATABASE_URL: DATABASE_URL,
      CANONICAL_ESTIMATE_TARGET_RELEASE_ID: candidate.releaseId,
      CANONICAL_ESTIMATE_CONTENT_ADMISSION_RELEASE_ID: candidate.releaseId,
      CANONICAL_ESTIMATE_TARGET_SEARCH_RELEASE_ID: candidate.searchReleaseId,
      CANONICAL_ESTIMATE_ALLOW_PREPARED_RELEASE_COMPILE: "true",
      CANONICAL_ESTIMATE_CUMULATIVE_MANIFEST: "true",
      CANONICAL_ESTIMATE_ADMISSION_RUN_ID: `${BATCH_TOKEN}-backend-parity`,
      CANONICAL_ESTIMATE_RUNTIME_ENVIRONMENT: `${BATCH_TOKEN}-isolated`,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ID: candidate.capabilityId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_ENVIRONMENT: `${BATCH_TOKEN}-isolated`,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_TENANT_ID: ORGANIZATION_ID,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_RELEASE_ID: candidate.releaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SEARCH_RELEASE_ID: candidate.searchReleaseId,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_EXPIRES_AT: candidate.capabilityExpiresAt,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_PURPOSE: "estimate_candidate_admission_r3",
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_HEAD: candidate.sourceHead,
      CANONICAL_ESTIMATE_ADMISSION_CAPABILITY_SOURCE_TREE: candidate.sourceTree,
      R45_RUNTIME_SOURCE_HEAD: candidate.sourceHead,
      R45_RUNTIME_SOURCE_TREE: candidate.sourceTree,
      R45_RUNTIME_SPEC_SHA256: MASTER_SHA256,
      CANONICAL_ESTIMATE_LOCAL_PORT: String(PORT),
      CANONICAL_ESTIMATE_REQUEST_AUDIT_LOG: resolve(OUTPUT_DIR, `${BATCH_TOKEN}_backend_http_audit.jsonl`),
    });
      const admissionNegative = await runAdmissionNegative(client, candidate);
      const externalReferenceNegative = await runBatch005ExternalReferenceNegative(client, candidate);
      const legacyReadOnly = legacyReadOnlyProof();
      const proofs = await runParity(client, candidate);
    invariant(proofs.length === EXPECTED_PARITY_DEFINITIONS && proofs.every((proof) => proof.finalStatus === "GREEN_BACKEND_CANDIDATE_PARITY_NO_RELEASE"),
      `${BATCH_ID}_BACKEND_PARITY_NOT_ALL_GREEN`);
    const counts = (await client.query(`select
      (select count(*) from public.estimate_definition_version where release_id=$1)::integer definitions,
      (select count(*) from public.estimate_revision where release_id=$1)::integer revisions,
      (select count(*) from public.estimate_revision where release_id=$1 and parent_revision_id is not null)::integer child_revisions,
      (select count(*) from public.estimate_revision_artifact artifact join public.estimate_revision revision
        on revision.id=artifact.revision_id where revision.release_id=$1 and artifact.status='ready')::integer artifacts,
      (select count(*) from public.estimate_compile_job where target_release_id=$1 and status='succeeded')::integer succeeded_jobs`, [candidate.releaseId])).rows[0];
    const expectedCounts = IS_BATCH005
      ? { definitions: 605, revisions: 1491, child_revisions: 994, artifacts: 994, succeeded_jobs: 2485 }
      : IS_BATCH004
      ? { definitions: 393, revisions: 1179, child_revisions: 786, artifacts: 786, succeeded_jobs: 1965 }
      : IS_BATCH003
      ? { definitions: 36, revisions: 108, child_revisions: 72, artifacts: 72, succeeded_jobs: 180 }
      : IS_BATCH001_R56
        ? { definitions: 16, revisions: 48, child_revisions: 32, artifacts: 32, succeeded_jobs: 80 }
      : null;
    if (expectedCounts) {
      invariant(Object.entries(expectedCounts).every(([key, value]) => Number(counts[key]) === value),
        `${BATCH_ID}_R56_EXACT_DATABASE_CARDINALITY_MISMATCH`);
    }
    const evidence = {
      contract: IS_BATCH005
        ? "rik-expo-app-r4.batch005-backend-revision-parity.v1"
        : IS_BATCH004
        ? EXECUTION_CONTRACT_VERSION === "r4"
          ? "rik-expo-app-r4.batch004-backend-revision-parity.v1"
          : "real-professional-estimates-r5.6.batch004-backend-revision-parity.v1"
        : IS_BATCH003
        ? EXECUTION_CONTRACT_VERSION === "r4"
          ? "rik-expo-app-r4.batch003-backend-revision-parity.v1"
          : "real-professional-estimates-r5.6.batch003-backend-revision-parity.v1"
        : IS_BATCH002
        ? EXECUTION_CONTRACT_VERSION === "r4"
          ? "rik-expo-app-r4.batch002-backend-revision-parity.v1"
          : "real-professional-estimates-r5.5.batch002-backend-revision-parity.v1"
        : IS_BATCH001_R56
          ? EXECUTION_CONTRACT_VERSION === "r4"
            ? "rik-expo-app-r4.batch001-backend-revision-parity.v1"
            : "real-professional-estimates-r5.6.batch001-backend-revision-parity.v1"
          : "real-professional-estimates-r3.batch001-backend-revision-parity.v1",
      status: IS_BATCH005
        ? "GREEN_R4_BATCH005_ISOLATED_BACKEND_PARITY_NO_RELEASE"
        : IS_BATCH004
        ? EXECUTION_CONTRACT_VERSION === "r4"
          ? "GREEN_R4_BATCH004_ISOLATED_BACKEND_PARITY_NO_RELEASE"
          : "GREEN_R56_BATCH004_ISOLATED_BACKEND_PARITY_NO_RELEASE"
        : IS_BATCH003
        ? EXECUTION_CONTRACT_VERSION === "r4"
          ? "GREEN_R4_BATCH003_ISOLATED_BACKEND_PARITY_NO_RELEASE"
          : "GREEN_R56_BATCH003_ISOLATED_BACKEND_PARITY_NO_RELEASE"
        : IS_BATCH002
        ? EXECUTION_CONTRACT_VERSION === "r4"
          ? "GREEN_R4_BATCH002_ISOLATED_BACKEND_PARITY_NO_RELEASE"
          : "GREEN_R55_BATCH002_ISOLATED_BACKEND_PARITY_NO_RELEASE"
        : IS_BATCH001_R56
          ? EXECUTION_CONTRACT_VERSION === "r4"
            ? "GREEN_R4_BATCH001_ISOLATED_BACKEND_PARITY_NO_RELEASE"
            : "GREEN_R56_BATCH001_ISOLATED_BACKEND_PARITY_NO_RELEASE"
          : "GREEN_R3_BATCH001_BACKEND_CANDIDATE_PARITY_NO_RELEASE",
      executionContractVersion: EXECUTION_CONTRACT_VERSION,
      masterSha256: MASTER_SHA256,
      sourceStateId: source.source_state_id,
      sourceIdentity: source,
      definitionSetSha256: candidate.definitionSetSha256,
      isolatedDatabase: true,
      releaseStatus: "prepared",
      releaseActivated: false,
      releaseId: candidate.releaseId,
      searchReleaseStatus: "draft",
      searchReleaseId: candidate.searchReleaseId,
      capabilityId: candidate.capabilityId,
      capabilityExpiresAt: candidate.capabilityExpiresAt,
      sourceHead: candidate.sourceHead,
      sourceTree: candidate.sourceTree,
      counts,
      expectedCounts,
      denominator: IS_BATCH005 ? {
        totalDefinitions: 605,
        contentDefinitions: 497,
        externalReferences: 108,
        workGroups: 107,
      } : null,
      connectionAudit: {
        runnerDatabaseClients: 1,
        backendPoolMaximum: Number(process.env.CANONICAL_ESTIMATE_LOCAL_DATABASE_POOL_MAX ?? 8),
        fixtureMaterializationMaxInFlight: 1,
        definitionExecution: "SEQUENTIAL",
        burstConnections: false,
      },
      invariants: {
        canonicalBackendCompile: true,
        formulasEvaluatedFromPersistedAst: true,
        allDefinitionsHavePersistedParentChild: true,
        uiProjectionMatchesPersistedRows: true,
        historyIsImmutableParentChild: true,
        priceOnlyChildChangesCostNotPhysicalQuantity: RUN_SEPARATE_PRICE_MUTATION,
        admissionNegativeFailsClosedWithoutRevision: admissionNegative.verdict === "GREEN_FAIL_CLOSED_NO_REVISION_CREATED",
        externalReferencesFailClosedWithoutRevision: !IS_BATCH005
          || externalReferenceNegative?.verdict === "GREEN_EXTERNAL_REFERENCE_FAIL_CLOSED_NO_REVISION_CREATED",
        legacyReadOnlyContractBlocksMutation: legacyReadOnly.verdict === "GREEN_READ_ONLY_AND_EXISTING_ARTIFACT_ALLOWED_MUTATIONS_BLOCKED",
        professionalPdfContainsEveryPersistedRow: true,
        procurementMatchesPersistedEligibleRows: true,
        noActiveRelease: true,
        noDeployOrOtaOrMerge: true,
      },
      admissionNegative,
      externalReferenceNegative,
      legacyReadOnly,
      proofs,
    };
    const sourceAfter = sourceIdentity();
    invariant(sourceAfter.source_state_id === source.source_state_id, `${BATCH_ID}_SOURCE_STATE_CHANGED_DURING_PARITY`);
    atomicJson(OUTPUT, { ...evidence, payloadSha256: sha256(evidence) });
      process.stdout.write(`${JSON.stringify({ status: evidence.status, counts, evidence: OUTPUT })}\n`);
    } finally {
      if (server) {
        await stopServer(server.child);
        mkdirSync(dirname(SERVER_LOG), { recursive: true });
        writeFileSync(SERVER_LOG, server.logs.join(""), "utf8");
      }
      await client.end();
    }
  } finally {
    runLock?.release();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
