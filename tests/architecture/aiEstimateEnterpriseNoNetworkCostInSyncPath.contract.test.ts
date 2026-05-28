import fs from "node:fs";
import path from "node:path";

import { AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY } from "../../src/lib/ai/globalEstimate";

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

const FORBIDDEN_PROVIDER_OR_NETWORK = [
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\baxios\b/,
  /\bOpenAI\b/,
  /\bAnthropic\b/,
  /\bGoogleGenerativeAI\b/,
  /\bgenerateText\b/,
  /\bstreamText\b/,
  /\b(OPENAI_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY)\b/,
];

describe("AI estimate enterprise no network/provider cost in sync path", () => {
  it("keeps the estimate runtime deterministic and zero cost", () => {
    expect(AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.providerCallsAllowed).toBe(0);
    expect(AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.networkCallsAllowed).toBe(0);
    expect(AI_ESTIMATE_ENTERPRISE_LOAD_PERFORMANCE_COST_POLICY.estimatedProviderCostUsdAllowed).toBe(0);

    const files = [
      ...ESTIMATE_RUNTIME_ROOTS.flatMap(sourceFilesUnder),
      "src/lib/ai/worldConstructionEstimateEngine.ts",
    ].filter((file) => fs.existsSync(path.join(process.cwd(), file)));
    const findings: string[] = [];

    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      for (const pattern of FORBIDDEN_PROVIDER_OR_NETWORK) {
        if (pattern.test(source)) findings.push(`${file}:${pattern.source}`);
      }
    }

    expect(findings).toEqual([]);
  });

  it("registers the release proof that enforces the same static scan", () => {
    const releaseGuard = fs.readFileSync(path.join(process.cwd(), "scripts/release/releaseGuard.shared.ts"), "utf8");
    const proof = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/runAiEstimateEnterpriseLoadPerformanceCostGuardProof.ts"),
      "utf8",
    );

    expect(releaseGuard).toContain("ai-estimate-enterprise-load-performance-cost-guard-proof");
    expect(proof).toContain("provider_or_network_findings");
    expect(proof).toContain("estimatedProviderCostUsd: 0");
    expect(proof).toContain("PROVIDER_OR_NETWORK_COST_FOUND");
  });
});
