import { productEntrypointSource } from "./world50000ArchitectureTestHelpers";

describe("world 50000 architecture - no inline screen rows", () => {
  it("does not inline world 50000 estimate rows in live screens", () => {
    expect(productEntrypointSource()).not.toMatch(/hydro_turbine_100kw|roof_waterproofing_100sqm|WORLD_50000/i);
  });
});
