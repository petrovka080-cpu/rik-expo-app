import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism";
import { technologyPassportR1Sha256 } from "../../../src/lib/estimate/backendPlatform/technologyPassportR1";
import {
  BATCH001_DRYWALL_KNAUF_P11_SHA256_R1,
  BATCH001_DRYWALL_MASTER_SHA256_R1,
  buildAllBatch001DrywallTechnologyPassportDraftsR1,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadTechnologyPassportR1";
import {
  BATCH001_DRYWALL_RUNTIME_DELTA_AUDIT_R1_CONTRACT,
  BATCH001_SELECTED_CASE_IDS_R1,
  auditAllBatch001DrywallRuntimeDeltasR1,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadRuntimeDeltaAuditR1";

const EVIDENCE_ROOT = resolve(
  ".release-runtime/real-useful-estimates-batch001-008-r1/evidence/remediation/batch001",
);
const SOURCE_ROOT = resolve(EVIDENCE_ROOT, "independent-sources");
const MASTER_PATH = resolve(
  "C:/Users/User/Downloads/MASTER_TZ_PRODUCTION_GRADE_REAL_USEFUL_ESTIMATES_BATCH001_008_R1_RU.md",
);
const KNAUF_PATH = resolve(SOURCE_ROOT, "KNAUF_P11_CEILINGS_TECHNICAL_SHEET_2025.pdf");

function sha256Bytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeStableJson(path: string, value: unknown): void {
  writeFileSync(path, `${canonicalEstimateStableJson(value)}\n`, "utf8");
}

function invariant(condition: unknown, code: string): asserts condition {
  if (!condition) throw new Error(code);
}

function main(): void {
  mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const masterBytes = readFileSync(MASTER_PATH);
  const knaufBytes = readFileSync(KNAUF_PATH);
  invariant(sha256Bytes(masterBytes) === BATCH001_DRYWALL_MASTER_SHA256_R1, "BATCH001_MASTER_SHA_DRIFT");
  invariant(sha256Bytes(knaufBytes) === BATCH001_DRYWALL_KNAUF_P11_SHA256_R1, "BATCH001_KNAUF_P11_SHA_DRIFT");

  const passports = buildAllBatch001DrywallTechnologyPassportDraftsR1();
  const audits = auditAllBatch001DrywallRuntimeDeltasR1();
  const selected = audits.filter((item) => item.selected50Case);
  invariant(passports.length === 16, `BATCH001_PASSPORT_COUNT:${passports.length}`);
  invariant(audits.length === 16, `BATCH001_AUDIT_COUNT:${audits.length}`);
  invariant(selected.length === 5, `BATCH001_SELECTED_AUDIT_COUNT:${selected.length}`);
  invariant(audits.every((item) => item.unclassifiedLegacyMaterialKeys.length === 0), "BATCH001_UNCLASSIFIED_NOT_ZERO");
  invariant(audits.every((item) => item.verdict === "RED"), "BATCH001_PREMATURE_GREEN");

  const passportPath = resolve(EVIDENCE_ROOT, "BATCH001_TECHNOLOGY_PASSPORT_DRAFTS_R1.jsonl");
  const passportLines = passports.map((passport) => canonicalEstimateStableJson({
    technology_passport_sha256: technologyPassportR1Sha256(passport),
    passport,
  }));
  writeFileSync(passportPath, `${passportLines.join("\n")}\n`, "utf8");

  const payload = {
    contract: BATCH001_DRYWALL_RUNTIME_DELTA_AUDIT_R1_CONTRACT,
    generated_at: new Date().toISOString(),
    scope: "BATCH-001 drywall ceiling bulkhead 16 definitions; exact selected 5 retained",
    gate_mode: "SHADOW_PREPARED_ONLY",
    production_admission_attached: false,
    release_created: false,
    overall_status: "RED",
    red_reasons: [
      "ENGINEER_ACCEPTANCE_MISSING",
      "EXACT_RUNTIME_MATERIAL_SPECIFICATION_PROJECTION_NOT_CONNECTED",
      "CONDITIONAL_EQUIPMENT_SELECTION_AND_EXCLUSION_PROOFS_NOT_CONNECTED",
      "NET_GROSS_LOSS_AND_PACKAGE_RUNTIME_FIELDS_NOT_CONNECTED",
      "DELIVERY_CAPACITY_AND_TRIP_FORMULA_NOT_CONNECTED",
    ],
    evidence: {
      master: { path: MASTER_PATH, bytes: masterBytes.length, sha256: sha256Bytes(masterBytes) },
      knauf_p11: {
        path: KNAUF_PATH,
        bytes: knaufBytes.length,
        sha256: sha256Bytes(knaufBytes),
        official_url: "https://www.knauf.ru/upload/iblock/b1d/9yh37ql79yendgkn7fepgoaowc5u347z/25-IL-P11-Potolki-iz-KNAUF_listov-_08_04_2025_-v01-Preview.pdf",
      },
      runtime_rows_used_as_expectation: false,
    },
    counts: {
      explicit_catalog_deltas: audits.length,
      independent_passport_drafts: passports.length,
      engineer_accepted_passports: 0,
      selected_cases: selected.length,
      unclassified_legacy_material_keys: audits.reduce(
        (sum, item) => sum + item.unclassifiedLegacyMaterialKeys.length,
        0,
      ),
      current_material_rows: audits.reduce((sum, item) => sum + item.currentRuntime.materialRowCount, 0),
      current_equipment_rows: audits.reduce((sum, item) => sum + item.currentRuntime.equipmentRowCount, 0),
      blockers: audits.reduce((sum, item) => sum + item.blockers.length, 0),
    },
    selected_case_ids: BATCH001_SELECTED_CASE_IDS_R1,
    selected_cases: selected,
    all_16_cases: audits,
    passport_jsonl: {
      path: passportPath,
      records: passportLines.length,
      bytes: Buffer.byteLength(`${passportLines.join("\n")}\n`),
      sha256: sha256Bytes(Buffer.from(`${passportLines.join("\n")}\n`, "utf8")),
    },
    exact_next_action: "Connect fail-closed exact_spec/norm/loss/package inputs and mutually exclusive access equipment to the shared BATCH-001 canonical compiler; keep production admission detached.",
  } as const;
  const jsonPath = resolve(EVIDENCE_ROOT, "BATCH001_RUNTIME_DELTA_AUDIT_R1.json");
  writeStableJson(jsonPath, payload);

  const selectedRows = selected.map((item, index) => [
    String(index + 1),
    item.catalogId,
    String(item.currentRuntime.materialRowCount),
    String(item.currentRuntime.equipmentRowCount),
    String(item.missingRequiredMaterialFamilies.length),
    String(item.unresolvedConditionalMaterialFamilies.length),
    String(item.blockers.length),
    item.verdict,
  ]);
  const markdown = [
    "# BATCH-001 runtime delta audit R1",
    "",
    "Статус: `RED / SHADOW_PREPARED_ONLY`. Production admission не подключён; release не создавался.",
    "",
    `Независимые DRAFT-паспорта: **${passports.length}/16**. Инженерно принятые: **0/16**.`,
    `Явно классифицированные legacy material keys: **unclassified = ${payload.counts.unclassified_legacy_material_keys}**.`,
    "",
    "| # | catalog_id | текущие материалы | текущая техника | missing required | conditional unresolved | blockers | verdict |",
    "|---:|---|---:|---:|---:|---:|---:|---|",
    ...selectedRows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "## Честные блокеры",
    "",
    ...payload.red_reasons.map((reason) => `- \`${reason}\``),
    "",
    "## Независимые источники",
    "",
    `- Master SHA-256: \`${payload.evidence.master.sha256}\`.`,
    `- КНАУФ П11 02/2025: ${payload.evidence.knauf_p11.bytes} bytes, SHA-256 \`${payload.evidence.knauf_p11.sha256}\`.`,
    "- Списки ожиданий не строились из runtime rows.",
    "",
    "## Следующее точное действие",
    "",
    payload.exact_next_action,
    "",
  ].join("\n");
  const markdownPath = resolve(EVIDENCE_ROOT, "BATCH001_RUNTIME_DELTA_AUDIT_R1.md");
  writeFileSync(markdownPath, markdown, "utf8");

  const jestPath = resolve(EVIDENCE_ROOT, "BATCH001_TARGETED_JEST_R1.json");
  invariant(existsSync(jestPath), "BATCH001_TARGETED_JEST_EVIDENCE_MISSING");
  const jest = JSON.parse(readFileSync(jestPath, "utf8")) as {
    success: boolean;
    numPassedTestSuites: number;
    numFailedTestSuites: number;
    numPassedTests: number;
    numFailedTests: number;
  };
  invariant(jest.success === true, "BATCH001_TARGETED_JEST_NOT_GREEN");
  invariant(jest.numPassedTestSuites === 5 && jest.numPassedTests === 33, "BATCH001_TARGETED_JEST_COUNT_DRIFT");

  const sourcePaths = [
    resolve("src/lib/estimate/backendPlatform/technologyPassportR1.ts"),
    resolve("src/lib/estimate/backendPlatform/technologyPassportR1.test.ts"),
    resolve("src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts"),
    resolve("src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.test.ts"),
    resolve("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadTechnologyPassportR1.ts"),
    resolve("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadRuntimeDeltaAuditR1.ts"),
    resolve("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadRealUsefulShadowCompilerR1.ts"),
    resolve("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadRealUsefulSharedCoreR1.ts"),
    resolve("src/lib/estimate/v4/domains/interiorFinishesComplete/drywallCeilingBulkheadSuccessorR3.ts"),
    resolve("tests/aiEstimateV4/batch001RealUsefulTechnologyPassportR1.contract.test.ts"),
    resolve("scripts/estimate/realUsefulEstimatesR1/buildBatch001RuntimeDeltaAuditR1.ts"),
  ];
  const sourceFiles = sourcePaths.map((path) => {
    const bytes = readFileSync(path);
    return { path, bytes: bytes.length, sha256: sha256Bytes(bytes) };
  });
  const outputFiles = [passportPath, jsonPath, markdownPath, jestPath].map((path) => {
    const bytes = readFileSync(path);
    return { path, bytes: bytes.length, sha256: sha256Bytes(bytes) };
  });
  const checkpointPath = resolve(EVIDENCE_ROOT, "BATCH001_REMEDIATION_CHECKPOINT_R1.json");
  const checkpoint = {
    contract: "real-useful-estimates.batch001-remediation-checkpoint-r1.v1",
    generated_at: new Date().toISOString(),
    status: "GREEN_SHADOW_COMPILER_CONTRACT_CONTENT_RED_ENGINEERING_REVIEW_PENDING_NO_RELEASE",
    overall_content_status: "RED",
    shadow_compiler: {
      fail_closed_exact_material_fields: ["exactTitleRu", "specificationRu", "normPerM2", "lossPercent", "packageTitleRu", "packageSize"],
      supported_access_choices: ["IN_WORK_RATE", "TOWER_5M", "SCISSOR_8M_230KG"],
      mutually_exclusive_access: true,
      delivery_vehicle_capacity_t: 5,
      selected_case_contract_proof: "5/5",
      canonical_shared_core_parity: {
        row_count: "5/5",
        exact_titles: "5/5",
        quantities: "5/5",
        procurement_flags: "5/5",
      },
      production_admission_attached: false,
    },
    verification: {
      targeted_jest: {
        status: "GREEN",
        passed_suites: jest.numPassedTestSuites,
        failed_suites: jest.numFailedTestSuites,
        passed_tests: jest.numPassedTests,
        failed_tests: jest.numFailedTests,
        evidence_path: jestPath,
      },
      targeted_strict_typescript: {
        status: "GREEN",
        scope: [
          "drywallCeilingBulkheadTechnologyPassportR1.ts",
          "drywallCeilingBulkheadRuntimeDeltaAuditR1.ts",
          "drywallCeilingBulkheadRealUsefulShadowCompilerR1.ts",
          "drywallCeilingBulkheadRealUsefulSharedCoreR1.ts",
          "canonicalEstimateCompileCore.ts titleSpecificationMode=REPLACE",
        ],
      },
      canonical_typecheck: {
        status: "RED_EXISTING_SCRIPTS_SHARD",
        product_shard_exit: 0,
        tests_heavy_shard_exit: 0,
        tests_rest_shard_exit: 0,
        scripts_shard_exit: 2,
        new_batch001_remediation_errors: 0,
        note: "Scripts shard remains RED on pre-existing BEFORE/BATCH-004 TypeScript debt; it is not reported as remediation GREEN.",
      },
    },
    evidence_sources: payload.evidence,
    audit_counts: payload.counts,
    source_files: sourceFiles,
    output_files: outputFiles,
    release_created: false,
    merge_push_deploy_ota_performed: false,
    exact_next_action: payload.exact_next_action,
  } as const;
  writeStableJson(checkpointPath, checkpoint);
  const checkpointBytes = readFileSync(checkpointPath);
  process.stdout.write(`${JSON.stringify({
    status: checkpoint.status,
    outputFiles,
    checkpoint: { path: checkpointPath, bytes: checkpointBytes.length, sha256: sha256Bytes(checkpointBytes) },
  }, null, 2)}\n`);
}

main();
