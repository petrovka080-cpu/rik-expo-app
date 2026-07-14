import { operationObjectAudit } from "./confusionFirewallTestHelpers";

describe("masonryRequiresMasonryObject", () => {
  it("requires a masonry object before selecting masonry", () => {
    const audit = operationObjectAudit();

    expect(audit.masonry_requires_masonry_object).toBe(true);
    expect(audit.masonry_without_masonry_object_matches).toBe(0);
  });
});
