import fs from "fs";
import path from "path";

const readSource = (...segments: string[]) =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe("market pagination lower bound contract", () => {
  it("advances the feed cursor by the server page and stops on empty pages", () => {
    const controller = readSource("src", "features", "market", "useMarketHomeController.ts");
    const repository = readSource("src", "features", "market", "market.repository.ts");

    expect(controller).toContain("offset: page.pageOffset + page.rawWindowRowCount");
    expect(controller).toContain("const nextOffset = nextPage.pageOffset + nextPage.rawWindowRowCount");
    expect(controller).toContain("const madeProgress = nextOffset > prev.offset");
    expect(controller).toContain("&& nextPage.rawWindowRowCount > 0");
    expect(controller).toContain("&& madeVisibleProgress");
    expect(controller).toContain("if (feedData.length < 1) return");
    expect(repository).toContain("hasMore: rawWindowRowCount > 0 && offset + rawWindowRowCount < totalCount");
  });
});
