import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ARTIFACT_DIR = join(process.cwd(), "artifacts", "S_FOREMAN_AI_ESTIMATE_FULL_ROLE_CHAIN_ACCEPTANCE");

const runGate = (name: string, command: string, args: string[]) => {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "pipe",
  });
  return {
    name,
    command: [command, ...args].join(" "),
    passed: result.status === 0,
    exitCode: result.status,
    startedAt,
    finishedAt: new Date().toISOString(),
    stdoutTail: String(result.stdout ?? "").slice(-4000),
    stderrTail: String(result.stderr ?? "").slice(-4000),
  };
};

mkdirSync(ARTIFACT_DIR, { recursive: true });

const gates = [
  runGate("typecheck", "npm", ["run", "verify:typecheck"]),
  runGate("lint", "npm", ["run", "lint"]),
  runGate("diff_check", "git", ["diff", "--check"]),
  runGate("focused_jest", "npm", [
    "test",
    "--",
    "--runInBand",
    "tests/foremanAiEstimate",
    "tests/foremanAiEstimateChain",
  ]),
];

const matrix = {
  typecheck_passed: gates.find((gate) => gate.name === "typecheck")?.passed === true,
  lint_passed: gates.find((gate) => gate.name === "lint")?.passed === true,
  diff_check_passed: gates.find((gate) => gate.name === "diff_check")?.passed === true,
  focused_jest_passed: gates.find((gate) => gate.name === "focused_jest")?.passed === true,
  all_command_gates_passed: gates.every((gate) => gate.passed),
  fake_green_claimed: false,
  gates,
};

writeFileSync(
  join(ARTIFACT_DIR, "command_gate_matrix.json"),
  `${JSON.stringify(matrix, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify(matrix, null, 2));
