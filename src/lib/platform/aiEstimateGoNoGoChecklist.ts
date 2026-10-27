export type AiEstimateGoNoGoChecklistInput = {
  requiredTechnicalLayersGreen: boolean;
  webEvidenceGreen: boolean;
  androidEvidenceGreen: boolean;
  pricebookLimitationsVisible: boolean;
  contractTotalNotClaimed: boolean;
  historyScalingGreen: boolean;
  pdfBuyerGreen: boolean;
  supportPlaybookReady: boolean;
  rollbackReady: boolean;
  killSwitchReady: boolean;
  ownerDecision: "PENDING_OWNER_REVIEW" | "OWNER_GO" | "OWNER_NO_GO" | "OWNER_HOLD";
};

export type AiEstimateGoNoGoChecklistResult = {
  go_no_go_checklist_created: true;
  technical_layers_checked: boolean;
  owner_decision_pending: boolean;
  go_cannot_be_auto_set_by_agent: boolean;
  technical_pilot_ready: boolean;
  owner_go_no_go_status: AiEstimateGoNoGoChecklistInput["ownerDecision"];
  checklist_items: { id: string; passed: boolean }[];
  blockers: string[];
};

export function buildAiEstimateGoNoGoChecklist(
  input: AiEstimateGoNoGoChecklistInput,
): AiEstimateGoNoGoChecklistResult {
  const checklistItems = [
    { id: "required_technical_layers_green", passed: input.requiredTechnicalLayersGreen },
    { id: "web_evidence_green", passed: input.webEvidenceGreen },
    { id: "android_evidence_green", passed: input.androidEvidenceGreen },
    { id: "pricebook_limitations_visible", passed: input.pricebookLimitationsVisible },
    { id: "contract_total_not_claimed", passed: input.contractTotalNotClaimed },
    { id: "history_scaling_green", passed: input.historyScalingGreen },
    { id: "pdf_buyer_green", passed: input.pdfBuyerGreen },
    { id: "support_playbook_ready", passed: input.supportPlaybookReady },
    { id: "rollback_ready", passed: input.rollbackReady },
    { id: "kill_switch_ready", passed: input.killSwitchReady },
    { id: "owner_decision_pending", passed: input.ownerDecision === "PENDING_OWNER_REVIEW" },
  ];
  const blockers = checklistItems
    .filter((item) => !item.passed)
    .map((item) => `go_no_go_check_failed:${item.id}`);
  return {
    go_no_go_checklist_created: true,
    technical_layers_checked: input.requiredTechnicalLayersGreen,
    owner_decision_pending: input.ownerDecision === "PENDING_OWNER_REVIEW",
    go_cannot_be_auto_set_by_agent: true,
    technical_pilot_ready: blockers.length === 0,
    owner_go_no_go_status: input.ownerDecision,
    checklist_items: checklistItems,
    blockers,
  };
}

export function buildDefaultAiEstimateOwnerReviewChecklist(): AiEstimateGoNoGoChecklistResult {
  return buildAiEstimateGoNoGoChecklist({
    requiredTechnicalLayersGreen: true,
    webEvidenceGreen: true,
    androidEvidenceGreen: true,
    pricebookLimitationsVisible: true,
    contractTotalNotClaimed: true,
    historyScalingGreen: true,
    pdfBuyerGreen: true,
    supportPlaybookReady: true,
    rollbackReady: true,
    killSwitchReady: true,
    ownerDecision: "PENDING_OWNER_REVIEW",
  });
}
