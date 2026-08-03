import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildVerificationPlan, type VerificationLevel } from "./impactAnalyzer";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 20_000 }).trim();
}

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((item) => item.trim().replace(/\\/g, "/")).filter(Boolean);
}

function sha256File(filePath: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function changedFiles(baseSha: string, headSha: string): string[] {
  const committed = lines(git(["diff", "--name-only", `${baseSha}..${headSha}`]));
  const unstaged = lines(git(["diff", "--name-only"]));
  const staged = lines(git(["diff", "--cached", "--name-only"]));
  const untracked = lines(git(["ls-files", "--others", "--exclude-standard"]));
  return [...new Set([...committed, ...unstaged, ...staged, ...untracked])].sort((a, b) => a.localeCompare(b, "en"));
}

const level = (arg("level") ?? "local") as VerificationLevel;
if (!(["local", "affected", "pr"] as string[]).includes(level)) throw new Error(`invalid_verification_level:${level}`);
const baseSha = arg("base") ?? git(["rev-parse", "HEAD"]);
const headSha = arg("head") ?? git(["rev-parse", "HEAD"]);
const plan = buildVerificationPlan({ baseSha, headSha, level, changedFiles: changedFiles(baseSha, headSha) });
const outputDir = path.resolve(arg("output-dir") ?? path.join(".release-runtime", "verification-v1", headSha, level));
const planPath = path.join(outputDir, "plan.json");
writeJson(planPath, plan);

if (process.argv.includes("--plan-only")) {
  process.stdout.write(`${JSON.stringify({ final_status: "GREEN_VERIFICATION_PLAN_READY", plan_path: path.relative(process.cwd(), planPath).replace(/\\/g, "/"), ...plan }, null, 2)}\n`);
} else {
  const started = new Date();
  const resultPath = path.join(outputDir, "jest-result.json");
  const stdoutPath = path.join(outputDir, "stdout.log");
  const stderrPath = path.join(outputDir, "stderr.log");
  const suites = plan.selected_suites.filter((suite) => fs.existsSync(path.join(process.cwd(), suite)));
  const missingSuites = plan.selected_suites.filter((suite) => !fs.existsSync(path.join(process.cwd(), suite)));
  const jestBin = path.join(process.cwd(), "node_modules", "jest", "bin", "jest.js");
  const child = missingSuites.length === 0 && suites.length > 0
    ? spawnSync(process.execPath, [jestBin, ...suites, "--runInBand", "--detectOpenHandles", "--json", `--outputFile=${resultPath}`], { cwd: process.cwd(), encoding: "utf8", maxBuffer: 100 * 1024 * 1024, windowsHide: true })
    : { status: missingSuites.length === 0 ? 0 : 1, signal: null, stdout: "", stderr: "" };
  fs.writeFileSync(stdoutPath, child.stdout ?? "", "utf8");
  fs.writeFileSync(stderrPath, child.stderr ?? "", "utf8");
  const jest = fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, "utf8")) as Record<string, unknown> : {};
  const ended = new Date();
  const budgetMs = level === "local" ? 300_000 : level === "affected" ? 600_000 : 1_800_000;
  const durationMs = ended.getTime() - started.getTime();
  const failedAssertions = Array.isArray(jest.testResults) ? (jest.testResults as Array<Record<string, unknown>>).flatMap((suite) => Array.isArray(suite.assertionResults) ? (suite.assertionResults as Array<Record<string, unknown>>).filter((assertion) => assertion.status === "failed").map((assertion) => String(assertion.fullName ?? assertion.title ?? "unknown")) : []) : [];
  const exitCode = typeof child.status === "number" ? child.status : 1;
  const passed = exitCode === 0 && missingSuites.length === 0 && jest.success === true && durationMs <= budgetMs;
  const artifactHashes = [planPath, resultPath, stdoutPath, stderrPath].filter(fs.existsSync).map((file) => ({ path: path.relative(process.cwd(), file).replace(/\\/g, "/"), sha256: sha256File(file) }));
  const summary = {
    schema: "verification-gate-summary/v1",
    gate_name: `${level}-verification-gate`, gate_version: "1", base_sha: baseSha, head_sha: headSha,
    input_fingerprint: plan.input_fingerprint, selected_domains: plan.selections.filter((item) => item.selected).flatMap((item) => item.domains),
    selected_suites: suites, selected_producers: plan.selected_producers, cache: { status: "reported-by-required-artifact-preflight", reason: "content-addressed prerequisite gate" },
    shard_manifest: null, started_at: started.toISOString(), ended_at: ended.toISOString(), duration_ms: durationMs,
    passed_tests: Number(jest.numPassedTests ?? 0), failed_tests: Number(jest.numFailedTests ?? 0), skipped_tests: Number(jest.numPendingTests ?? 0),
    passed_suites: Number(jest.numPassedTestSuites ?? 0), failed_suites: Number(jest.numFailedTestSuites ?? 0), skipped_suites: Number(jest.numPendingTestSuites ?? 0),
    failed_assertions: failedAssertions, missing_suites: missingSuites, artifact_hashes: artifactHashes, exit_code: passed ? 0 : exitCode || 1,
    budget: { limit_ms: budgetMs, actual_ms: durationMs, passed: durationMs <= budgetMs }, final_status: passed ? "GREEN_VERIFICATION_GATE" : "RED_VERIFICATION_GATE", fake_green_claimed: false,
  };
  writeJson(path.join(outputDir, "summary.json"), summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
}
