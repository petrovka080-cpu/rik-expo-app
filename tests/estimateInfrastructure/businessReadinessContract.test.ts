import { validateAiEstimateBusinessReadiness } from "../../src/lib/platform/validateAiEstimateBusinessReadiness";

describe("AI estimate business readiness contract", () => {
  it("keeps owner approval, production release and contract total unclaimed", () => {
    const validation = validateAiEstimateBusinessReadiness();

    expect(validation.business_readiness_contract_created).toBe(true);
    expect(validation.owner_approval_not_faked).toBe(true);
    expect(validation.production_release_not_started).toBe(true);
    expect(validation.contract_total_not_claimed).toBe(true);
    expect(validation.known_limitations_visible).toBe(true);
    expect(validation.kill_switch_available).toBe(true);
    expect(validation.support_playbook_available).toBe(true);
    expect(validation.passed).toBe(true);
  });

  it("hard fails if approval or limitations are faked", () => {
    const validation = validateAiEstimateBusinessReadiness({
      technicalPilotReady: true,
      ownerApproved: true as false,
      productionReleaseStarted: false,
      contractTotalClaimed: false,
      controlledPilotAllowed: true,
      publicBetaAllowed: false,
      knownLimitationsVisible: false,
      pricebookLimitationsVisible: true,
      highRiskWorkLimitationsVisible: true,
      killSwitchAvailable: true,
      rollbackPlanAvailable: true,
      supportPlaybookAvailable: true,
    });

    expect(validation.passed).toBe(false);
    expect(validation.owner_approved_true_without_owner).toBe(true);
    expect(validation.known_limitations_hidden).toBe(true);
  });
});
