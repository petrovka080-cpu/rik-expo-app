import fs from "node:fs";
import path from "node:path";

const EXACT_PROMPT = "смета на заливку бетонных тумб 12 шт";

const RUNTIME_FILES = [
  "src/lib/ai/estimatorKernel/buildEstimatorReasoningPlan.ts",
  "src/lib/ai/estimatorKernel/isParsableConstructionWork.ts",
  "src/lib/ai/constructionFormulas/constructionFormulaRegistry.ts",
  "src/lib/ai/professionalBoq/compileDynamicProfessionalBoq.ts",
  "src/lib/ai/globalEstimate/globalEstimateCalculator.ts",
  "src/lib/ai/globalEstimate/globalWorkTypeResolver.ts",
] as const;

describe("concrete pedestal no exact prompt lookup", () => {
  it("does not hardcode the exact acceptance prompt in runtime routing code", () => {
    for (const relativePath of RUNTIME_FILES) {
      const content = fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
      expect(content).not.toContain(EXACT_PROMPT);
    }
  });
});
