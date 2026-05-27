import { world50000Source } from "./world50000ArchitectureTestHelpers";

describe("world 50000 architecture - no API36 green", () => {
  it("keeps Android acceptance pinned to API34 and rejects API36", () => {
    const source = world50000Source();
    expect(source).toContain("API34_AVD_NAME");
    expect(source).toContain("api36_rejected");
    expect(source).not.toMatch(/android_sdk\s*!==\s*36|API36.*GREEN/i);
  });
});
