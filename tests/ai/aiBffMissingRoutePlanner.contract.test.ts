import { planAiBffMissingRoutes } from "../../src/features/ai/bffCoverage/aiBffMissingRoutePlanner";

describe("AI BFF missing route planner", () => {
  it("extracts all 38 audited missing routes without turning forbidden sentinels into routes", () => {
    const plan = planAiBffMissingRoutes();

    expect(plan).toMatchObject({
      totalAuditedMissingRoutes: 38,
      documentedMissingRouteCount: 10,
      forbiddenRouteSentinelCount: 28,
      allMissingRoutesAccountedFor: true,
      routeCreationDeferredToDomainWaves: true,
      directClientAccessAllowed: false,
      dbWritesAllowed: false,
      liveMutationsAdded: false,
    });
    expect(plan.domains.flatMap((domain) => domain.items).every((item) => item.requiresRuntimeRouteNow === false)).toBe(true);
    expect(plan.domains.flatMap((domain) => domain.items).every((item) => item.allowsDirectClientAccess === false)).toBe(true);
  });

  it("groups documented missing endpoints by production domain", () => {
    const plan = planAiBffMissingRoutes();
    const finance = plan.domains.find((domain) => domain.domain === "finance");
    const market = plan.domains.find((domain) => domain.domain === "market_external_intel");
    const approval = plan.domains.find((domain) => domain.domain === "approval");

    expect(finance?.items.map((item) => item.route)).toContain("POST /agent/finance/payment/submit-for-approval");
    expect(market?.items.map((item) => item.route)).toEqual(
      expect.arrayContaining([
        "GET /agent/market/listing-context/:listingId",
        "GET /agent/supplier-showcase/:supplierId/context",
        "GET /agent/map/object-context/:objectId",
      ]),
    );
    expect(approval?.items.map((item) => item.route)).toEqual(
      expect.arrayContaining([
        "POST /agent/office/access-change/submit-for-approval",
        "GET /agent/security/context",
        "POST /agent/security/draft-review",
        "POST /agent/security/submit-for-approval",
      ]),
    );
  });

  it("keeps NO_ROUTE_ALLOWED entries forbidden and non-executable", () => {
    const plan = planAiBffMissingRoutes();
    const forbiddenItems = plan.domains
      .flatMap((domain) => domain.items)
      .filter((item) => item.disposition === "forbidden_no_route_allowed");

    expect(forbiddenItems).toHaveLength(28);
    expect(forbiddenItems.every((item) => item.route.startsWith("NO_ROUTE_ALLOWED:"))).toBe(true);
    expect(forbiddenItems.every((item) => item.allowsDbWrite === false)).toBe(true);
  });
});
