import fs from "node:fs";
import path from "node:path";

function read(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("AI estimate core architecture", () => {
  it("does not introduce a second AI framework for estimates", () => {
    const registry = read("src/lib/ai/builtInAi/builtInAiToolRegistry.ts");
    expect(registry).toContain("calculate_global_estimate");
    expect(registry).not.toMatch(/new\s+OpenAI|new\s+Anthropic|LangChain|LlamaIndex/i);
  });
});
