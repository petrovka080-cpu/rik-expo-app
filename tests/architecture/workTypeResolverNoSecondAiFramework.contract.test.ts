import fs from "node:fs";
import path from "node:path";

describe("work type resolver AI framework boundary", () => {
  it("does not introduce a second AI framework for waterproofing disambiguation", () => {
    const files = [
      "src/lib/ai/globalEstimate/workTypeDisambiguation.ts",
      "src/lib/ai/globalEstimate/waterproofingWorkTypeResolver.ts",
      "src/lib/ai/globalEstimate/roofingWorkTypeResolver.ts",
      "src/lib/ai/globalEstimate/workTypeResolverNegativeRules.ts",
    ];
    const source = files.map((filePath) => fs.readFileSync(path.join(process.cwd(), filePath), "utf8")).join("\n");

    expect(source).not.toMatch(/langchain|llamaindex|semantic-kernel|autogen|crewai|haystack/i);
  });
});
