import fs from "node:fs";
import path from "node:path";

describe("estimate norm hardcoded rate guard", () => {
  it("keeps the 10000 compiler consuming norm records instead of local rate helpers", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/lib/ai/estimateTemplate10000/productionExpandedWorkCatalog10000.ts"),
      "utf8",
    );

    expect(source).not.toContain("function normFactorFor");
    expect(source).not.toContain("function packageSizeFor");
    expect(source).not.toContain("formulaContextForRow");
    expect(source).toContain("formulaContextFromEstimateNormItem");
    expect(source).toContain("buildEstimateNormItemForTemplateRow");
  });
});
