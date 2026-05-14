import { buildConstructionDecisionCard } from "../../src/features/ai/constructionKnowhow/constructionDecisionCardEngine";

describe("Construction decision card engine", () => {
  it("returns a structured professional decision card with approval boundary and no mutations", () => {
    const card = buildConstructionDecisionCard({
      roleId: "director_control",
      domainId: "procurement",
      observedSignals: ["requested material is not covered"],
      externalPreviewRequested: true,
    });

    expect(typeof card).toBe("object");
    expect(card.rolePerspective).toBe("director_control");
    expect(card.domain).toBe("procurement");
    expect(card.evidenceRefs.length).toBeGreaterThan(0);
    expect(card.riskLevel).toBe("high");
    expect(card.urgency).toBe("now");
    expect(card.recommendedActions.safeRead.length).toBeGreaterThan(0);
    expect(card.recommendedActions.draftOnly.length).toBeGreaterThan(0);
    expect(card.recommendedActions.approvalRequired.length).toBeGreaterThan(0);
    expect(card.recommendedActions.forbidden.map((action) => action.label)).toContain(
      "direct execution without approval",
    );
    expect(card.externalIntelStatus).toBe("available_preview_only");
    expect(card.mutationCount).toBe(0);
    expect(card.dbWrites).toBe(0);
    expect(JSON.stringify(card)).not.toMatch(/rawPrompt|providerPayload|rawDbRows/i);
  });

  it("blocks role-forbidden domain work without inventing data", () => {
    const card = buildConstructionDecisionCard({
      roleId: "contractor",
      domainId: "finance_cost_control",
    });

    expect(card.recommendedActions.safeRead).toHaveLength(0);
    expect(card.recommendedActions.forbidden.some((action) => action.blockedBy === "role_scope")).toBe(true);
    expect(card.evidenceRefs.every((ref) => ref.rawRowsReturned === false && ref.redacted === true)).toBe(true);
  });
});
