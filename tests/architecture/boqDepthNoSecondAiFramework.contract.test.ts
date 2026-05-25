import fs from "node:fs";
import path from "node:path";
import { listFilesRecursively } from "./requestEstimateArchitectureTestHelpers";

describe("BOQ depth no second AI framework", () => {
  it("does not add a separate AI runtime for BOQ quality", () => {
    const source = [
      ...listFilesRecursively("src/lib/ai/globalEstimate"),
      ...listFilesRecursively("scripts/e2e"),
      ...listFilesRecursively("tests/boqDepth"),
    ]
      .filter((file) => /\.(ts|tsx)$/.test(file))
      .map((file) => `\n/* ${file} */\n${fs.readFileSync(path.resolve(file), "utf8")}`)
      .join("\n");

    expect(source).not.toMatch(/new\s+(?:OpenAI|Anthropic|LangChain|LlamaIndex)/i);
    expect(source).not.toMatch(/from\s+["'](?:langchain|llamaindex|@langchain\/)/i);
    expect(source).not.toContain("createSecondAiFramework");
  });
});
