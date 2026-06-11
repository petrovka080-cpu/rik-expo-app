import { spawnSync } from "node:child_process";

import { writeWaveJson } from "./aiEstimateCoreReal10000Hardening.shared";

type CheckName = "typecheck" | "lint" | "diff_check" | "cached_diff_check";

type CheckResult = {
  name: CheckName;
  command: string;
  exit_code: number | null;
  passed: boolean;
  stdout_tail: string[];
  stderr_tail: string[];
};

function runCheck(name: CheckName, command: string, args: string[]): CheckResult {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30 * 60_000,
    shell: process.platform === "win32",
  });
  return {
    name,
    command: [command, ...args].join(" "),
    exit_code: result.status,
    passed: result.status === 0,
    stdout_tail: (result.stdout ?? "").split(/\r?\n/).slice(-120),
    stderr_tail: (result.stderr ?? "").split(/\r?\n/).slice(-120),
  };
}

export function runAiEstimateCoreReal10000StaticChecks() {
  const checks = [
    runCheck("typecheck", "npm", ["run", "verify:typecheck"]),
    runCheck("lint", "npm", ["run", "lint"]),
    runCheck("diff_check", "git", ["diff", "--check"]),
    runCheck("cached_diff_check", "git", ["diff", "--cached", "--check"]),
  ];
  const failures = checks.filter((item) => !item.passed).map((item) => item.name);
  const matrix = {
    final_status: failures.length === 0
      ? "GREEN_AI_ESTIMATE_CORE_REAL_10000_STATIC_CHECKS_READY"
      : "BLOCKED_AI_ESTIMATE_CORE_REAL_10000_STATIC_CHECKS",
    typecheck_passed: checks.find((item) => item.name === "typecheck")?.passed === true,
    lint_passed: checks.find((item) => item.name === "lint")?.passed === true,
    diff_check_passed: checks.find((item) => item.name === "diff_check")?.passed === true,
    cached_diff_check_passed: checks.find((item) => item.name === "cached_diff_check")?.passed === true,
    checks,
    failures,
  };
  writeWaveJson("static_checks_results.json", matrix);
  console.log(matrix.final_status);
  if (failures.length > 0) process.exitCode = 1;
  return matrix;
}

if (require.main === module) {
  runAiEstimateCoreReal10000StaticChecks();
}
