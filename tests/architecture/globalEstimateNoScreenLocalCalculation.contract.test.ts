import { listRepoFiles, readRepoFile } from "./anyEstimateArchitectureTestHelpers";

describe("global estimate no screen-local calculation", () => {
  it("keeps ratebook and price math out of route and screen files", () => {
    const files = [
      ...listRepoFiles("app", (file) => /\.(ts|tsx)$/.test(file)),
      ...listRepoFiles("src/features", (file) => /\.(ts|tsx)$/.test(file)),
      ...listRepoFiles("src/screens", (file) => /\.(ts|tsx)$/.test(file)),
    ];

    for (const file of files) {
      const source = readRepoFile(file);
      expect(source).not.toContain("GLOBAL_RATE_MATERIALS");
      expect(source).not.toContain("GLOBAL_RATE_WORKS");
      expect(source).not.toContain("GLOBAL_ESTIMATE_TEMPLATES");
      expect(source).not.toContain("calculateGlobalConstructionEstimateSync");
      expect(source).not.toContain("resolveGlobalRate");
    }
  });
});
