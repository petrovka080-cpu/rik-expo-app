import { world50000Source } from "./world50000ArchitectureTestHelpers";

describe("world 50000 architecture - no second AI framework", () => {
  it("does not add another AI framework for proof execution", () => {
    expect(world50000Source()).not.toMatch(/new\s+(OpenAI|Anthropic|GoogleGenerativeAI)|from ["']openai["']|from ["']@anthropic-ai/i);
  });
});
