import fs from "node:fs";
import path from "node:path";

import {
  AI_ESTIMATE_CHANGE_CONTROL_ARTIFACT_DIR,
  AI_ESTIMATE_CHANGE_CONTROL_BLOCKED_STATUS,
  AI_ESTIMATE_CHANGE_CONTROL_GREEN_STATUS,
} from "../../src/lib/ai/changeControl";
import {
  artifactPath,
  buildChangeControlMatrix,
  detectChangeControlOperatorUiReadiness,
  detectChangeControlWebSmokeEvidence,
  runChangeControlScenario,
  writeJson,
  writeScenarioArtifacts,
} from "../e2e/aiEstimateChangeControlProof.shared";

function exists(name: string): boolean {
  return fs.existsSync(artifactPath(name));
}

function repoText(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

function releaseGuardRegistered(): boolean {
  return repoText("scripts/release/releaseGuard.shared.ts").includes("ai-estimate-template-rate-catalog-ontology-change-control-proof");
}

function runAudit(): { passed: boolean; failures: string[]; audit: Record<string, unknown> } {
  const requiredArtifacts = [
    "change_inventory.json",
    "entity_versions.json",
    "validation_runs.json",
    "approvals.json",
    "rollback_events.json",
    "golden_results.json",
    "matrix.json",
    "proof.md",
  ];
  const missing = requiredArtifacts.filter((name) => !exists(name));
  const matrix = exists("matrix.json")
    ? JSON.parse(fs.readFileSync(artifactPath("matrix.json"), "utf8")) as Record<string, unknown>
    : {};
  const validationRuns = exists("validation_runs.json")
    ? JSON.parse(fs.readFileSync(artifactPath("validation_runs.json"), "utf8")) as Array<Record<string, unknown>>
    : [];
  const approvals = exists("approvals.json")
    ? JSON.parse(fs.readFileSync(artifactPath("approvals.json"), "utf8")) as Array<Record<string, unknown>>
    : [];
  const rollbackEvents = exists("rollback_events.json")
    ? JSON.parse(fs.readFileSync(artifactPath("rollback_events.json"), "utf8")) as Array<Record<string, unknown>>
    : [];
  const golden = exists("golden_results.json")
    ? JSON.parse(fs.readFileSync(artifactPath("golden_results.json"), "utf8")) as Record<string, unknown>
    : {};

  const failures = [
    ...missing.map((name) => `MISSING_ARTIFACT:${name}`),
    releaseGuardRegistered() ? null : "RELEASE_GUARD_NOT_REGISTERED",
    matrix.direct_active_mutation_found === false ? null : "DIRECT_ACTIVE_MUTATION_FOUND",
    matrix.publish_without_validation_found === false ? null : "PUBLISH_WITHOUT_VALIDATION_FOUND",
    matrix.publish_without_approval_found === false ? null : "PUBLISH_WITHOUT_APPROVAL_FOUND",
    matrix.mutation_without_audit_found === false ? null : "MUTATION_WITHOUT_AUDIT_FOUND",
    rollbackEvents.length > 0 ? null : "ROLLBACK_NOT_PROVEN",
    validationRuns.some((run) => run.status === "passed") ? null : "VALIDATION_NOT_PROVEN",
    approvals.some((approval) => approval.approval_status === "approved") ? null : "APPROVAL_NOT_PROVEN",
    golden.failed_golden_case_blocks_publish === true ? null : "FAILED_GOLDEN_CASE_DOES_NOT_BLOCK_PUBLISH",
    matrix.production_rollout_enabled === false ? null : "PRODUCTION_ROLLOUT_ENABLED",
    matrix.fake_green_claimed === false ? null : "FAKE_GREEN_CLAIMED",
  ].filter((item): item is string => Boolean(item));

  const audit = {
    artifact_dir: AI_ESTIMATE_CHANGE_CONTROL_ARTIFACT_DIR,
    release_guard_registered: releaseGuardRegistered(),
    missing_artifacts: missing,
    validation_runs: validationRuns.length,
    approvals: approvals.length,
    rollback_events: rollbackEvents.length,
    closeout_audit_passed: failures.length === 0,
    failures,
  };
  return { passed: failures.length === 0, failures, audit };
}

function main(): void {
  if (!exists("matrix.json")) {
    const { store, proof, blockers } = runChangeControlScenario();
    const matrix = buildChangeControlMatrix(store, blockers, {
      operatorUiReady: detectChangeControlOperatorUiReadiness(),
      webSmokePassed: detectChangeControlWebSmokeEvidence(),
    });
    writeScenarioArtifacts(store, proof, blockers, matrix);
  }

  const result = runAudit();
  writeJson(artifactPath("closeout_audit.json"), result.audit);

  if (result.passed) {
    const { store, proof, blockers } = runChangeControlScenario();
    const matrix = buildChangeControlMatrix(store, blockers, {
      operatorUiReady: detectChangeControlOperatorUiReadiness(),
      webSmokePassed: detectChangeControlWebSmokeEvidence(),
      closeoutAuditPassed: true,
    });
    writeScenarioArtifacts(store, proof, blockers, matrix);
    writeJson(artifactPath("closeout_audit.json"), result.audit);
    const accepted = matrix.final_status === AI_ESTIMATE_CHANGE_CONTROL_GREEN_STATUS;
    if (accepted) {
      console.info(`${matrix.final_status}: closeout audit passed`);
    } else {
      console.error(`${matrix.final_status}: closeout audit passed, release closeout evidence still incomplete`);
      process.exitCode = 1;
    }
    return;
  }

  const blocked = {
    final_status: AI_ESTIMATE_CHANGE_CONTROL_BLOCKED_STATUS,
    failures: result.failures,
    fake_green_claimed: false,
  };
  writeJson(artifactPath("matrix.closeout_blocked.json"), blocked);
  console.error(`${AI_ESTIMATE_CHANGE_CONTROL_BLOCKED_STATUS}: ${result.failures.join(", ")}`);
  process.exitCode = 1;
}

main();
