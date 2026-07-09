import { execSync } from "node:child_process";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "../estimate/buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SOURCE_GATES =
  "GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SOURCE_GATES" as const;
export const STOP_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SOURCE_GATES_FAILED =
  "STOP_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SOURCE_GATES_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-evolutionary-architecture-scale-seal", "source-gates");

const COMMANDS = [
  ["typecheck", "npm run verify:typecheck"],
  ["lint", "npm run lint"],
  ["diff_check", "git diff --check"],
  ["no_test_weakening", "npx tsx scripts/release/assertNoTestWeakening.ts"],
  ["web_public_smoke", "npm run verify:web-public-smoke"],
  ["ci_office_market", "npm run ci:office-market"],
  ["secret_scan", "npx tsx scripts/release/scanCloseoutArtifactsForSecrets.ts artifacts .release-runtime"],
] as const;

function runGate(command: string) {
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 900_000,
    });
    return { passed: true, outputTail: output.slice(-4000) };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    return {
      passed: false,
      outputTail: `${err.stdout ?? ""}\n${err.stderr ?? ""}\n${err.message ?? ""}`.slice(-4000),
    };
  }
}

export function runAiEstimateArchitectureScaleSealSourceGates(input: { writeSummary?: boolean } = {}) {
  const gateResults = COMMANDS.map(([name, command]) => ({ name, command, ...runGate(command) }));
  const blockers = gateResults.filter((gate) => !gate.passed).map((gate) => `${gate.name}_failed`);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SOURCE_GATES
      : STOP_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SOURCE_GATES_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    typecheck_passed: gateResults.find((gate) => gate.name === "typecheck")?.passed === true,
    lint_passed: gateResults.find((gate) => gate.name === "lint")?.passed === true,
    diff_check_passed: gateResults.find((gate) => gate.name === "diff_check")?.passed === true,
    no_test_weakening_passed: gateResults.find((gate) => gate.name === "no_test_weakening")?.passed === true,
    web_public_smoke_passed: gateResults.find((gate) => gate.name === "web_public_smoke")?.passed === true,
    ci_office_market_passed: gateResults.find((gate) => gate.name === "ci_office_market")?.passed === true,
    secret_scan_passed: gateResults.find((gate) => gate.name === "secret_scan")?.passed === true,
    gate_results: gateResults,
    blockers,
  };
  const summaryPath = path.join(ROOT, timestampForPath(), "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateArchitectureScaleSealSourceGates({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_EVOLUTIONARY_ARCHITECTURE_SOURCE_GATES) process.exitCode = 1;
}
