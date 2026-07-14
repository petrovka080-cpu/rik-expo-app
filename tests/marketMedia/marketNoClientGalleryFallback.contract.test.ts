import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market no client gallery fallback contract", () => {
  it("keeps marketplace feed and detail on the canonical scope RPC read model", () => {
    const repo = read("src/features/market/market.repository.ts");
    const transport = read("src/features/market/market.repository.transport.ts");
    const detail = read("app/product/[id].tsx");
    const detailContent = read("src/features/market/ProductDetailsContent.tsx");
    const marketSources = `${repo}\n${transport}\n${detail}\n${detailContent}`;

    expect(repo).toContain("MARKET_HOME_READ_SOURCE_KIND = \"rpc:marketplace_items_scope_page_v1\"");
    expect(repo).toContain("MARKET_PRODUCT_READ_SOURCE_KIND = \"rpc:marketplace_item_scope_detail_v1\"");
    expect(transport).toContain("callMarketplaceItemsScopePageRpc");
    expect(transport).toContain("callMarketplaceItemScopeDetailRpc");
    expect(detail).toContain("mergeProductDetailRefresh");
    expect(detail).toContain("refreshed.imageUrls.length > 0 ? refreshed.imageUrls : current.imageUrls");
    expect(detail).toContain("refreshed.videoUrls.length > 0 ? refreshed.videoUrls : current.videoUrls");
    expect(detail).not.toContain("marketplace_listing_public_image_urls_v1");
    expect(detail).not.toContain("marketplace_listing_public_video_urls_v1");
    expect(marketSources).not.toContain("media_links");
    expect(marketSources).not.toContain("selectMarketplaceListingPublicMediaRows");
    expect(marketSources).not.toContain("callMarketplaceListingPublicImageUrlsRpc");
  });
});
