import fs from "fs";
import path from "path";

describe("AddListingScreen source contract", () => {
  it("owns the add-listing flow without profile-host semantics", () => {
    const filePath = path.join(
      process.cwd(),
      "src/screens/profile/AddListingScreen.tsx",
    );
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain("loadAddListingOwnerData");
    expect(source).toContain("createMarketListing({");
    expect(source).toContain("Location.requestForegroundPermissionsAsync");
    expect(source).toContain("router.replace(MARKET_TAB_ROUTE)");
    expect(source).toContain("<ListingModal");
    expect(source).toContain("visible");
    expect(source).toContain("onRequestClose={exitAddListingFlow}");

    expect(source).not.toContain("loadProfileScreenData()");
    expect(source).not.toContain("listingModalOpen");
    expect(source).not.toContain("catalogModalOpen");
    expect(source).not.toContain("setListingModalOpen");
    expect(source).not.toContain("setCatalogModalOpen(true)");
  });
});
