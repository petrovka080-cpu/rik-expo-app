import fs from "fs";

describe("global estimate consumer isolation architecture", () => {
  it("does not route global estimate B2C drafts through Office/B2B data", () => {
    const source = fs.readFileSync("src/lib/consumerRequests/consumerRequestGlobalEstimateIntegration.ts", "utf8");

    expect(source).not.toMatch(/from\s+["'][^"']*(office|warehouse|finance|company)/i);
    expect(source).not.toMatch(/orgId:\s*(?!null)/i);
    expect(source).toContain("createConsumerRepairRequestDraft");
    expect(source).toContain("GLOBAL_ESTIMATE_B2C_DRAFT_MUST_NOT_LINK_OFFICE_OR_COMPANY");
  });
});
