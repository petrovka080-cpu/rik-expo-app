import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("UI canonical layout no screen-local padding hack", () => {
  it("uses global scroll padding for touched action-heavy screens", () => {
    const buyerSubcontracts = read("src/screens/buyer/BuyerSubcontractTab.view.tsx");
    const buyerList = read("src/screens/buyer/components/BuyerMainList.tsx");
    const listingStyles = read("src/screens/profile/profile.styles.ts");

    expect(buyerSubcontracts).not.toContain("paddingBottom: 100");
    expect(buyerSubcontracts).toContain("APP_LAYOUT.scrollBottomPaddingPx");
    expect(buyerList).toContain("APP_LAYOUT.scrollBottomPaddingPx");
    expect(listingStyles).toContain("APP_LAYOUT.scrollBottomPaddingPx");
  });
});
