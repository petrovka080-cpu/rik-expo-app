import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market open latency budget contract", () => {
  it("keeps /market feed-first with bounded page size and smoke budget checks", () => {
    const repo = read("src/features/market/market.repository.ts");
    const service = read("src/features/market/marketplace.home.service.ts");
    const controller = read("src/features/market/useMarketHomeController.ts");
    const cache = read("src/features/market/marketListingInstantCache.ts");
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(repo).toContain("MARKET_INITIAL_PAGE_SIZE = 8");
    expect(repo).toContain("MARKET_PAGE_SIZE = 24");
    expect(service).toContain("params.offset && params.offset > 0 ? MARKET_PAGE_SIZE : MARKET_INITIAL_PAGE_SIZE");
    expect(controller).toContain("loadMarketplaceHomeFeedStage");
    expect(controller).toContain("loadMarketplaceHomeStage1");
    expect(controller).toContain('void loadFeedStage("initial").finally(() =>');
    expect(controller).toContain("getMarketFeedForInstantOpen({ side, kind })");
    expect(controller).toContain("storeMarketFeedForInstantOpen({ side, kind }, nextFeed)");
    expect(cache).toContain("MARKET_FEED_LISTING_MAX = 80");
    expect(cache).toContain("MARKET_FEED_CACHE_TTL_MS");
    expect(smoke).toContain("slowestMarketFirstContentMs");
    expect(smoke).toContain("slowestMarketOpenMs");
    expect(smoke).toContain("MARKET_FEED_FIRST_CONTENT_BUDGET_MS = 1_000");
    expect(smoke).toContain("MARKET_FEED_FULL_ROUTE_BUDGET_MS = 1_500");
    expect(smoke).toContain("MY_LISTINGS_FIRST_CONTENT_BUDGET_MS = 1_000");
    expect(smoke).toContain("item.marketFirstContentMs <= MARKET_FEED_FIRST_CONTENT_BUDGET_MS");
    expect(smoke).toContain("item.marketOpenMs <= MARKET_FEED_FULL_ROUTE_BUDGET_MS");
    expect(smoke).toContain("item.myListingsFirstContentMs <= MY_LISTINGS_FIRST_CONTENT_BUDGET_MS");
  });
});
