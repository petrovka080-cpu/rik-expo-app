import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

describe("market my listings public market unaffected contract", () => {
  it("keeps the public market feed free of owner-only blocks", () => {
    const marketHome = read("src/features/market/MarketHomeScreen.tsx");
    const marketController = read("src/features/market/useMarketHomeController.ts");
    const profile = read("src/screens/profile/ProfileContent.tsx");
    const addScreen = read("src/screens/profile/AddListingScreen.tsx");
    const sellerArea = read("src/features/seller/SellerAreaScreen.tsx");

    expect(marketHome).not.toContain("market-my-listings");
    expect(marketController).not.toContain("MARKET_MY_LISTINGS_ROUTE");
    expect(profile).toContain("MARKET_MY_LISTINGS_ROUTE");
    expect(profile).toContain('returnTo: "market-my-listings"');
    expect(addScreen).toContain('returnToSource === "market-my-listings"');
    expect(addScreen).toContain("MARKET_MY_LISTINGS_REFRESH_ROUTE");
    expect(sellerArea).toContain("MARKET_MY_LISTINGS_ROUTE");
  });
});
