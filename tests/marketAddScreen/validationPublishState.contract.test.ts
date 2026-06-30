import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen validation and publish state", () => {
  it("keeps validation visible on the add listing screen", () => {
    const screen = read("src/screens/profile/AddListingScreen.tsx");
    const modal = read("src/screens/profile/components/ListingModal.tsx");
    const primitives = read("src/screens/profile/components/ProfilePrimitives.tsx");
    const styles = read("src/screens/profile/profile.styles.ts");

    expect(screen).toContain("buildAddListingValidationErrors");
    expect(screen).toContain("marketplaceMediaAssetIds.length < 1");
    expect(screen).toContain("marketplaceMediaUploading");
    expect(screen).toContain("marketplaceFailedMediaCount");
    expect(screen).toContain('setPublishStatus("uploading_media")');
    expect(screen).toContain("parsePositiveListingPrice");
    expect(screen).toContain("normalizePhoneDigits");
    expect(screen).toContain("setValidationErrors(nextValidationErrors)");
    expect(modal).toContain("market-add-error-summary");
    expect(modal).toContain("market-add-media-error");
    expect(modal).toContain("market-add-kind-error");
    expect(primitives).toContain("hintText?: string");
    expect(primitives).toContain("errorText?: string | null");
    expect(primitives).toContain("required?: boolean");
    expect(styles).toContain("fieldHintText");
    expect(styles).toContain("fieldErrorText");
  });

  it("keeps publish state tied to the real listing result", () => {
    const screen = read("src/screens/profile/AddListingScreen.tsx");
    const modal = read("src/screens/profile/components/ListingModal.tsx");
    const services = read("src/screens/profile/profile.services.ts");
    const stickyBar = read("src/components/layout/AppStickyActionBar.tsx");

    expect(screen).toContain("onPublishStage: setPublishStatus");
    expect(screen).toContain("setPublishedListingId(result.listingId)");
    expect(screen).toContain('setPublishStatus("published")');
    expect(screen).toContain("setValidationErrors({ submit: message })");
    expect(modal).toContain("market-add-publish-state");
    expect(modal).toContain("mediaUploading");
    expect(modal).toContain("market-add-success-state");
    expect(modal).toContain("market-add-open-listing");
    expect(modal).toContain("market-add-back-to-market");
    expect(modal).toContain("publishedListingId");
    expect(services).toContain("export type MarketplaceListingPublishResult");
    expect(services).toContain("return publishMarketplaceListing");
    expect(services).toContain('options.onPublishStage?.("creating_listing")');
    expect(services).toContain('options.onPublishStage?.("linking_media")');
    expect(stickyBar).toContain("keepsReadableLabel");
    expect(stickyBar).toContain('normalizedLabel.includes("объяв")');
  });
});
