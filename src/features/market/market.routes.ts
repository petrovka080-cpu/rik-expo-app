import type { Href } from "expo-router";

import type { MarketMapParams } from "./marketHome.types";

export const MARKET_TAB_ROUTE = "/(tabs)/market" satisfies Href;
export const MARKET_PROFILE_ROUTE = "/(tabs)/profile" satisfies Href;
export const MARKET_AUCTIONS_ROUTE = "/auctions" satisfies Href;
export const MARKET_ADD_ROUTE = "/add" satisfies Href;
export const MARKET_MY_LISTINGS_ROUTE = "/market/my-listings" satisfies Href;
export const MARKET_TAB_REFRESH_ROUTE = (refresh: string): Href => ({
  pathname: "/(tabs)/market",
  params: { refresh },
});
export const MARKET_MY_LISTINGS_REFRESH_ROUTE = (refresh: string): Href => ({
  pathname: "/market/my-listings",
  params: { refresh },
});
export const MARKET_ADD_MY_LISTINGS_ROUTE = (): Href => ({
  pathname: "/add",
  params: { returnTo: "market-my-listings" },
});
export const MARKET_AI_ROUTE = (prompt: string): Href => ({
  pathname: "/(tabs)/ai",
  params: {
    prompt,
    autoSend: "1",
    context: "market",
  },
});

export const buildMarketProductRoute = (id: string): Href => ({
  pathname: "/product/[id]",
  params: { id },
});

export const buildMarketSupplierShowcaseRoute = (
  userId: string,
  companyId?: string | null,
): Href => ({
  pathname: "/supplierShowcase",
  params: companyId ? { userId, companyId } : { userId },
});

export const buildMarketSupplierMapRoute = (params: MarketMapParams): Href => ({
  pathname: "/supplierMap",
  params,
});
