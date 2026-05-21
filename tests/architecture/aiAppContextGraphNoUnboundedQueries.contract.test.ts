import { readAiAppContextGraphSource } from "./aiAppContextGraphArchitectureTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS architecture: no unbounded queries", () => {
  it("does not use select star or raw SQL queries", () => {
    const source = readAiAppContextGraphSource();
    expect(source).not.toMatch(/select\s*\(\s*["'`]?\*/i);
    expect(source).not.toMatch(/select\s+\*/i);
    expect(source).not.toMatch(/\bwhere\s+1\s*=\s*1\b/i);
  });
});
