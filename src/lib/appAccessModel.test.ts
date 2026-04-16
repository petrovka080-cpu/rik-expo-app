import {
  buildAppAccessModel,
  buildAppAccessSourceMap,
} from "./appAccessModel";

describe("appAccessModel", () => {
  it("builds market-only access for a plain market user", () => {
    const model = buildAppAccessModel({
      userId: "user-1",
      authRole: null,
      resolvedRole: null,
      usageMarket: false,
      usageBuild: false,
      ownedCompanyId: null,
      companyMemberships: [],
      listingsCount: 0,
    });

    expect(model).toMatchObject({
      hasMarketAccess: true,
      hasOfficeAccess: false,
      hasCompanyContext: false,
      hasSellerCapability: false,
      availableContexts: ["market"],
      activeContext: "market",
      availableOfficeRoles: [],
      activeOfficeRole: null,
    });
  });

  it("builds office access from usage_build even without explicit office role", () => {
    const model = buildAppAccessModel({
      userId: "user-2",
      authRole: null,
      resolvedRole: null,
      usageMarket: false,
      usageBuild: true,
      ownedCompanyId: null,
      companyMemberships: [],
      listingsCount: 0,
      requestedActiveContext: "office",
    });

    expect(model).toMatchObject({
      hasMarketAccess: true,
      hasOfficeAccess: true,
      hasCompanyContext: false,
      availableContexts: ["market", "office"],
      activeContext: "office",
      availableOfficeRoles: [],
      activeOfficeRole: null,
    });
  });

  it("builds mixed market and office access for a multi-context user", () => {
    const model = buildAppAccessModel({
      userId: "user-3",
      authRole: "director",
      resolvedRole: "director",
      usageMarket: true,
      usageBuild: true,
      ownedCompanyId: "company-1",
      companyMemberships: [{ companyId: "company-1", role: "director" }],
      listingsCount: 3,
      requestedActiveContext: "market",
    });

    expect(model).toMatchObject({
      hasMarketAccess: true,
      hasOfficeAccess: true,
      hasCompanyContext: true,
      hasSellerCapability: true,
      availableContexts: ["market", "office"],
      activeContext: "market",
      availableOfficeRoles: ["director"],
      activeOfficeRole: "director",
    });
  });

  it("keeps company context separate from office role", () => {
    const model = buildAppAccessModel({
      userId: "user-4",
      authRole: null,
      resolvedRole: null,
      usageMarket: true,
      usageBuild: false,
      ownedCompanyId: "company-2",
      companyMemberships: [],
      listingsCount: 1,
    });

    expect(model).toMatchObject({
      hasCompanyContext: true,
      hasOfficeAccess: false,
      availableOfficeRoles: [],
      activeOfficeRole: null,
      availableContexts: ["market"],
      activeContext: "market",
    });
  });

  it("uses office membership roles while preserving market access", () => {
    const model = buildAppAccessModel({
      userId: "user-5",
      authRole: "buyer",
      resolvedRole: "buyer",
      usageMarket: false,
      usageBuild: false,
      ownedCompanyId: null,
      companyMemberships: [
        { companyId: "company-3", role: "buyer" },
        { companyId: "company-3", role: "accountant" },
      ],
      listingsCount: 0,
      requestedActiveContext: "office",
    });

    expect(model).toMatchObject({
      hasMarketAccess: true,
      hasOfficeAccess: true,
      hasCompanyContext: true,
      hasSellerCapability: false,
      availableContexts: ["market", "office"],
      activeContext: "office",
      availableOfficeRoles: ["buyer", "accountant"],
      activeOfficeRole: "buyer",
    });
  });

  it("prefers company membership as the active office role when profile/RPC role drifts", () => {
    const model = buildAppAccessModel({
      userId: "user-5b",
      authRole: "contractor",
      resolvedRole: "contractor",
      usageMarket: false,
      usageBuild: true,
      ownedCompanyId: null,
      companyMemberships: [{ companyId: "company-3", role: "buyer" }],
      listingsCount: 0,
      requestedActiveContext: "office",
    });

    expect(model.availableOfficeRoles).toEqual(["buyer", "contractor"]);
    expect(model.activeOfficeRole).toBe("buyer");
  });

  it("returns an explicit source map for legacy mixed truth inputs", () => {
    const sourceMap = buildAppAccessSourceMap({
      userId: "user-6",
      authRole: "director",
      resolvedRole: "director",
      usageMarket: true,
      usageBuild: true,
      ownedCompanyId: "company-9",
      companyMemberships: [{ companyId: "company-9", role: "director" }],
      listingsCount: 2,
    });

    expect(sourceMap.identity.userId).toBe("user-6");
    expect(sourceMap.duplicatedTruths).toContain("auth_metadata_role + rpc_role");
    expect(sourceMap.duplicatedTruths).toContain("company_ownership + company_membership");
    expect(sourceMap.fakeModeSources).toContain("usage_market");
    expect(sourceMap.fakeModeSources).toContain("route_implicit_context");
  });
});
