import { readRequestEstimateRuntimeSource } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate no useEffect rewrite", () => {
  it("does not patch answers after render with useEffect rewrites", () => {
    const source = readRequestEstimateRuntimeSource();
    expect(source).not.toMatch(/useEffect\s*\(\s*\(\)\s*=>\s*setAnswer/);
    expect(source).not.toMatch(/setMessages\s*\(\s*prev\s*=>\s*rewrite/);
  });
});
