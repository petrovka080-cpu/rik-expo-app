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
  OFFICE_TAB_ROUTE,
  PROFILE_TAB_ROUTE,
  PUBLIC_REQUEST_NAVIGATION_ROUTE,
  PUBLIC_REQUEST_ROUTE,
  REPORTS_AI_ASSISTANT_ROUTE,
  REPORTS_DASHBOARD_ROUTE,
  REPORTS_MODULE_ROUTES,
  resolvePublicRequestDeepLinkTarget,
  SELLER_ROUTE,
  SUPPLIER_MAP_ROUTE,
  SUPPLIER_SHOWCASE_ROUTE,
} from "./coreRoutes";

describe("coreRoutes", () => {
  it("keeps stable string routes for core entry points", () => {
    expect(AUTH_LOGIN_ROUTE).toBe("/auth/login");
    expect(DIRECTOR_ROUTE).toBe("/office/director");
    expect(ADD_LISTING_ROUTE).toBe("/add");
    expect(MARKET_TAB_ROUTE).toBe("/(tabs)/market");
    expect(OFFICE_TAB_ROUTE).toBe("/(tabs)/office");
    expect(PROFILE_TAB_ROUTE).toBe("/(tabs)/profile");
    expect(PUBLIC_REQUEST_ROUTE).toBe("/(tabs)/request");
    expect(PUBLIC_REQUEST_NAVIGATION_ROUTE).toBe("/request");
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
      pathname: "/add",
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

  it("separates public request deep-link href from Expo Router tab navigation", () => {
    expect(resolvePublicRequestDeepLinkTarget("rik:///request?prompt=roof+120")).toEqual({
      pathname: PUBLIC_REQUEST_ROUTE,
      navigationPathname: PUBLIC_REQUEST_NAVIGATION_ROUTE,
      query: "?prompt=roof+120",
      href: "/(tabs)/request?prompt=roof+120",
      params: { prompt: "roof 120" },
      normalizedPath: "/request",
    });
  });
});
