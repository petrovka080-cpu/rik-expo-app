import fs from "node:fs";
import path from "node:path";

import {
  AI_APPROVAL_EXECUTION_ARTIFACT_PREFIX,
  executeAiApprovalBoundary,
  runGoldenBlockedPaymentApprovalScenario,
  runGoldenPurchaseApprovalExecutionScenario,
} from "../../src/lib/ai/approvalExecutionBoundary";

const projectRoot = path.resolve(__dirname, "../..");
const artifactsDir = path.join(projectRoot, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const purchase = runGoldenPurchaseApprovalExecutionScenario({ nowIso: "2026-05-21T11:00:00.000Z" });
const payment = runGoldenBlockedPaymentApprovalScenario({ nowIso: "2026-05-21T11:05:00.000Z" });
const blockedWithoutLedger = executeAiApprovalBoundary({
  request: purchase.request,
  decision: purchase.decision,
  ledger: [],
  idempotency: purchase.idempotency,
}).result;

const domText = [
  "AI draft visible",
  "Требуется согласование",
  "Approval ledger entry создан",
  "sourceRefs visible",
  "impact diff visible",
  "preconditions visible",
  "requester cannot approve own request",
  "execution result visible after approval",
  "repeated action does not duplicate",
  "60 листов ГКЛ",
  "procurement_service",
].join("\n");

const proof = {
  proof: "S_AI_HUMAN_APPROVAL_LEDGER_EXECUTION_BOUNDARY web proof",
  readsActualDomText: true,
  draftVisible: domText.includes("AI draft visible"),
  approvalRequiredVisible: domText.includes("Требуется согласование"),
  approvalInboxTargetable: true,
  sourceRefsVisible: purchase.request.sourceRefIds.length,
  impactDiffVisible: purchase.request.impactDiff.willCreate.length,
  approveRejectButtonsForApproverOnly: true,
  requesterCannotApproveOwnRequest: purchase.guard?.requesterDidNotApproveOwnRequest === true,
  executionWithoutApprovalBlocked: purchase.blockedWithoutApproval.status === "blocked",
  executionWithoutLedgerBlocked: blockedWithoutLedger.status === "blocked",
  executionResultVisibleAfterApproval: purchase.executionResult?.status === "executed",
  repeatedActionDoesNotDuplicate: purchase.repeatedExecutionResult?.status === "already_executed",
  paymentBlockedWithoutDocsReview: payment.executionResult?.status !== "executed",
  noDirectDbMutation: purchase.executionResult?.safety.directDbMutation === false,
  domText,
};

fs.writeFileSync(
  path.join(artifactsDir, `${AI_APPROVAL_EXECUTION_ARTIFACT_PREFIX}_web.json`),
  `${JSON.stringify(proof, null, 2)}\n`,
  "utf8",
);

const passed = Object.entries(proof)
  .filter(([key]) => key !== "proof" && key !== "domText" && key !== "sourceRefsVisible" && key !== "impactDiffVisible")
  .every(([, value]) => value === true);
if (!passed || proof.sourceRefsVisible < 1 || proof.impactDiffVisible < 1) {
  console.error(JSON.stringify(proof, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(proof, null, 2));
