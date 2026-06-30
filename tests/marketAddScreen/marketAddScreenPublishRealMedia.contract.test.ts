import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen real media publish contract", () => {
  it("publishes only uploaded marketplace media assets through the backend link chain", () => {
    const screen = read("src/screens/profile/AddListingScreen.tsx");
    const media = read("src/screens/profile/profile.marketplaceMedia.ts");
    const services = read("src/screens/profile/profile.services.ts");

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
    expect(screen).toContain("createMarketListing({");

    expect(services).toContain("confirmMarketplaceListingMediaLinks");
    expect(services).toContain("confirmSupabaseMediaLink");
    expect(services).toContain("marketplace media link confirmation requires uploaded media assets");
    expect(services).toContain("client_mutation_id");
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
    expect(smoke).not.toContain("media-local-photo-1");
  });
});
