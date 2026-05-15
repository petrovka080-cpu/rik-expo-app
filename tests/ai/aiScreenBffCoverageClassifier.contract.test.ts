import {
  getAiScreenButtonRoleActionEntry,
  listAiScreenButtonRoleActionEntries,
} from "../../src/features/ai/screenAudit/aiScreenButtonRoleActionRegistry";
import {
  classifyAiScreenBffCoverage,
  hasUnsafeDirectClientAccess,
} from "../../src/features/ai/screenAudit/aiScreenBffCoverageClassifier";

describe("AI screen BFF coverage classifier", () => {
  it("distinguishes covered read, draft, and approval routes", () => {
    expect(
      classifyAiScreenBffCoverage(getAiScreenButtonRoleActionEntry("ai.command_center", "ai.command_center.safe_read")!),
    ).toContain("covered_read_route");
    expect(
      classifyAiScreenBffCoverage(getAiScreenButtonRoleActionEntry("ai.command_center", "ai.command_center.draft")!),
    ).toContain("covered_draft_route");
    expect(
      classifyAiScreenBffCoverage(getAiScreenButtonRoleActionEntry("ai.command_center", "ai.command_center.approval")!),
    ).toContain("covered_approval_route");
  });

  it("reports missing domain-specific BFF routes as gaps", () => {
    const marketSafeRead = getAiScreenButtonRoleActionEntry("market.home", "market.home.safe_read")!;
    const securityDraft = getAiScreenButtonRoleActionEntry("security.screen", "security.screen.draft")!;
    const financeApproval = getAiScreenButtonRoleActionEntry("accountant.payment", "accountant.payment.approval")!;

    expect(classifyAiScreenBffCoverage(marketSafeRead)).toEqual(
      expect.arrayContaining(["covered_read_route", "missing_read_route"]),
    );
    expect(classifyAiScreenBffCoverage(securityDraft)).toEqual(
      expect.arrayContaining(["covered_draft_route", "missing_draft_route"]),
    );
    expect(classifyAiScreenBffCoverage(financeApproval)).toEqual(
      expect.arrayContaining(["covered_approval_route", "missing_approval_route"]),
    );
  });

  it("does not contain unsafe direct client mutation paths in the audit registry", () => {
    expect(listAiScreenButtonRoleActionEntries().filter(hasUnsafeDirectClientAccess)).toHaveLength(0);
  });
});
