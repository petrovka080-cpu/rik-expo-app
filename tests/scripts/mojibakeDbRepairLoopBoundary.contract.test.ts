import { readFileSync } from "fs";
import { join } from "path";

const REPAIR_SOURCE = join(__dirname, "../../scripts/mojibake_db_repair.ts");

describe("mojibake DB repair loop boundary", () => {
  it("keeps table scans under an explicit fail-closed page ceiling", () => {
    const source = readFileSync(REPAIR_SOURCE, "utf8");

    expect(source).not.toMatch(/while\s*\(\s*true\s*\)/);
    expect(source).not.toMatch(/for\s*\(\s*;\s*;\s*\)/);
    expect(source).toContain("MOJIBAKE_REPAIR_MAX_PAGES_PER_TABLE");
    expect(source).toContain("MOJIBAKE_REPAIR_MAX_ROWS_PER_TABLE");
    expect(source).toContain("pageIndex < MOJIBAKE_REPAIR_MAX_PAGES_PER_TABLE");
    expect(source).toContain("mojibake_db_repair exceeded page ceiling");
  });

  it("keeps repair mutation semantics scoped to normalized field patches", () => {
    const source = readFileSync(REPAIR_SOURCE, "utf8");

    expect(source).toContain('createVerifierAdmin("mojibake-db-repair")');
    expect(source).toContain("const patch: RowRecord = {}");
    expect(source).toContain(".update(patch)");
    expect(source).toContain(".eq(spec.idColumn, id)");
  });

  it("keeps explicit error propagation without silent catches", () => {
    const source = readFileSync(REPAIR_SOURCE, "utf8");

    expect(source).toContain("if (error) throw error");
    expect(source).toContain("if (updateError) throw updateError");
    expect(source).not.toMatch(/catch\s*\{\s*\}/);
  });
});
