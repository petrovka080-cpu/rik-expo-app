import {
  AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS,
  listAiScreenButtonRoleActionEntries,
  listAiScreenButtonRoleActionEntriesForScreen,
} from "../../src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry";

describe("AI all-screen button role action registry", () => {
  const entries = listAiScreenButtonRoleActionEntries();

  it("inventories every required screen with deterministic action ids", () => {
    const screenIds = [...new Set(entries.map((entry) => entry.screenId))].sort();

    expect(screenIds).toEqual(expect.arrayContaining([...AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS]));
    expect(screenIds).toHaveLength(AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS.length);

    for (const screenId of AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS) {
      const screenEntries = listAiScreenButtonRoleActionEntriesForScreen(screenId);
      expect(screenEntries.length).toBeGreaterThanOrEqual(4);
      expect(screenEntries.every((entry) => entry.roleScope.length > 0)).toBe(true);
      expect(screenEntries.every((entry) => entry.visibleButtons.length > 0)).toBe(true);
      expect(screenEntries.every((entry) => entry.evidenceSources.length > 0)).toBe(true);
    }
  });

  it("has no duplicate action ids per screen", () => {
    for (const screenId of AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS) {
      const actionIds = listAiScreenButtonRoleActionEntriesForScreen(screenId).map((entry) => entry.actionId);
      expect(new Set(actionIds).size).toBe(actionIds.length);
    }
  });

  it("separates safe read, draft, approval, and forbidden actions", () => {
    const kinds = new Set(entries.map((entry) => entry.actionKind));

    expect(kinds).toEqual(new Set(["safe_read", "draft_only", "approval_required", "forbidden"]));
    expect(entries.filter((entry) => entry.actionKind === "forbidden").every((entry) => entry.forbiddenReason)).toBe(
      true,
    );
    expect(
      entries
        .filter((entry) => entry.actionKind === "approval_required")
        .every((entry) => entry.mutationRisk === "approval_required" && entry.aiOpportunity === "submit_for_approval"),
    ).toBe(true);
  });

  it("reports missing BFF coverage instead of hiding gaps", () => {
    const missingRouteEntries = entries.filter((entry) => entry.missingBffRoutes.length > 0);

    expect(missingRouteEntries.length).toBeGreaterThan(0);
    expect(missingRouteEntries.every((entry) => entry.bffCoverage.length > 0)).toBe(true);
    expect(entries.some((entry) => entry.screenId === "documents.main" && entry.routeStatus === "route_missing_or_not_registered")).toBe(
      true,
    );
  });
});
