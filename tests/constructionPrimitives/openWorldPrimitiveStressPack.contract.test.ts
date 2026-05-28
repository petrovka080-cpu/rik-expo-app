import { OPEN_WORLD_PRIMITIVE_STRESS_PACK, primitiveGraph } from "./primitiveBoqTestHelpers";

describe("open-world primitive stress pack", () => {
  it("contains 300 compact primitive cases across 30 domains", () => {
    const domains = new Set(OPEN_WORLD_PRIMITIVE_STRESS_PACK.map((item) => item.domain));
    expect(OPEN_WORLD_PRIMITIVE_STRESS_PACK.length).toBe(300);
    expect(domains.size).toBe(30);
    for (const item of OPEN_WORLD_PRIMITIVE_STRESS_PACK) {
      const domain = primitiveGraph.domains.find((candidate) => candidate.domain === item.domain);
      expect(domain).toBeTruthy();
      expect(domain?.objects).toContain(item.object);
      expect(domain?.operations).toContain(item.operation);
      expect(domain?.methods).toContain(item.method);
    }
  });
});
