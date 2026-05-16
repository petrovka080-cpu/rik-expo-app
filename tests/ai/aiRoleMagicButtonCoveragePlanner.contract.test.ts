import {
  listAiRoleMagicBlueprintButtonLabels,
  listAiRoleMagicButtonCoveragePlans,
} from "../../src/features/ai/roleMagic/aiRoleMagicButtonCoveragePlanner";

describe("AI role magic button coverage planner", () => {
  it("maps role blueprint buttons to safe, draft, approval and forbidden audited action plans", () => {
    const plans = listAiRoleMagicButtonCoveragePlans();

    expect(plans).toHaveLength(12);
    expect(plans.every((plan) => plan.missingActionIds.length === 0)).toBe(true);
    expect(plans.every((plan) => plan.safeReadActions > 0)).toBe(true);
    expect(plans.every((plan) => plan.draftOnlyActions > 0)).toBe(true);
    expect(plans.every((plan) => plan.approvalRequiredActions > 0)).toBe(true);
    expect(plans.every((plan) => plan.forbiddenActions > 0)).toBe(true);
    expect(plans.flatMap((plan) => plan.actions).every((action) => action.routeDisposition !== undefined)).toBe(true);
  });

  it("keeps user-visible buttons in the blueprint instead of a registry-only artifact", () => {
    const labels = listAiRoleMagicBlueprintButtonLabels();

    expect(labels).toContain("Prepare rationale");
    expect(labels).toContain("Compare suppliers");
    expect(labels).toContain("Show deficit");
  });
});
