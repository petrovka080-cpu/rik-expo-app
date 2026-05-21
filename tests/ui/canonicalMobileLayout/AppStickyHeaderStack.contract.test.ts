import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("AppStickyHeaderStack canonical layout", () => {
  it("is used by buyer search so cards start below sticky search/header stack", () => {
    const source = read("src/components/layout/AppStickyHeaderStack.tsx");
    const buyer = read("src/screens/buyer/components/BuyerScreenRenderSections.tsx");

    expect(source).toContain("mustNotOverlapContent: true");
    expect(source).toContain("APP_LAYOUT.stickySearchHeightPx");
    expect(buyer).toContain("AppStickyHeaderStack");
    expect(buyer).toContain("buyer-sticky-search-stack");
  });
});
