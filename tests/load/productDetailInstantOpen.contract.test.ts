import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("product detail instant open contract", () => {
  it("renders feed card data from instant cache before background detail refresh", () => {
    const detail = read("app/product/[id].tsx");
    const content = read("src/features/market/ProductDetailsContent.tsx");
    const controller = read("src/features/market/useMarketHomeController.ts");
    const cache = read("src/features/market/marketListingInstantCache.ts");
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(controller).toContain("storeMarketListingForInstantOpen(listing)");
    expect(controller).toContain("router.push(buildMarketProductRoute(listing.id))");
    expect(detail).toContain("initialInstantRowRef.current = getMarketListingForInstantOpen(id)");
    expect(detail).toContain("readWebProductIdFromLocation");
    expect(detail).toContain("const id = routeId || readWebProductIdFromLocation()");
    expect(detail).toContain("useState<MarketHomeListingCard | null>(() => initialInstantRowRef.current ?? null)");
    expect(detail).toContain("useState(() => !initialInstantRowRef.current)");
    expect(detail).toContain("const cachedRow = getMarketListingForInstantOpen(id)");
    expect(detail).toContain("setLoading(false)");
    expect(detail).not.toContain('from "../../src/features/market/market.repository"');
    expect(detail).not.toContain('from "../../src/shared/ui/ScreenErrorBoundary"');
    expect(detail).not.toContain("expo-av");
    expect(detail).not.toContain("MarketContactSupplierModal");
    expect(detail).not.toContain("marketHome.data");
    expect(detail).toContain('React.lazy(async () => import("../../src/features/market/ProductDetailsContent"))');
    expect(detail).toContain("waitForProductDetailBackgroundSlot");
    expect(detail).toContain("if (renderedInstantRow)");
    expect(detail).toContain("if (!active) return;");
    expect(content).toContain("secondaryContentReady");
    expect(content).toContain("secondaryContentReady && galleryMediaItems.length > 1");
    expect(content).toContain('await import("expo-av")');
    expect(content).toContain('import("./components/MarketContactSupplierModal")');
    expect(detail).toContain('testID="market_product_instant_title"');
    expect(detail).toContain('await import("../../src/features/market/market.repository")');
    expect(detail).toContain("mergeProductDetailRefresh");
    expect(detail).toContain("setRow((current) => mergeProductDetailRefresh(current, nextRow))");
    expect(detail).toContain("refreshed.imageUrls.length > 0 ? refreshed.imageUrls : current.imageUrls");
    expect(detail).toContain("refreshed.videoUrls.length > 0 ? refreshed.videoUrls : current.videoUrls");
    expect(cache).toContain("MARKET_LISTING_CACHE_TTL_MS");
    expect(cache).toContain("MARKET_LISTING_CACHE_MAX = 80");
    expect(smoke).toContain("PRODUCT_INSTANT_OPEN_BUDGET_MS = 300");
    expect(smoke).toContain("ANDROID_PRODUCT_DETAIL_OPEN_BUDGET_MS = 500");
    expect(smoke).toContain('const productDetailOpenBudgetMs = smokeTarget === "android-chrome"');
    expect(smoke).toContain("? ANDROID_PRODUCT_DETAIL_OPEN_BUDGET_MS");
    expect(smoke).toContain(": PRODUCT_INSTANT_OPEN_BUDGET_MS");
    expect(smoke).toContain("item.productOpenMs <= productDetailOpenBudgetMs");
    expect(smoke).toContain('readyTestId: "market_product_instant_title"');
    expect(smoke).toContain('[data-testid="market_product_gallery_thumb_${productLastThumbIndex}"]');
    expect(smoke).toContain("item.productGalleryThumbCount === item.photoCount + item.videoCount");
  });
});
