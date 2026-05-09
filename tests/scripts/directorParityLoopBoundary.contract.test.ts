import { readFileSync } from "fs";
import { join } from "path";

const root = join(__dirname, "..", "..");

const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

describe("director parity script loop boundary", () => {
  it("keeps legacy issue pagination bounded without an unconditional loop", () => {
    const source = read("scripts/director_parity_check_v1.js");

    expect(source).toContain("const LEGACY_PAGE_SIZE = 1000");
    expect(source).toContain("const LEGACY_MAX_START_OFFSET = 1000000");
    expect(source).toContain("fromIdx <= LEGACY_MAX_START_OFFSET");
    expect(source).toContain("fromIdx += LEGACY_PAGE_SIZE");
    expect(source).toContain(".range(fromIdx, fromIdx + LEGACY_PAGE_SIZE - 1)");
    expect(source).not.toContain("while (true)");
    expect(source).not.toMatch(/for\s*\(\s*;\s*;\s*\)/);
  });

  it("keeps the parity script read-only at the Supabase table boundary", () => {
    const source = read("scripts/director_parity_check_v1.js");

    expect(source).toContain('.from("warehouse_issue_items")');
    expect(source).toContain(".select(");
    expect(source).not.toMatch(/\.insert\s*\(/);
    expect(source).not.toMatch(/\.update\s*\(/);
    expect(source).not.toMatch(/\.upsert\s*\(/);
    expect(source).not.toMatch(/\.delete\s*\(/);
  });
});
