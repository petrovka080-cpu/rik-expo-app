import { world50000Source } from "./world50000ArchitectureTestHelpers";

describe("world 50000 architecture - no fake catalog service", () => {
  it("does not create a separate fake catalog service for proof", () => {
    expect(world50000Source()).not.toMatch(/fakeCatalog|mockCatalogService|supplier:\s*["']|stock:\s*\d|availability:\s*["']/i);
  });
});
