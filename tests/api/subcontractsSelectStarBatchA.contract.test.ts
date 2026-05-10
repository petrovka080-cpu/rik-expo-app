import fs from "node:fs";
import path from "node:path";

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("subcontracts select-star batch A contract", () => {
  const sourcePath = "src/screens/subcontracts/subcontracts.shared.ts";

  it("uses explicit columns for subcontract and item reads", () => {
    const source = readSource(sourcePath);

    expect(source).not.toContain('.select("*")');
    expect(source).not.toContain(".select('*')");
    expect(source).toContain("const SUBCONTRACT_ROW_SELECT");
    expect(source).toContain("const SUBCONTRACT_ITEM_ROW_SELECT");
    expect(source).toContain(".select(SUBCONTRACT_ROW_SELECT)");
    expect(source).toContain(".select(SUBCONTRACT_ITEM_ROW_SELECT)");
  });

  it("keeps paged list and mutation-returning paths scoped", () => {
    const source = readSource(sourcePath);

    expect(source).toContain(".range(page.from, page.toInclusive)");
    expect(source).toContain("SUBCONTRACT_COLLECT_ALL_MAX_ROWS");
    expect(source).toContain(".insert(payload)");
    expect(source).toContain(".select(SUBCONTRACT_ITEM_ROW_SELECT)");
  });
});
