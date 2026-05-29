import { execFileSync } from "node:child_process";

function changedFiles(): string[] {
  const tracked = execFileSync("git", ["diff", "--name-only"], { cwd: process.cwd(), encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd: process.cwd(),
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
  return Array.from(new Set([...tracked, ...untracked])).map((file) => file.replace(/\\/g, "/"));
}

const PERFORMANCE_COST_GUARD_GLOBAL_ESTIMATE_FILES = new Set([
  "src/lib/ai/globalEstimate/index.ts",
  "src/lib/ai/globalEstimate/estimatePerformanceCostPolicy.ts",
  "src/lib/ai/globalEstimate/evaluateEstimatePerformanceCost.ts",
  "src/lib/estimatePdf/index.ts",
  "src/lib/estimatePdf/aiEstimatePdfJobGuard.ts",
  "src/lib/estimatePdf/aiEstimatePdfRateLimit.ts",
  "src/lib/estimatePdf/validateAiEstimatePdfLoadPolicy.ts",
]);

describe("Android app root ready marker unblock wave: no estimate engine change", () => {
  it("does not edit estimate engine, resolver, ratebook, template, or PDF renderer code", () => {
    const forbidden = changedFiles().filter(
      (file) =>
        !PERFORMANCE_COST_GUARD_GLOBAL_ESTIMATE_FILES.has(file) &&
        (/^src\/lib\/ai\/globalEstimate\//.test(file) ||
          /^src\/lib\/ai\/builtInAi\//.test(file) ||
          /^src\/lib\/ai\/ratebook\//.test(file) ||
          /^src\/lib\/pdf\//.test(file) ||
          /^src\/lib\/estimatePdf\//.test(file)),
    );

    expect(forbidden).toEqual([]);
  });
});
