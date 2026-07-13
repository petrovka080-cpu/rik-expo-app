import { buildProductionTemplate10000Manifest } from "../../src/lib/ai/estimateTemplate10000";

describe("template manifest 10000", () => {
  it("contains exactly 10000 production work template manifest entries", () => {
    const manifest = buildProductionTemplate10000Manifest();

    expect(manifest).toHaveLength(10000);
    expect(manifest.every((entry) => entry.workKey && entry.templateKey && entry.visibleNameRu.trim())).toBe(true);
    expect(manifest.every((entry) => entry.aliasesRuMin >= 3)).toBe(true);
    expect(manifest.every((entry) => entry.materialRecipeScope && entry.pricebookScope)).toBe(true);
    expect(manifest.every((entry) => entry.supportStatus === "SUPPORTED")).toBe(true);
  });
});
