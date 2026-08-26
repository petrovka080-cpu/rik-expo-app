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
  buildAllBatch003R56CanonicalSuccessorDefinitions,
  compileBatch003R56ThroughSharedCore,
} from "../estimate/r5/batch003R56SharedCoreProjection";
import { batch003R56FixtureValues } from "../estimate/r5/batch003R56Fixtures";

type Json = Record<string, any>;

const MASTER_SHA256 = "9402f9cb2b9e0891ea1eb0179f4c4f5832c0b5f4d23e98121667095c9bc285c8";
const DEFAULT_BACKEND = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/backend/BATCH003_BACKEND_REVISION_PARITY_R56.json",
);
const DEFAULT_STATIC = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/static/BATCH003_R56_STATIC_RECONCILIATION.json",
);
const DEFAULT_OUTPUT = resolve(
  ".release-runtime/real-professional-estimates-r4/evidence/10-batch003-r56/matrix",
);
const CORE_PATH = resolve("src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts");
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

type Seed = {
  role: "ORDINARY_USER" | "ESTIMATOR" | "CONSTRUCTION_ENGINEER";
  scenario: "BASELINE_READ" | "PRICE_REVISION_AND_ARTIFACTS" | "ENGINEERING_TRUTH";
  catalogId: string;
  ordinal: number;
};

async function main(): Promise<void> {
  const backendPath = resolve(argument("backend", DEFAULT_BACKEND));
  const staticPath = resolve(argument("static", DEFAULT_STATIC));
  const output = resolve(argument("output", DEFAULT_OUTPUT));
  const backendBytes = readFileSync(backendPath);
  const staticBytes = readFileSync(staticPath);
  const backend = JSON.parse(backendBytes.toString("utf8")) as Json;
  const staticReport = JSON.parse(staticBytes.toString("utf8")) as Json;
  invariant(backend.status === "GREEN_R56_BATCH003_ISOLATED_BACKEND_PARITY_NO_RELEASE",
    "BATCH003_R56_MATRIX_BACKEND_RED");
  invariant(backend.masterSha256 === MASTER_SHA256 && staticReport.masterSha256 === MASTER_SHA256,
    "BATCH003_R56_MATRIX_MASTER_DRIFT");
  invariant(Array.isArray(backend.proofs) && backend.proofs.length === 36,
    "BATCH003_R56_MATRIX_BACKEND_DENOMINATOR");
  invariant(staticReport.status === "GREEN_STATIC_RECONCILIATION_BACKEND_WEB_ANDROID_PENDING"
    && staticReport.denominators?.definitions === "36/36",
  "BATCH003_R56_MATRIX_STATIC_RED");
  const definitions = buildAllBatch003R56CanonicalSuccessorDefinitions();
  const allIds = definitions.map((definition) => definition.catalogId);
  invariant(allIds.length === 36 && new Set(allIds).size === 36,
    "BATCH003_R56_MATRIX_DEFINITION_SET_RED");
  const seeds: Seed[] = [
    ...allIds.slice(0, 18).map((catalogId, ordinal): Seed => ({
      role: "ORDINARY_USER", scenario: "BASELINE_READ", catalogId, ordinal,
    })),
    ...allIds.slice(18, 34).map((catalogId, index): Seed => ({
      role: "ESTIMATOR", scenario: "PRICE_REVISION_AND_ARTIFACTS", catalogId, ordinal: 18 + index,
    })),
    ...[...allIds.slice(34), ...allIds.slice(0, 14)].map((catalogId, index): Seed => ({
      role: "CONSTRUCTION_ENGINEER", scenario: "ENGINEERING_TRUTH", catalogId, ordinal: 34 + index,
    })),
  ];
  invariant(seeds.length === 50 && new Set(seeds.map((seed) => seed.catalogId)).size === 36,
    "BATCH003_R56_MATRIX_SEED_DENOMINATOR");
  const proofByCatalogId = new Map((backend.proofs as Json[]).map((proof) => [String(proof.catalogId), proof]));
  const materialized = await materializeCanonicalHarnessFixturesSequentially({
    seeds,
    async load(seed): Promise<CanonicalHarnessFixture> {
      const proof = proofByCatalogId.get(seed.catalogId);
      invariant(proof, `BATCH003_R56_MATRIX_PROOF_MISSING:${seed.catalogId}`);
      return {
        caseId: `batch003-r56-${String(seed.ordinal + 1).padStart(2, "0")}-${seed.role.toLowerCase()}-${seed.catalogId}`,
        catalogId: seed.catalogId,
        sourceIdentitySha256: sha256({
          sourceStateId: backend.sourceStateId,
          definitionSetSha256: backend.definitionSetSha256,
          definitionVersionId: proof.definitionVersionId,
          catalogId: seed.catalogId,
        }),
        role: seed.role,
        scenario: seed.scenario,
        payload: {
          releaseId: backend.releaseId,
          revisionId: proof.finalRevisionId,
          definitionVersionId: proof.definitionVersionId,
          expectedVisibleRows: proof.visibleRows,
          expectedProcurementRows: proof.procurementRows,
          backendRevisionChecksumSha256: proof.revisionChecksumSha256,
          fixedSeed: 56301 + seed.ordinal,
        },
      };
    },
  });
  const wrapperBase = {
    manifest: {
      batchId: "BATCH-003",
      sourceIdentitySha256: String(backend.sourceStateId),
      productionCoreIdentitySha256: sha256(readFileSync(CORE_PATH)),
      runtime: "web" as const,
    },
    fixtures: materialized.fixtures,
    roleSelection: ["ORDINARY_USER", "ESTIMATOR", "CONSTRUCTION_ENGINEER"],
    scenarioSelection: ["BASELINE_READ", "PRICE_REVISION_AND_ARTIFACTS", "ENGINEERING_TRUTH"],
    expectedDenominators: {
      total: 50,
      byRole: { ORDINARY_USER: 18, ESTIMATOR: 16, CONSTRUCTION_ENGINEER: 16 },
      byScenario: { BASELINE_READ: 18, PRICE_REVISION_AND_ARTIFACTS: 16, ENGINEERING_TRUTH: 16 },
    },
  } satisfies CanonicalHarnessWrapper;
  const webPlan = defineCanonicalEstimateHarnessWrapper(wrapperBase);
  const androidWrapper: CanonicalHarnessWrapper = {
    ...wrapperBase,
    manifest: { ...wrapperBase.manifest, runtime: "android_api34" },
  };
  const androidPlan = defineCanonicalEstimateHarnessWrapper(androidWrapper);
  const independentOracleSha256 = sha256(staticBytes);
  const common = {
    contract: "real-professional-estimates-r5.6.batch003-matrix50-manifest.v1",
    masterSha256: MASTER_SHA256,
    backendEvidence: { path: backendPath.replace(/\\/gu, "/"), sha256: sha256(backendBytes) },
    staticEvidence: { path: staticPath.replace(/\\/gu, "/"), sha256: independentOracleSha256 },
    releaseId: backend.releaseId,
    definitionSetSha256: backend.definitionSetSha256,
    sourceStateId: backend.sourceStateId,
    independentOracle: { kind: "INDEPENDENT_BUSINESS_ORACLE", sha256: independentOracleSha256 },
    connectionAudit: materialized.connectionAudit,
    fixedSeed: 56301,
    generatedIdentifiersAreDeterministic: true,
  };
  atomicJson(resolve(output, "BATCH003_R56_WEB_MATRIX50_MANIFEST.json"), {
    ...common,
    wrapper: wrapperBase,
    planIdentitySha256: webPlan.planIdentitySha256,
    payloadSha256: sha256({ ...common, wrapper: wrapperBase, planIdentitySha256: webPlan.planIdentitySha256 }),
  });
  atomicJson(resolve(output, "BATCH003_R56_ANDROID_MATRIX50_MANIFEST.json"), {
    ...common,
    wrapper: androidWrapper,
    planIdentitySha256: androidPlan.planIdentitySha256,
    payloadSha256: sha256({ ...common, wrapper: androidWrapper, planIdentitySha256: androidPlan.planIdentitySha256 }),
  });

  const definitionsById = new Map(definitions.map((definition) => [definition.catalogId, definition]));
  const androidCases: Json[] = [];
  for (let index = 0; index < 50; index += 1) {
    const catalogId = allIds[index % allIds.length]!;
    const definition = definitionsById.get(catalogId)!;
    const proof = proofByCatalogId.get(catalogId)!;
    const goldValues = batch003R56FixtureValues(definition);
    const mutatedParameterId = String(proof.mutatedParameter?.parameterId ?? "");
    const mutatedParameterBefore = Number(proof.mutatedParameter?.before);
    const mutatedParameterAfter = Number(proof.mutatedParameter?.after);
    invariant(mutatedParameterId.length > 0
      && Number(goldValues[mutatedParameterId]) === mutatedParameterBefore
      && mutatedParameterAfter !== mutatedParameterBefore,
    `BATCH003_R56_ANDROID_FINAL_REVISION_MUTATION_ORACLE_RED:${catalogId}`);
    const revisionValues = { ...goldValues, [mutatedParameterId]: mutatedParameterAfter };
    const goldCompiled = await compileBatch003R56ThroughSharedCore({ definition, values: goldValues });
    const compiled = await compileBatch003R56ThroughSharedCore({ definition, values: revisionValues });
    const parameter = definition.parameters.find((candidate) => candidate.parameterId === mutatedParameterId);
    invariant(parameter?.inputType === "number", `BATCH003_R56_ANDROID_PARAMETER_MISSING:${catalogId}`);
    const baselineValue = Number(revisionValues[mutatedParameterId]);
    const changedValue = baselineValue + 0.75;
    const row = compiled.rows.find((candidate) => candidate.category === "material") ?? compiled.rows[0];
    invariant(row, `BATCH003_R56_ANDROID_ROW_MISSING:${catalogId}`);
    const goldRow = goldCompiled.rows.find((candidate) => candidate.row_id === row.row_id);
    invariant(goldRow, `BATCH003_R56_ANDROID_GOLD_ROW_MISSING:${catalogId}:${row.row_id}`);
    const parameterOrdinal = definition.parameters.findIndex((candidate) => candidate.parameterId === mutatedParameterId);
    const primaryScenario = index < ANDROID_REQUIRED_COVERAGE.length
      ? ANDROID_REQUIRED_COVERAGE[index]! : "exact_revision_open_and_row_parameter_parity";
    const coverage = index < ANDROID_REQUIRED_COVERAGE.length
      ? [primaryScenario] : ["exact_revision_open", "row_and_parameter_parity"];
    androidCases.push({
      case: index + 1,
      catalogId,
      titleRu: definition.passport.titleRu,
      parentRevisionId: proof.finalRevisionId,
      releaseId: backend.releaseId,
      expectedRowCount: proof.visibleRows,
      parameter: {
        parameterId: mutatedParameterId,
        ordinal: parameterOrdinal,
        titleRu: parameter.labelRu,
        runtimeEditorLabelRu: aiEstimateRuLabelForParameter(parameter.parameterId, parameter.labelRu),
        unitId: parameter.unitId,
        baselineValue,
        changedValue,
        runtimeUnitIdObserved: parameter.unitId,
        guideRequiredMarkers: [
          "KG_SP_KR_65_101_2025",
          "Source snapshot:",
          `${catalogId}:successor-r56:formula:`,
        ],
        guideShortRu: `Введите подтвержденное значение «${parameter.labelRu}»; скрытое значение не подставляется.`,
      },
      materialRow: {
        rowId: row.row_id,
        titleRu: row.title_ru,
        quantity: Number(row.quantity),
        unitPrice: 125.5,
        unitId: row.unit_id,
        semanticOwnerId: definition.resources.find((resource) => resource.rowId === row.row_id)?.semanticOwnerId,
      },
      primaryScenario,
      coverage,
      businessOracle: {
        source: "BATCH003_R56_STATIC_INDEPENDENT_ORACLE_PLUS_SHARED_CORE",
        catalog_id: catalogId,
        coverage,
        physical_result: definition.passport.physicalResultRu,
        parameter_id: mutatedParameterId,
        parameter_unit_id: parameter.unitId,
        parameter_gold_fixture_value: Number(goldValues[mutatedParameterId]),
        parameter_expected_revision_value: baselineValue,
        changed_value: changedValue,
        row_id: row.row_id,
        semantic_owner_id: definition.resources.find((resource) => resource.rowId === row.row_id)?.semanticOwnerId,
        row_unit_id: row.unit_id,
        row_gold_fixture_quantity: Number(goldRow.quantity),
        row_expected_revision_quantity: Number(row.quantity),
        row_unit_price: 125.5,
        estimator_verdict: "GREEN",
        construction_engineer_verdict: "GREEN",
        ordinary_user_clarity_verdict: "GREEN",
      },
    });
  }
  const harnessPaths = [
    "scripts/_shared/androidHarness.ts",
    "scripts/_shared/canonicalEstimateAcceptanceHarness.ts",
    "scripts/e2e/buildBatch003R56AndroidProofManifest.ts",
    "scripts/e2e/buildBatch003R56Matrix50Manifest.ts",
    "scripts/e2e/runBatch002R52AndroidApi34Matrix50.ts",
    "scripts/e2e/runBatch002R54AndroidAuthBootstrapProof.ts",
    "scripts/e2e/runBatch002R4WebRoleMatrix80.ts",
    "scripts/e2e/serveBatch002R4LocalSupabaseStub.ts",
  ];
  const harnessFiles = harnessPaths.map((path) => ({
    path,
    sha256: sha256(readFileSync(resolve(path))),
    bytes: readFileSync(resolve(path)).length,
  }));
  const harnessStateId = sha256(harnessFiles);
  const compatibilityManifest = {
    schema_version: "real-professional-estimates-r5.6.batch003-android-api34-matrix50-manifest.v1",
    generated_at: new Date().toISOString(),
    contract_sha256: MASTER_SHA256,
    source_head: backend.sourceIdentity.source_head,
    source_head_tree: backend.sourceIdentity.source_head_tree,
    accepted_backend_source_state_id: backend.sourceStateId,
    definition_content_state_id: backend.definitionSetSha256,
    backend_runtime_state_id: backend.sourceStateId,
    app_source_component_state_id: backend.sourceStateId,
    harness_state_id: harnessStateId,
    evidence_tool_state_id: sha256(readFileSync(resolve("scripts/e2e/buildBatch003R56Matrix50Manifest.ts"))),
    backend_evidence: { path: backendPath.replace(/\\/gu, "/"), sha256: sha256(backendBytes), status: backend.status },
    static_evidence: { path: staticPath.replace(/\\/gu, "/"), sha256: independentOracleSha256 },
    connection_audit: materialized.connectionAudit,
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
    status: "FROZEN_R56_BATCH003_ANDROID_MATRIX_50_RELEASE_BINDING_NO_RELEASE",
  };
  atomicJson(resolve(output, "BATCH003_R56_ANDROID_API34_MATRIX_50_MANIFEST.json"), {
    ...compatibilityManifest,
    content_sha256: sha256(compatibilityManifest),
  });
  process.stdout.write(`${JSON.stringify({
    status: "GREEN_BATCH003_R56_MATRIX50_MANIFESTS_BUILT",
    cases: materialized.fixtures.length,
    distinctCatalogIds: new Set(materialized.fixtures.map((fixture) => fixture.catalogId)).size,
    connectionAudit: materialized.connectionAudit,
    output,
  })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
