import { readAiAppContextGraphSource } from "./aiAppContextGraphArchitectureTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS architecture: no hooks", () => {
  it("keeps the graph foundation in pure services without React hooks", () => {
    const source = readAiAppContextGraphSource();
    expect(source).not.toMatch(/from\s+["']react["']/);
    expect(source).not.toMatch(/function\s+use[A-Z][A-Za-z0-9_]*/);
    expect(source).not.toMatch(/const\s+use[A-Z][A-Za-z0-9_]*\s*=/);
  });
});
