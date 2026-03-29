import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import { loadAuctionSummaries } from "../auctions/auctions.data";
import type { UnifiedAuctionSummary } from "../auctions/auctions.types";
import { MARKET_AUCTIONS_ROUTE } from "./market.routes";

export type MarketplaceAuctionSummaryState = "ready" | "empty" | "error" | "degraded";

export type MarketplaceAuctionSummary = {
  activeCount: number;
  pendingCount: number;
  hasVisibleAuctions: boolean;
  primaryCtaRoute: typeof MARKET_AUCTIONS_ROUTE;
  primaryCtaParams?: Record<string, string | number | boolean>;
  updatedAt: string | null;
  state: MarketplaceAuctionSummaryState;
  message: string | null;
  sourceKind: "canonical:auctions.summary";
};

const MARKETPLACE_AUCTIONS_SURFACE = "auctions_entry";

const normalizeStatus = (value: unknown) => String(value ?? "").trim().toLowerCase();

const isPendingStatus = (status: string | null | undefined) => {
  const normalized = normalizeStatus(status);
  return normalized === "draft" || normalized === "pending";
};

const getLatestTimestamp = (rows: UnifiedAuctionSummary[]) => {
  let latest: string | null = null;
  let latestTs = Number.NEGATIVE_INFINITY;
  for (const row of rows) {
    const nextValue = row.createdAt ?? row.deadlineAt ?? null;
    if (!nextValue) continue;
    const ts = new Date(nextValue).getTime();
    if (!Number.isFinite(ts)) continue;
    if (ts > latestTs) {
      latestTs = ts;
      latest = nextValue;
    }
  }
  return latest;
};

export function buildMarketplaceAuctionSummary(rows: UnifiedAuctionSummary[]): MarketplaceAuctionSummary {
  const pendingCount = rows.filter((row) => isPendingStatus(row.status)).length;
  const activeCount = Math.max(rows.length - pendingCount, 0);

  if (!rows.length) {
    return {
      activeCount: 0,
      pendingCount: 0,
      hasVisibleAuctions: false,
      primaryCtaRoute: MARKET_AUCTIONS_ROUTE,
      updatedAt: null,
      state: "empty",
      message: "Сейчас нет активных торгов. Откройте раздел, чтобы проверить архив и новые публикации.",
      sourceKind: "canonical:auctions.summary",
    };
  }

  return {
    activeCount,
    pendingCount,
    hasVisibleAuctions: true,
    primaryCtaRoute: MARKET_AUCTIONS_ROUTE,
    updatedAt: getLatestTimestamp(rows),
    state: "ready",
    message:
      pendingCount > 0
        ? `${pendingCount} ${pendingCount === 1 ? "черновик ждёт" : "черновика ждут"} публикации.`
        : "Откройте торги снабженца и перейдите к позициям.",
    sourceKind: "canonical:auctions.summary",
  };
}

export function buildMarketplaceAuctionSummaryFailure(
  state: "error" | "degraded",
  message: string,
): MarketplaceAuctionSummary {
  return {
    activeCount: 0,
    pendingCount: 0,
    hasVisibleAuctions: false,
    primaryCtaRoute: MARKET_AUCTIONS_ROUTE,
    updatedAt: null,
    state,
    message,
    sourceKind: "canonical:auctions.summary",
  };
}

export async function loadMarketplaceAuctionSummary(): Promise<MarketplaceAuctionSummary> {
  try {
    const rows = await loadAuctionSummaries("active");
    const summary = buildMarketplaceAuctionSummary(rows);
    recordPlatformObservability({
      screen: "market",
      surface: MARKETPLACE_AUCTIONS_SURFACE,
      category: "fetch",
      event: "marketplace_auctions_summary_load",
      result: "success",
      extra: {
        state: summary.state,
        activeCount: summary.activeCount,
        pendingCount: summary.pendingCount,
        sourceKind: summary.sourceKind,
      },
    });
    return summary;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Не удалось загрузить сводку торгов.";
    recordPlatformObservability({
      screen: "market",
      surface: MARKETPLACE_AUCTIONS_SURFACE,
      category: "fetch",
      event: "marketplace_auctions_summary_load",
      result: "error",
      errorStage: "summary",
      errorMessage: message,
    });
    return buildMarketplaceAuctionSummaryFailure("error", message);
  }
}
