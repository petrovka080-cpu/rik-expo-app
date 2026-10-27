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
    expect(source).toContain('title: "\\u041a\\u0430\\u0431\\u0438\\u043d\\u0435\\u0442 \\u043f\\u0440\\u043e\\u0434\\u0430\\u0432\\u0446\\u0430"');

    expect(source).not.toContain("ProfileContent");
    expect(source).not.toContain("ProfileMainSections");
    expect(source).not.toContain("loadProfileScreenData");
    expect(source).not.toContain("profile semantics");
    expect(source).not.toContain("seller tools");
    expect(source).not.toContain("contour");
  });
});
