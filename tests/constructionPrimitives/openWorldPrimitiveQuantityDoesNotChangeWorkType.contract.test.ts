import { classifyPrimitive, OPEN_WORLD_PRIMITIVE_STRESS_PACK } from "./primitiveBoqTestHelpers";

describe("open-world primitive quantity stability", () => {
  it("does not change domain/object/operation when quantity changes", () => {
    for (const item of OPEN_WORLD_PRIMITIVE_STRESS_PACK.slice(0, 80)) {
      const first = classifyPrimitive(item.prompt);
      const second = classifyPrimitive(item.prompt.replace(String(item.quantity), String(item.quantity + 137)));
      expect(second.domain).toBe(first.domain);
      expect(second.objectScope).toBe(first.objectScope);
      expect(second.operation).toBe(first.operation);
    }
  });
});
