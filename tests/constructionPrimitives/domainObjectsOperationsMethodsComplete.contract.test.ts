import { primitiveGraph } from "./primitiveBoqTestHelpers";

describe("construction primitive graph completeness", () => {
  it("requires every domain to expose objects, operations, and methods", () => {
    for (const domain of primitiveGraph.domains) {
      expect(domain.objects.length).toBeGreaterThan(0);
      expect(domain.operations.length).toBeGreaterThan(0);
      expect(domain.methods.length).toBeGreaterThan(0);
    }
  });
});
