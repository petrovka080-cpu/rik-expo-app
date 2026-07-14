import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

function read(relativePath: string): string {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

describe("no one-off production formula branches", () => {
  it("keeps the 10000-template production compiler on the generic DSL path", () => {
    const source = read("src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000.ts");

    expect(source).toContain("evaluateProductionFormulaDsl");
    expect(source).not.toContain("function evaluateQuantity(");
    expect(source).not.toMatch(/if\s*\(\s*definition\.workKey\s*===/);
    expect(source).not.toMatch(/if\s*\(\s*input\.workKey\s*===/);
    expect(source).not.toContain("apartment_capital_renovation");
  });
});
