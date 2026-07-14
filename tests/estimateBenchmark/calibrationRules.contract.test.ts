import { readFileSync } from "node:fs";

import { runGoldenBenchmarkAcceptance } from "../../scripts/estimate/goldenBenchmarkCore";

describe("golden benchmark calibration rules", () => {
  it("does not rely on prompt-specific hardcode or LLM quantity calibration", () => {
    const summary = runGoldenBenchmarkAcceptance();
    const core = readFileSync("scripts/estimate/goldenBenchmarkCore.ts", "utf8");

    expect(summary.no_prompt_specific_hardcode).toBe(true);
    expect(summary.no_llm_quantity_calibration).toBe(true);
    expect(summary.all_corrections_versioned).toBe(true);
    expect(summary.calibration_audit_passed).toBe(true);
    expect(core).not.toMatch(/return canned|exact prompt|prompt-specific hardcode/i);
    expect(core).not.toMatch(/LLM adjusts quantities|silent tolerance widening/i);
  });
});
