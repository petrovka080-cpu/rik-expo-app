import fs from "node:fs";
import path from "node:path";

function sourceFilesUnder(relativeRoot: string): string[] {
  const absoluteRoot = path.join(process.cwd(), relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];
  const files: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(process.cwd(), absolute).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !relative.includes("/fixtures/")) {
        files.push(relative);
      }
    }
  };
  walk(absoluteRoot);
  return files;
}

const ESTIMATE_RUNTIME_ROOTS = [
  "src/lib/ai/builtInAi",
  "src/lib/ai/worldConstructionInterpreter",
  "src/lib/ai/constructionPrimitives",
  "src/lib/ai/constructionFormulas",
  "src/lib/ai/professionalBoq",
  "src/lib/ai/estimatePresentation",
  "src/lib/estimatePdf",
];

const FORBIDDEN_UNBOUNDED_RUNTIME_PATTERNS = [
  /while\s*\(\s*true\s*\)/,
  /for\s*\(\s*;\s*;\s*\)/,
  /\bsetInterval\s*\(/,
];

describe("AI estimate enterprise no unbounded loops", () => {
  it("keeps the estimate, presentation, and PDF runtime free of unbounded loops", () => {
    const files = [
      ...ESTIMATE_RUNTIME_ROOTS.flatMap(sourceFilesUnder),
      "src/lib/ai/worldConstructionEstimateEngine.ts",
    ].filter((file) => fs.existsSync(path.join(process.cwd(), file)));
    const findings: string[] = [];

    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      for (const pattern of FORBIDDEN_UNBOUNDED_RUNTIME_PATTERNS) {
        if (pattern.test(source)) findings.push(`${file}:${pattern.source}`);
      }
    }

    expect(findings).toEqual([]);
  });

  it("keeps release verify timeout hardening aware of the named proof gate", () => {
    const timedRunner = fs.readFileSync(
      path.join(process.cwd(), "scripts/release/runReleaseVerifyWithStepTiming.ts"),
      "utf8",
    );
    const proof = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAiEstimateEnterpriseLoadPerformanceCostGuardProof.ts"),
      "utf8",
    );

    expect(timedRunner).toContain("ai-estimate-enterprise-load-performance-cost-guard-proof");
    expect(proof).toContain("UNBOUNDED_RUNTIME_PATTERN_FOUND");
    expect(proof).toContain("no_unbounded_runtime_loops");
  });
});
