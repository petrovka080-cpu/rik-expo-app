import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("UI canonical layout no duplicate layout framework", () => {
  it("keeps the legacy sticky bar as a compatibility wrapper over AppStickyActionBar", () => {
    const legacy = read("src/components/layout/StickyActionBar.tsx");
    const canonical = read("src/components/layout/AppStickyActionBar.tsx");

    expect(legacy).toContain("AppStickyActionBar");
    expect(canonical).toContain("AppStickyActionBarProps");
    expect(legacy).not.toContain("StyleSheet.create");
  });
});
