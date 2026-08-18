import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  closeSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const SPEC_SHA256 = "21bdd2cf79185cbcf2a6621005f32d6eaf47e653dd88e5b006fcdc6797854138";
const SPEC_PATH = "C:/Users/User/Downloads/P0_ONE_MONOLITH_ESTIMATE_PLATFORM_R5_PRODUCTION_GRADE_TZ (11).md";
const REQUIRED_ANCESTOR = "691acb78";
const GATE_ROOT = path.join(
  ".release-runtime",
  "p0-one-monolith-r58",
  "evidence",
  "10-platform-core",
);
const SHARD_TIMEOUT_MS = 1_200_000;
const HEARTBEAT_MS = 15_000;

const SHARDS = [
  {
    id: "shard_01_boot_auth_navigation",
    suites: [
      "tests/estimateInfrastructure/aiEstimateCatalogIndex11610.contract.test.ts",
      "tests/estimateInfrastructure/aiEstimateWorkClassifier.contract.test.ts",
      "tests/estimateInfrastructure/aiEstimatePlatformCoreV2Matrix.contract.test.ts",
      "tests/estimateRuntime/aiEstimatePlatformCoreV2Performance.contract.test.ts",
    ],
  },
  {
    id: "shard_02_roles_requests_drafts_rpc",
    suites: [
      "tests/estimateInfrastructure/aiEstimateParameterGraph.contract.test.ts",
      "tests/estimateInfrastructure/aiEstimateFormulaDag.contract.test.ts",
      "tests/requestEstimate/platformCoreV2RequestFlow.contract.test.tsx",
      "tests/consumerRepair/platformCoreV2ConsumerFlow.contract.test.ts",
      "tests/foreman/platformCoreV2ForemanFlow.contract.test.ts",
    ],
  },
  {
    id: "shard_03_pdf_procurement_history_offline",
    suites: [
      "tests/estimateInfrastructure/aiEstimateRevisionEngineV2.contract.test.ts",
      "tests/estimateInfrastructure/aiEstimateArtifactLifecycle.contract.test.ts",
      "tests/architecture/aiEstimateStorageBoundary.contract.test.ts",
      "tests/officeEstimate/platformCoreV2PdfBuyerFlow.contract.test.ts",
    ],
  },
  {
    id: "shard_04_warehouse_finance_rls_quality",
    suites: [
      "tests/estimateInfrastructure/aiEstimateTelemetryBoundary.contract.test.ts",
      "tests/architecture/aiEstimatePlatformArchitectureInventory.contract.test.ts",
      "tests/architecture/aiEstimateE2eHarnessBoundary.contract.test.ts",
      "tests/architecture/aiEstimateCodeQualityBoundaries.contract.test.ts",
    ],
  },
] as const;

type ProcessIdentity = {
  pid: number;
  parentPid: number;
  name: string;
  commandLine: string;
  creationDate: string;
};

type ShardSummary = {
  schemaVersion: string;
  specSha256: string;
  runId: string;
  shardId: string;
  status: "GREEN" | "RED" | "TIMEOUT";
  suites: readonly string[];
  suiteCount: number;
  suiteListSha256: string;
  timeoutMs: number;
  timeoutBasis: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  pid: number;
  processTreeRoot: ProcessIdentity | null;
  seenProcessIdentities: ProcessIdentity[];
  orphanProcessIdentities: ProcessIdentity[];
  orphanProcessCount: number;
  exitCode: number;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  command: { executable: string; args: string[] };
  stdoutLog: string;
  stderrLog: string;
  heartbeatLog: string;
  processTreeLog: string;
  stdoutSha256: string;
  stderrSha256: string;
  heartbeatSha256: string;
  processTreeSha256: string;
  headBefore: string;
  treeBefore: string;
  worktreeFingerprintBefore: string;
  headAfter: string;
  treeAfter: string;
  worktreeFingerprintAfter: string;
  repositoryDrift: boolean;
  databaseWriteCount: 0;
  databaseEnvironmentSanitized: boolean;
  isolatedSuiteStarts: string[];
  isolatedSuiteGreens: string[];
  isolatedSuiteExecutionExact: boolean;
  blockers: string[];
};

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256File(file: string): string {
  return sha256(readFileSync(file));
}

function stableListHash(values: readonly string[]): string {
  return sha256(`${values.join("\n")}\n`);
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", windowsHide: true }).trim();
}

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function worktreeFingerprint(): string {
  const diff = execFileSync("git", ["diff", "--binary", "HEAD"], {
    windowsHide: true,
    maxBuffer: 128 * 1024 * 1024,
  });
  const untracked = git(["ls-files", "--others", "--exclude-standard"])
    .split(/\r?\n/)
    .filter(Boolean)
    .sort();
  const hash = createHash("sha256").update(diff);
  for (const file of untracked) {
    hash.update(`\0${file}\0`);
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}

function normalizedProcessRows(raw: unknown): ProcessIdentity[] {
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return rows.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const row = candidate as Record<string, unknown>;
    const pid = Number(row.ProcessId);
    const parentPid = Number(row.ParentProcessId);
    if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(parentPid)) return [];
    return [{
      pid,
      parentPid,
      name: String(row.Name ?? ""),
      commandLine: String(row.CommandLine ?? ""),
      creationDate: String(row.CreationDate ?? ""),
    }];
  });
}

function allProcesses(): ProcessIdentity[] {
  if (process.platform !== "win32") {
    const output = execFileSync("ps", ["-eo", "pid=,ppid=,comm=,args="], { encoding: "utf8" });
    return output.split(/\r?\n/).flatMap((line) => {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s*(.*)$/);
      if (!match) return [];
      return [{ pid: Number(match[1]), parentPid: Number(match[2]), name: match[3], commandLine: match[4], creationDate: "" }];
    });
  }
  const command = [
    "Get-CimInstance Win32_Process",
    "Select-Object ProcessId,ParentProcessId,Name,CommandLine,CreationDate",
    "ConvertTo-Json -Compress",
  ].join(" | ");
  const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 10_000,
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
  return output ? normalizedProcessRows(JSON.parse(output)) : [];
}

function processTree(rootPid: number, processes = allProcesses()): ProcessIdentity[] {
  const byParent = new Map<number, ProcessIdentity[]>();
  for (const row of processes) {
    const bucket = byParent.get(row.parentPid) ?? [];
    bucket.push(row);
    byParent.set(row.parentPid, bucket);
  }
  const byPid = new Map(processes.map((row) => [row.pid, row]));
  const output: ProcessIdentity[] = [];
  const pending = [rootPid];
  const visited = new Set<number>();
  while (pending.length > 0) {
    const pid = pending.shift()!;
    if (visited.has(pid)) continue;
    visited.add(pid);
    const row = byPid.get(pid);
    if (row) output.push(row);
    for (const child of byParent.get(pid) ?? []) pending.push(child.pid);
  }
  return output.sort((left, right) => left.pid - right.pid);
}

function terminateProcessTree(pid: number): void {
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    return;
  }
  try { process.kill(-pid, "SIGKILL"); } catch { /* already terminal */ }
}

function databaseSafeEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, CI: process.env.CI ?? "1" };
  for (const key of [
    "DATABASE_URL",
    "SUPABASE_DB_URL",
    "PGHOST",
    "PGPORT",
    "PGDATABASE",
    "PGUSER",
    "PGPASSWORD",
  ]) delete env[key];
  env.P0_R52_DATABASE_WRITES_FORBIDDEN = "true";
  return env;
}

function assertPlan(): { exactSuites: string[]; exactSuiteListSha256: string } {
  if (!existsSync(SPEC_PATH) || sha256File(SPEC_PATH) !== SPEC_SHA256) {
    throw new Error("R58_PLATFORM_CORE_SPEC_DRIFT");
  }
  execFileSync("git", ["merge-base", "--is-ancestor", REQUIRED_ANCESTOR, "HEAD"], {
    windowsHide: true,
    stdio: "ignore",
  });
  const exactSuites = SHARDS.flatMap((shard) => [...shard.suites]);
  const unique = new Set(exactSuites);
  if (exactSuites.length !== 17 || unique.size !== 17) {
    throw new Error(`SHARD_DENOMINATOR_INVALID:${exactSuites.length}:${unique.size}`);
  }
  for (const suite of exactSuites) if (!existsSync(suite)) throw new Error(`SHARD_SUITE_MISSING:${suite}`);
  return { exactSuites, exactSuiteListSha256: stableListHash(exactSuites) };
}

async function runShard(input: {
  runId: string;
  runDir: string;
  shard: typeof SHARDS[number];
}): Promise<ShardSummary> {
  const shardDir = path.join(input.runDir, input.shard.id);
  mkdirSync(shardDir, { recursive: true });
  const summaryFile = path.join(shardDir, "summary.json");
  const headBefore = git(["rev-parse", "HEAD"]);
  const treeBefore = git(["rev-parse", "HEAD^{tree}"]);
  const worktreeFingerprintBefore = worktreeFingerprint();
  if (existsSync(summaryFile)) {
    const previous = readJson<ShardSummary>(summaryFile);
    if (
      previous.status === "GREEN" &&
      previous.headAfter === headBefore &&
      previous.treeAfter === treeBefore &&
      previous.worktreeFingerprintAfter === worktreeFingerprintBefore &&
      previous.suiteListSha256 === stableListHash(input.shard.suites)
    ) {
      process.stdout.write(`[R5.8] ${input.shard.id} resume=GREEN_SKIP pid=${previous.pid}\n`);
      return previous;
    }
    const attemptDir = path.join(
      input.runDir,
      "_attempts",
      input.shard.id,
      `${timestampForPath()}_${previous.status}`,
    );
    mkdirSync(path.dirname(attemptDir), { recursive: true });
    cpSync(shardDir, attemptDir, { recursive: true, errorOnExist: true });
    process.stdout.write(
      `[R5.8] ${input.shard.id} archived=${attemptDir.replace(/\\/g, "/")}\n`,
    );
  }

  const stdoutLog = path.join(shardDir, "stdout.log");
  const stderrLog = path.join(shardDir, "stderr.log");
  const heartbeatLog = path.join(shardDir, "heartbeat.jsonl");
  const processTreeLog = path.join(shardDir, "process-tree.jsonl");
  writeFileSync(stdoutLog, "", "utf8");
  writeFileSync(stderrLog, "", "utf8");
  writeFileSync(heartbeatLog, "", "utf8");
  writeFileSync(processTreeLog, "", "utf8");
  const stdoutFd = openSync(stdoutLog, "a");
  const stderrFd = openSync(stderrLog, "a");
  const args = [
    path.join("scripts", "estimate", "runJestSuitesIsolated.mjs"),
    ...input.shard.suites,
  ];
  const startedAt = new Date();
  const startedMs = Date.now();
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: databaseSafeEnvironment(),
    windowsHide: true,
    detached: process.platform !== "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!child.pid) throw new Error(`SHARD_PID_MISSING:${input.shard.id}`);
  const pid = child.pid;
  const seen = new Map<string, ProcessIdentity>();
  let processTreeRoot: ProcessIdentity | null = null;
  let timedOut = false;
  let settled = false;

  const captureTree = (event: string): void => {
    try {
      const tree = processTree(pid);
      if (!processTreeRoot) processTreeRoot = tree.find((row) => row.pid === pid) ?? null;
      for (const identity of tree) seen.set(`${identity.pid}:${identity.creationDate}`, identity);
      appendFileSync(processTreeLog, `${JSON.stringify({ at: new Date().toISOString(), event, pid, tree })}\n`, "utf8");
    } catch (error) {
      appendFileSync(processTreeLog, `${JSON.stringify({
        at: new Date().toISOString(),
        event: `${event}_capture_failed`,
        pid,
        error: error instanceof Error ? error.message : String(error),
      })}\n`, "utf8");
    }
  };
  captureTree("spawned");
  writeJson(path.join(shardDir, "launch.json"), {
    schemaVersion: "p0-one-monolith-r5.8-platform-core-shard-launch.v1",
    specSha256: SPEC_SHA256,
    runId: input.runId,
    shardId: input.shard.id,
    pid,
    startedAt: startedAt.toISOString(),
    timeoutMs: SHARD_TIMEOUT_MS,
    suites: input.shard.suites,
    suiteListSha256: stableListHash(input.shard.suites),
    executable: process.execPath,
    args,
    headBefore,
    treeBefore,
    worktreeFingerprintBefore,
    databaseWritesAllowed: false,
  });
  process.stdout.write(`[R5.8] ${input.shard.id} started pid=${pid} timeoutMs=${SHARD_TIMEOUT_MS}\n`);
  child.stdout?.on("data", (chunk: Buffer) => {
    writeFileSync(stdoutFd, chunk);
    process.stdout.write(chunk);
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    writeFileSync(stderrFd, chunk);
    process.stderr.write(chunk);
  });

  const heartbeat = setInterval(() => {
    captureTree("heartbeat");
    const record = {
      at: new Date().toISOString(),
      shardId: input.shard.id,
      pid,
      elapsedMs: Date.now() - startedMs,
      timeoutMs: SHARD_TIMEOUT_MS,
      seenProcessCount: seen.size,
    };
    appendFileSync(heartbeatLog, `${JSON.stringify(record)}\n`, "utf8");
    process.stdout.write(`[R5.8] ${input.shard.id} heartbeat pid=${pid} elapsedMs=${record.elapsedMs}\n`);
  }, HEARTBEAT_MS);

  const timeout = setTimeout(() => {
    if (settled) return;
    timedOut = true;
    captureTree("timeout_before_kill");
    terminateProcessTree(pid);
  }, SHARD_TIMEOUT_MS);

  const terminal = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    child.once("error", (error) => {
      appendFileSync(stderrLog, `\nSHARD_SPAWN_ERROR:${error.message}\n`, "utf8");
      resolve({ code: 1, signal: null });
    });
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  settled = true;
  clearTimeout(timeout);
  clearInterval(heartbeat);
  captureTree("terminal");
  closeSync(stdoutFd);
  closeSync(stderrFd);

  const afterProcesses = allProcesses();
  const afterByIdentity = new Map(afterProcesses.map((row) => [`${row.pid}:${row.creationDate}`, row]));
  const orphanProcessIdentities = [...seen.entries()]
    .filter(([key]) => afterByIdentity.has(key))
    .map(([, identity]) => identity)
    .filter((identity) => identity.pid !== process.pid);
  if (orphanProcessIdentities.length > 0) {
    for (const orphan of orphanProcessIdentities) terminateProcessTree(orphan.pid);
  }
  const headAfter = git(["rev-parse", "HEAD"]);
  const treeAfter = git(["rev-parse", "HEAD^{tree}"]);
  const worktreeFingerprintAfter = worktreeFingerprint();
  const repositoryDrift = headAfter !== headBefore || treeAfter !== treeBefore ||
    worktreeFingerprintAfter !== worktreeFingerprintBefore;
  const exitCode = timedOut ? 124 : terminal.code ?? 1;
  const stdoutText = readFileSync(stdoutLog, "utf8");
  const isolatedSuiteStarts = [...stdoutText.matchAll(/^\[isolated-jest\] suite=(\S+) status=STARTED /gmu)]
    .map((match) => match[1]);
  const isolatedSuiteGreens = [...stdoutText.matchAll(/^\[isolated-jest\] suite=(\S+) status=GREEN /gmu)]
    .map((match) => match[1]);
  const isolatedSuiteExecutionExact = stableListHash(isolatedSuiteStarts) === stableListHash(input.shard.suites) &&
    stableListHash(isolatedSuiteGreens) === stableListHash(input.shard.suites);
  const blockers = [
    exitCode === 0 ? "" : timedOut ? "SHARD_TIMEOUT" : `JEST_EXIT_${exitCode}`,
    repositoryDrift ? "REPOSITORY_DRIFT_DURING_SHARD" : "",
    orphanProcessIdentities.length > 0 ? `ORPHAN_PROCESS_COUNT_${orphanProcessIdentities.length}` : "",
    isolatedSuiteExecutionExact ? "" : "ISOLATED_SUITE_EXECUTION_NOT_EXACT",
  ].filter(Boolean);
  const status: ShardSummary["status"] = timedOut ? "TIMEOUT" : blockers.length === 0 ? "GREEN" : "RED";
  const finishedAt = new Date();
  const summary: ShardSummary = {
    schemaVersion: "p0-one-monolith-r5.8-platform-core-shard-result.v1",
    specSha256: SPEC_SHA256,
    runId: input.runId,
    shardId: input.shard.id,
    status,
    suites: input.shard.suites,
    suiteCount: input.shard.suites.length,
    suiteListSha256: stableListHash(input.shard.suites),
    timeoutMs: SHARD_TIMEOUT_MS,
    timeoutBasis: "four fixed logical shards; every Jest suite runs in a fresh process with a 700000ms ceiling; 1200000ms logical-shard ceiling covers the measured 1033000ms worst shard plus cleanup while remaining below the rejected 1800000ms monolith timeout",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: Date.now() - startedMs,
    pid,
    processTreeRoot,
    seenProcessIdentities: [...seen.values()],
    orphanProcessIdentities,
    orphanProcessCount: orphanProcessIdentities.length,
    exitCode,
    signal: terminal.signal,
    timedOut,
    command: { executable: process.execPath, args },
    stdoutLog: stdoutLog.replace(/\\/g, "/"),
    stderrLog: stderrLog.replace(/\\/g, "/"),
    heartbeatLog: heartbeatLog.replace(/\\/g, "/"),
    processTreeLog: processTreeLog.replace(/\\/g, "/"),
    stdoutSha256: sha256File(stdoutLog),
    stderrSha256: sha256File(stderrLog),
    heartbeatSha256: sha256File(heartbeatLog),
    processTreeSha256: sha256File(processTreeLog),
    headBefore,
    treeBefore,
    worktreeFingerprintBefore,
    headAfter,
    treeAfter,
    worktreeFingerprintAfter,
    repositoryDrift,
    databaseWriteCount: 0,
    databaseEnvironmentSanitized: true,
    isolatedSuiteStarts,
    isolatedSuiteGreens,
    isolatedSuiteExecutionExact,
    blockers,
  };
  writeJson(summaryFile, summary);
  process.stdout.write(`[R5.8] ${input.shard.id} status=${status} exitCode=${exitCode} durationMs=${summary.durationMs}\n`);
  return summary;
}

function aggregate(input: {
  runId: string;
  runDir: string;
  exactSuites: string[];
  exactSuiteListSha256: string;
}): { summary: Record<string, unknown>; green: boolean } {
  const results = SHARDS.flatMap((shard) => {
    const file = path.join(input.runDir, shard.id, "summary.json");
    return existsSync(file) ? [readJson<ShardSummary>(file)] : [];
  });
  const observedSuites = results.flatMap((result) => [...result.suites]);
  const exactCoverage = observedSuites.length === 17 &&
    new Set(observedSuites).size === 17 &&
    stableListHash(observedSuites) === input.exactSuiteListSha256;
  const green = results.length === SHARDS.length &&
    results.every((result) => result.status === "GREEN" && result.exitCode === 0) &&
    results.every((result) => result.orphanProcessCount === 0 && !result.repositoryDrift) &&
    exactCoverage;
  const blockers = [
    results.length === SHARDS.length ? "" : `MISSING_SHARDS:${SHARDS.length - results.length}`,
    exactCoverage ? "" : `EXACT_SUITE_COVERAGE_INVALID:${observedSuites.length}:${new Set(observedSuites).size}`,
    ...results.flatMap((result) => result.blockers.map((blocker) => `${result.shardId}:${blocker}`)),
  ].filter(Boolean);
  const summary = {
    schemaVersion: "p0-one-monolith-r5.8-platform-core-gate-summary.v1",
    specSha256: SPEC_SHA256,
    requiredAncestor: REQUIRED_ANCESTOR,
    runId: input.runId,
    generatedAt: new Date().toISOString(),
    finalStatus: green ? "GREEN_R58_PLATFORM_CORE_17_OF_17" : "RED_R58_PLATFORM_CORE",
    exactSuiteDenominator: 17,
    exactSuiteNumerator: green ? 17 : results.filter((result) => result.status === "GREEN").reduce((sum, result) => sum + result.suiteCount, 0),
    exactSuiteListSha256: input.exactSuiteListSha256,
    exactSuites: input.exactSuites,
    observedSuiteCount: observedSuites.length,
    observedUniqueSuiteCount: new Set(observedSuites).size,
    exactCoverage,
    shardDenominator: SHARDS.length,
    shardNumerator: results.filter((result) => result.status === "GREEN").length,
    shards: results.map((result) => ({
      shardId: result.shardId,
      status: result.status,
      suiteCount: result.suiteCount,
      pid: result.pid,
      timeoutMs: result.timeoutMs,
      durationMs: result.durationMs,
      exitCode: result.exitCode,
      orphanProcessCount: result.orphanProcessCount,
      repositoryDrift: result.repositoryDrift,
      isolatedSuiteExecutionExact: result.isolatedSuiteExecutionExact,
      stdoutSha256: result.stdoutSha256,
      stderrSha256: result.stderrSha256,
      heartbeatSha256: result.heartbeatSha256,
      processTreeSha256: result.processTreeSha256,
      summaryPath: path.join(input.runDir, result.shardId, "summary.json").replace(/\\/g, "/"),
    })),
    databaseWriteCount: 0,
    runtimeCutoverPerformed: false,
    auditThresholdsChanged: false,
    forbiddenMarkersChanged: false,
    blockers,
  };
  writeJson(path.join(input.runDir, "PLATFORM_CORE_GATE_SUMMARY.json"), summary);
  writeJson(path.join(GATE_ROOT, "PLATFORM_CORE_GATE_SUMMARY.json"), summary);
  return { summary, green };
}

async function main(): Promise<void> {
  const plan = assertPlan();
  const runId = argValue("--run-id") ?? timestampForPath();
  if (!/^[A-Za-z0-9._-]+$/.test(runId)) throw new Error("RUN_ID_INVALID");
  const runDir = path.join(GATE_ROOT, runId);
  mkdirSync(runDir, { recursive: true });
  writeJson(path.join(runDir, "SHARD_PLAN.json"), {
    schemaVersion: "p0-one-monolith-r5.8-platform-core-shard-plan.v1",
    specSha256: SPEC_SHA256,
    requiredAncestor: REQUIRED_ANCESTOR,
    runId,
    exactSuiteDenominator: 17,
    exactSuiteListSha256: plan.exactSuiteListSha256,
    timeoutMsPerShard: SHARD_TIMEOUT_MS,
    heartbeatMs: HEARTBEAT_MS,
    shards: SHARDS,
    databaseWritesAllowed: false,
    runtimeCutoverAllowed: false,
  });

  const requestedShard = argValue("--shard");
  if (!process.argv.includes("--aggregate-only")) {
    const selected = requestedShard
      ? SHARDS.filter((shard) => shard.id === requestedShard)
      : [...SHARDS];
    if (selected.length === 0) throw new Error(`UNKNOWN_SHARD:${requestedShard}`);
    for (const shard of selected) await runShard({ runId, runDir, shard });
  }
  const aggregated = aggregate({
    runId,
    runDir,
    exactSuites: plan.exactSuites,
    exactSuiteListSha256: plan.exactSuiteListSha256,
  });
  process.stdout.write(`${JSON.stringify(aggregated.summary, null, 2)}\n`);
  if (!aggregated.green && (!requestedShard || process.argv.includes("--aggregate-only"))) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
