import { world50000ProofSource } from "./worldConstruction50000TestHelpers";

describe("world construction 50000 no self-validating matrix", () => {
  it("merge reads shard artifacts and supplemental proof before declaring green", () => {
    const source = world50000ProofSource();
    expect(source).toContain("readShard");
    expect(source).toContain("PDF_EXTRACTION_SAMPLE_MISSING");
    expect(source).toContain("ANDROID_API34_SAMPLE_MISSING");
    expect(source).not.toMatch(/final_status:\s*WORLD_50000_GREEN_STATUS\s*[,}]/);
  });
});
