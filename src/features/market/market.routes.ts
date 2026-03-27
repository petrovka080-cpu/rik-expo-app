import type { Href } from "expo-router";

import type { MarketMapParams } from "./marketHome.types";

export const MARKET_TAB_ROUTE = "/(tabs)/market" satisfies Href;
export const MARKET_PROFILE_ROUTE = "/(tabs)/profile" satisfies Href;
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
