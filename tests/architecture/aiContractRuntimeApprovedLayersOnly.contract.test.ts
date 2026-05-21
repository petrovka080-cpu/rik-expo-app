import { AI_ENTERPRISE_ALLOWED_LAYERS } from "../../src/lib/ai/enterpriseGuardrails";

describe("AI contract runtime approved layers only", () => {
  it("registers contractRuntime as an approved non-screen AI layer", () => {
    expect(AI_ENTERPRISE_ALLOWED_LAYERS).toContainEqual(
      expect.objectContaining({
        layer: "contractRuntime",
        root: "src/lib/ai/contractRuntime",
        screenMayImportDirectly: false,
      }),
    );
  });
});
