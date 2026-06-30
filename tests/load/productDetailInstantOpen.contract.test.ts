import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("product detail instant open contract", () => {
  it("renders feed card data from instant cache before background detail refresh", () => {
    const detail = read("app/product/[id].tsx");
    const controller = read("src/features/market/useMarketHomeController.ts");
    const cache = read("src/features/market/marketListingInstantCache.ts");
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(controller).toContain("storeMarketListingForInstantOpen(listing)");
    expect(controller).toContain("router.push(buildMarketProductRoute(listing.id))");
    expect(detail).toContain("initialInstantRowRef.current = getMarketListingForInstantOpen(id)");
    expect(detail).toContain("useState<MarketHomeListingCard | null>(() => initialInstantRowRef.current ?? null)");
    expect(detail).toContain("useState(() => !initialInstantRowRef.current)");
    expect(detail).toContain("const cachedRow = getMarketListingForInstantOpen(id)");
    expect(detail).toContain("setLoading(false)");
    expect(detail).not.toContain('from "../../src/features/market/market.repository"');
    expect(detail).toContain('await import("../../src/features/market/market.repository")');
    expect(detail).toContain("mergeProductDetailRefresh");
    expect(detail).toContain("setRow((current) => mergeProductDetailRefresh(current, nextRow))");
    expect(detail).toContain("refreshed.imageUrls.length > 0 ? refreshed.imageUrls : current.imageUrls");
    expect(detail).toContain("refreshed.videoUrls.length > 0 ? refreshed.videoUrls : current.videoUrls");
    expect(cache).toContain("MARKET_LISTING_CACHE_TTL_MS");
    expect(cache).toContain("MARKET_LISTING_CACHE_MAX = 80");
    expect(smoke).toContain("item.productOpenMs <= 300");
    expect(smoke).toContain("readyTestId: `market_product_gallery_thumb_${productLastThumbIndex}`");
  });
});
