import { readRepoFile } from "../worldConstruction/worldConstructionTestHelpers";

describe("world estimate architecture - no prompt hardcoded tax", () => {
  it("uses local estimate policy instead of prompt-hardcoded tax rules", () => {
    const engine = readRepoFile("src/lib/ai/worldConstructionEstimateEngine.ts");
    const policy = readRepoFile("src/lib/ai/localEstimatePolicy/resolveTaxPolicy.ts");

    expect(engine).toContain("resolveLocalEstimatePolicy");
    expect(policy).not.toMatch(/Хочу уложить|турбины|гидроизоляцию/);
  });
});
