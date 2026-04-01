import {
  ADD_LISTING_ROUTE,
  AUTH_LOGIN_ROUTE,
  buildAddListingRoute,
  buildAssistantRoute,
  buildAuctionDetailRoute,
  buildChatRoute,
  buildSupplierMapRoute,
  buildSupplierShowcaseRoute,
  DIRECTOR_ROUTE,
  MARKET_AUCTIONS_ROUTE,
  MARKET_TAB_ROUTE,
  REPORTS_AI_ASSISTANT_ROUTE,
  REPORTS_DASHBOARD_ROUTE,
  REPORTS_MODULE_ROUTES,
  SELLER_ROUTE,
  SUPPLIER_MAP_ROUTE,
  SUPPLIER_SHOWCASE_ROUTE,
} from "./coreRoutes";

describe("coreRoutes", () => {
  it("keeps stable string routes for core entry points", () => {
    expect(AUTH_LOGIN_ROUTE).toBe("/auth/login");
    expect(DIRECTOR_ROUTE).toBe("/director");
    expect(ADD_LISTING_ROUTE).toBe("/(tabs)/add");
    expect(MARKET_TAB_ROUTE).toBe("/(tabs)/market");
    expect(MARKET_AUCTIONS_ROUTE).toBe("/auctions");
    expect(REPORTS_DASHBOARD_ROUTE).toBe("/reports/dashboard");
    expect(REPORTS_AI_ASSISTANT_ROUTE).toBe("/reports/ai-assistant");
    expect(SELLER_ROUTE).toBe("/seller");
    expect(SUPPLIER_MAP_ROUTE).toBe("/supplierMap");
    expect(SUPPLIER_SHOWCASE_ROUTE).toBe("/supplierShowcase");
  });

  it("builds deep routes with explicit params", () => {
    expect(buildAuctionDetailRoute("auction-1")).toEqual({
      pathname: "/auction/[id]",
      params: { id: "auction-1" },
    });
    expect(buildChatRoute({ listingId: "listing-1", title: "Test" })).toEqual({
      pathname: "/chat",
      params: { listingId: "listing-1", title: "Test" },
    });
  });

  it("builds assistant routes without route hacks", () => {
    expect(buildAssistantRoute({ context: "market", prompt: "hello" })).toEqual({
      pathname: "/(tabs)/ai",
      params: { context: "market", prompt: "hello" },
    });
    expect(buildAssistantRoute({ context: "profile", prompt: "hello", autoSend: "1" })).toEqual({
      pathname: "/(tabs)/ai",
      params: { context: "profile", prompt: "hello", autoSend: "1" },
    });
  });

  it("keeps showcase and map helpers typed on optional params", () => {
    expect(buildAddListingRoute()).toBe(ADD_LISTING_ROUTE);
    expect(buildAddListingRoute({ entry: "seller" })).toEqual({
      pathname: "/(tabs)/add",
      params: { entry: "seller" },
    });
    expect(buildSupplierShowcaseRoute()).toBe("/supplierShowcase");
    expect(buildSupplierShowcaseRoute({ userId: "user-1", companyId: "company-1" })).toEqual({
      pathname: "/supplierShowcase",
      params: { userId: "user-1", companyId: "company-1" },
    });
    expect(buildSupplierMapRoute()).toBe("/supplierMap");
    expect(buildSupplierMapRoute({ side: "demand", city: "Bishkek" })).toEqual({
      pathname: "/supplierMap",
      params: { side: "demand", city: "Bishkek" },
    });
  });

  it("maps reports hub cards to typed routes", () => {
    expect(REPORTS_MODULE_ROUTES.dashboard).toBe(REPORTS_DASHBOARD_ROUTE);
    expect(REPORTS_MODULE_ROUTES["ai-assistant"]).toBe(REPORTS_AI_ASSISTANT_ROUTE);
  });
});
