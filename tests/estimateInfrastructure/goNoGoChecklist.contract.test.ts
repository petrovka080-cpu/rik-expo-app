import {
  buildAiEstimateGoNoGoChecklist,
  buildDefaultAiEstimateOwnerReviewChecklist,
} from "../../src/lib/platform/aiEstimateGoNoGoChecklist";

describe("AI estimate GO/NO-GO checklist", () => {
  it("requires owner decision pending and prevents agent auto-GO", () => {
    const checklist = buildDefaultAiEstimateOwnerReviewChecklist();

    expect(checklist.go_no_go_checklist_created).toBe(true);
    expect(checklist.technical_layers_checked).toBe(true);
    expect(checklist.owner_decision_pending).toBe(true);
    expect(checklist.go_cannot_be_auto_set_by_agent).toBe(true);
    expect(checklist.technical_pilot_ready).toBe(true);
  });

  it("does not treat owner GO as pending owner review", () => {
    const checklist = buildAiEstimateGoNoGoChecklist({
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
      ownerDecision: "OWNER_GO",
    });

    expect(checklist.owner_decision_pending).toBe(false);
    expect(checklist.technical_pilot_ready).toBe(false);
  });
});
