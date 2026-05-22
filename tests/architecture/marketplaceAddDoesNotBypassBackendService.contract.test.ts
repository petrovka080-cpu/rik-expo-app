import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("marketplace add does not bypass backend service architecture contract", () => {
  it("keeps database writes out of the add screen", () => {
    const screen = read("src/screens/profile/AddListingScreen.tsx");

    expect(screen).toContain("createMarketListing({");
    expect(screen).not.toContain('from("market_listings")');
    expect(screen).not.toContain("status: \"published\"");
    expect(screen).not.toContain("status = published");
  });

  it("publishes through the marketplace listing service chain", () => {
    const profileService = read("src/screens/profile/profile.services.ts");
    const marketTransport = read("src/features/market/market.repository.transport.ts");

    for (const serviceName of [
      "createMarketplaceListingDraft",
      "attachMarketplaceListingMedia",
      "suggestMarketplaceListingFieldsFromMedia",
      "validateMarketplaceListingForPublish",
      "publishMarketplaceListing",
    ]) {
      expect(profileService).toContain(serviceName);
    }

    expect(profileService).toContain("insertMarketplaceListingDraft");
    expect(profileService).not.toContain('supabase.from("market_listings").insert');
    expect(marketTransport).toContain("insertMarketplaceListingDraft");
    expect(marketTransport).toContain('from("market_listings").insert');
    expect(profileService).not.toContain('status: "published"');
  });
});
