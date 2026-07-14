import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen kind parity contract", () => {
  it("keeps every add-listing category on one marketplace media publish path", () => {
    const screen = read("src/screens/profile/AddListingScreen.tsx");
    const modal = read("src/screens/profile/components/ListingModal.tsx");
    const sharedCategories = read("src/features/market/marketListingCategories.ts");
    const media = read("src/screens/profile/profile.marketplaceMedia.ts");
    const services = read("src/screens/profile/profile.services.ts");
    const smoke = read("scripts/market_add_web_media_publish_smoke.ts");

    expect(modal).toContain("MARKET_LISTING_CATEGORY_OPTIONS");
    for (const kind of ["material", "work", "service", "delivery", "rent"]) {
      expect(sharedCategories).toContain(`kind: "${kind}"`);
      expect(smoke).toContain(`kind: "${kind}"`);
    }
    expect(screen).toContain("handleListingKindChange");
    expect(screen).toContain("listingKind,");
    expect(screen).toContain("marketplaceMediaAssetIds");
    expect(screen).toContain("marketplaceMediaAssets");
    expect(media).toContain('targetType: "marketplace_product"');
    expect(media).toContain('purpose: params.mediaKind === "photo" ? "product_photo" : "product_video"');
    expect(services).toContain("confirmMarketplaceListingMediaLinks");
    expect(services).toContain('purpose: mediaAsset.mediaKind === "video" ? "product_video" : "product_photo"');
    expect(smoke).toContain("SMOKE_SCENARIOS");
    expect(smoke).toContain("scenarioResults.every((item)");
  });
});
