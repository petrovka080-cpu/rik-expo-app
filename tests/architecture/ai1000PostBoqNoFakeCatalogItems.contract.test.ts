import fs from "node:fs";
import path from "node:path";

describe("AI 1000 post-BOQ architecture: no fake catalog items", () => {
  it("keeps generated catalog evidence source-backed and unknown availability", () => {
    const validator = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi1000/validateBuiltInAi1000PostBoqResult.ts"), "utf8");

    expect(validator).toContain('sourceId: "catalog_items"');
    expect(validator).toContain('availabilityStatus: "unknown"');
    expect(validator).toContain('stockStatus: "unknown"');
    expect(validator).not.toContain("fakeCatalogItem:");
  });
});
