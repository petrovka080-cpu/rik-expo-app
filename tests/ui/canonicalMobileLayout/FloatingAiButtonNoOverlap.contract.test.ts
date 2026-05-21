import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("canonical floating AI button no overlap", () => {
  it("uses the raised offset on routes that commonly expose sticky actions", () => {
    const layout = read("src/components/layout/appLayout.ts");
    const tabs = read("app/(tabs)/_layout.tsx");

    expect(layout).toContain("floatingAiButtonWithStickyActionOffsetPx: 160");
    expect(tabs).toContain("routeOftenHasStickyAction");
    expect(tabs).toContain("assistantBottomOffset");
  });
});
