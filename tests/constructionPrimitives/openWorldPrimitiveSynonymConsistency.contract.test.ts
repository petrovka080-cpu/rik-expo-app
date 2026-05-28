import { classifyPrimitive, OPEN_WORLD_PRIMITIVE_STRESS_PACK } from "./primitiveBoqTestHelpers";

describe("open-world primitive synonym consistency", () => {
  it("keeps domain stable when phrasing changes around the same primitive seed", () => {
    for (const item of OPEN_WORLD_PRIMITIVE_STRESS_PACK.slice(0, 80)) {
      const base = classifyPrimitive(item.prompt);
      const variant = classifyPrimitive(`boq ${item.domain.replace(/_/g, " ")} ${item.object} ${item.operation} ${item.quantity} ${item.unit}`);
      expect(variant.domain).toBe(base.domain);
    }
  });
});
