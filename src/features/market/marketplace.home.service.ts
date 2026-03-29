import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import type { MarketHomeFilters, MarketHomePayload, MarketRoleCapabilities } from "./marketHome.types";
import { loadMarketplaceAuctionSummary, type MarketplaceAuctionSummary } from "./marketplace.auctions.service";
import { MARKET_PAGE_SIZE, loadMarketHomePage, loadMarketRoleCapabilities } from "./market.repository";
import { MARKET_AUCTIONS_ROUTE } from "./market.routes";

export type MarketplaceHomeStage1Payload = {
  capabilities: MarketRoleCapabilities;
  auctionsSummary: MarketplaceAuctionSummary;
  state: "ready" | "degraded";
};

export type MarketplaceHomeFeedPayload = MarketHomePayload;

const MARKET_HOME_STAGE1_SURFACE = "home_stage1";
const DEFAULT_CAPABILITIES: MarketRoleCapabilities = {
  role: null,
  canAddToRequest: false,
  canCreateProposal: false,
};

export async function loadMarketplaceHomeStage1(): Promise<MarketplaceHomeStage1Payload> {
  const [capabilitiesResult, auctionsResult] = await Promise.allSettled([
    loadMarketRoleCapabilities(),
    loadMarketplaceAuctionSummary(),
  ]);

  const capabilities =
    capabilitiesResult.status === "fulfilled" ? capabilitiesResult.value : DEFAULT_CAPABILITIES;
  const auctionsSummary =
    auctionsResult.status === "fulfilled"
      ? auctionsResult.value
      : {
          activeCount: 0,
          pendingCount: 0,
          hasVisibleAuctions: false,
          primaryCtaRoute: MARKET_AUCTIONS_ROUTE as typeof MARKET_AUCTIONS_ROUTE,
          updatedAt: null,
          state: "error" as const,
          message:
            auctionsResult.reason instanceof Error
              ? auctionsResult.reason.message
              : "Не удалось загрузить сводку торгов.",
          sourceKind: "canonical:auctions.summary" as const,
        };

  const state =
    capabilitiesResult.status === "rejected" || auctionsSummary.state === "error" ? "degraded" : "ready";

  if (capabilitiesResult.status === "rejected") {
    recordPlatformObservability({
      screen: "market",
      surface: MARKET_HOME_STAGE1_SURFACE,
      category: "fetch",
      event: "market_home_stage1_capabilities",
      result: "error",
      errorStage: "role_capabilities",
      errorMessage:
        capabilitiesResult.reason instanceof Error
          ? capabilitiesResult.reason.message
          : String(capabilitiesResult.reason ?? "unknown"),
    });
  }

  recordPlatformObservability({
    screen: "market",
    surface: MARKET_HOME_STAGE1_SURFACE,
    category: "fetch",
    event: "market_home_stage1_ready",
    result: state === "ready" ? "success" : "error",
    extra: {
      stageState: state,
      auctionsState: auctionsSummary.state,
      activeCount: auctionsSummary.activeCount,
      pendingCount: auctionsSummary.pendingCount,
      canAddToRequest: capabilities.canAddToRequest,
      canCreateProposal: capabilities.canCreateProposal,
    },
  });

  return {
    capabilities,
    auctionsSummary,
    state,
  };
}

export async function loadMarketplaceHomeFeedStage(
  filters: Pick<MarketHomeFilters, "side" | "kind">,
  params: { offset?: number; limit?: number } = {},
): Promise<MarketplaceHomeFeedPayload> {
  return loadMarketHomePage({
    offset: params.offset ?? 0,
    limit: params.limit ?? MARKET_PAGE_SIZE,
    filters,
  });
}
