import { AI_BUTTON_ACTION_REGISTRY } from "../../src/features/ai/appGraph/aiButtonActionRegistry";
import { AI_MAJOR_SCREEN_IDS, AI_SCREEN_ACTION_REGISTRY } from "../../src/features/ai/appGraph/aiScreenActionRegistry";

describe("AI app action graph registry", () => {
  it("registers every major screen with role, entity, intent, evidence, and approval metadata", () => {
    const screens = new Map(AI_SCREEN_ACTION_REGISTRY.map((entry) => [entry.screenId, entry]));

    for (const screenId of AI_MAJOR_SCREEN_IDS) {
      const entry = screens.get(screenId);
      expect(entry).toBeDefined();
      expect(entry?.allowedRoles.length).toBeGreaterThan(0);
      expect(entry?.businessEntities.length).toBeGreaterThan(0);
      expect(entry?.allowedIntents.length).toBeGreaterThan(0);
      expect(entry?.evidenceRequired).toBe(true);
      expect(entry?.source).toBe("app_action_graph_registry_v1");
    }
  });

  it("maps every AI relevant button to domain, intent, risk, roles, and evidence requirements", () => {
    expect(AI_BUTTON_ACTION_REGISTRY.length).toBeGreaterThanOrEqual(AI_MAJOR_SCREEN_IDS.length);

    for (const button of AI_BUTTON_ACTION_REGISTRY) {
      expect(button.screenId).toBeTruthy();
      expect(button.buttonId).toBeTruthy();
      expect(button.testId).toBeTruthy();
      expect(button.domain).toBeTruthy();
      expect(button.intent).toBeTruthy();
      expect(button.riskLevel).toBeTruthy();
      expect(button.sourceEntities.length).toBeGreaterThan(0);
      expect(button.evidenceRequired).toBe(true);
    }
  });

  it("requires approval for risky actions and keeps forbidden actions tool-less", () => {
    const risky = AI_BUTTON_ACTION_REGISTRY.filter((button) => button.riskLevel === "approval_required");
    const forbidden = AI_BUTTON_ACTION_REGISTRY.filter((button) => button.riskLevel === "forbidden");

    expect(risky.length).toBeGreaterThan(0);
    expect(risky.every((button) => button.approvalRequired === true)).toBe(true);
    expect(forbidden.length).toBeGreaterThan(0);
    expect(forbidden.every((button) => button.requiredTool === undefined)).toBe(true);
  });
});
