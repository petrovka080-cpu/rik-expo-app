import * as fs from "fs";
import * as path from "path";

const ENTERPRISE_CLOSEOUT_GREEN = "GREEN_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL_READY";
const RELEASE_PIPELINE_GREEN = "GREEN_RELEASE_PIPELINE_NO_TIMEOUT_MOBILE_RUNTIME_READY";

type JsonRecord = Record<string, unknown>;

function readArtifactMatrix(artifactsDir: string, name: string): JsonRecord {
  const matrixPath = path.join(artifactsDir, name);
  if (!fs.existsSync(matrixPath)) return {};
  try {
    const parsed = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed as JsonRecord : {};
  } catch {
    return {};
  }
}

function bool(value: unknown): boolean {
  return value === true;
}

function status(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function buildVerifiedReleaseGateEvidence(artifactsDir = path.resolve(process.cwd(), "artifacts")) {
  const enterpriseCloseout = readArtifactMatrix(artifactsDir, "S_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL_matrix.json");
  const releasePipeline = readArtifactMatrix(artifactsDir, "S_RELEASE_PIPELINE_matrix.json");
  const enterpriseCloseoutGreen =
    status(enterpriseCloseout.final_status) === ENTERPRISE_CLOSEOUT_GREEN &&
    enterpriseCloseout.fake_green_claimed === false;
  const releasePipelineGreen =
    status(releasePipeline.final_status) === RELEASE_PIPELINE_GREEN &&
    releasePipeline.fake_green_claimed === false;
  const sourceChainGreen = enterpriseCloseoutGreen && releasePipelineGreen;
  const releaseVerifyFromEnterprise =
    bool(enterpriseCloseout.precommit_release_verify_passed) ||
    bool(enterpriseCloseout.postpush_release_verify_passed);
  const gates = {
    typecheck_passed: sourceChainGreen && bool(enterpriseCloseout.precommit_tsc_passed),
    lint_passed: sourceChainGreen && bool(enterpriseCloseout.precommit_lint_passed),
    git_diff_check_passed: sourceChainGreen && bool(enterpriseCloseout.precommit_diff_check_passed),
    targeted_tests_passed: sourceChainGreen && bool(enterpriseCloseout.precommit_contract_runtime_passed),
    architecture_tests_passed: sourceChainGreen && bool(enterpriseCloseout.precommit_architecture_guardrails_passed),
    full_jest_passed:
      sourceChainGreen &&
      bool(enterpriseCloseout.precommit_full_jest_passed) &&
      bool(releasePipeline.full_jest_passed),
    release_verify_passed:
      sourceChainGreen &&
      releaseVerifyFromEnterprise &&
      bool(releasePipeline.release_verify_passed),
  };
  const blockers = [
    ...(!enterpriseCloseoutGreen ? ["enterprise_closeout_not_green"] : []),
    ...(!releasePipelineGreen ? ["release_pipeline_not_green"] : []),
    ...(!gates.full_jest_passed ? ["full_jest_gate_not_proven"] : []),
    ...(!gates.release_verify_passed ? ["release_verify_gate_not_proven"] : []),
  ];

  return {
    source_artifacts: [
      "artifacts/S_AI_ENTERPRISE_RELEASE_CLOSEOUT_CHANGE_CONTROL_matrix.json",
      "artifacts/S_RELEASE_PIPELINE_matrix.json",
    ],
    enterprise_closeout_final_status: enterpriseCloseout.final_status ?? null,
    release_pipeline_final_status: releasePipeline.final_status ?? null,
    enterprise_closeout_green: enterpriseCloseoutGreen,
    release_pipeline_green: releasePipelineGreen,
    source_chain_green: sourceChainGreen,
    ...gates,
    fake_green_claimed: false,
    blockers,
  };
}
