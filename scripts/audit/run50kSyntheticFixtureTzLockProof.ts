import fs from "node:fs";
import path from "node:path";

import {
  WHOLE_APP_50K_FIXTURE_DATA_BLOCKER,
  WHOLE_APP_50K_FIXTURE_POLICY,
  WHOLE_APP_50K_TZ_LOCK_GREEN_STATUS,
  WHOLE_APP_50K_TZ_LOCK_WAVE,
} from "../../src/lib/proofFixtures/50kProofFixturePolicy";
import { buildWholeApp50kTzLockMatrix } from "../../src/lib/proofFixtures/50kProofFixtureMatrix";
import {
  WHOLE_APP_50K_FIXTURE_MODES,
  WHOLE_APP_50K_MINIMUM_REQUIRED,
} from "../../src/lib/proofFixtures/50kProofFixtureTypes";

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts");
const PREFIX = "S_50K_SYNTHETIC_FIXTURE_TZ_LOCK";

type JsonRecord = Record<string, unknown>;

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, `${PREFIX}_${name}`);
}

function readJson(name: string): JsonRecord {
  const filePath = path.join(ARTIFACT_DIR, name);
  if (!fs.existsSync(filePath)) return {};
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(`${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(`${name}.md`), value, "utf8");
}

function bool(value: unknown): boolean {
  return value === true;
}

function buildProofMd(matrix: JsonRecord): string {
  return [
    `# ${WHOLE_APP_50K_TZ_LOCK_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    "Locked:",
    "- 50k means synthetic proof rows, not real users",
    "- proof_run_id required",
    "- seed requires ALLOW_WHOLE_APP_50K_FIXTURE_SEED=1",
    "- cleanup scope is proof_run_id only",
    "- drop/truncate/reset/delete business rows are forbidden",
    "- empty DB maps to BLOCKED_EXTERNAL_ONLY_50K_FIXTURE_DATA_REQUIRED, not p95 failure",
    "- final 9.2 green requires sufficient fixture and live 50k proof",
    "",
    "Seed executed in this wave: false",
    "Fake green claimed: false",
    "",
  ].join("\n");
}

export function build50kSyntheticFixtureTzLockProof() {
  const releasePipeline = readJson("S_RELEASE_PIPELINE_matrix.json");
  const fullJestPassed = process.env.TZ_LOCK_FULL_JEST_PASSED === "1" || bool(releasePipeline.full_jest_passed);
  const releaseVerifyPassed = process.env.TZ_LOCK_RELEASE_VERIFY_PASSED === "1" || bool(releasePipeline.release_verify_passed);
  const matrix = buildWholeApp50kTzLockMatrix({ fullJestPassed, releaseVerifyPassed });

  const inventory = {
    wave: WHOLE_APP_50K_TZ_LOCK_WAVE,
    final_status: WHOLE_APP_50K_TZ_LOCK_GREEN_STATUS,
    fixture_seed_executed: false,
    required_files: [
      "src/lib/proofFixtures/50kProofFixturePolicy.ts",
      "src/lib/proofFixtures/50kProofFixtureTypes.ts",
      "src/lib/proofFixtures/50kProofFixtureGuards.ts",
      "src/lib/proofFixtures/50kProofFixtureMatrix.ts",
      "scripts/e2e/seedWholeApp50kSyntheticFixture.ts",
    ],
    required_tests: [
      "tests/proofFixtures/wholeApp50kProofFixturePolicy.contract.test.ts",
      "tests/proofFixtures/wholeApp50kProofRunId.contract.test.ts",
      "tests/proofFixtures/wholeApp50kNoRealUsers.contract.test.ts",
      "tests/proofFixtures/wholeApp50kNoDestructiveSql.contract.test.ts",
      "tests/proofFixtures/wholeApp50kCleanupProofRunIdOnly.contract.test.ts",
      "tests/proofFixtures/wholeApp50kFixtureSufficiency.contract.test.ts",
      "tests/proofFixtures/wholeApp50kEmptyDbIsFixtureMissingNotPerfFail.contract.test.ts",
      "tests/proofFixtures/wholeApp50kSeedModes.contract.test.ts",
      "tests/architecture/wholeApp50kNoDropTruncateReset.contract.test.ts",
      "tests/architecture/wholeApp50kNoDeleteBusinessRows.contract.test.ts",
      "tests/architecture/wholeApp50kNoMassAuthUsers.contract.test.ts",
      "tests/architecture/wholeApp50kNoFakeGreenOnEmptyFixture.contract.test.ts",
    ],
  };

  const runnerModes = {
    runner: "scripts/e2e/seedWholeApp50kSyntheticFixture.ts",
    fixture_seed_executed: false,
    modes: [...WHOLE_APP_50K_FIXTURE_MODES],
    smoke_required_before_full: true,
    cleanup_verify_required_before_full: true,
  };

  const guardrails = {
    fifty_k_means_synthetic_rows_not_real_users: true,
    do_not_require_50000_auth_users: true,
    do_not_create_50000_auth_users: true,
    use_one_existing_proof_owner_user: true,
    proof_markers_required: [
      "proof_run_id",
      "payload.proof_run_id",
      "title starts with [PROOF <proof_run_id>]",
      "storage_key contains <proof_run_id>",
      "event payload contains <proof_run_id>",
    ],
    destructive_sql_forbidden: ["drop table", "truncate", "reset database", "disable RLS"],
    cleanup_scope: WHOLE_APP_50K_FIXTURE_POLICY.cleanupScope,
    empty_db_status: WHOLE_APP_50K_FIXTURE_DATA_BLOCKER,
    minimum_required: WHOLE_APP_50K_MINIMUM_REQUIRED,
  };

  return {
    inventory,
    policy: WHOLE_APP_50K_FIXTURE_POLICY,
    runnerModes,
    guardrails,
    matrix,
    proofMd: buildProofMd(matrix),
  };
}

export function write50kSyntheticFixtureTzLockArtifacts() {
  const report = build50kSyntheticFixtureTzLockProof();
  writeJson("inventory", report.inventory);
  writeJson("policy", report.policy);
  writeJson("runner_modes", report.runnerModes);
  writeJson("guardrails", report.guardrails);
  writeJson("matrix", report.matrix);
  writeText("proof", report.proofMd);
  return report;
}

if (require.main === module) {
  const report = write50kSyntheticFixtureTzLockArtifacts();
  console.log(JSON.stringify(report.matrix, null, 2));
}
