import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_NORMATIVE_SOURCE_GATES =
  "GREEN_AI_ESTIMATE_NORMATIVE_SOURCE_GATES" as const;
export const STOP_AI_ESTIMATE_NORMATIVE_SOURCE_GATES_FAILED =
  "STOP_AI_ESTIMATE_NORMATIVE_SOURCE_GATES_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-normative-parameter-completeness", "source-gates");

type GateName =
  | "typecheck"
  | "lint"
  | "diff_check"
  | "no_test_weakening"
  | "web_public_smoke"
  | "ci_office_market"
  | "secret_scan";

const GATES: { name: GateName; command: string }[] = [
  { name: "typecheck", command: "npm run verify:typecheck" },
  { name: "lint", command: "npm run lint" },
  { name: "diff_check", command: "git diff --check" },
  { name: "no_test_weakening", command: "npx tsx scripts/release/assertNoTestWeakening.ts" },
  { name: "web_public_smoke", command: "npm run verify:web-public-smoke" },
  { name: "ci_office_market", command: "npm run ci:office-market" },
  { name: "secret_scan", command: "npx tsx scripts/release/scanCloseoutArtifactsForSecrets.ts artifacts .release-runtime" },
];

export type AiEstimateNormativeSourceGatesSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_NORMATIVE_SOURCE_GATES
    | typeof STOP_AI_ESTIMATE_NORMATIVE_SOURCE_GATES_FAILED;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  typecheck_passed: boolean;
  lint_passed: boolean;
  diff_check_passed: boolean;
  no_test_weakening_passed: boolean;
  web_public_smoke_passed: boolean;
  ci_office_market_passed: boolean;
  secret_scan_passed: boolean;
  gates: Record<GateName, {
    command: string;
    exit_code: number | null;
    stdout_log: string;
    stderr_log: string;
  }>;
  blockers: string[];
};

function runShell(command: string, outDir: string, name: GateName) {
  const stdoutLog = path.join(outDir, `${name}.stdout.log`);
  const stderrLog = path.join(outDir, `${name}.stderr.log`);
  const result = spawnSync(
    process.platform === "win32" ? "cmd.exe" : "sh",
    process.platform === "win32" ? ["/c", command] : ["-lc", command],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 64,
    },
  );
  writeFileSync(stdoutLog, result.stdout ?? "", "utf8");
  writeFileSync(stderrLog, result.stderr ?? "", "utf8");
  return {
    command,
    exit_code: result.status,
    stdout_log: stdoutLog,
    stderr_log: stderrLog,
  };
}

export function runAiEstimateNormativeSourceGates(input: { writeSummary?: boolean } = {}) {
  const outDir = path.join(ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const gateResults = Object.fromEntries(
    GATES.map((gate) => [gate.name, runShell(gate.command, outDir, gate.name)]),
  ) as AiEstimateNormativeSourceGatesSummary["gates"];
  const passed = (name: GateName) => gateResults[name].exit_code === 0;
  const blockers = GATES
    .filter((gate) => !passed(gate.name))
    .map((gate) => `${gate.name}_failed:${gateResults[gate.name].exit_code ?? "null"}`);
  const summary: AiEstimateNormativeSourceGatesSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_NORMATIVE_SOURCE_GATES
      : STOP_AI_ESTIMATE_NORMATIVE_SOURCE_GATES_FAILED,
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    typecheck_passed: passed("typecheck"),
    lint_passed: passed("lint"),
    diff_check_passed: passed("diff_check"),
    no_test_weakening_passed: passed("no_test_weakening"),
    web_public_smoke_passed: passed("web_public_smoke"),
    ci_office_market_passed: passed("ci_office_market"),
    secret_scan_passed: passed("secret_scan"),
    gates: gateResults,
    blockers,
  };
  const summaryPath = path.join(outDir, "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateNormativeSourceGates({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_NORMATIVE_SOURCE_GATES) process.exitCode = 1;
}
