import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

type ShardStatus = "passed" | "failed" | "timeout";

type ShardResult = {
  shard_id: string;
  files: string[];
  started_at: string;
  finished_at: string;
  duration_ms: number;
  status: ShardStatus;
  exit_code: number | null;
  stdout_tail: string;
  stderr_tail: string;
};

const DEFAULT_WAVE = "S_B2C_REQUEST_RELEASE_CLOSEOUT_NO_TIMEOUT_ESCAPE_POINT_OF_NO_RETURN";
const DEFAULT_ARTIFACT_PREFIX = "S_B2C_REQUEST_RELEASE_CLOSEOUT";
const WAVE = argValue("--wave") ?? DEFAULT_WAVE;
const ARTIFACT_PREFIX = argValue("--artifact-prefix") ?? DEFAULT_ARTIFACT_PREFIX;
const ARTIFACT_DIR = path.resolve(process.cwd(), "artifacts");
const SHARDS_ARTIFACT = path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_jest_shards.json`);
const HANGING_ARTIFACT = path.join(ARTIFACT_DIR, `${ARTIFACT_PREFIX}_hanging_test.json`);

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function argNumber(name: string, fallback: number): number {
  const raw = argValue(name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
  return value;
}

function readList(filePath: string): string[] {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const bytes = fs.readFileSync(absolutePath);
  const hasUtf16Nulls = bytes.some((byte, index) => index > 1 && index % 2 === 1 && byte === 0);
  const source = hasUtf16Nulls ? bytes.toString("utf16le") : bytes.toString("utf8");
  return source
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((filePathValue) => path.relative(process.cwd(), path.resolve(filePathValue)).replace(/\\/g, "/"));
}

function shellQuote(value: string): string {
  if (process.platform === "win32") {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function tail(value: string, limit = 8000): string {
  if (value.length <= limit) return value;
  return value.slice(value.length - limit);
}

function writeArtifacts(results: ShardResult[], hanging: unknown | null): void {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(
    SHARDS_ARTIFACT,
    `${JSON.stringify({
      wave: WAVE,
      batch_count: results.length,
      failed_or_timeout_count: results.filter((result) => result.status !== "passed").length,
      results,
    }, null, 2)}\n`,
    "utf8",
  );
  if (hanging) {
    fs.writeFileSync(
      HANGING_ARTIFACT,
      `${JSON.stringify({
        wave: WAVE,
        ...hanging,
      }, null, 2)}\n`,
      "utf8",
    );
  }
}

function runJestFiles(shardId: string, files: string[], timeoutMs: number, extraArgs: string[] = []): Promise<ShardResult> {
  return new Promise((resolve) => {
    const startedAt = new Date();
    const startedMs = Date.now();
    const command = [
      "npx",
      "jest",
      "--runInBand",
      ...extraArgs,
      ...files.map(shellQuote),
    ].join(" ");
    let stdout = "";
    let stderr = "";
    let finished = false;

    const child = spawn(command, {
      cwd: process.cwd(),
      shell: true,
      env: { ...process.env, CI: process.env.CI ?? "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGTERM");
      const finishedAt = new Date();
      resolve({
        shard_id: shardId,
        files,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: Date.now() - startedMs,
        status: "timeout",
        exit_code: null,
        stdout_tail: tail(stdout),
        stderr_tail: tail(stderr),
      });
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
      process.stdout.write(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
      process.stderr.write(chunk);
    });
    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const finishedAt = new Date();
      resolve({
        shard_id: shardId,
        files,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: Date.now() - startedMs,
        status: code === 0 ? "passed" : "failed",
        exit_code: code,
        stdout_tail: tail(stdout),
        stderr_tail: tail(stderr),
      });
    });
  });
}

async function bisect(files: string[], timeoutMs: number, prefix: string, results: ShardResult[]): Promise<ShardResult> {
  const result = await runJestFiles(prefix, files, timeoutMs);
  results.push(result);
  writeArtifacts(results, result.status === "passed" ? null : { current_status: result.status, candidate_files: files });

  if (result.status === "passed" || files.length === 1) {
    return result;
  }

  const midpoint = Math.max(1, Math.floor(files.length / 2));
  const left = await bisect(files.slice(0, midpoint), timeoutMs, `${prefix}L`, results);
  if (left.status !== "passed") return left;
  return bisect(files.slice(midpoint), timeoutMs, `${prefix}R`, results);
}

async function main() {
  const listPath = argValue("--list");
  if (!listPath) {
    throw new Error("Usage: npx tsx scripts/test/runJestCloseoutShards.ts --list <file> [--preflight-list <file>] [--batch-size 40] [--timeout-ms 180000] [--artifact-prefix S_RELEASE_PIPELINE] [--wave WAVE_NAME]");
  }
  const batchSize = argNumber("--batch-size", 40);
  const timeoutMs = argNumber("--timeout-ms", 180000);
  const allFiles = readList(listPath);
  const preflightFiles = argValue("--preflight-list") ? readList(argValue("--preflight-list") as string) : [];
  const preflightSet = new Set(preflightFiles);
  const mainFiles = allFiles.filter((file) => !preflightSet.has(file));
  const results: ShardResult[] = [];

  if (preflightFiles.length > 0) {
    const preflight = await runJestFiles("preflight_clean_worktree", preflightFiles, timeoutMs);
    results.push(preflight);
    if (preflight.status !== "passed") {
      writeArtifacts(results, {
        final_status: preflight.status === "timeout" ? "BLOCKED_PREFLIGHT_CLEAN_WORKTREE_TIMEOUT" : "BLOCKED_PREFLIGHT_CLEAN_WORKTREE_FAILED",
        hanging_step: "preflight_clean_worktree",
        candidate_files: preflightFiles,
        root_cause:
          preflight.status === "timeout"
            ? "Clean-worktree-sensitive Jest preflight timed out."
            : "Clean-worktree-sensitive Jest preflight failed before shard artifacts were written.",
      });
      console.error(JSON.stringify(preflight, null, 2));
      process.exit(1);
    }
    writeArtifacts(results, null);
  }

  for (let index = 0; index < mainFiles.length; index += batchSize) {
    const files = mainFiles.slice(index, index + batchSize);
    const shard = await bisect(files, timeoutMs, `batch_${Math.floor(index / batchSize) + 1}`, results);
    if (shard.status !== "passed") {
      const single = shard.files.length === 1
        ? await runJestFiles(`${shard.shard_id}_detect_open_handles`, shard.files, timeoutMs, [
            "--detectOpenHandles",
            "--verbose",
            "--logHeapUsage",
          ])
        : null;
      if (single) {
        results.push(single);
      }
      writeArtifacts(results, {
        final_status: shard.status === "timeout" ? "BLOCKED_EXACT_HANGING_TEST_OR_STEP" : "BLOCKED_EXACT_FAILING_TEST_OR_STEP",
        hanging_step: "full_jest",
        hanging_file: shard.files.length === 1 ? shard.files[0] : null,
        candidate_files: shard.files,
        root_cause: shard.status === "timeout" ? "Jest shard timed out; inspect stdout_tail/stderr_tail." : "Jest shard failed.",
        detect_open_handles_result: single,
      });
      console.error(JSON.stringify(shard, null, 2));
      process.exit(1);
    }
  }

  writeArtifacts(results, {
    final_status: "GREEN_FULL_JEST_SHARDS_PASSED",
    hanging_test_found: false,
    full_jest_timeout: false,
  });
  console.info(JSON.stringify({
    wave: WAVE,
    final_status: "GREEN_FULL_JEST_SHARDS_PASSED",
    test_file_count: allFiles.length,
    preflight_test_file_count: preflightFiles.length,
    sharded_test_file_count: mainFiles.length,
    shard_count: results.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
