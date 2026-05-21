import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("AppScreen canonical layout", () => {
  it("provides the shared screen, header and scroll primitives", () => {
    const screen = read("src/components/layout/AppScreen.tsx");
    const header = read("src/components/layout/AppScreenHeader.tsx");
    const scroll = read("src/components/layout/AppScreenScroll.tsx");

    expect(screen).toContain("app.screen.has-sticky-action");
    expect(header).toContain("APP_LAYOUT.headerHeightPx");
    expect(scroll).toContain("APP_LAYOUT.scrollBottomPaddingPx");
    expect(scroll).toContain("keyboardShouldPersistTaps");
  });
});
