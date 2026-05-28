import { classifyPrimitive, OPEN_WORLD_PRIMITIVE_STRESS_PACK } from "./primitiveBoqTestHelpers";

describe("open-world primitive location stability", () => {
  it("does not change domain/object/operation when city changes", () => {
    for (const item of OPEN_WORLD_PRIMITIVE_STRESS_PACK.slice(0, 80)) {
      const first = classifyPrimitive(item.prompt);
      const second = classifyPrimitive(item.prompt.replace(item.city, "Austin Texas"));
      expect(second.domain).toBe(first.domain);
      expect(second.objectScope).toBe(first.objectScope);
      expect(second.operation).toBe(first.operation);
    }
  });
});
