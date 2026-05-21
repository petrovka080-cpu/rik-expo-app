import { AI_ENTERPRISE_ALLOWED_LAYERS } from "../../src/lib/ai/enterpriseGuardrails";
import { listExternalKnowledgeFiles } from "./aiExternalKnowledgeArchitectureTestHelpers";

describe("S_AI_VERIFIED_EXTERNAL_KNOWLEDGE architecture: approved layer only", () => {
  it("is registered as an enterprise approved layer", () => {
    expect(AI_ENTERPRISE_ALLOWED_LAYERS).toEqual(expect.arrayContaining([
      expect.objectContaining({
        layer: "externalKnowledge",
        root: "src/lib/ai/externalKnowledge",
        screenMayImportDirectly: false,
      }),
    ]));
    expect(listExternalKnowledgeFiles().every((file) => file.includes("/src/lib/ai/externalKnowledge/"))).toBe(true);
  });
});
