import { readAiUniversalRoleQaSource } from "./aiUniversalRoleQaArchitectureTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA architecture: no second AI framework", () => {
  it("does not import model SDKs, agent frameworks, or network clients", () => {
    const source = readAiUniversalRoleQaSource();
    expect(source).not.toMatch(/langchain|llamaindex|@ai-sdk|openai|anthropic|gemini/i);
    expect(source).not.toMatch(/fetch\s*\(|XMLHttpRequest|WebSocket/);
  });
});
