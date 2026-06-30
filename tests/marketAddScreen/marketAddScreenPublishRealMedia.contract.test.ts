import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen real media publish contract", () => {
  it("publishes only uploaded marketplace media assets through the backend link chain", () => {
    const screen = read("src/screens/profile/AddListingScreen.tsx");
    const media = read("src/screens/profile/profile.marketplaceMedia.ts");
    const services = read("src/screens/profile/profile.services.ts");
    const uploadTransport = read("src/lib/media/services/mediaBackendUpload.transport.ts");

    expect(media).toContain("createSupabaseMediaUploadSession");
    expect(media).toContain("uploadSupabaseMediaObject");
    expect(media).toContain("completeSupabaseMediaUploadSession");
    expect(media).toContain("getSupabaseMediaPublicUrl");
    expect(media).toContain('publicUrl.startsWith("blob:")');
    expect(media).toContain("Marketplace media upload did not create a stable public URL");

    expect(screen).toContain("marketplaceMediaAssetIds");
    expect(screen).toContain("marketplaceMediaAssets");
    expect(screen).toContain("snapshot.mediaAssetIds");
    expect(screen).toContain("snapshot.mediaAssets");
    expect(screen).toContain("snapshot.uploadInProgress");
    expect(screen).toContain("snapshot.failedMediaCount");
    expect(screen).toContain("snapshot.photoPublicUrls");
    expect(screen).toContain("snapshot.videoPublicUrls");
    expect(screen).toContain("marketplaceOwnerCompanyId");
    expect(screen).toContain("companyId: marketplaceOwnerCompanyId");
    expect(screen).toContain("createMarketListing({");
    expect(screen).toContain("buildInstantPublishedMarketListing");
    expect(screen).toContain("prefetchStableMarketplaceImages(marketplacePhotoPublicUrls)");
    expect(screen).toContain("storeMarketListingForInstantOpen(instantListing)");
    expect(screen).toContain("upsertMarketFeedListingForInstantOpen(instantListing)");

    expect(services).toContain("confirmMarketplaceListingMediaLinks");
    expect(services).toContain("confirmSupabaseMediaLink");
    expect(services).toContain("marketplace media link confirmation requires uploaded media assets");
    expect(services).toContain("client_mutation_id");
    expect(uploadTransport).toContain('cacheControl: params.storageBucket === "public-marketplace-media" ? "31536000" : "3600"');
  });

  it("keeps final publish proof away from fake local ids and local URLs", () => {
    const panel = read("src/features/ai/liveRouteWiring/LiveRouteMediaEntrypointPanel.tsx");
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(panel).toContain("isStableMarketplaceMediaUrl");
    expect(panel).toContain("MARKETPLACE_MEDIA_STABLE_PUBLIC_URL_MISSING");
    expect(panel).toContain('mediaItems.filter((item) => item.uploadStatus === "uploaded")');
    expect(panel).toContain("mediaAssetIds: hasMedia ? mediaAssetIds : []");
    expect(smoke).toContain("mediaLinkConfirmed");
    expect(smoke).toContain("listingInserted");
    expect(smoke).toContain("productImageDisplayed");
    expect(smoke).toContain("PHOTO_LIMIT = 5");
    expect(smoke).toContain("buildFakeAuthSession()");
    expect(smoke).toContain('pathName === "/auth/v1/token"');
    expect(smoke).toContain('url.searchParams.get("grant_type") === "refresh_token"');
    expect(smoke).toContain("SMOKE_SCENARIOS");
    expect(smoke).toContain('kind: "material"');
    expect(smoke).toContain('kind: "service"');
    expect(smoke).toContain('kind: "rent"');
    expect(smoke).toContain('title: "Web smoke material 5 photos"');
    expect(smoke).toContain('title: "Web smoke service 5 photos"');
    expect(smoke).toContain('title: "Web smoke rent 5 photos"');
    expect(smoke).toContain("selectedPhotoCount === scenario.photoCount");
    expect(smoke).toContain("selectedVideoCount === scenario.videoCount");
    expect(smoke).toContain("item.photoCount === PHOTO_LIMIT");
    expect(smoke).toContain("item.videoCount === VIDEO_LIMIT");
    expect(smoke).toContain("product_video");
    expect(smoke).toContain("productVideoThumbDisplayed");
    expect(smoke).toContain("productGalleryThumbCount === item.photoCount + item.videoCount");
    expect(smoke).toContain("item.productOpenMs <= 300");
    expect(smoke).toContain("market-add-back-to-market");
    expect(smoke).not.toContain("media-local-photo-1");
  });
});
