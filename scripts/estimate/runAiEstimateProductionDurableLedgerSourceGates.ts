import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";

export const GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SOURCE_GATES =
  "GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SOURCE_GATES" as const;
export const STOP_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SOURCE_GATES_FAILED =
  "STOP_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SOURCE_GATES_FAILED" as const;

const ROOT = path.join(".release-runtime", "ai-estimate-production-durable-ledger-sync-history-scale", "source-gates");

type GateName =
  | "typecheck"
  | "lint"
  | "diff_check"
  | "no_test_weakening"
  | "web_public_smoke"
  | "ci_office_market"
  | "secret_scan";

const GATES: { name: GateName; command: string; args: string[]; timeoutMs: number }[] = [
  { name: "typecheck", command: "npm", args: ["run", "verify:typecheck"], timeoutMs: 900_000 },
  { name: "lint", command: "npm", args: ["run", "lint"], timeoutMs: 900_000 },
  { name: "diff_check", command: "git", args: ["diff", "--check"], timeoutMs: 120_000 },
  { name: "no_test_weakening", command: "npx", args: ["tsx", "scripts/release/assertNoTestWeakening.ts"], timeoutMs: 300_000 },
  { name: "web_public_smoke", command: "npm", args: ["run", "verify:web-public-smoke"], timeoutMs: 900_000 },
  { name: "ci_office_market", command: "npm", args: ["run", "ci:office-market"], timeoutMs: 900_000 },
  { name: "secret_scan", command: "npx", args: ["tsx", "scripts/release/scanCloseoutArtifactsForSecrets.ts", "artifacts", ".release-runtime"], timeoutMs: 900_000 },
];

function runGate(gate: { name: GateName; command: string; args: string[]; timeoutMs: number }, outDir: string) {
  const result = spawnSync(
    process.platform === "win32" && gate.command !== "git" ? "cmd.exe" : gate.command,
    process.platform === "win32" && gate.command !== "git"
      ? ["/c", gate.command, ...gate.args]
      : gate.args,
    {
      cwd: process.cwd(),
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 1024 * 1024 * 128,
      timeout: gate.timeoutMs,
    },
  );
  const stdoutLog = path.join(outDir, `${gate.name}.stdout.log`);
  const stderrLog = path.join(outDir, `${gate.name}.stderr.log`);
  writeFileSync(stdoutLog, result.stdout ?? "", "utf8");
  writeFileSync(stderrLog, result.stderr ?? "", "utf8");
  return {
    exit_code: result.status,
    signal: result.signal,
    stdout_log: stdoutLog,
    stderr_log: stderrLog,
  };
}

export function runAiEstimateProductionDurableLedgerSourceGates(input: { writeSummary?: boolean } = {}) {
  const outDir = path.join(ROOT, timestampForPath());
  mkdirSync(outDir, { recursive: true });
  const results = Object.fromEntries(GATES.map((gate) => [gate.name, runGate(gate, outDir)])) as Record<GateName, ReturnType<typeof runGate>>;
  const passed = (name: GateName) => results[name].exit_code === 0;
  const blockers = GATES.filter((gate) => !passed(gate.name)).map((gate) => `${gate.name}_failed:${results[gate.name].exit_code ?? results[gate.name].signal ?? "null"}`);
  const summary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SOURCE_GATES
      : STOP_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SOURCE_GATES_FAILED,
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
    gates: results,
    blockers,
  };
  const summaryPath = path.join(outDir, "summary.json");
  if (input.writeSummary !== false) writeJson(summaryPath, summary);
  return { summary, summaryPath };
}

if (require.main === module) {
  const result = runAiEstimateProductionDurableLedgerSourceGates({ writeSummary: true });
  console.log(JSON.stringify({ ...result.summary, summary_path: result.summaryPath }, null, 2));
  if (result.summary.final_status !== GREEN_AI_ESTIMATE_PRODUCTION_DURABLE_LEDGER_SOURCE_GATES) process.exitCode = 1;
}
