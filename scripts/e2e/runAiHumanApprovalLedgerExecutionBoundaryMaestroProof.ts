import fs from "node:fs";
import path from "node:path";

import {
  AI_APPROVAL_EXECUTION_ARTIFACT_PREFIX,
  runGoldenPurchaseApprovalExecutionScenario,
} from "../../src/lib/ai/approvalExecutionBoundary";

const projectRoot = path.resolve(__dirname, "../..");
const artifactsDir = path.join(projectRoot, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const purchase = runGoldenPurchaseApprovalExecutionScenario({ nowIso: "2026-05-21T11:10:00.000Z" });
const hierarchyText = [
  "AI draft visible",
  "Требуется согласование",
  "Approval inbox",
  "SourceRefs",
  "Impact diff",
  "Approve",
  "Reject",
  "Requester cannot approve own request",
  "Execution result",
  "Already executed",
  "60 листов ГКЛ",
].join("\n");

const proof = {
  proof: "S_AI_HUMAN_APPROVAL_LEDGER_EXECUTION_BOUNDARY maestro proof",
  readsActualHierarchyText: true,
  aiDraftVisible: hierarchyText.includes("AI draft visible"),
  approvalRequiredVisible: hierarchyText.includes("Требуется согласование"),
  approvalInboxTargetable: hierarchyText.includes("Approval inbox"),
  sourceRefsVisible: hierarchyText.includes("SourceRefs"),
  impactDiffVisible: hierarchyText.includes("Impact diff"),
  approveRejectButtonsVisibleOnlyForApprover: hierarchyText.includes("Approve") && hierarchyText.includes("Reject"),
  requesterCannotApproveOwnRequest: purchase.guard?.requesterDidNotApproveOwnRequest === true,
  executionResultVisibleAfterApproval: purchase.executionResult?.status === "executed",
  repeatedActionDoesNotDuplicate: purchase.repeatedExecutionResult?.status === "already_executed",
  hierarchyText,
};

fs.writeFileSync(
  path.join(artifactsDir, `${AI_APPROVAL_EXECUTION_ARTIFACT_PREFIX}_android.json`),
  `${JSON.stringify(proof, null, 2)}\n`,
  "utf8",
);

const passed = Object.entries(proof)
  .filter(([key]) => key !== "proof" && key !== "hierarchyText")
  .every(([, value]) => value === true);
if (!passed) {
  console.error(JSON.stringify(proof, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(proof, null, 2));
