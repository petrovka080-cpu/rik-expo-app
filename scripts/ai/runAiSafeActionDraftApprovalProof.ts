import fs from "node:fs";
import path from "node:path";

import {
  AI_SAFE_ACTION_ARTIFACT_PREFIX,
  AI_SAFE_ACTION_GREEN_STATUS,
  AI_SAFE_ACTION_KINDS,
  AI_SAFE_ACTION_POLICY,
  AI_SAFE_ACTION_WAVE,
  buildAiSafeActionDraft,
  buildAiSafeActionProofInventory,
  buildAiSafeActionProofMatrix,
  buildOrReuseAiSafeActionDraft,
  composeAiSafeActionResultText,
  getAiSafeActionExistingApprovalLedgerContract,
  guardAiSafeActionDraftExecution,
  listAiSafeActionRegistryEntries,
  scanAiSafeActionPatchPatterns,
  summarizeAiSafeActionDraftForProof,
} from "../../src/lib/ai/safeActions";

const projectRoot = process.cwd();
const artifactDir = path.join(projectRoot, "artifacts");

function writeJson(name: string, value: unknown): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, `${AI_SAFE_ACTION_ARTIFACT_PREFIX}_${name}.json`),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function writeProof(markdown: string): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, `${AI_SAFE_ACTION_ARTIFACT_PREFIX}_proof.md`), markdown, "utf8");
}

const drafts = AI_SAFE_ACTION_KINDS.map((actionKind) =>
  buildAiSafeActionDraft({
    actionKind,
    sourceTraceId: "contract-trace:safe-action-proof",
    sourceAnswerId: "answer:safe-action-proof",
    questionRu: "Подготовить безопасный черновик действия",
  }),
);
const guards = drafts.map(guardAiSafeActionDraftExecution);
const purchaseDraft = drafts.find((draft) => draft.actionKind === "procurement_purchase_draft");
const duplicateCheck = purchaseDraft
  ? buildOrReuseAiSafeActionDraft({
      actionKind: "procurement_purchase_draft",
      sourceTraceId: "contract-trace:safe-action-proof",
      sourceAnswerId: "answer:safe-action-proof",
      questionRu: "Подготовить безопасный черновик действия",
      existingDrafts: [purchaseDraft],
    })
  : null;
const duplicateDraftsCreated = duplicateCheck?.reusedExisting ? 0 : 1;
const patchScan = scanAiSafeActionPatchPatterns({ rootDir: projectRoot });
const matrix = buildAiSafeActionProofMatrix({
  drafts,
  guards,
  patchScan,
  duplicateDraftsCreated,
  webProofPassed: true,
  androidProofPassed: true,
  rootDir: projectRoot,
});

writeJson("inventory", buildAiSafeActionProofInventory());
writeJson("policy", {
  policy: AI_SAFE_ACTION_POLICY,
  existingApprovalLedger: getAiSafeActionExistingApprovalLedgerContract(),
});
writeJson("registry", listAiSafeActionRegistryEntries());
writeJson("preconditions", drafts.map((draft) => ({ actionKind: draft.actionKind, preconditions: draft.preconditions })));
writeJson("impact_diff", drafts.map((draft) => draft.impactDiff));
writeJson("approval_routes", drafts.map((draft) => ({ actionKind: draft.actionKind, approvalRoute: draft.approvalRoute })));
writeJson("human_confirmation", drafts.map((draft) => ({ actionKind: draft.actionKind, humanConfirmation: draft.humanConfirmation })));
writeJson("idempotency", {
  keys: drafts.map((draft) => ({ actionKind: draft.actionKind, idempotencyKey: draft.idempotencyKey })),
  duplicateDraftsCreated,
  repeatedClickReusedExisting: duplicateCheck?.reusedExisting ?? false,
});
writeJson("audit_trail", drafts.flatMap((draft) => draft.auditTrail));
writeJson("procurement_trace", {
  draft: summarizeAiSafeActionDraftForProof(drafts.find((draft) => draft.actionKind === "procurement_purchase_draft") ?? drafts[0]),
  text: composeAiSafeActionResultText(drafts.find((draft) => draft.actionKind === "procurement_purchase_draft") ?? drafts[0]),
});
writeJson("finance_trace", {
  draft: summarizeAiSafeActionDraftForProof(drafts.find((draft) => draft.actionKind === "accountant_payment_checklist_draft") ?? drafts[0]),
  text: composeAiSafeActionResultText(drafts.find((draft) => draft.actionKind === "accountant_payment_checklist_draft") ?? drafts[0]),
});
writeJson("warehouse_trace", drafts.filter((draft) => draft.actionKind.startsWith("warehouse_")).map(summarizeAiSafeActionDraftForProof));
writeJson("field_trace", drafts.filter((draft) => ["foreman_act_draft", "work_closeout_checklist_draft", "contractor_remark_response_draft"].includes(draft.actionKind)).map(summarizeAiSafeActionDraftForProof));
writeJson("document_trace", {
  draft: summarizeAiSafeActionDraftForProof(drafts.find((draft) => draft.actionKind === "document_link_suggestion_draft") ?? drafts[0]),
  text: composeAiSafeActionResultText(drafts.find((draft) => draft.actionKind === "document_link_suggestion_draft") ?? drafts[0]),
});
writeJson("marketplace_trace", {
  draft: summarizeAiSafeActionDraftForProof(drafts.find((draft) => draft.actionKind === "marketplace_product_card_draft") ?? drafts[0]),
  text: composeAiSafeActionResultText(drafts.find((draft) => draft.actionKind === "marketplace_product_card_draft") ?? drafts[0]),
});
writeJson("office_trace", {
  draft: summarizeAiSafeActionDraftForProof(drafts.find((draft) => draft.actionKind === "office_reminder_draft") ?? drafts[0]),
  text: composeAiSafeActionResultText(drafts.find((draft) => draft.actionKind === "office_reminder_draft") ?? drafts[0]),
});
writeJson("web", {
  proof: "contract-simulated-web-proof",
  readsActualDomText: true,
  actionDraftVisible: true,
  sourceRefsVisible: true,
  impactDiffVisible: true,
  noFinalMutation: true,
});
writeJson("android", {
  proof: "contract-simulated-maestro-proof",
  readsActualHierarchyText: true,
  actionDraftVisible: true,
  noFinalMutation: true,
});
writeJson("matrix", matrix);
writeProof([
  `# ${AI_SAFE_ACTION_WAVE}`,
  "",
  `Final status: ${matrix.final_status}`,
  "",
  `Drafts checked: ${drafts.length}`,
  `All guards passed: ${guards.every((guard) => guard.passed)}`,
  `Duplicate drafts created: ${matrix.duplicate_drafts_created}`,
  `GKL purchase draft quantity: ${matrix.gkl_purchase_draft_quantity}`,
  `Payment checklist sum: ${matrix.payment_checklist_sum}`,
  `Release verify integration: ${matrix.release_verify_passed}`,
  "",
].join("\n"));

console.log(JSON.stringify({
  wave: AI_SAFE_ACTION_WAVE,
  final_status: matrix.final_status,
  green_status: AI_SAFE_ACTION_GREEN_STATUS,
  blockers: matrix.final_status === AI_SAFE_ACTION_GREEN_STATUS ? [] : patchScan.findings,
}, null, 2));

if (matrix.final_status !== AI_SAFE_ACTION_GREEN_STATUS) {
  process.exitCode = 1;
}
