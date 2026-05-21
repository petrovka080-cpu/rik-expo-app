import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("UI canonical layout no technical AI media text", () => {
  it("does not expose sourceRef/mediaAssetId/storageKey in visible route shells", () => {
    const visibleRouteSources = [
      read("src/screens/foreman/ForemanEditorSection.tsx"),
      read("src/screens/profile/components/ListingModal.tsx"),
      read("src/screens/buyer/components/BuyerScreenContent.tsx"),
    ].join("\n");

    expect(visibleRouteSources).not.toMatch(/sourceRef|mediaAssetId|storageKey/);
  });
});
