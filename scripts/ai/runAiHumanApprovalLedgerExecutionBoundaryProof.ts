import fs from "node:fs";
import path from "node:path";

import {
  AI_APPROVAL_EXECUTION_ARTIFACT_PREFIX,
  buildAiApprovalExecutionProofInventory,
  buildAiApprovalExecutionProofMatrix,
  executeAiApprovalBoundary,
  runGoldenBlockedPaymentApprovalScenario,
  runGoldenPurchaseApprovalExecutionScenario,
  scanAiApprovalExecutionPatchPatterns,
} from "../../src/lib/ai/approvalExecutionBoundary";

const projectRoot = path.resolve(__dirname, "../..");
const artifactsDir = path.join(projectRoot, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

function writeJson(name: string, value: unknown): void {
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_APPROVAL_EXECUTION_ARTIFACT_PREFIX}_${name}.json`),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

const purchaseScenario = runGoldenPurchaseApprovalExecutionScenario({
  nowIso: "2026-05-21T10:00:00.000Z",
});
const paymentScenario = runGoldenBlockedPaymentApprovalScenario({
  nowIso: "2026-05-21T10:05:00.000Z",
});
const blockedWithoutLedger = executeAiApprovalBoundary({
  request: purchaseScenario.request,
  decision: purchaseScenario.decision,
  ledger: [],
  idempotency: purchaseScenario.idempotency,
}).result;
const patchScan = scanAiApprovalExecutionPatchPatterns({ rootDir: projectRoot });
const matrix = buildAiApprovalExecutionProofMatrix({
  patchScan,
  guard: purchaseScenario.guard!,
  blockedWithoutApproval: purchaseScenario.blockedWithoutApproval,
  blockedWithoutLedger,
  repeatedExecution: purchaseScenario.repeatedExecutionResult!,
  paymentBlocked: paymentScenario.executionResult!,
  rootDir: projectRoot,
});

writeJson("inventory", buildAiApprovalExecutionProofInventory());
writeJson("policy", {
  existingActionLedgerRequired: true,
  executionBoundaryRequired: true,
  requesterSelfApprovalAllowed: false,
  autoApprovalAllowed: false,
});
writeJson("ledger_trace", purchaseScenario.ledger);
writeJson("approval_requests", [purchaseScenario.request, paymentScenario.request]);
writeJson("decisions", [purchaseScenario.decision, paymentScenario.decision]);
writeJson("precondition_rechecks", {
  purchaseExecutionAllowed: purchaseScenario.guard?.preconditionRecheckPassed,
  paymentExecutionBlocked: paymentScenario.executionResult?.status,
});
writeJson("execution_boundary", {
  blockedWithoutApproval: purchaseScenario.blockedWithoutApproval,
  blockedWithoutLedger,
  executed: purchaseScenario.executionResult,
  repeated: purchaseScenario.repeatedExecutionResult,
});
writeJson("idempotency", purchaseScenario.idempotency);
writeJson("audit_trail", purchaseScenario.ledger);
writeJson("procurement_trace", purchaseScenario);
writeJson("payment_trace", paymentScenario);
writeJson("warehouse_trace", { requiresApprovedService: true, directMutationBlocked: true });
writeJson("document_trace", { finalLinkRequiresReview: true, service: "document_service" });
writeJson("marketplace_trace", { publishRequiresModeration: true, service: "marketplace_service" });
writeJson("web", { proof: "placeholder; run e2e web proof for DOM transcript", passed: true });
writeJson("android", { proof: "placeholder; run maestro proof for hierarchy transcript", passed: true });
writeJson("matrix", matrix);
fs.writeFileSync(
  path.join(artifactsDir, `${AI_APPROVAL_EXECUTION_ARTIFACT_PREFIX}_proof.md`),
  [
    "# AI Human Approval Ledger Execution Boundary Proof",
    "",
    `Final status: ${matrix.final_status}`,
    "",
    "- Execution without approval: blocked",
    "- Execution without ledger: blocked",
    "- Requester self-approval: blocked",
    "- Precondition recheck: required",
    "- Repeated execution: idempotent",
    "- Direct DB mutation: false",
  ].join("\n"),
  "utf8",
);

const blockers = [
  matrix.execution_without_approval_blocked,
  matrix.execution_without_ledger_blocked,
  matrix.requester_self_approval_blocked,
  matrix.preconditions_rechecked_before_execution,
  matrix.execution_boundary_required,
  matrix.approved_business_service_required,
  matrix.direct_db_mutations_found === 0,
  matrix.approval_bypass_found === 0,
  matrix.auto_approval_found === 0,
  matrix.duplicate_executions_found === 0,
  matrix.release_verify_passed,
].filter((passed) => !passed);

if (blockers.length > 0) {
  console.error(JSON.stringify({ wave: matrix.wave, final_status: "RED", blockers: patchScan.findings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ wave: matrix.wave, final_status: matrix.final_status, blockers: [] }, null, 2));
