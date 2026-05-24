import fs from "node:fs";
import path from "node:path";

import {
  FINAL_50K_92_GREEN_STATUS,
  evaluateFinal50k92GreenReleaseGuard,
} from "../release/releaseGuard.shared";
import {
  WHOLE_APP_50K_FIXTURE_RETENTION_GREEN_STATUS,
  WHOLE_APP_50K_FIXTURE_RETENTION_REQUIRED_ARCHIVE_ARTIFACTS,
  WHOLE_APP_50K_FIXTURE_RETENTION_WAVE,
  classifyWholeApp50kFixtureEvidenceMode,
  evaluateWholeApp50kFixtureRetentionPolicy,
} from "../../src/lib/proofFixtures/50kFixtureRetentionPolicy";

type JsonRecord = Record<string, unknown>;

const ROOT = process.cwd();
const ARTIFACT_DIR = path.join(ROOT, "artifacts");
const PREFIX = "S_50K_FIXTURE_RETENTION";

function artifactPath(name: string): string {
  return path.join(ARTIFACT_DIR, name);
}

function readJson(name: string): JsonRecord {
  const filePath = artifactPath(name);
  if (!fs.existsSync(filePath)) return {};
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function readExistingPrefixedJson(name: string): JsonRecord {
  const filePath = path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`);
  if (!fs.existsSync(filePath)) return {};
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as JsonRecord : {};
}

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(name: string, value: string): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACT_DIR, `${PREFIX}_${name}`), value, "utf8");
}

function bool(value: unknown): boolean {
  return value === true;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function artifactExists(relativePath: string): boolean {
  return fs.existsSync(path.join(ROOT, relativePath));
}

export function build50kFixtureRetentionCleanupPolicyProof() {
  const final50k = readJson("S_FINAL_50K_92_SCORE_matrix.json");
  const wholeApp50k = readJson("S_WHOLE_APP_50K_matrix.json");
  const fixture = readJson("S_50K_SYNTHETIC_FIXTURE_matrix.json");
  const releaseCandidate = readJson("S_ENTERPRISE_RELEASE_CANDIDATE_matrix.json");

  const requiredArchiveArtifacts = WHOLE_APP_50K_FIXTURE_RETENTION_REQUIRED_ARCHIVE_ARTIFACTS.map((file) => ({
    file,
    exists: artifactExists(file),
  }));
  const archivedArtifactsPresent = requiredArchiveArtifacts.every((item) => item.exists);
  const proofRunId =
    stringOrNull(final50k.proof_run_id)
    ?? stringOrNull(wholeApp50k.proof_run_id)
    ?? stringOrNull(fixture.proof_run_id);
  const fixtureSufficient =
    bool(final50k.fixture_sufficient)
    && bool(wholeApp50k.fixture_sufficient)
    && Number(wholeApp50k.b2c_requests ?? 0) >= 50_000
    && Number(wholeApp50k.b2c_request_items ?? 0) >= 250_000
    && Number(wholeApp50k.media_rows ?? 0) >= 100_000
    && Number(wholeApp50k.pdfs ?? 0) >= 50_000
    && Number(wholeApp50k.marketplace_listings ?? 0) >= 50_000
    && Number(wholeApp50k.events ?? 0) >= 1_000_000;
  const wholeApp50kProofPassed =
    final50k.final_status === FINAL_50K_92_GREEN_STATUS
    && bool(final50k.whole_app_50k_proof_passed)
    && wholeApp50k.final_status === "GREEN_WHOLE_APP_50K_EXPLAIN_P95_READY"
    && fixtureSufficient;
  const evidenceMode = classifyWholeApp50kFixtureEvidenceMode({
    fixtureSufficient,
    proofRunId,
    wholeApp50kProofPassed,
    archivedArtifactsPresent,
  });

  const matrix = evaluateWholeApp50kFixtureRetentionPolicy({
    final50kStatus: String(final50k.final_status ?? "MISSING"),
    fixtureSufficient,
    proofRunId,
    wholeApp50kProofPassed,
    archivedArtifactsPresent,
    releaseGuardRequiresLiveFixture: true,
    cleanupRequested: process.argv.includes("--cleanup-requested"),
    cleanupScope: "proof_run_id_only",
    targetDatabaseKind: "proof",
    ownerDecisionRecorded: false,
    businessRowsDeleted: 0,
  });

  const releaseGuard = evaluateFinal50k92GreenReleaseGuard({
    finalStatus: String(final50k.final_status ?? "MISSING"),
    fixtureSufficient,
    proofRunId,
    wholeApp50kLiveProofPassed: wholeApp50kProofPassed,
    evidenceMode,
    rlsGreen: bool(final50k.rls_dynamic_proof_passed),
    fullJestPassed: bool(final50k.full_jest_passed) || bool(releaseCandidate.full_jest_passed),
    releaseVerifyPassed: bool(final50k.release_verify_passed) || bool(releaseCandidate.release_verify_passed),
  });

  const existingInventory = readExistingPrefixedJson("inventory");
  const inventory = {
    wave: WHOLE_APP_50K_FIXTURE_RETENTION_WAVE,
    generated_at: stringOrNull(existingInventory.generated_at) ?? new Date().toISOString(),
    source_artifacts: {
      fixture: "artifacts/S_50K_SYNTHETIC_FIXTURE_matrix.json",
      whole_app_50k: "artifacts/S_WHOLE_APP_50K_matrix.json",
      final_50k: "artifacts/S_FINAL_50K_92_SCORE_matrix.json",
      release_candidate: "artifacts/S_ENTERPRISE_RELEASE_CANDIDATE_matrix.json",
    },
    required_archive_artifacts: requiredArchiveArtifacts,
  };

  const cleanupPolicy = {
    cleanup_now_recommended: false,
    reason: "The current release guard still requires live fixture evidence for fresh final 9.2 green.",
    allowed_cleanup_path: [
      "archive required proof artifacts",
      "record owner decision",
      "move fixture to dedicated perf/proof DB or change release guard mode explicitly",
      "run cleanup only by proof_run_id",
      "prove business_rows_deleted=0",
      "rerun release guard with exact live-vs-archived status",
    ],
    forbidden_cleanup: [
      "drop",
      "truncate",
      "reset",
      "delete without proof_run_id",
      "delete real business rows",
      "claim fresh 9.2 green from archived artifacts only",
    ],
  };

  const releaseGuardPolicy = {
    release_guard_uses_live_fixture_for_fresh_green: releaseGuard.requiresLiveFixtureEvidence,
    archived_evidence_accepted_for_fresh_green: releaseGuard.archivedEvidenceAcceptedForFreshGreen,
    current_evidence_mode: releaseGuard.evidenceMode,
    release_guard_passed: releaseGuard.passed,
    release_guard_blockers: releaseGuard.blockers,
  };

  const proof = [
    `# ${WHOLE_APP_50K_FIXTURE_RETENTION_WAVE}`,
    "",
    `Status: ${matrix.final_status}`,
    "",
    "## Decision",
    "- Keep the live synthetic 50k fixture as the current proof/staging baseline.",
    "- Do not cleanup the fixture while release guard requires live fixture evidence.",
    "- Archived artifacts document the historical baseline but do not replace live fixture evidence for fresh final 9.2 green.",
    "- Any future cleanup must be proof_run_id scoped and must prove business_rows_deleted=0.",
    "",
    "## Current Evidence",
    `- proof_run_id: ${matrix.proof_run_id ?? "missing"}`,
    `- evidence mode: ${matrix.evidence_mode}`,
    `- fixture sufficient: ${matrix.fixture_sufficient}`,
    `- archived evidence present: ${matrix.archived_evidence_present}`,
    `- cleanup allowed now: ${matrix.cleanup_allowed_now}`,
    `- release guard passed: ${releaseGuard.passed}`,
    "",
    "## Blockers",
    matrix.blockers.length > 0 ? matrix.blockers.map((item) => `- ${item}`).join("\n") : "- none",
    "",
  ].join("\n");

  return {
    inventory,
    cleanupPolicy,
    releaseGuardPolicy,
    matrix,
    proof,
  };
}

export function write50kFixtureRetentionCleanupPolicyProof() {
  const report = build50kFixtureRetentionCleanupPolicyProof();
  writeJson("inventory", report.inventory);
  writeJson("cleanup_policy", report.cleanupPolicy);
  writeJson("release_guard_policy", report.releaseGuardPolicy);
  writeJson("matrix", report.matrix);
  writeText("proof.md", report.proof);
  return report;
}

const report = write50kFixtureRetentionCleanupPolicyProof();
console.log(JSON.stringify({
  wave: report.matrix.wave,
  final_status: report.matrix.final_status,
  evidence_mode: report.matrix.evidence_mode,
  cleanup_allowed_now: report.matrix.cleanup_allowed_now,
  release_guard_uses_live_fixture_for_fresh_green: report.matrix.release_guard_uses_live_fixture_for_fresh_green,
}, null, 2));

if (report.matrix.final_status !== WHOLE_APP_50K_FIXTURE_RETENTION_GREEN_STATUS) {
  process.exitCode = 1;
}
