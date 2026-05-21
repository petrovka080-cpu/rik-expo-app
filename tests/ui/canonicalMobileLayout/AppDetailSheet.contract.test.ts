import * as fs from "fs";
import * as path from "path";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("AppDetailSheet canonical layout", () => {
  it("keeps detail content scrollable with footer actions separated", () => {
    const source = read("src/components/layout/AppDetailSheet.tsx");

    expect(source).toContain("app.detail-sheet.header");
    expect(source).toContain("app.detail-sheet.scroll");
    expect(source).toContain("app.detail-sheet.footer");
    expect(source).toContain("APP_LAYOUT.stickyActionHeightPx");
  });
});
