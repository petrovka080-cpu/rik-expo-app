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
// DEEP-LINK CONTRACT: Director route lives under office/ after NAV-LAZY.
export const DIRECTOR_ROUTE = "/office/director" satisfies Href;
export const ADD_LISTING_ROUTE = "/(tabs)/add" satisfies Href;
export const OFFICE_TAB_ROUTE = "/(tabs)/office" satisfies Href;
export const PROFILE_TAB_ROUTE = "/(tabs)/profile" satisfies Href;
export const REPORTS_DASHBOARD_ROUTE = "/reports/dashboard" satisfies Href;
export const REPORTS_AI_ASSISTANT_ROUTE = "/reports/ai-assistant" satisfies Href;
export const SELLER_ROUTE = "/seller" satisfies Href;
export const SUPPLIER_MAP_ROUTE = "/supplierMap" satisfies Href;
export const SUPPLIER_SHOWCASE_ROUTE = "/supplierShowcase" satisfies Href;
export const PUBLIC_REQUEST_ROUTE = "/(tabs)/request" as const;

export type PublicRequestDeepLinkTarget = {
  pathname: typeof PUBLIC_REQUEST_ROUTE;
  query: string;
  href: string;
  params: Record<string, string>;
  normalizedPath: string;
};

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

function splitPathAndQuery(path: string): { routePath: string; query: string } {
  const [routePath = "", ...queryParts] = path.split("?");
  const query = queryParts.length > 0 ? `?${queryParts.join("?")}` : "";
  return { routePath, query };
}

function safeDecodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function splitIntentPathAndQuery(path: string): { routePath: string; query: string } {
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    return splitPathAndQuery(path);
  }

  try {
    const url = new URL(path);
    const nestedDevClientUrl = url.hostname === "expo-development-client"
      ? url.searchParams.get("url")
      : null;
    if (nestedDevClientUrl) {
      const nested = new URL(nestedDevClientUrl);
      const nestedPathname = safeDecodePath(nested.pathname || "");
      const expoRoutePrefix = "/--/";
      return {
        routePath: nestedPathname.startsWith(expoRoutePrefix)
          ? `/${nestedPathname.slice(expoRoutePrefix.length)}`
          : nestedPathname || "/",
        query: nested.search || "",
      };
    }

    const hostPath = url.hostname ? `/${safeDecodePath(url.hostname)}` : "";
    const pathname = safeDecodePath(url.pathname || "");
    const routePath = hostPath
      ? `${hostPath}${pathname && pathname !== "/" ? pathname : ""}`
      : pathname || "/";
    return {
      routePath,
      query: url.search || "",
    };
  } catch {
    return splitPathAndQuery(path);
  }
}

export function normalizeIntentRoutePath(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`;
  return withLeadingSlash.replace(/\/+/g, "/");
}

function parseQueryParams(query: string): Record<string, string> {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const next: Record<string, string> = {};
  params.forEach((value, key) => {
    next[key] = value;
  });
  return next;
}

export function resolvePublicRequestDeepLinkTarget(
  path: string | null | undefined,
): PublicRequestDeepLinkTarget | null {
  if (!path) return null;
  const { routePath, query } = splitIntentPathAndQuery(path);
  const normalizedPath = normalizeIntentRoutePath(routePath);
  if (
    normalizedPath !== "/request" &&
    normalizedPath !== "/request/index" &&
    normalizedPath !== PUBLIC_REQUEST_ROUTE &&
    normalizedPath !== `${PUBLIC_REQUEST_ROUTE}/index`
  ) {
    return null;
  }

  return {
    pathname: PUBLIC_REQUEST_ROUTE,
    query,
    href: `${PUBLIC_REQUEST_ROUTE}${query}`,
    params: parseQueryParams(query),
    normalizedPath,
  };
}

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
{
  if (params) {
    return buildMarketSupplierMapRoute(params);
  }
  return SUPPLIER_MAP_ROUTE;
};

export const buildSupplierShowcaseRoute = (params?: {
  userId?: string | null;
  companyId?: string | null;
}): Href =>
{
  if (params?.userId) {
    return buildMarketSupplierShowcaseRoute(params.userId, params.companyId);
  }
  return SUPPLIER_SHOWCASE_ROUTE;
};

export {
  buildMarketProductRoute,
  MARKET_AUCTIONS_ROUTE,
  MARKET_TAB_ROUTE,
};
