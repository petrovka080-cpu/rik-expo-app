import fs from "fs";
import path from "path";

describe("SellerAreaScreen source contract", () => {
  it("owns seller management separately from profile", () => {
    const filePath = path.join(
      process.cwd(),
      "src/features/seller/SellerAreaScreen.tsx",
    );
    const source = fs.readFileSync(filePath, "utf8");

    expect(source).toContain("loadSupplierShowcasePayload()");
    expect(source).toContain("loadCurrentProfileIdentity()");
    expect(source).toContain('buildAddListingRoute({ entry: "seller" })');
    expect(source).toContain("buildSupplierShowcaseRoute()");
    expect(source).toContain("buildMarketProductRoute(item.id)");

    expect(source).not.toContain("ProfileContent");
    expect(source).not.toContain("ProfileMainSections");
    expect(source).not.toContain("loadProfileScreenData");
  });
});
