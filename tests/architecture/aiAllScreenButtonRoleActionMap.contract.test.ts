import fs from "node:fs";
import path from "node:path";

import { buildAiScreenAuditSummary } from "../../src/features/ai/screenAudit/aiScreenAuditSummary";
import {
  AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS,
  listAiScreenButtonRoleActionEntries,
} from "../../src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("S_AI_AUDIT_02 all-screen button role action map architecture", () => {
  it("builds a green audit summary without provider calls, DB writes, fake cards, or UI changes", () => {
    const summary = buildAiScreenAuditSummary();

    expect(summary).toMatchObject({
      ok: true,
      finalStatus: "GREEN_AI_ALL_SCREEN_BUTTON_ROLE_ACTION_MAP_READY",
      fakeAiCardsAdded: false,
      uiChanged: false,
      hooksAdded: false,
      dbWritesUsed: false,
      providerCalled: false,
      secretsPrinted: false,
      rawRowsPrinted: false,
      fakeGreenClaimed: false,
      unsafeDirectMutationPaths: 0,
    });
    expect(summary.screensAudited).toBe(AI_ALL_SCREEN_BUTTON_ROLE_ACTION_REQUIRED_SCREEN_IDS.length);
    expect(summary.actionsAudited).toBeGreaterThanOrEqual(100);
  });

  it("keeps the new audit layer deterministic and source-only", () => {
    for (const file of [
      "src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry.ts",
      "src/features/ai/screenAudit/aiScreenButtonOpportunityClassifier.ts",
      "src/features/ai/screenAudit/aiScreenForbiddenActionPolicy.ts",
      "src/features/ai/screenAudit/aiScreenBffCoverageClassifier.ts",
      "src/features/ai/screenAudit/aiScreenAuditSummary.ts",
      "scripts/ai/auditAllScreenButtonRoleActionMap.ts",
    ]) {
      const source = read(file);
      expect(source).not.toMatch(/@google\/generative-ai|openai|Gemini|modelProvider|createClient\(|\.from\(|insert\(|update\(|delete\(/);
      expect(source).not.toMatch(/testID\s*=/);
    }
  });

  it("reports missing BFF routes and route-missing screens honestly", () => {
    const entries = listAiScreenButtonRoleActionEntries();
    const missingBffRoutes = entries.flatMap((entry) => entry.missingBffRoutes);
    const routeMissingScreens = [...new Set(entries.filter((entry) => entry.routeStatus === "route_missing_or_not_registered").map((entry) => entry.screenId))];

    expect(missingBffRoutes.length).toBeGreaterThan(0);
    expect(routeMissingScreens).toContain("documents.main");
    expect(entries.every((entry) => entry.actionKind !== "unknown_needs_audit")).toBe(true);
  });
});
