import { readAiAppContextGraphSource } from "./aiAppContextGraphArchitectureTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS architecture: no useEffect hacks", () => {
  it("does not use useEffect or lifecycle workarounds", () => {
    const source = readAiAppContextGraphSource();
    expect(source).not.toMatch(/\buseEffect\b/);
    expect(source).not.toMatch(/setTimeout\(/);
  });
});
