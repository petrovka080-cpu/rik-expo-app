import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market card and detail top marketplace UI contract", () => {
  it("renders card and detail media from persistent gallery urls with compact marketplace sizing", () => {
    const card = read("src/features/market/components/MarketFeedCard.tsx");
    const home = read("src/features/market/MarketHomeScreen.tsx");
    const detail = read("app/product/[id].tsx");
    const detailContent = read("src/features/market/ProductDetailsContent.tsx");
    const data = read("src/features/market/marketHome.data.ts");
    const repo = read("src/features/market/market.repository.ts");
    const homeService = read("src/features/market/marketplace.home.service.ts");
    const homeController = read("src/features/market/useMarketHomeController.ts");
    const instantCache = read("src/features/market/marketListingInstantCache.ts");
    const fastGalleryReadModel = read("supabase/migrations/20260630190000_marketplace_scope_feed_detail_fast_gallery_v2.sql");

    expect(card).toContain("const imageSource = useMemo<ImageSourcePropType>");
    expect(card).toContain("listing.imageUrl ? { uri: listing.imageUrl } : listing.imageSource");
    expect(card).toContain("source={imageItemSource ?? listing.imageSource}");
    expect(card).toContain("resizeMode=\"cover\"");
    expect(card).toContain("market_feed_card_image_");
    expect(home).toContain("estimatedItemSize={520}");
    expect(detail).toContain('React.lazy(async () => import("../../src/features/market/ProductDetailsContent"))');
    expect(detailContent).toContain("const galleryImageUrls = row.imageUrls.length ? row.imageUrls : row.imageUrl ? [row.imageUrl] : []");
    expect(detailContent).toContain("...row.videoUrls.map");
    expect(detailContent).toContain("market_product_hero_video");
    expect(detailContent).toContain("market_product_gallery");
    expect(detailContent).toContain("market_product_gallery_strip");
    expect(detailContent).toContain("market_product_hero_image");
    expect(detailContent).toContain("market_product_image_viewer");
    expect(detailContent).toContain("market_product_viewer_image");
    expect(detailContent).toContain("resizeMode=\"cover\"");
    expect(detailContent).toContain("resizeMode=\"contain\"");
    expect(data).toContain("normalizeImageUrl");
    expect(data).toContain("imageUrls");
    expect(data).toContain("image_url");
    expect(data).toContain("image_urls");
    expect(data).toContain("videoUrls");
    expect(data).toContain("video_url");
    expect(data).toContain("video_urls");
    expect(repo).toContain("MARKETPLACE_LISTING_GALLERY_LIMIT = 5");
    expect(repo).toContain("uniqueMarketplaceImageUrls([card.imageUrl], card.imageUrls)");
    expect(repo).toContain("uniqueMarketplaceImageUrls([card.videoUrl], card.videoUrls)");
    expect(repo).not.toContain("callMarketplaceListingPublicImageUrlsRpc");
    expect(repo).not.toContain("selectMarketplaceListingPublicMediaRows");
    expect(repo).toContain("MARKET_INITIAL_PAGE_SIZE = 8");
    expect(homeService).toContain("params.offset && params.offset > 0 ? MARKET_PAGE_SIZE : MARKET_INITIAL_PAGE_SIZE");
    expect(homeController).toContain("MARKET_HOME_FOCUS_REFRESH_TTL_MS");
    expect(homeController).toContain("lastFeedLoadKeyRef.current !== feedLoadKey");
    expect(homeController).toContain("getMarketFeedForInstantOpen({ side, kind, category: activeCategory })");
    expect(homeController).toContain("storeMarketFeedForInstantOpen({ side, kind, category: activeCategory }, nextFeed)");
    expect(homeController).toContain("storeMarketListingForInstantOpen(listing)");
    expect(instantCache).toContain("MARKET_FEED_CACHE_TTL_MS");
    expect(instantCache).toContain("upsertMarketFeedListingForInstantOpen");
    expect(instantCache).toContain("getMarketFeedCacheKey");
    expect(fastGalleryReadModel).toContain("create or replace function public.marketplace_items_scope_page_v1");
    expect(fastGalleryReadModel).toContain("public.marketplace_listing_public_image_urls_v1(pl.id, 5)");
    expect(fastGalleryReadModel).toContain("public.marketplace_listing_public_video_urls_v1(pl.id, 1)");
    expect(fastGalleryReadModel).not.toContain("v_marketplace_catalog_stock");
    expect(fastGalleryReadModel).not.toContain("expanded_items");
    expect(fastGalleryReadModel).not.toContain("stock_items");
  });
});
