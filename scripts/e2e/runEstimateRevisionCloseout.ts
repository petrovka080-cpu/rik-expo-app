import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  ESTIMATE_REVISION_ARTIFACT_DIR,
  assertAuditPass,
  buildEstimateRevisionAuditScenario,
  writeEstimateRevisionArtifact,
} from "./estimateRevisionAuditShared";

const scenario = buildEstimateRevisionAuditScenario();
const requiredArtifacts = [
  "matrix.json",
  "revision_protocol.json",
  "manual_edit_revision_results.json",
  "pdf_revision_binding.json",
  "request_history_revision_binding.json",
  "approval_freeze_results.json",
  "conflict_detection_results.json",
  "restore_revision_results.json",
];
const missing = requiredArtifacts.filter((name) => !fs.existsSync(path.join(ESTIMATE_REVISION_ARTIFACT_DIR, name)));

assertAuditPass(scenario.checks.audit_trail_complete, "audit trail incomplete");
assertAuditPass(missing.length === 0, `missing artifacts: ${missing.join(",")}`);

writeEstimateRevisionArtifact("audit_trail_completeness.json", {
  passed: true,
  event_count: scenario.restored.events.length,
  revision_count: scenario.restored.revisions.length,
  audit_trail_complete: scenario.checks.audit_trail_complete,
});

let releaseVerifyPassed = false;
let releaseVerifyOutput = "";
try {
  releaseVerifyOutput = execFileSync("npm", ["run", "release:verify"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  releaseVerifyPassed = true;
} catch (error) {
  const output = error as { message?: unknown; stdout?: unknown; stderr?: unknown };
  releaseVerifyOutput = [
    typeof output.message === "string" ? output.message : String(error),
    typeof output.stdout === "string" ? output.stdout : "",
    typeof output.stderr === "string" ? output.stderr : "",
  ].filter(Boolean).join("\n");
  releaseVerifyPassed = false;
}

writeEstimateRevisionArtifact("release_verify.json", {
  passed: releaseVerifyPassed,
  command: "npm run release:verify",
  output_tail: releaseVerifyOutput.slice(-4000),
});

assertAuditPass(releaseVerifyPassed, "release verify failed");

writeEstimateRevisionArtifact("CLOSEOUT_PROOF.json", {
  passed: true,
  closeout_status: "GREEN_ESTIMATE_REVISION_AUDIT_APPROVAL_SAFE_SNAPSHOT_CORE",
  blockers: [],
  required_artifacts_present: true,
  release_verify_passed: releaseVerifyPassed,
  fake_green_claimed: false,
});
