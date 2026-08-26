import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("UI canonical layout no duplicate layout framework", () => {
  it("keeps AppStickyActionBar as the sole sticky action implementation", () => {
    const legacyPath = path.resolve(
      process.cwd(),
      "src/components/layout/StickyActionBar.tsx",
    );
    const canonical = read("src/components/layout/AppStickyActionBar.tsx");

    expect(fs.existsSync(legacyPath)).toBe(false);
    expect(canonical).toContain("AppStickyActionBarProps");
    expect(canonical).toContain('testID="app.sticky-action-bar"');
  });
});
