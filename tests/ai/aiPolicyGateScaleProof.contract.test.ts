import {
  AI_POLICY_GATE_SCALE_ACTIONS,
  AI_POLICY_GATE_SCALE_ROLES,
  AI_POLICY_GATE_SCALE_SCREENS,
  runAiPolicyGateScaleProof,
} from "../../scripts/ai/aiPolicyGateScaleProof";

describe("ai policy gate scale proof", () => {
  it("evaluates a deterministic 10k role/screen/action matrix without side effects", () => {
    const result = runAiPolicyGateScaleProof();

    expect(result.final_status).toBe("GREEN_AI_POLICY_GATE_SCALE_PROOF_READY");
    expect(result.deterministic10kDecisions).toBe(true);
    expect(result.metrics.totalDecisions).toBeGreaterThanOrEqual(10_000);
    expect(result.rolesCovered).toEqual(AI_POLICY_GATE_SCALE_ROLES);
    expect(result.screensCovered).toEqual(AI_POLICY_GATE_SCALE_SCREENS);
    expect(result.actionsCovered).toEqual(AI_POLICY_GATE_SCALE_ACTIONS.map((scenario) => scenario.action));
    expect(result.missingScreenRuntimeEntries).toEqual([]);
    expect(result.metrics.modelCalls).toBe(0);
    expect(result.metrics.dbCalls).toBe(0);
    expect(result.metrics.externalFetches).toBe(0);
    expect(result.metrics.mutations).toBe(0);
  });

  it("keeps core role-scope and approval invariants green at scale", () => {
    const { metrics } = runAiPolicyGateScaleProof();

    expect(metrics.explicitProof).toMatchObject({
      unknownRoleDenied: true,
      contractorOwnRecordsOnly: true,
      buyerNoFinanceMutation: true,
      accountantNoSupplierConfirmation: true,
      warehouseNoFinanceAccess: true,
      foremanNoFullCompanyFinance: true,
      directorControlNoSilentMutation: true,
      forbiddenAlwaysDenied: true,
      approvalRequiredNeverDirectExecutes: true,
      executeApprovedGateOnly: true,
    });
    expect(metrics.toolPlanProof).toMatchObject({
      allRegisteredToolsPlanned: true,
      noDirectToolExecution: true,
      noToolMutation: true,
      noToolProviderCall: true,
      noToolDbAccess: true,
      noToolRawRows: true,
      noToolRawPromptStorage: true,
    });
  });
});
