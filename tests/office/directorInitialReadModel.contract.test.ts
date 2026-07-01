import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("director initial read model", () => {
  it("uses a bounded initial window before any legacy full dataset path", () => {
    const repository = read("src/screens/director/director.repository.ts");
    const data = read("src/screens/director/director.data.ts");

    expect(repository).toContain("loadDirectorRowsInitialWindow");
    expect(repository).toContain("DIRECTOR_INITIAL_POSITION_PAGE_DEFAULTS");
    expect(repository).toContain("request_items_initial_window");
    expect(repository).toContain('.from("request_items")');
    expect(repository).toContain('.in("status", Array.from(DIRECTOR_PENDING_ITEM_STATUSES))');
    expect(repository).toContain('.order("created_at", { ascending: false })');
    expect(repository).toContain("range(itemPage.from, itemPage.to)");
    expect(repository).toContain("range(requestPage.from, requestPage.to)");
    expect(repository).toContain("initialRequestLimit: safeRequestLimit");
    expect(repository).toContain("initialPositionPreviewLimit: safePositionPreviewLimit");
    expect(data).toContain("const useInitialWindow = !force");
    expect(data).toContain("normalized = lastNonEmptyRows.current");
    expect(data).toContain("usedFallback = true");
  });
});
