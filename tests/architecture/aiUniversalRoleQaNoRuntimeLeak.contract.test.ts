import { readAiUniversalRoleQaSource } from "./aiUniversalRoleQaArchitectureTestHelpers";

describe("S_AI_UNIVERSAL_ROLE_QA architecture: no runtime leak", () => {
  it("does not expose runtime/debug/provider payloads to users", () => {
    const source = readAiUniversalRoleQaSource();
    expect(source).not.toMatch(/console\.log|process\.env|provider payload|stack trace/i);
  });
});
