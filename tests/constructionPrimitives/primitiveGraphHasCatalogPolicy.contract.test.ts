import { primitiveGraph } from "./primitiveBoqTestHelpers";

describe("construction primitive catalog policy", () => {
  it("requires material systems and domains to carry catalog policy", () => {
    const materialSystems = new Map(primitiveGraph.materialSystems.map((system) => [system.key, system]));
    for (const system of primitiveGraph.materialSystems) {
      expect(system.materialKeys.length).toBeGreaterThan(0);
      expect(system.catalogPolicy).toBeTruthy();
    }
    for (const domain of primitiveGraph.domains) {
      expect(domain.catalogPolicy).toBeTruthy();
      for (const materialSystem of domain.materialSystems) {
        expect(materialSystems.has(materialSystem)).toBe(true);
      }
    }
  });
});
