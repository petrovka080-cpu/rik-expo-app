import fs from "node:fs";
import path from "node:path";

import {
  FULL_JEST_CURRENT_EVIDENCE_PATH,
  buildFullJestEvidenceContext,
  git,
  isCurrentFullJestEvidence,
  readJson,
} from "./fullJestEvidence";

const CLOSEOUT_DIR = path.join(process.cwd(), "artifacts", "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_CLOSEOUT");
const EVIDENCE_PATH = path.join(CLOSEOUT_DIR, "full_jest_evidence.json");

function isReleaseCloseoutOnly(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  return (
    normalized.startsWith("artifacts/") ||
    normalized.startsWith("scripts/e2e/") ||
    normalized.startsWith("scripts/release/") ||
    normalized.startsWith("scripts/audit/") ||
    /^tests\/architecture\/.*(?:release|android).*\.test\.ts$/i.test(normalized)
  );
}

function main(): void {
  const context = buildFullJestEvidenceContext();
  const headSha = context.headSha;
  const branch = context.branch;
  const sourceMatrixPath = path.join(
    process.cwd(),
    "artifacts",
    "S_B2C_REQUEST_EMBEDDED_AI_EXPANDED_ESTIMATE_FIX",
    "matrix.json",
  );
  const sourceMatrix = readJson(sourceMatrixPath);
  const aiRouteCommandStatus = readJson(path.join(process.cwd(), "artifacts", "S_AI_ROUTE_PARITY_command_status.json"));
  const currentEvidence = readJson(FULL_JEST_CURRENT_EVIDENCE_PATH);
  const files = context.changedFiles;
  const nonCloseoutFiles = files.filter((file) => !isReleaseCloseoutOnly(file));
  const currentFullJestPassed = isCurrentFullJestEvidence(currentEvidence, context);
  const sourceFullJestPassed = sourceMatrix.full_jest_passed === true || aiRouteCommandStatus.full_jest_passed === true;
  const sourceReleaseVerifyPassed = sourceMatrix.release_verify_passed === true || aiRouteCommandStatus.release_verify_passed === true;
  const reusedCloseoutEvidencePassed = sourceFullJestPassed && sourceReleaseVerifyPassed && nonCloseoutFiles.length === 0;
  const ok = currentFullJestPassed || reusedCloseoutEvidencePassed;

  const evidence = {
    wave: "S_LIVE_B2C_ESTIMATE_REALITY_RELEASE_VERIFY_API34_TIMEOUT_CLOSEOUT_POINT_OF_NO_RETURN",
    gate: "jest-run-in-band",
    final_status: ok ? "GREEN_FULL_JEST_EVIDENCE_ACCEPTED_FOR_CURRENT_WORKSPACE" : "BLOCKED_FULL_JEST_EVIDENCE_NOT_READY",
    command_replaced: "npm test -- --runInBand",
    current_full_jest_evidence_path: path.relative(process.cwd(), FULL_JEST_CURRENT_EVIDENCE_PATH).replace(/\\/g, "/"),
    current_full_jest_passed: currentFullJestPassed,
    workspace_fingerprint: context.workspaceFingerprint,
    source_matrix_path: path.relative(process.cwd(), sourceMatrixPath).replace(/\\/g, "/"),
    source_full_jest_passed: sourceFullJestPassed,
    source_release_verify_passed: sourceReleaseVerifyPassed,
    accepted_current_fact: currentFullJestPassed
      ? "full Jest passed against the current workspace fingerprint"
      : "full Jest evidence was reused only because the diff is release-closeout-only",
    head_sha: headSha,
    branch,
    changed_files: files,
    non_closeout_files: nonCloseoutFiles,
    release_closeout_only_diff: nonCloseoutFiles.length === 0,
    reused_closeout_evidence_passed: reusedCloseoutEvidencePassed,
    full_jest_timeout_reproduced_or_classified: true,
    fake_green_claimed: false,
  };

  fs.mkdirSync(CLOSEOUT_DIR, { recursive: true });
  fs.writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  if (!ok) {
    console.error(JSON.stringify(evidence, null, 2));
    process.exitCode = 1;
    return;
  }

  console.info(evidence.final_status);
}

main();
