import path from "node:path";

import { AI_PLATFORM_KERNEL_ROOT, currentGitState, runCommand, timestampForPath, writeJson } from "./aiPlatformKernelAuditUtils";

export const GREEN_AI_PLATFORM_KERNEL_SOURCE_GATES = "GREEN_AI_PLATFORM_KERNEL_SOURCE_GATES" as const;
export const STOP_AI_PLATFORM_KERNEL_SOURCE_GATES_FAILED = "STOP_AI_PLATFORM_KERNEL_SOURCE_GATES_FAILED" as const;

const gates = [
  { name: "typecheck", command: "npm", args: ["run", "verify:typecheck"] },
  { name: "lint", command: "npm", args: ["run", "lint"] },
  { name: "diff_check", command: "git", args: ["diff", "--check"] },
  { name: "no_test_weakening", command: "npx", args: ["tsx", "scripts/release/assertNoTestWeakening.ts"] },
  { name: "web_public_smoke", command: "npm", args: ["run", "verify:web-public-smoke"] },
  { name: "ci_office_market", command: "npm", args: ["run", "ci:office-market"] },
  {
    name: "secret_scan",
    command: "npx",
    args: ["tsx", "scripts/release/scanCloseoutArtifactsForSecrets.ts", "artifacts", ".release-runtime"],
  },
] as const;

export function runAiPlatformKernelSourceGates(input: { writeSummary?: boolean } = {}) {
  const gateResults = gates.map((gate) => {
    const result = runCommand(gate.command, [...gate.args]);
    return {
      name: gate.name,
      command: `${gate.command} ${gate.args.join(" ")}`,
      passed: result.passed,
      outputTail: result.output.slice(-4000),
    };
  });
  const passed = gateResults.every((gate) => gate.passed);
  const byName = new Map(gateResults.map((gate) => [gate.name, gate.passed]));
  const summary = {
    final_status: passed ? GREEN_AI_PLATFORM_KERNEL_SOURCE_GATES : STOP_AI_PLATFORM_KERNEL_SOURCE_GATES_FAILED,
    ...currentGitState(),
    generated_at: new Date().toISOString(),
    typecheck_passed: byName.get("typecheck") === true,
    lint_passed: byName.get("lint") === true,
    diff_check_passed: byName.get("diff_check") === true,
    no_test_weakening_passed: byName.get("no_test_weakening") === true,
    web_public_smoke_passed: byName.get("web_public_smoke") === true,
    ci_office_market_passed: byName.get("ci_office_market") === true,
    secret_scan_passed: byName.get("secret_scan") === true,
    gate_results: gateResults,
    blockers: gateResults.filter((gate) => !gate.passed).map((gate) => `${gate.name}_failed`),
  };
  const summaryPath = path.join(AI_PLATFORM_KERNEL_ROOT, "source-gates", timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiPlatformKernelSourceGates({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_PLATFORM_KERNEL_SOURCE_GATES) process.exitCode = 1;
}
