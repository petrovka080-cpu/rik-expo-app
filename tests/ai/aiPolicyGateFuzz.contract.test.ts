import {
  AI_POLICY_GATE_SCALE_ACTIONS,
  AI_POLICY_GATE_SCALE_ROLES,
  AI_POLICY_GATE_SCALE_SCREENS,
  evaluateAiPolicyGateScaleDecision,
  runAiPolicyGateScaleProof,
} from "../../scripts/ai/aiPolicyGateScaleProof";

describe("ai policy gate deterministic fuzz proof", () => {
  it("keeps every sampled decision read-only and non-mutating", () => {
    const result = runAiPolicyGateScaleProof();

    expect(result.decisions).toHaveLength(result.metrics.totalDecisions);
    expect(result.decisions.every((decision) => decision.providerCallAllowed === false)).toBe(true);
    expect(result.decisions.every((decision) => decision.dbCallAllowed === false)).toBe(true);
    expect(result.decisions.every((decision) => decision.externalFetchAllowed === false)).toBe(true);
    expect(result.decisions.every((decision) => decision.mutationCount === 0)).toBe(true);
    expect(result.decisions.every((decision) => decision.finalMutationAllowed === false)).toBe(true);
    expect(result.decisions.every((decision) => decision.directExecutionAllowed === false)).toBe(true);
  });

  it("has stable coverage counts for the deterministic fuzz dimensions", () => {
    const result = runAiPolicyGateScaleProof();
    const repetitionCount =
      result.metrics.totalDecisions /
      (AI_POLICY_GATE_SCALE_ROLES.length *
        AI_POLICY_GATE_SCALE_SCREENS.length *
        AI_POLICY_GATE_SCALE_ACTIONS.length);

    for (const role of AI_POLICY_GATE_SCALE_ROLES) {
      expect(result.metrics.decisionsByRole[role]).toBe(
        AI_POLICY_GATE_SCALE_SCREENS.length * AI_POLICY_GATE_SCALE_ACTIONS.length * repetitionCount,
      );
    }
    for (const screenId of AI_POLICY_GATE_SCALE_SCREENS) {
      expect(result.metrics.decisionsByScreen[screenId]).toBe(
        AI_POLICY_GATE_SCALE_ROLES.length * AI_POLICY_GATE_SCALE_ACTIONS.length * repetitionCount,
      );
    }
    for (const scenario of AI_POLICY_GATE_SCALE_ACTIONS) {
      expect(result.metrics.decisionsByAction[scenario.action]).toBe(
        AI_POLICY_GATE_SCALE_ROLES.length * AI_POLICY_GATE_SCALE_SCREENS.length * repetitionCount,
      );
    }
  });

  it("denies unknown-role samples and execute-approved direct execution samples", () => {
    const executeScenario = AI_POLICY_GATE_SCALE_ACTIONS.find((scenario) => scenario.action === "execute_approved");
    expect(executeScenario).toBeDefined();

    for (const screenId of AI_POLICY_GATE_SCALE_SCREENS) {
      for (const scenario of AI_POLICY_GATE_SCALE_ACTIONS) {
        const unknownDecision = evaluateAiPolicyGateScaleDecision({
          index: 0,
          iteration: 0,
          role: "unknown",
          screenId,
          scenario,
        });
        expect(unknownDecision.allowed).toBe(false);
      }
    }

    for (const role of AI_POLICY_GATE_SCALE_ROLES) {
      const executeDecision = evaluateAiPolicyGateScaleDecision({
        index: 1,
        iteration: 0,
        role,
        screenId: "director.dashboard",
        scenario: executeScenario ?? AI_POLICY_GATE_SCALE_ACTIONS[0],
      });
      expect(executeDecision.approvalGateOnly).toBe(true);
      expect(executeDecision.directExecutionAllowed).toBe(false);
      expect(executeDecision.finalMutationAllowed).toBe(false);
    }
  });
});
