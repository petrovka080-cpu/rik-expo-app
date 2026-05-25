import fs from "node:fs";
import path from "node:path";

describe("AI 10000 post-BOQ architecture: no fake catalog items", () => {
  it("declares source and catalog policies without generated catalog rows", () => {
    const domains = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi10000/builtInAi10000PostBoqDomains.ts"), "utf8");
    const generator = fs.readFileSync(path.join(process.cwd(), "src/lib/ai/builtInAi10000/builtInAi10000PostBoqGenerator.ts"), "utf8");
    const source = `${domains}\n${generator}`;

    expect(source).toContain("availability_unknown_unless_confirmed");
    expect(source).toContain("source_status_explicit");
    expect(source).not.toContain("mockCatalogItem");
    expect(source).not.toContain("fakeCatalogItem:");
    expect(source).not.toContain("const fakeCatalog");
  });
});
