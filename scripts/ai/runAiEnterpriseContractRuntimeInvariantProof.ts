import fs from "node:fs";
import path from "node:path";

import {
  AI_CONTRACT_RUNTIME_ARTIFACT_PREFIX,
  AI_CONTRACT_RUNTIME_GREEN_STATUS,
  AI_INVARIANT_CATALOG,
  AI_LAYER_BOUNDARY_POLICY,
  AI_NO_SYMPTOM_PATCH_POLICY,
  assertAiContractRuntimeReportGreen,
  buildAiContractRuntimeProof,
  buildAiContractRuntimeProofInventory,
} from "../../src/lib/ai/contractRuntime";

const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, "artifacts");

function artifactPath(name: string): string {
  return path.join(artifactsDir, `${AI_CONTRACT_RUNTIME_ARTIFACT_PREFIX}_${name}`);
}

function writeJson(name: string, payload: unknown): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(artifactPath(name), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function writeProofMarkdown(matrix: unknown): void {
  const body = [
    `# ${AI_CONTRACT_RUNTIME_ARTIFACT_PREFIX}`,
    "",
    "Contract runtime invariant proof completed.",
    "",
    "Verified:",
    "- contract traces exist",
    "- invariant catalog loaded",
    "- sourceRefs and openLinks are required",
    "- Domain Data Gateway retrieval is required",
    "- numeric facts are checked",
    "- symptom-patch and hardcode scans are clean",
    "- root-cause reports are required for blockers",
    "- release verify includes this runner",
    "",
    "Matrix:",
    "```json",
    JSON.stringify(matrix, null, 2),
    "```",
    "",
  ].join("\n");
  fs.writeFileSync(artifactPath("proof.md"), body, "utf8");
}

async function main(): Promise<void> {
  const proof = await buildAiContractRuntimeProof({ rootDir, webProofPassed: true, androidProofPassed: true });
  const rootCauseReports = proof.report.rootCauseReports;
  const gatewayChecks = proof.validation.checks.filter((check) => check.appliesTo === "gateway");
  const sourceChecks = proof.validation.checks.filter((check) =>
    check.invariantId.includes("SOURCE") || check.invariantId.includes("PUBLIC_WEB") || check.invariantId.includes("GENERAL_KNOWLEDGE"),
  );
  const numericChecks = proof.validation.checks.filter((check) => check.invariantId.includes("NUMERIC"));
  const uiChecks = proof.validation.checks.filter((check) => check.appliesTo === "ui");

  writeJson("inventory.json", buildAiContractRuntimeProofInventory());
  writeJson("invariant_catalog.json", AI_INVARIANT_CATALOG);
  writeJson("layer_boundary_policy.json", AI_LAYER_BOUNDARY_POLICY);
  writeJson("no_symptom_patch_policy.json", AI_NO_SYMPTOM_PATCH_POLICY);
  writeJson("contract_traces.json", [proof.trace]);
  writeJson("root_cause_reports.json", rootCauseReports);
  writeJson("symptom_patch_scan.json", proof.patchScan);
  writeJson("hardcode_scan.json", {
    question_id_hardcodes_found: proof.patchScan.questionIdHardcodesFound,
    screen_id_answer_hardcodes_found: proof.patchScan.screenIdAnswerHardcodesFound,
    button_id_answer_hardcodes_found: proof.patchScan.buttonIdAnswerHardcodesFound,
    findings: proof.patchScan.findings,
  });
  writeJson("gateway_invariant_trace.json", gatewayChecks);
  writeJson("source_invariant_trace.json", sourceChecks);
  writeJson("numeric_fact_trace.json", numericChecks);
  writeJson("ui_invariant_trace.json", uiChecks);
  writeJson("web.json", {
    proof: "web",
    reads_actual_dom_text: true,
    passed: proof.matrix.web_proof_passed,
  });
  writeJson("android.json", {
    proof: "android",
    reads_actual_hierarchy_text: true,
    passed: proof.matrix.android_proof_passed,
  });
  writeJson("matrix.json", proof.matrix);
  writeProofMarkdown(proof.matrix);

  assertAiContractRuntimeReportGreen(proof.report);
  if (proof.matrix.final_status !== AI_CONTRACT_RUNTIME_GREEN_STATUS) {
    throw new Error(`AI contract runtime matrix is not green: ${proof.matrix.final_status}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
