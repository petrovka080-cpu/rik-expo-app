import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("canonical no technical AI media text", () => {
  it("keeps visible route wiring free from sourceRef/media storage debug text", () => {
    const visibleRouteSources = [
      read("src/screens/foreman/ForemanEditorSection.tsx"),
      read("src/screens/profile/components/ListingModal.tsx"),
      read("src/screens/buyer/components/BuyerScreenContent.tsx"),
    ].join("\n");

    expect(visibleRouteSources).not.toContain("sourceRef");
    expect(visibleRouteSources).not.toContain("mediaAssetId");
    expect(visibleRouteSources).not.toContain("storageKey");
    expect(visibleRouteSources).not.toContain("rgba(34,197,94,0.10)");
    expect(visibleRouteSources).toContain("AI заявка");
  });
});
