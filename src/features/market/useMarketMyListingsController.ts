import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import type { MarketHomeListingCard } from "./marketHome.types";
import { loadMarketplaceMyListingsStage } from "./marketplace.home.service";
import {
  buildMarketProductRoute,
  MARKET_ADD_MY_LISTINGS_ROUTE,
  MARKET_PROFILE_ROUTE,
} from "./market.routes";
import {
  storeMarketListingForInstantOpen,
  storeMarketListingsForInstantOpen,
} from "./marketListingInstantCache";

export type MarketMyListingsPhase = "loading" | "ready" | "empty" | "error";

type MyListingsState = {
  listings: MarketHomeListingCard[];
  totalCount: number;
  hasMore: boolean;
  offset: number;
};

const DEFAULT_MY_LISTINGS_STATE: MyListingsState = {
  listings: [],
  totalCount: 0,
  hasMore: false,
  offset: 0,
};

function getMarketMyListingsErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = ["message", "details", "hint", "code"]
      .map((key) => String(record[key] ?? "").trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
  }
  return "\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c \u043c\u043e\u0438 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u044f.";
}

export function useMarketMyListingsController() {
  const routeParams = useLocalSearchParams<{ refresh?: string | string[] }>();
  const lastRefreshTokenRef = useRef<string | null>(null);
  const latestListingCountRef = useRef(0);
  const [myListings, setMyListings] = useState<MyListingsState>(DEFAULT_MY_LISTINGS_STATE);
  const [phase, setPhase] = useState<MarketMyListingsPhase>("loading");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadMyListings = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else if (latestListingCountRef.current === 0) {
      setPhase("loading");
    }

    try {
      const page = await loadMarketplaceMyListingsStage({ offset: 0 });
      latestListingCountRef.current = page.listings.length;
      setMyListings({
        listings: page.listings,
        totalCount: page.totalCount,
        hasMore: page.hasMore,
        offset: page.listings.length,
      });
      storeMarketListingsForInstantOpen(page.listings);
      setErrorText(null);
      setPhase(page.listings.length > 0 ? "ready" : "empty");
      recordPlatformObservability({
        screen: "market",
        surface: "my_listings_screen",
        category: "fetch",
        event: "market_my_listings_loaded",
        result: "success",
        extra: {
          rowCount: page.listings.length,
          totalCount: page.totalCount,
        },
      });
    } catch (error: unknown) {
      const message = getMarketMyListingsErrorMessage(error);
      setErrorText(message);
      setPhase(latestListingCountRef.current > 0 ? "ready" : "error");
      recordPlatformObservability({
        screen: "market",
        surface: "my_listings_screen",
        category: "fetch",
        event: "market_my_listings_loaded",
        result: "error",
        errorStage: "screen_state",
        errorMessage: message,
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMyListings("initial");
    }, [loadMyListings]),
  );

  useEffect(() => {
    const refreshToken = Array.isArray(routeParams.refresh) ? routeParams.refresh[0] : routeParams.refresh;
    if (!refreshToken || lastRefreshTokenRef.current === refreshToken) return;
    lastRefreshTokenRef.current = refreshToken;
    void loadMyListings("refresh");
  }, [loadMyListings, routeParams.refresh]);

  const handleRefresh = useCallback(() => {
    void loadMyListings("refresh");
  }, [loadMyListings]);

  const handleOpenAddListing = useCallback(() => {
    router.push(MARKET_ADD_MY_LISTINGS_ROUTE());
  }, []);

  const handleOpenListing = useCallback((listing: MarketHomeListingCard) => {
    storeMarketListingForInstantOpen(listing);
    recordPlatformObservability({
      screen: "market",
      surface: "my_listings_screen",
      category: "ui",
      event: "market_my_listing_open",
      result: "success",
      extra: {
        listingId: listing.id,
        source: listing.source,
      },
    });
    router.push(buildMarketProductRoute(listing.id));
  }, []);

  const handleBack = useCallback(() => {
    router.replace(MARKET_PROFILE_ROUTE);
  }, []);

  return {
    errorText,
    handleBack,
    handleOpenAddListing,
    handleOpenListing,
    handleRefresh,
    myListings,
    phase,
    refreshing,
  };
}
