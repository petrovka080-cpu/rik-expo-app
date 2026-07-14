import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("market add screen duplicate publish contract", () => {
  it("guards duplicate publish in the UI and keeps idempotency in the service layer", () => {
    const screen = read("src/screens/profile/AddListingScreen.tsx");
    const modal = read("src/screens/profile/components/ListingModal.tsx");
    const services = read("src/screens/profile/profile.services.ts");

    expect(screen).toContain("if (!profile || savingListing) return");
    expect(screen).toContain("setSavingListing(true)");
    expect(screen).toContain("setSavingListing(false)");
    expect(modal).toContain("const publishBusy = savingListing || mediaUploading");
    expect(modal).toContain("disabled: publishBusy");
    expect(modal).toContain("loading: publishBusy");
    expect(services).toContain("client_mutation_id");
    expect(services).toContain("loadMarketplaceListingByClientMutationId");
    expect(services).toContain("marketplace_listing_publish_idempotent_replay");
    expect(services).toContain("confirmMarketplaceListingMediaLinks");
  });
});
