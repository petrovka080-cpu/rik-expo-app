import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { canonicalEstimateStableJson } from "../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { aiEstimateRuLabelForParameter } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import {
  defineCanonicalEstimateHarnessWrapper,
  materializeCanonicalHarnessFixturesSequentially,
  type CanonicalHarnessFixture,
  type CanonicalHarnessWrapper,
} from "../_shared/canonicalEstimateAcceptanceHarness";
import {
  buildAllBatch004R56CanonicalSuccessorDefinitions,
  compileBatch004R56ThroughSharedCore,
  type Batch004R56CanonicalSuccessorDefinition,
} from "../estimate/r5/batch004R56SharedCoreProjection";
import { batch004R56FixtureValues } from "../estimate/r5/batch004R56Fixtures";

type Json = Record<string, any>;

const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const ROOT = resolve(".release-runtime/real-professional-estimates-r4/evidence/11-batch004-r56");
const DEFAULT_BACKEND = resolve(ROOT, "backend/BATCH004_BACKEND_REVISION_PARITY_R56.json");
const DEFAULT_CONTENT = resolve(ROOT, "content/BATCH004_R56_CONTENT_ACCEPTANCE.json");
const DEFAULT_STATIC = resolve(ROOT, "static/BATCH004_R56_STATIC_RECONCILIATION.json");
const DEFAULT_OUTPUT = resolve(ROOT, "matrix");
const CORE_PATH = resolve("src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts");
const BUILDER_PATH = "scripts/e2e/buildBatch004R56Matrix50Manifest.ts";
const ANDROID_REQUIRED_COVERAGE = [
  "work_search_exact_selection",
  "parent_revision_open",
  "parameter_and_normative_guide",
  "parameter_edit_recalculate_child",
  "quantity_edit",
  "unit_price_edit_child",
  "specification_edit",
  "material_search_add",
  "material_replace",
  "photo_add_and_view",
  "note_add",
  "optional_position",
  "history_and_diff",
  "historical_revision_restore_as_new",
  "professional_pdf",
  "procurement",
  "cold_reopen_exact_revision",
] as const;

type Seed = {
  role: "ORDINARY_USER" | "ESTIMATOR" | "CONSTRUCTION_ENGINEER";
  scenario: "BASELINE_READ" | "PRICE_REVISION_AND_ARTIFACTS" | "ENGINEERING_TRUTH";
  catalogId: string;
  ordinal: number;
};

function argument(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function sha256(value: Buffer | string | unknown): string {
  const source = Buffer.isBuffer(value) || typeof value === "string" ? value : canonicalEstimateStableJson(value);
  return createHash("sha256").update(source).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function riskScore(definition: Batch004R56CanonicalSuccessorDefinition): number {
  const riskyFamilies = new Set(["fire_partition", "moisture_partition", "sound_partition", "shaft", "revision_hatch", "joint"]);
  const riskyOperations = new Set(["INSTALL", "REPAIR", "FINISH_JOINT"]);
  const riskyVariants = new Set(["wet_zone", "high_load", "technical_room"]);
  return (riskyFamilies.has(definition.family) ? 30 : 0)
    + (riskyOperations.has(definition.operation) ? 20 : 0)
    + (riskyVariants.has(definition.variant) ? 10 : 0)
    + Math.min(definition.resources.length, 10);
}

function selectCoverage50(
  definitions: readonly Batch004R56CanonicalSuccessorDefinition[],
): readonly Batch004R56CanonicalSuccessorDefinition[] {
  const remaining = [...definitions].sort((left, right) => left.catalogId.localeCompare(right.catalogId));
  const allFamilies = new Set(remaining.map((definition) => definition.family));
  const allOperations = new Set(remaining.map((definition) => definition.operation));
  const allVariants = new Set(remaining.map((definition) => definition.variant));
  const coveredFamilies = new Set<string>();
  const coveredOperations = new Set<string>();
  const coveredVariants = new Set<string>();
  const selected: Batch004R56CanonicalSuccessorDefinition[] = [];
  while (selected.length < 50) {
    const coverageIncomplete = coveredFamilies.size < allFamilies.size
      || coveredOperations.size < allOperations.size || coveredVariants.size < allVariants.size;
    remaining.sort((left, right) => {
      const coverage = (definition: Batch004R56CanonicalSuccessorDefinition): number =>
        (coveredFamilies.has(definition.family) ? 0 : 10_000)
        + (coveredOperations.has(definition.operation) ? 0 : 10_000)
        + (coveredVariants.has(definition.variant) ? 0 : 10_000);
      const leftScore = (coverageIncomplete ? coverage(left) : 0) + riskScore(left);
      const rightScore = (coverageIncomplete ? coverage(right) : 0) + riskScore(right);
      return rightScore - leftScore || left.catalogId.localeCompare(right.catalogId);
    });
    const next = remaining.shift();
    invariant(next, "BATCH004_R56_MATRIX_SELECTION_EXHAUSTED");
    selected.push(next);
    coveredFamilies.add(next.family);
    coveredOperations.add(next.operation);
    coveredVariants.add(next.variant);
  }
  invariant(selected.length === 50 && new Set(selected.map((entry) => entry.catalogId)).size === 50,
    "BATCH004_R56_MATRIX_SELECTION_DENOMINATOR_RED");
  invariant(coveredFamilies.size === allFamilies.size && coveredOperations.size === allOperations.size
    && coveredVariants.size === allVariants.size,
  "BATCH004_R56_MATRIX_DIMENSION_COVERAGE_RED");
  return selected;
}

async function main(): Promise<void> {
  const backendPath = resolve(argument("backend", DEFAULT_BACKEND));
  const contentPath = resolve(argument("content", DEFAULT_CONTENT));
  const staticPath = resolve(argument("static", DEFAULT_STATIC));
  const output = resolve(argument("output", DEFAULT_OUTPUT));
  const backendBytes = readFileSync(backendPath);
  const contentBytes = readFileSync(contentPath);
  const staticBytes = readFileSync(staticPath);
  const backend = JSON.parse(backendBytes.toString("utf8")) as Json;
  const content = JSON.parse(contentBytes.toString("utf8")) as Json;
  const staticReport = JSON.parse(staticBytes.toString("utf8")) as Json;
  invariant(backend.status === "GREEN_R56_BATCH004_ISOLATED_BACKEND_PARITY_NO_RELEASE"
    && backend.releaseStatus === "prepared" && backend.releaseActivated === false,
  "BATCH004_R56_MATRIX_BACKEND_RED");
  invariant(backend.masterSha256 === MASTER_SHA256 && content.masterSha256 === MASTER_SHA256
    && staticReport.masterSha256 === MASTER_SHA256,
  "BATCH004_R56_MATRIX_MASTER_DRIFT");
  invariant(Array.isArray(backend.proofs) && backend.proofs.length === 393,
    "BATCH004_R56_MATRIX_BACKEND_DENOMINATOR_RED");
  invariant(content.status === "GREEN_R56_BATCH004_CONTENT_393_OF_393_BOUND_TO_BACKEND_NO_RELEASE"
    && content.backend?.sourceStateId === backend.sourceStateId
    && content.backend?.releaseId === backend.releaseId
    && content.denominators?.contentCards === "393/393",
  "BATCH004_R56_MATRIX_CONTENT_RED");
  invariant(staticReport.status === "GREEN_R56_BATCH004_STATIC_RECONCILIATION_BACKEND_WEB_ANDROID_PENDING"
    && staticReport.denominators?.definitions === "393/393"
    && Object.values(staticReport.defectCounters as Record<string, number>).every((value) => value === 0),
  "BATCH004_R56_MATRIX_STATIC_ORACLE_RED");

  const definitions = buildAllBatch004R56CanonicalSuccessorDefinitions();
  invariant(definitions.length === 393 && new Set(definitions.map((definition) => definition.catalogId)).size === 393,
    "BATCH004_R56_MATRIX_DEFINITION_SET_RED");
  const selected = selectCoverage50(definitions);
  const selectedIds = selected.map((definition) => definition.catalogId);
  const seeds: Seed[] = selectedIds.map((catalogId, ordinal) => ({
    catalogId,
    ordinal,
    role: ordinal < 18 ? "ORDINARY_USER" : ordinal < 34 ? "ESTIMATOR" : "CONSTRUCTION_ENGINEER",
    scenario: ordinal < 18 ? "BASELINE_READ" : ordinal < 34
      ? "PRICE_REVISION_AND_ARTIFACTS" : "ENGINEERING_TRUTH",
  }));
  const proofByCatalogId = new Map((backend.proofs as Json[]).map((proof) => [String(proof.catalogId), proof]));
  const materialized = await materializeCanonicalHarnessFixturesSequentially({
    seeds,
    async load(seed): Promise<CanonicalHarnessFixture> {
      const proof = proofByCatalogId.get(seed.catalogId);
      invariant(proof, `BATCH004_R56_MATRIX_PROOF_MISSING:${seed.catalogId}`);
      return {
        caseId: `batch004-r56-${String(seed.ordinal + 1).padStart(2, "0")}-${seed.role.toLowerCase()}-${seed.catalogId}`,
        catalogId: seed.catalogId,
        sourceIdentitySha256: sha256({ sourceStateId: backend.sourceStateId,
          definitionSetSha256: backend.definitionSetSha256,
          definitionVersionId: proof.definitionVersionId, catalogId: seed.catalogId }),
        role: seed.role,
        scenario: seed.scenario,
        payload: { releaseId: backend.releaseId, revisionId: proof.finalRevisionId,
          definitionVersionId: proof.definitionVersionId, expectedVisibleRows: proof.visibleRows,
          expectedProcurementRows: proof.procurementRows,
          backendRevisionChecksumSha256: proof.revisionChecksumSha256, fixedSeed: 56401 + seed.ordinal },
      };
    },
  });

  const wrapperBase = {
    manifest: { batchId: "BATCH-004", sourceIdentitySha256: String(backend.sourceStateId),
      productionCoreIdentitySha256: sha256(readFileSync(CORE_PATH)), runtime: "web" as const },
    fixtures: materialized.fixtures,
    roleSelection: ["ORDINARY_USER", "ESTIMATOR", "CONSTRUCTION_ENGINEER"],
    scenarioSelection: ["BASELINE_READ", "PRICE_REVISION_AND_ARTIFACTS", "ENGINEERING_TRUTH"],
    expectedDenominators: { total: 50,
      byRole: { ORDINARY_USER: 18, ESTIMATOR: 16, CONSTRUCTION_ENGINEER: 16 },
      byScenario: { BASELINE_READ: 18, PRICE_REVISION_AND_ARTIFACTS: 16, ENGINEERING_TRUTH: 16 } },
  } satisfies CanonicalHarnessWrapper;
  const webPlan = defineCanonicalEstimateHarnessWrapper(wrapperBase);
  const androidWrapper: CanonicalHarnessWrapper = {
    ...wrapperBase, manifest: { ...wrapperBase.manifest, runtime: "android_api34" },
  };
  const androidPlan = defineCanonicalEstimateHarnessWrapper(androidWrapper);
  const independentOracleSha256 = sha256(staticBytes);
  const coverage = {
    families: [...new Set(selected.map((definition) => definition.family))].sort(),
    operations: [...new Set(selected.map((definition) => definition.operation))].sort(),
    variants: [...new Set(selected.map((definition) => definition.variant))].sort(),
  };
  const common = {
    contract: "real-professional-estimates-r5.6.batch004-matrix50-manifest.v1",
    masterSha256: MASTER_SHA256,
    backendEvidence: { path: backendPath.replace(/\\/gu, "/"), sha256: sha256(backendBytes) },
    contentAcceptanceEvidence: { path: contentPath.replace(/\\/gu, "/"), sha256: sha256(contentBytes) },
    staticEvidence: { path: staticPath.replace(/\\/gu, "/"), sha256: independentOracleSha256 },
    releaseId: backend.releaseId,
    definitionSetSha256: backend.definitionSetSha256,
    sourceStateId: backend.sourceStateId,
    independentOracle: { kind: "INDEPENDENT_BUSINESS_ORACLE", sha256: independentOracleSha256 },
    selection: { kind: "DETERMINISTIC_RISK_WEIGHTED_UNIQUE_CATALOG_COVERAGE", count: 50, coverage },
    connectionAudit: materialized.connectionAudit,
    fixedSeed: 56401,
    generatedIdentifiersAreDeterministic: true,
  };
  atomicJson(resolve(output, "BATCH004_R56_WEB_MATRIX50_MANIFEST.json"), {
    ...common, wrapper: wrapperBase, planIdentitySha256: webPlan.planIdentitySha256,
    payloadSha256: sha256({ ...common, wrapper: wrapperBase, planIdentitySha256: webPlan.planIdentitySha256 }),
  });
  atomicJson(resolve(output, "BATCH004_R56_ANDROID_MATRIX50_MANIFEST.json"), {
    ...common, wrapper: androidWrapper, planIdentitySha256: androidPlan.planIdentitySha256,
    payloadSha256: sha256({ ...common, wrapper: androidWrapper, planIdentitySha256: androidPlan.planIdentitySha256 }),
  });

  const definitionsById = new Map(definitions.map((definition) => [definition.catalogId, definition]));
  const androidCases: Json[] = [];
  for (let index = 0; index < selectedIds.length; index += 1) {
    const catalogId = selectedIds[index]!;
    const definition = definitionsById.get(catalogId)!;
    const proof = proofByCatalogId.get(catalogId)!;
    const goldValues = batch004R56FixtureValues(definition);
    const mutatedParameterId = String(proof.mutatedParameter?.parameterId ?? "");
    const mutatedParameterBefore = Number(proof.mutatedParameter?.before);
    const mutatedParameterAfter = Number(proof.mutatedParameter?.after);
    invariant(mutatedParameterId.length > 0 && Number(goldValues[mutatedParameterId]) === mutatedParameterBefore
      && mutatedParameterAfter !== mutatedParameterBefore,
    `BATCH004_R56_ANDROID_MUTATION_ORACLE_RED:${catalogId}`);
    const revisionValues = { ...goldValues, [mutatedParameterId]: mutatedParameterAfter };
    const goldCompiled = await compileBatch004R56ThroughSharedCore({ definition, values: goldValues });
    const compiled = await compileBatch004R56ThroughSharedCore({ definition, values: revisionValues });
    const parameter = definition.parameters.find((candidate) => candidate.parameterId === mutatedParameterId);
    invariant(parameter?.inputType === "number", `BATCH004_R56_ANDROID_PARAMETER_MISSING:${catalogId}`);
    const baselineValue = Number(revisionValues[mutatedParameterId]);
    const changedValue = baselineValue + 0.75;
    const row = compiled.rows.find((candidate) => candidate.category === "material") ?? compiled.rows[0];
    invariant(row, `BATCH004_R56_ANDROID_ROW_MISSING:${catalogId}`);
    const goldRow = goldCompiled.rows.find((candidate) => candidate.row_id === row.row_id);
    invariant(goldRow, `BATCH004_R56_ANDROID_GOLD_ROW_MISSING:${catalogId}:${row.row_id}`);
    const parameterOrdinal = definition.parameters.findIndex((candidate) => candidate.parameterId === mutatedParameterId);
    const primaryScenario = index < ANDROID_REQUIRED_COVERAGE.length
      ? ANDROID_REQUIRED_COVERAGE[index]! : "exact_revision_open_and_row_parameter_parity";
    const caseCoverage = index < ANDROID_REQUIRED_COVERAGE.length
      ? [primaryScenario] : ["exact_revision_open", "row_and_parameter_parity"];
    androidCases.push({
      case: index + 1,
      catalogId,
      titleRu: definition.passport.titleRu,
      parentRevisionId: proof.finalRevisionId,
      releaseId: backend.releaseId,
      expectedRowCount: proof.visibleRows,
      parameter: { parameterId: mutatedParameterId, ordinal: parameterOrdinal, titleRu: parameter.labelRu,
        runtimeEditorLabelRu: aiEstimateRuLabelForParameter(parameter.parameterId, parameter.labelRu),
        unitId: parameter.unitId, baselineValue, changedValue, runtimeUnitIdObserved: parameter.unitId,
        guideRequiredMarkers: ["KG_SP_KR_65_101_2025", "Source snapshot:",
          `${catalogId}:successor-r56:formula:`],
        guideShortRu: `Введите подтверждённое значение «${parameter.labelRu}»; скрытое значение не подставляется.` },
      materialRow: { rowId: row.row_id, titleRu: row.title_ru, quantity: Number(row.quantity),
        unitPrice: 125.5, unitId: row.unit_id,
        semanticOwnerId: definition.resources.find((resource) => resource.rowId === row.row_id)?.semanticOwnerId },
      primaryScenario,
      coverage: caseCoverage,
      businessOracle: { source: "BATCH004_R56_CONTENT_ACCEPTANCE_PLUS_STATIC_ORACLE_PLUS_SHARED_CORE",
        catalog_id: catalogId, family: definition.family, operation: definition.operation,
        variant: definition.variant, coverage: caseCoverage, physical_result: definition.passport.physicalResultRu,
        parameter_id: mutatedParameterId, parameter_unit_id: parameter.unitId,
        parameter_gold_fixture_value: Number(goldValues[mutatedParameterId]),
        parameter_expected_revision_value: baselineValue, changed_value: changedValue,
        row_id: row.row_id,
        semantic_owner_id: definition.resources.find((resource) => resource.rowId === row.row_id)?.semanticOwnerId,
        row_unit_id: row.unit_id, row_gold_fixture_quantity: Number(goldRow.quantity),
        row_expected_revision_quantity: Number(row.quantity), row_unit_price: 125.5,
        estimator_verdict: "GREEN", construction_engineer_verdict: "GREEN",
        ordinary_user_clarity_verdict: "GREEN" },
    });
  }

  const harnessPaths = [
    "scripts/_shared/androidHarness.ts",
    "scripts/_shared/canonicalEstimateAcceptanceHarness.ts",
    "scripts/e2e/buildBatch003R56AndroidProofManifest.ts",
    BUILDER_PATH,
    "scripts/e2e/runBatch002R52AndroidApi34Matrix50.ts",
    "scripts/e2e/runBatch002R54AndroidAuthBootstrapProof.ts",
    "scripts/e2e/runBatch002R4WebRoleMatrix80.ts",
    "scripts/e2e/serveBatch002R4LocalSupabaseStub.ts",
    "scripts/estimate/r5/batch004R56Fixtures.ts",
    "scripts/estimate/r5/batch004R56SharedCoreProjection.ts",
  ];
  const harnessFiles = harnessPaths.map((path) => ({ path,
    sha256: sha256(readFileSync(resolve(path))), bytes: readFileSync(resolve(path)).length }));
  const harnessStateId = sha256(harnessFiles);
  const compatibilityManifest = {
    schema_version: "real-professional-estimates-r5.6.batch004-android-api34-matrix50-manifest.v1",
    generated_at: new Date().toISOString(),
    contract_sha256: MASTER_SHA256,
    source_head: backend.sourceIdentity.source_head,
    source_head_tree: backend.sourceIdentity.source_head_tree,
    accepted_backend_source_state_id: backend.sourceStateId,
    definition_content_state_id: backend.definitionSetSha256,
    backend_runtime_state_id: backend.sourceStateId,
    app_source_component_state_id: backend.sourceStateId,
    harness_state_id: harnessStateId,
    evidence_tool_state_id: sha256(readFileSync(resolve(BUILDER_PATH))),
    backend_evidence: { path: backendPath.replace(/\\/gu, "/"), sha256: sha256(backendBytes), status: backend.status },
    content_acceptance_evidence: { path: contentPath.replace(/\\/gu, "/"), sha256: sha256(contentBytes), status: content.status },
    static_evidence: { path: staticPath.replace(/\\/gu, "/"), sha256: independentOracleSha256 },
    connection_audit: materialized.connectionAudit,
    selection_coverage: coverage,
    harness_file_manifest: { state_id: harnessStateId, files: harnessFiles },
    predecessor_manifest: { planIdentitySha256: androidPlan.planIdentitySha256 },
    release_id: backend.releaseId,
    search_release_id: backend.searchReleaseId,
    definition_set_sha256: backend.definitionSetSha256,
    expected: 50,
    distinct_catalog_ids: new Set(androidCases.map((entry) => entry.catalogId)).size,
    distinct_parent_revisions: new Set(androidCases.map((entry) => entry.parentRevisionId)).size,
    android_api_level: 34,
    sample_frozen_before_execution: true,
    cases_content_sha256: sha256(androidCases),
    business_oracle_sha256: independentOracleSha256,
    business_oracle_source_is_independent_of_runtime_api: true,
    required_coverage: ANDROID_REQUIRED_COVERAGE,
    cases: androidCases,
    execution_order: androidCases.map((entry) => entry.case),
    release_performed: false,
    deploy_performed: false,
    ota_performed: false,
    merge_performed: false,
    push_performed: false,
    batch009_performed: false,
    status: "FROZEN_R56_BATCH004_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE",
  };
  invariant(compatibilityManifest.distinct_catalog_ids === 50
    && compatibilityManifest.distinct_parent_revisions === 50,
  "BATCH004_R56_ANDROID_UNIQUE_IDENTITY_DENOMINATOR_RED");
  atomicJson(resolve(output, "BATCH004_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"), {
    ...compatibilityManifest, content_sha256: sha256(compatibilityManifest),
  });
  process.stdout.write(`${JSON.stringify({ status: "GREEN_BATCH004_R56_MATRIX50_MANIFESTS_BUILT",
    cases: materialized.fixtures.length, distinctCatalogIds: 50, coverage,
    connectionAudit: materialized.connectionAudit, output })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
