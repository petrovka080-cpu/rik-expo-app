import type { Href } from "expo-router";

import {
  buildMarketProductRoute,
  buildMarketSupplierMapRoute,
  buildMarketSupplierShowcaseRoute,
  MARKET_AUCTIONS_ROUTE,
  MARKET_TAB_ROUTE,
} from "../../features/market/market.routes";
import type { MarketMapParams } from "../../features/market/marketHome.types";

export const AUTH_LOGIN_ROUTE = "/auth/login" satisfies Href;
export const DIRECTOR_ROUTE = "/director" satisfies Href;
export const ADD_LISTING_ROUTE = "/(tabs)/add" satisfies Href;
export const OFFICE_TAB_ROUTE = "/office/index" satisfies Href;
export const REPORTS_DASHBOARD_ROUTE = "/reports/dashboard" satisfies Href;
export const REPORTS_AI_ASSISTANT_ROUTE = "/reports/ai-assistant" satisfies Href;
export const SELLER_ROUTE = "/seller" satisfies Href;
export const SUPPLIER_MAP_ROUTE = "/supplierMap" satisfies Href;
export const SUPPLIER_SHOWCASE_ROUTE = "/supplierShowcase" satisfies Href;

export type ReportsModuleRouteKey = "dashboard" | "ai-assistant";

export const REPORTS_MODULE_ROUTES: Record<ReportsModuleRouteKey, Href> = {
  dashboard: REPORTS_DASHBOARD_ROUTE,
  "ai-assistant": REPORTS_AI_ASSISTANT_ROUTE,
};

export const buildAuctionDetailRoute = (id: string): Href => ({
  pathname: "/auction/[id]",
  params: { id },
});

export const buildAssistantRoute = (params: {
  context: string;
  prompt: string;
  autoSend?: "1";
}): Href => ({
  pathname: "/(tabs)/ai",
  params: params.autoSend
    ? {
        context: params.context,
        prompt: params.prompt,
        autoSend: params.autoSend,
      }
    : {
        context: params.context,
        prompt: params.prompt,
      },
});

export const buildChatRoute = (params: {
  listingId: string;
  title?: string | null;
}): Href => ({
  pathname: "/chat",
  params: params.title
    ? {
        listingId: params.listingId,
        title: params.title,
      }
    : {
        listingId: params.listingId,
      },
});

export const buildAddListingRoute = (params?: {
  entry?: "seller";
}): Href =>
  params?.entry
    ? {
        pathname: ADD_LISTING_ROUTE,
        params: { entry: params.entry },
      }
    : ADD_LISTING_ROUTE;

export const buildSupplierMapRoute = (params?: MarketMapParams): Href =>
  params ? buildMarketSupplierMapRoute(params) : SUPPLIER_MAP_ROUTE;

export const buildSupplierShowcaseRoute = (params?: {
  userId?: string | null;
  companyId?: string | null;
}): Href =>
  params?.userId
    ? buildMarketSupplierShowcaseRoute(params.userId, params.companyId)
    : SUPPLIER_SHOWCASE_ROUTE;

export {
  buildMarketProductRoute,
  MARKET_AUCTIONS_ROUTE,
  MARKET_TAB_ROUTE,
};
