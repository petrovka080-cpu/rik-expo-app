import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { selectCanonicalArtifactRows } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract";
import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import {
  buildAllBatch001DrywallSuccessorsR3,
  compileBatch001DrywallSuccessorR3,
  evaluateBatch001DrywallContentPassportR3,
  type Batch001DrywallSuccessorDefinitionR3,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3";
import { batch001DrywallGoldFixtureValuesR3 } from "../batch001008R3/batch001DrywallGoldFixtureR3";
import { compileBatch001R56ThroughSharedCore } from "./batch001R56SharedCoreProjection";
import { buildCanonicalSourceIdentityR56 } from "./canonicalSourceIdentityR56";

const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const ORACLE_PATH = resolve(
  ".release-runtime/real-professional-estimates-r3/evidence/04-repair/batch001/batch001_gold_fixture_compiled_rows.jsonl",
);
const ORACLE_SHA256 = "8eca44e50affd832a7d89d9e596289aee370f9eb499c3d8c1aa30a62cefccf32";
const OUTPUT_DIR = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/09-batch001-r56/static",
);
const REPORT_PATH = resolve(OUTPUT_DIR, "BATCH001_R56_STATIC_RECONCILIATION.json");
const VERDICTS_PATH = resolve(OUTPUT_DIR, "BATCH001_R56_CATALOG_VERDICTS.jsonl");
const FORBIDDEN_TEXT = /(?:worker_h|man_hour|machine_h|входн(?:ой|ого)\s+контрол|журнал|акт\b|испытани|координац|комплект\s+документац|обмер\s+и\s+подтвержден)/iu;
const FORBIDDEN_UNITS = new Set(["worker_h", "man_hour", "machine_h", "test", "document", "service", "connection"]);

type OracleRecord = {
  catalogId: string;
  rows: {
    rowId: string;
    titleRu: string;
    unitId: string;
    quantity: number;
    semanticOwnerId: string;
    costOwnerId: string;
    procurementEligible: boolean;
  }[];
};

function sha256(value: Buffer | string | unknown): string {
  const source = Buffer.isBuffer(value) || typeof value === "string" ? value : canonicalEstimateStableJson(value);
  return createHash("sha256").update(source).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function atomicWrite(path: string, bytes: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, bytes, "utf8");
  renameSync(temporary, path);
}

function readOracle(): Map<string, OracleRecord> {
  const bytes = readFileSync(ORACLE_PATH);
  invariant(sha256(bytes) === ORACLE_SHA256, "BATCH001_R56_ORACLE_IDENTITY_DRIFT");
  const records = bytes.toString("utf8").trim().split("\n").map((line) => JSON.parse(line) as OracleRecord);
  invariant(records.length === 16, `BATCH001_R56_ORACLE_DENOMINATOR:${records.length}`);
  return new Map(records.map((record) => [record.catalogId, record]));
}

function roleVerdicts(definition: Batch001DrywallSuccessorDefinitionR3, visibleRowCount: number) {
  const ordinaryUserChecks = {
    clearPhysicalResult: definition.passport.physicalResultRu.length >= 20,
    russianTitles: definition.resources.every((row) => /[а-яё]/iu.test(row.titleRu)),
    boundedVisibleRows: visibleRowCount > 0 && visibleRowCount <= 32,
    guidedInputs: definition.passport.userParameterContracts.every((contract) => contract.guideRu.length >= 20),
  };
  const estimatorChecks = {
    uniqueSemanticOwners: new Set(definition.passport.semanticOwners).size === definition.resources.length,
    uniqueCostOwners: new Set(definition.passport.costOwners).size === definition.resources.length,
    rangesForEveryVisibleInput: definition.passport.userParameterContracts.length
      === definition.passport.parameters.filter((parameter) => parameter.visibilityRole === "USER_INPUT").length,
    procurementExcludesWork: definition.resources
      .filter((row) => row.procurementEligible)
      .every((row) => row.group === "material" || row.group === "delivery"),
  };
  const engineerChecks = {
    technologySequencePresent: definition.technologyStepsRu.length >= 2,
    dependencyBoundaryDeclared: definition.dependencyRu.length >= 1,
    exactNormativeLocatorPerRow: definition.resources.every((row) => row.normativeSource.locator.length >= 20),
    engineeringSourcePackBound: definition.resources.every((row) => row.engineeringSourceIds.length >= 3),
  };
  const verdict = (checks: Record<string, boolean>) => Object.values(checks).every(Boolean) ? "GREEN" : "RED";
  return [
    { role: "ORDINARY_USER", checks: ordinaryUserChecks, verdict: verdict(ordinaryUserChecks) },
    { role: "ESTIMATOR", checks: estimatorChecks, verdict: verdict(estimatorChecks) },
    { role: "CONSTRUCTION_ENGINEER", checks: engineerChecks, verdict: verdict(engineerChecks) },
  ];
}

async function catalogVerdict(
  definition: Batch001DrywallSuccessorDefinitionR3,
  oracle: OracleRecord,
) {
  const fixture = { ...batch001DrywallGoldFixtureValuesR3(definition) };
  const shared = await compileBatch001R56ThroughSharedCore({ definition, values: fixture });
  const oracleParity = shared.rows.length === oracle.rows.length && oracle.rows.every((row, index) => {
    const actual = shared.rows[index];
    return actual?.row_id === row.rowId
      && actual.title_ru === row.titleRu
      && actual.unit_id === row.unitId
      && actual.procurement_eligible === row.procurementEligible
      && Math.abs(Number(actual.quantity) - row.quantity) < 0.000001;
  });
  const numeric = definition.passport.userParameterContracts.find((contract) => contract.range.kind === "NUMERIC");
  invariant(numeric?.range.kind === "NUMERIC", `BATCH001_R56_NUMERIC_CONTRACT_MISSING:${definition.catalogId}`);
  const below = compileBatch001DrywallSuccessorR3(definition, {
    ...fixture,
    [numeric.parameterId]: numeric.range.minimum - Math.max(1, Math.abs(numeric.range.minimum) + 1),
  });
  const above = compileBatch001DrywallSuccessorR3(definition, {
    ...fixture,
    [numeric.parameterId]: numeric.range.maximum + Math.max(1, Math.abs(numeric.range.maximum) * 0.01),
  });
  const mutatedFixture = {
    ...fixture,
    horizontal_face_area_m2: Number(fixture.horizontal_face_area_m2) + 25,
  };
  const mutated = await compileBatch001R56ThroughSharedCore({ definition, values: mutatedFixture });
  const beforeById = new Map(shared.rows.map((row) => [row.row_id, row.quantity]));
  const mutationChangedRows = mutated.rows.filter((row) => beforeById.get(row.row_id) !== row.quantity).map((row) => row.row_id);
  const source = definition.passport.resources[0]!;
  const foreignRow = {
    ...source,
    rowId: `${definition.catalogId}:successor-r56:material:foreign_concrete`,
    titleRu: "Бетонная смесь для монолитного фундамента",
    semanticOwnerId: `${definition.catalogId}:successor-r56:semantic:foreign_concrete`,
    costOwnerId: `${definition.catalogId}:successor-r56:cost:foreign_concrete`,
    procurementOwnerId: `${definition.catalogId}:successor-r56:procurement:foreign_concrete`,
    resourceIdentity: `${definition.catalogId}:material:foreign_concrete`,
  };
  const negative = evaluateBatch001DrywallContentPassportR3({
    ...definition.passport,
    resources: [...definition.passport.resources, foreignRow],
    semanticOwners: [...definition.passport.semanticOwners, foreignRow.semanticOwnerId],
    costOwners: [...definition.passport.costOwners, foreignRow.costOwnerId],
    procurementOwners: [...definition.passport.procurementOwners, foreignRow.procurementOwnerId],
  });
  const artifactSelection = selectCanonicalArtifactRows(shared.rows);
  const roles = roleVerdicts(definition, shared.rows.length);
  const criteria = {
    physicalScope: definition.passport.physicalResultRu.length >= 20
      && definition.passport.includedScopeRu.length > 0 && definition.passport.excludedScopeRu.length > 0,
    technologySequence: definition.technologyStepsRu.length >= 2,
    applicableMaterials: definition.domainDecision.allowed,
    measurableOperations: definition.resources.some((row) => row.group === "construction_work")
      && definition.resources.filter((row) => row.group === "construction_work").every((row) => !FORBIDDEN_UNITS.has(row.unitId)),
    conditionalEquipment: definition.passport.capabilityMatrix
      .some((entry) => entry.group === "machine_equipment" && entry.status === "NOT_APPLICABLE"),
    consolidatedLogistics: definition.resources.filter((row) => row.group === "delivery").length <= 1,
    forbiddenNoiseAbsent: definition.resources.every((row) => !FORBIDDEN_TEXT.test(row.titleRu) && !FORBIDDEN_UNITS.has(row.unitId)),
    minimumParameters: definition.passport.userParameterContracts.length
      === definition.passport.parameters.filter((parameter) => parameter.visibilityRole === "USER_INPUT").length,
    formulaAndUnitProof: definition.resources.every((row) => definition.runtimeFormulas
      .some((formula) => formula.formulaId === row.formulaId && formula.outputUnitId === row.unitId)),
    normSources: definition.resources.every((row) => row.engineeringSourceIds.length >= 3
      && row.normativeSource.locator.length >= 20),
    titleAndAliases: /[а-яё]/iu.test(definition.passport.titleRu)
      && definition.passport.aliasesRu.length > 0 && definition.passport.aliasesRu.every((alias) => alias.trim().length > 0),
    fixtures: oracleParity && below.status !== "GREEN" && above.status !== "GREEN"
      && mutationChangedRows.length > 0 && !negative.allowed && negative.errors.includes("DRYWALL_CROSS_DOMAIN_RESOURCE"),
    roleProjection: roles.every((role) => role.verdict === "GREEN"),
    historyPdfProcurementContract: artifactSelection.estimateRows.length === shared.rows.length
      && artifactSelection.procurementRows.length === shared.rows.filter((row) => row.procurement_eligible).length,
    disposition: false,
  };
  const staticCriteria = { ...criteria, disposition: true };
  invariant(Object.values(staticCriteria).every(Boolean), `BATCH001_R56_STATIC_CRITERION_RED:${definition.catalogId}`);
  return {
    contract: "real-professional-estimates-r5.6.batch001-catalog-verdict.v1",
    catalogId: definition.catalogId,
    successorVersionId: definition.successorVersionId,
    group: definition.group,
    variant: definition.variant,
    sourcePackIds: definition.passport.engineeringSources.map((source) => source.sourceId),
    counts: {
      parameters: definition.passport.parameters.length,
      userParameters: definition.passport.userParameterContracts.length,
      formulas: definition.runtimeFormulas.length,
      resources: definition.resources.length,
      visibleRows: shared.rows.length,
      procurementRows: artifactSelection.procurementRows.length,
      predecessorAdjudications: definition.adjudication.length,
    },
    fixtures: {
      goldOracle: oracleParity ? "GREEN" : "RED",
      lowerBoundary: below.status !== "GREEN" ? "GREEN_REJECTED" : "RED_ACCEPTED",
      upperBoundary: above.status !== "GREEN" ? "GREEN_REJECTED" : "RED_ACCEPTED",
      mutation: mutationChangedRows.length > 0 ? "GREEN" : "RED",
      mutationChangedRows,
      negativeCrossDomain: !negative.allowed && negative.errors.includes("DRYWALL_CROSS_DOMAIN_RESOURCE")
        ? "GREEN_REJECTED" : "RED_ACCEPTED",
    },
    roles,
    criteria,
    requestedDisposition: "REAL_WORK",
    currentDisposition: "PENDING_ISOLATED_REGISTRY_REPLAY",
    status: "GREEN_STATIC_RECONCILIATION_BACKEND_REPLAY_PENDING",
  };
}

async function main(): Promise<void> {
  const oracle = readOracle();
  const definitions = buildAllBatch001DrywallSuccessorsR3();
  invariant(definitions.length === 16, `BATCH001_R56_DEFINITION_DENOMINATOR:${definitions.length}`);
  const verdicts = [];
  for (const definition of definitions) {
    const expected = oracle.get(definition.catalogId);
    invariant(expected, `BATCH001_R56_ORACLE_RECORD_MISSING:${definition.catalogId}`);
    verdicts.push(await catalogVerdict(definition, expected));
  }
  invariant(verdicts.length === 16
    && verdicts.every((verdict) => verdict.status === "GREEN_STATIC_RECONCILIATION_BACKEND_REPLAY_PENDING"),
  "BATCH001_R56_STATIC_DENOMINATOR_RED");
  const sourceIdentity = buildCanonicalSourceIdentityR56({
    contractSha256: MASTER_SHA256,
    paths: [
      "C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (8).md",
      "scripts/estimate/r5/auditBatch001R56StaticReconciliation.ts",
      "scripts/estimate/r5/batch001R56SharedCoreProjection.ts",
      "scripts/estimate/r5/canonicalSourceIdentityR56.ts",
      "scripts/estimate/batch001008R3/batch001DrywallGoldFixtureR3.ts",
      "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3.ts",
      "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallBatch001EngineeringSourcesR56.ts",
      "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallBatch002EngineeringSourcesR4.ts",
      "src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadProfessionalV3.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts",
      "src/lib/estimate/backendPlatform/canonicalEstimateDefinitionRegistry.ts",
      ".release-runtime/real-professional-estimates-r3/evidence/04-repair/batch001/batch001_gold_fixture_compiled_rows.jsonl",
    ],
  });
  const report = {
    contract: "real-professional-estimates-r5.6.batch001-static-reconciliation.v1",
    status: "GREEN_STATIC_RECONCILIATION_BACKEND_WEB_ANDROID_PENDING",
    masterSha256: MASTER_SHA256,
    sourceIdentity,
    oracle: {
      kind: "FROZEN_DATA_ONLY_BUSINESS_ORACLE",
      path: ORACLE_PATH.replace(/\\/gu, "/"),
      sha256: ORACLE_SHA256,
      records: oracle.size,
      trustedAsPriorTerminalReport: false,
    },
    denominators: {
      definitions: "16/16",
      catalogVerdicts: "16/16",
      roleVerdicts: "48/48",
      goldOracle: "16/16",
      lowerBoundariesRejected: "16/16",
      upperBoundariesRejected: "16/16",
      mutations: "16/16",
      negativeCrossDomainRejected: "16/16",
    },
    blockers: [
      "ISOLATED_BACKEND_REPLAY_PENDING",
      "REGISTRY_REAL_WORK_DISPOSITION_PENDING",
      "WEB_50_OF_50_PENDING",
      "ANDROID_API34_50_OF_50_PENDING",
    ],
    runtimeMutation: {
      databaseWrites: 0,
      release: false,
      deploy: false,
      ota: false,
      merge: false,
    },
    verdicts,
  };
  atomicWrite(VERDICTS_PATH, `${verdicts.map((verdict) => JSON.stringify({
    ...verdict,
    payloadSha256: sha256(verdict),
  })).join("\n")}\n`);
  atomicWrite(REPORT_PATH, `${JSON.stringify({ ...report, payloadSha256: sha256(report) }, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: report.status, definitions: verdicts.length, report: REPORT_PATH })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
