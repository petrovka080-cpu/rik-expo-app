import { buildAiRoleWorkflowContext } from "../../src/lib/ai/roleBusinessCopilots";

describe("S_AI_ROLE_BUSINESS_COPILOTS_FULL_WORKFLOWS: context builder", () => {
  it("exposes the golden linked business refs needed by workflows", () => {
    const context = buildAiRoleWorkflowContext();
    expect(context.dataset.purpose).toBe("deterministic_evaluation_only_not_production_user_data");
    expect(context.dataset.procurement.may2026Total).toBe(14);
    expect(context.dataset.warehouse.gkl.shortageSheets).toBe(60);
    expect(Object.values(context.sourceRefIds).every(Boolean)).toBe(true);
    expect(context.sourceRefs.length).toBeGreaterThanOrEqual(Object.keys(context.sourceRefIds).length);
  });
});
