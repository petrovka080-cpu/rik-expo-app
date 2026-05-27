import { world50000Source } from "./world50000ArchitectureTestHelpers";

describe("world 50000 architecture - no markdown PDF truth", () => {
  it("uses structured estimate PDF source instead of markdown truth", () => {
    const source = world50000Source();
    expect(source).toContain("buildAiEstimatePdfSourceFromGlobalEstimate");
    expect(source).not.toMatch(/markdown.*pdf|parseMarkdownTable|markdownAsPdfTruth/i);
  });
});
