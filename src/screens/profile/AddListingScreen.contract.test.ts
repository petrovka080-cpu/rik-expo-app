import fs from "fs";
import path from "path";

describe("AddListingScreen source contract", () => {
  it("owns the add-listing flow without profile-host semantics", () => {
    const filePath = path.join(
      process.cwd(),
      "src/screens/profile/AddListingScreen.tsx",
    );
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain("useAddListingOwnerContext({");
    expect(source).toContain("submitAddListing({");
    expect(source).toContain("buildListingCatalogItem({");
    expect(source).toContain("buildAddListingValidationErrors({");
    expect(source).toContain("resolveAddListingReturnNavigation(params)");
    expect(source).toContain("useLocalSearchParams");
    expect(source).toContain("MARKET_MY_LISTINGS_ROUTE");
    expect(source).toContain("MARKET_TAB_ROUTE");
    expect(source).toContain("router.replace(returnRoute)");
    expect(source).toContain("<ListingModal");
    expect(source).toContain("visible");
    expect(source).toContain("resetAndExitAddListingFlow");
    expect(source).toContain("onRequestClose={resetAndExitAddListingFlow}");
    expect(source).toContain("if (!profile || savingListing) return;");

    expect(source).not.toContain("loadProfileScreenData()");
    expect(source).not.toContain("loadAddListingOwnerData");
    expect(source).not.toContain("createMarketListing({");
    expect(source).not.toContain("Location.requestForegroundPermissionsAsync");
    expect(source).not.toContain("entrySource");
    expect(source).not.toContain("returnToSource");
    expect(source).not.toContain("listingModalOpen");
    expect(source).not.toContain("catalogModalOpen");
    expect(source).not.toContain("setListingModalOpen");
    expect(source).not.toContain("setCatalogModalOpen(true)");
  });
});
