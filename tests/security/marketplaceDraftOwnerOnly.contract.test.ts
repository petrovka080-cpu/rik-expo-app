import { buildRlsDynamicCrossTenantReport, RLS_TARGET_GROUPS } from "../../scripts/audit/rlsDynamicCrossTenant.shared";

describe("RLS marketplace draft owner-only contract", () => {
  it("distinguishes draft marketplace listings from published safe public rows", () => {
    const report = buildRlsDynamicCrossTenantReport();
    const marketplaceGroup = RLS_TARGET_GROUPS.find((group) => group.logicalName === "marketplace_listings");
    const attempts = report.crossTenantAttempts.attempts as Array<Record<string, unknown>>;

    expect(marketplaceGroup).toMatchObject({
      actualTables: expect.arrayContaining(["market_listings"]),
      requiredAssertions: expect.arrayContaining(["draft_owner_only", "public_marketplace_only_published_safe_fields"]),
    });
    expect(attempts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actor: "anonymous_public",
          relation: "market_listings:draft",
          operation: "select",
          expected: "blocked",
        }),
        expect.objectContaining({
          actor: "anonymous_public",
          relation: "market_listings:published_safe",
          operation: "select",
          expected: "allowed_safe_fields_only",
        }),
      ]),
    );
  });
});
