import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("AppStickyActionBar canonical layout", () => {
  it("supports page and sheet placements with safe bottom navigation spacing", () => {
    const source = read("src/components/layout/AppStickyActionBar.tsx");

    expect(source).toContain("placement: \"above_bottom_nav\" | \"inside_sheet_footer\"");
    expect(source).toContain("safeAreaAware: true");
    expect(source).toContain("APP_LAYOUT.bottomNavHeightPx + APP_LAYOUT.stickyActionGapPx");
    expect(source).toContain("app.sticky-action-bar");
  });
});
