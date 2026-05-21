import { readAiAlwaysOnExternalSources } from "./aiAlwaysOnExternalArchitectureTestHelpers";

describe("AI always-on external no hardcoded question answer", () => {
  it("does not route by questionId or buttonId hardcodes", () => {
    const source = readAiAlwaysOnExternalSources();

    expect(source).not.toMatch(/questionId|buttonId|screenId\s*===/);
    expect(source).toContain("resolveAiQuestionKnowledgeMode");
    expect(source).toContain("resolveConstructionWorkType");
  });
});
