import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("UI canonical layout no random fixed bottom actions", () => {
  it("keeps fixed bottom positioning inside the canonical sticky action bar", () => {
    const canonical = read("src/components/layout/AppStickyActionBar.tsx");
    const foreman = read("src/screens/foreman/ForemanEditorSection.tsx");
    const listing = read("src/screens/profile/components/ListingModal.tsx");

    expect(canonical).toContain("position: \"fixed\"");
    expect(foreman).not.toContain("position: \"fixed\"");
    expect(listing).not.toContain("position: \"fixed\"");
  });
});
