import { createHash } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EXPECTED_MANIFEST_TOTAL = 11610;
const EXPECTED_SHARD_COUNT = 24;
const WORKER_COUNT = 2;
const WORKER_TIMEOUT_MS = 260_000;
const MANIFEST_TIMEOUT_MS = 60_000;
const TERMINATION_GRACE_MS = 2_000;
const BOUNDED_CLOSEOUT_MS = 5_000;
const MIN_FREE_PHYSICAL_BYTES = 3.5 * 1024 * 1024 * 1024;

export type EditableParam11610ShardTerminal = {
  schema: "editable-param-11610-shard-terminal/v1";
  status: "GREEN" | "RED";
  shard_index: number;
  shard_count: number;
  duration_ms: number;
  assigned: number;
  ready: number;
  blockers: string[];
  cache_bounded: boolean;
  first_global_index: number | null;
  end_global_index_exclusive: number | null;
  template_ids: string[];
};

export type EditableParam11610WorkerPayloadTerminal = {
  schema: "editable-param-11610-worker-terminal/v1";
  status: "GREEN" | "RED";
  duration_ms: number;
  shard_indexes: number[];
  terminal_count: number;
  blocker: string | null;
};

export type EditableParam11610ManifestTerminal = {
  schema: "editable-param-11610-manifest-terminal/v1";
  status: "GREEN" | "RED";
  duration_ms: number;
  manifest_total: number;
  unique_template_ids: number;
  manifest_sha256: string;
  assignment_sha256: string;
  predicate_contract: string[];
  predicate_contract_sha256: string;
  shards: Array<{
    shard_index: number;
    assigned: number;
    first_global_index: number | null;
    end_global_index_exclusive: number | null;
    template_ids_sha256: string;
  }>;
  blocker: string | null;
};

export type OwnedChildLifecycle = {
  pid: number | null;
  started_at_ms: number;
  deadline_at_ms: number;
  close_observed: boolean;
  close_observed_at_ms: number | null;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  timed_out: boolean;
  termination_attempted: boolean;
  termination_succeeded: boolean;
  orphan_detected: boolean;
  stderr_tail: string;
  blockers: string[];
};

export type EditableParam11610WorkerProcessTerminal = {
  schema: "editable-param-11610-worker-process-terminal/v1";
  status: "GREEN" | "RED" | "TIMEOUT";
  worker_index: number;
  assigned_shard_indexes: number[];
  pid: number | null;
  started_at: string;
  technical_deadline_at: string;
  close_observed: boolean;
  close_observed_at: string | null;
  exit_code: number | null;
  signal: NodeJS.Signals | null;
  timed_out: boolean;
  within_technical_deadline: boolean;
  termination_attempted: boolean;
  termination_succeeded: boolean;
  orphan_detected: boolean;
  payload_terminal: EditableParam11610WorkerPayloadTerminal | null;
  shards: EditableParam11610ShardTerminal[];
  blockers: string[];
};

export type EditableParam11610ManifestPreflight = {
  schema: "editable-param-11610-manifest-preflight/v1";
  status: "GREEN" | "RED" | "TIMEOUT";
  source_sha256: string;
  close_observed: boolean;
  close_observed_at: string | null;
  exit_code: number | null;
  timed_out: boolean;
  within_technical_deadline: boolean;
  orphan_detected: boolean;
  terminal: EditableParam11610ManifestTerminal | null;
  blockers: string[];
};

export type EditableParam11610HarnessTerminal = {
  schema: "editable-param-11610-harness-terminal/v1";
  status: "GREEN" | "RED";
  duration_ms: number;
  manifest_total: number;
  unique_template_ids: number;
  manifest_sha256: string | null;
  predicate_contract_sha256: string | null;
  worker_count: number;
  free_physical_bytes_at_start: number;
  execution_profile: {
    external_jest_workers: 1;
    reusable_child_workers: 2;
    contiguous_chunks: 24;
    child_old_space_mib: 1536;
    explicit_gc_between_chunks: true;
    cache_clear_scope: "per_chunk";
  };
  preflight: EditableParam11610ManifestPreflight;
  workers: EditableParam11610WorkerProcessTerminal[];
  shards: EditableParam11610ShardTerminal[];
  blockers: string[];
};

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function processExists(pid: number | null): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function terminateOwnedProcessTree(child: ChildProcess, force: boolean): boolean {
  if (!child.pid || child.exitCode != null || child.signalCode != null) return true;
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(child.pid), "/T", ...(force ? ["/F"] : [])], {
      windowsHide: true,
      stdio: "ignore",
    });
    return result.status === 0 || !processExists(child.pid);
  }
  try {
    return child.kill(force ? "SIGKILL" : "SIGTERM");
  } catch {
    return !processExists(child.pid);
  }
}

function arraysEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function runOwnedChild(input: {
  childEntry: string;
  args: string[];
  timeoutMs: number;
  onLine: (line: string) => void;
}): Promise<OwnedChildLifecycle> {
  const startedAtMs = Date.now();
  const deadlineAtMs = startedAtMs + input.timeoutMs;
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--expose-gc", "--max-old-space-size=1536", "--import", "tsx", input.childEntry, ...input.args],
      {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: "test" },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    const pid = child.pid ?? null;
    const blockers: string[] = [];
    let stdoutBuffer = "";
    let stderrBuffer = "";
    let timedOut = false;
    let terminationAttempted = false;
    let terminationSucceeded = false;
    let settled = false;
    let forceTimer: ReturnType<typeof setTimeout> | null = null;
    let boundedCloseoutTimer: ReturnType<typeof setTimeout> | null = null;
    let deadlineTimer: ReturnType<typeof setTimeout> | null = null;

    const consumeStdoutLines = (flush: boolean): void => {
      const lines = stdoutBuffer.split(/\r?\n/u);
      stdoutBuffer = flush ? "" : (lines.pop() ?? "");
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        try {
          input.onLine(line);
        } catch (error) {
          blockers.push(error instanceof Error ? error.message : String(error));
        }
      }
    };
    const finish = (
      closeObserved: boolean,
      exitCode: number | null,
      signal: NodeJS.Signals | null,
    ): void => {
      if (settled) return;
      settled = true;
      const closeObservedAtMs = closeObserved ? Date.now() : null;
      if (deadlineTimer) clearTimeout(deadlineTimer);
      if (forceTimer) clearTimeout(forceTimer);
      if (boundedCloseoutTimer) clearTimeout(boundedCloseoutTimer);
      const orphanDetected = processExists(pid);
      if (terminationAttempted && !orphanDetected) terminationSucceeded = true;
      resolve({
        pid,
        started_at_ms: startedAtMs,
        deadline_at_ms: deadlineAtMs,
        close_observed: closeObserved,
        close_observed_at_ms: closeObservedAtMs,
        exit_code: exitCode,
        signal,
        timed_out: timedOut || (closeObservedAtMs != null && closeObservedAtMs > deadlineAtMs),
        termination_attempted: terminationAttempted,
        termination_succeeded: terminationAttempted && terminationSucceeded,
        orphan_detected: orphanDetected,
        stderr_tail: stderrBuffer.trim(),
        blockers,
      });
    };

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdoutBuffer += chunk;
      consumeStdoutLines(false);
    });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderrBuffer = `${stderrBuffer}${chunk}`.slice(-1024 * 1024);
    });
    child.once("error", (error) => {
      blockers.push(`PROCESS_ERROR:${error.message}`);
    });
    child.once("close", (code, signal) => {
      consumeStdoutLines(true);
      finish(true, code, signal);
    });
    deadlineTimer = setTimeout(() => {
      timedOut = true;
      terminationAttempted = true;
      terminationSucceeded = terminateOwnedProcessTree(child, false);
      forceTimer = setTimeout(() => {
        if (!processExists(pid)) return;
        terminationSucceeded = terminateOwnedProcessTree(child, true);
      }, TERMINATION_GRACE_MS);
      boundedCloseoutTimer = setTimeout(
        () => finish(false, child.exitCode, child.signalCode),
        BOUNDED_CLOSEOUT_MS,
      );
    }, input.timeoutMs);
  });
}

export function evaluateEditableParam11610WorkerProcess(input: {
  workerIndex: number;
  assignedShardIndexes: number[];
  lifecycle: OwnedChildLifecycle;
  payloadTerminals: EditableParam11610WorkerPayloadTerminal[];
  shardTerminals: EditableParam11610ShardTerminal[];
}): EditableParam11610WorkerProcessTerminal {
  const blockers = [...input.lifecycle.blockers];
  const payload = input.payloadTerminals.length === 1 ? input.payloadTerminals[0] : null;
  if (input.payloadTerminals.length !== 1) {
    blockers.push(`WORKER_PAYLOAD_TERMINAL_COUNT:${input.payloadTerminals.length}:1`);
  }
  if (!input.lifecycle.close_observed) blockers.push("WORKER_CLOSE_NOT_OBSERVED");
  if (input.lifecycle.exit_code !== 0) blockers.push(`WORKER_EXIT_NOT_ZERO:${input.lifecycle.exit_code}`);
  if (input.lifecycle.signal != null) blockers.push(`WORKER_SIGNAL:${input.lifecycle.signal}`);
  if (input.lifecycle.orphan_detected) blockers.push("WORKER_ORPHAN_DETECTED");
  const withinDeadline = input.lifecycle.close_observed &&
    input.lifecycle.close_observed_at_ms != null &&
    input.lifecycle.close_observed_at_ms <= input.lifecycle.deadline_at_ms &&
    !input.lifecycle.timed_out;
  if (!withinDeadline) blockers.push("WORKER_TECHNICAL_DEADLINE_EXCEEDED");
  if (payload) {
    if (payload.status !== "GREEN") blockers.push(`WORKER_PAYLOAD_STATUS:${payload.status}`);
    if (payload.blocker != null) blockers.push(`WORKER_PAYLOAD_BLOCKER:${payload.blocker}`);
    if (!arraysEqual(payload.shard_indexes, input.assignedShardIndexes)) {
      blockers.push("WORKER_PAYLOAD_ASSIGNMENT_MISMATCH");
    }
    if (payload.terminal_count !== input.assignedShardIndexes.length) {
      blockers.push(`WORKER_PAYLOAD_COUNT:${payload.terminal_count}:${input.assignedShardIndexes.length}`);
    }
  }
  const actualShardIndexes = input.shardTerminals.map((terminal) => terminal.shard_index);
  if (!arraysEqual(actualShardIndexes, input.assignedShardIndexes)) {
    blockers.push("WORKER_SHARD_MEMBERSHIP_MISMATCH");
  }
  if (new Set(actualShardIndexes).size !== actualShardIndexes.length) {
    blockers.push("WORKER_SHARD_DUPLICATE");
  }
  if (input.shardTerminals.some((terminal) => terminal.shard_count !== EXPECTED_SHARD_COUNT)) {
    blockers.push("WORKER_SHARD_COUNT_MISMATCH");
  }
  if (input.shardTerminals.some((terminal) => terminal.status !== "GREEN")) {
    blockers.push("WORKER_SHARD_RED");
  }
  if (input.lifecycle.stderr_tail) blockers.push(`WORKER_STDERR:${input.lifecycle.stderr_tail}`);

  return {
    schema: "editable-param-11610-worker-process-terminal/v1",
    status: input.lifecycle.timed_out || !withinDeadline ? "TIMEOUT" : blockers.length === 0 ? "GREEN" : "RED",
    worker_index: input.workerIndex,
    assigned_shard_indexes: input.assignedShardIndexes,
    pid: input.lifecycle.pid,
    started_at: new Date(input.lifecycle.started_at_ms).toISOString(),
    technical_deadline_at: new Date(input.lifecycle.deadline_at_ms).toISOString(),
    close_observed: input.lifecycle.close_observed,
    close_observed_at: input.lifecycle.close_observed_at_ms == null
      ? null
      : new Date(input.lifecycle.close_observed_at_ms).toISOString(),
    exit_code: input.lifecycle.exit_code,
    signal: input.lifecycle.signal,
    timed_out: input.lifecycle.timed_out,
    within_technical_deadline: withinDeadline,
    termination_attempted: input.lifecycle.termination_attempted,
    termination_succeeded: input.lifecycle.termination_succeeded,
    orphan_detected: input.lifecycle.orphan_detected,
    payload_terminal: payload,
    shards: input.shardTerminals,
    blockers,
  };
}

async function runManifestPreflight(childEntry: string): Promise<EditableParam11610ManifestPreflight> {
  const sourceSha256 = sha256File(childEntry);
  const terminals: EditableParam11610ManifestTerminal[] = [];
  const lifecycle = await runOwnedChild({
    childEntry,
    args: ["--manifest-only"],
    timeoutMs: MANIFEST_TIMEOUT_MS,
    onLine: (line) => {
      if (!line.includes('"schema":"editable-param-11610-manifest-terminal/v1"')) return;
      terminals.push(JSON.parse(line) as EditableParam11610ManifestTerminal);
    },
  });
  const terminal = terminals.length === 1 ? terminals[0] : null;
  const withinDeadline = lifecycle.close_observed &&
    lifecycle.close_observed_at_ms != null &&
    lifecycle.close_observed_at_ms <= lifecycle.deadline_at_ms &&
    !lifecycle.timed_out;
  const blockers = [...lifecycle.blockers];
  if (terminals.length !== 1) blockers.push(`MANIFEST_TERMINAL_COUNT:${terminals.length}:1`);
  if (!lifecycle.close_observed) blockers.push("MANIFEST_CLOSE_NOT_OBSERVED");
  if (lifecycle.exit_code !== 0) blockers.push(`MANIFEST_EXIT_NOT_ZERO:${lifecycle.exit_code}`);
  if (!withinDeadline) blockers.push("MANIFEST_TECHNICAL_DEADLINE_EXCEEDED");
  if (lifecycle.orphan_detected) blockers.push("MANIFEST_ORPHAN_DETECTED");
  if (lifecycle.stderr_tail) blockers.push(`MANIFEST_STDERR:${lifecycle.stderr_tail}`);
  if (terminal?.status !== "GREEN") blockers.push(`MANIFEST_STATUS:${terminal?.status ?? "MISSING"}`);
  if (terminal && (
    terminal.manifest_total !== EXPECTED_MANIFEST_TOTAL ||
    terminal.unique_template_ids !== EXPECTED_MANIFEST_TOTAL ||
    terminal.shards.length !== EXPECTED_SHARD_COUNT
  )) blockers.push("MANIFEST_CARDINALITY_MISMATCH");
  return {
    schema: "editable-param-11610-manifest-preflight/v1",
    status: lifecycle.timed_out || !withinDeadline ? "TIMEOUT" : blockers.length === 0 ? "GREEN" : "RED",
    source_sha256: sourceSha256,
    close_observed: lifecycle.close_observed,
    close_observed_at: lifecycle.close_observed_at_ms == null
      ? null
      : new Date(lifecycle.close_observed_at_ms).toISOString(),
    exit_code: lifecycle.exit_code,
    timed_out: lifecycle.timed_out,
    within_technical_deadline: withinDeadline,
    orphan_detected: lifecycle.orphan_detected,
    terminal,
    blockers,
  };
}

async function runWorker(input: {
  workerIndex: number;
  shardIndexes: number[];
  childEntry: string;
}): Promise<EditableParam11610WorkerProcessTerminal> {
  const shardTerminals: EditableParam11610ShardTerminal[] = [];
  const payloadTerminals: EditableParam11610WorkerPayloadTerminal[] = [];
  const lifecycle = await runOwnedChild({
    childEntry: input.childEntry,
    args: [`--shards=${input.shardIndexes.join(",")}`],
    timeoutMs: WORKER_TIMEOUT_MS,
    onLine: (line) => {
      if (line.includes('"schema":"editable-param-11610-shard-terminal/v1"')) {
        const terminal = JSON.parse(line) as EditableParam11610ShardTerminal;
        shardTerminals.push(terminal);
        console.info("[EditableParam11610ShardTerminal]", JSON.stringify({
          ...terminal,
          template_ids: undefined,
          worker_index: input.workerIndex,
        }));
      } else if (line.includes('"schema":"editable-param-11610-worker-terminal/v1"')) {
        payloadTerminals.push(JSON.parse(line) as EditableParam11610WorkerPayloadTerminal);
      }
    },
  });
  return evaluateEditableParam11610WorkerProcess({
    workerIndex: input.workerIndex,
    assignedShardIndexes: input.shardIndexes,
    lifecycle,
    payloadTerminals,
    shardTerminals,
  });
}

export function evaluateEditableParam11610FanIn(input: {
  preflight: EditableParam11610ManifestPreflight;
  workers: EditableParam11610WorkerProcessTerminal[];
}): {
  passed: boolean;
  manifestTotal: number;
  uniqueTemplateIds: number;
  shards: EditableParam11610ShardTerminal[];
  blockers: string[];
} {
  const blockers = [...input.preflight.blockers];
  if (input.preflight.status !== "GREEN") blockers.push(`PREFLIGHT_STATUS:${input.preflight.status}`);
  if (input.workers.length !== WORKER_COUNT) blockers.push(`WORKER_COUNT:${input.workers.length}:${WORKER_COUNT}`);
  if (input.workers.some((worker) => worker.status !== "GREEN")) blockers.push("WORKER_PROCESS_NOT_GREEN");
  const workerIndexes = input.workers.map((worker) => worker.worker_index);
  if (!arraysEqual(workerIndexes, [0, 1])) blockers.push("WORKER_INDEX_MEMBERSHIP_MISMATCH");

  const shards = input.workers.flatMap((worker) => worker.shards)
    .sort((left, right) => left.shard_index - right.shard_index);
  const templateIds = shards.flatMap((shard) => shard.template_ids);
  const manifestTotal = shards.reduce((total, shard) => total + shard.assigned, 0);
  const uniqueTemplateIds = new Set(templateIds).size;
  const continuous = shards.length === EXPECTED_SHARD_COUNT && shards.every((shard, index) =>
    shard.shard_index === index &&
    shard.shard_count === EXPECTED_SHARD_COUNT &&
    shard.first_global_index === (index === 0 ? 0 : shards[index - 1].end_global_index_exclusive) &&
    shard.end_global_index_exclusive != null &&
    shard.end_global_index_exclusive - (shard.first_global_index ?? 0) === shard.assigned);
  if (!continuous) blockers.push("SHARD_COVERAGE_NOT_CONTINUOUS");
  if (manifestTotal !== EXPECTED_MANIFEST_TOTAL) blockers.push(`MANIFEST_TOTAL:${manifestTotal}`);
  if (templateIds.length !== EXPECTED_MANIFEST_TOTAL) blockers.push(`TEMPLATE_ID_TOTAL:${templateIds.length}`);
  if (uniqueTemplateIds !== EXPECTED_MANIFEST_TOTAL) blockers.push(`UNIQUE_TEMPLATE_IDS:${uniqueTemplateIds}`);
  const manifestTerminal = input.preflight.terminal;
  if (manifestTerminal && sha256Json(templateIds) !== manifestTerminal.manifest_sha256) {
    blockers.push("MANIFEST_HASH_MISMATCH");
  }
  if (manifestTerminal) {
    const actualShardManifest = shards.map((shard) => ({
      shard_index: shard.shard_index,
      assigned: shard.assigned,
      first_global_index: shard.first_global_index,
      end_global_index_exclusive: shard.end_global_index_exclusive,
      template_ids_sha256: sha256Json(shard.template_ids),
    }));
    if (sha256Json(actualShardManifest) !== manifestTerminal.assignment_sha256) {
      blockers.push("SHARD_ASSIGNMENT_HASH_MISMATCH");
    }
  }
  if (shards.some((shard) =>
    shard.status !== "GREEN" ||
    shard.ready !== shard.assigned ||
    shard.blockers.length !== 0 ||
    !shard.cache_bounded)) blockers.push("SHARD_ASSERTION_RED");
  return { passed: blockers.length === 0, manifestTotal, uniqueTemplateIds, shards, blockers };
}

export async function runEditableParam11610Harness(): Promise<EditableParam11610HarnessTerminal> {
  const startedAt = Date.now();
  const freePhysicalBytesAtStart = os.freemem();
  if (freePhysicalBytesAtStart < MIN_FREE_PHYSICAL_BYTES) {
    throw new Error(
      `EDITABLE_PARAM_11610_RESOURCE_STOP:${freePhysicalBytesAtStart}:${MIN_FREE_PHYSICAL_BYTES}`,
    );
  }
  const childEntry = path.resolve(
    process.cwd(),
    "tests/estimateRuntime/editableParam11610Readiness.shared.ts",
  );
  const preflight = await runManifestPreflight(childEntry);
  const workerShards = Array.from({ length: WORKER_COUNT }, (_, workerIndex) =>
    Array.from({ length: EXPECTED_SHARD_COUNT }, (_value, shardIndex) => shardIndex)
      .filter((shardIndex) => shardIndex % WORKER_COUNT === workerIndex));
  const workers = preflight.status === "GREEN"
    ? await Promise.all(workerShards.map((shardIndexes, workerIndex) =>
      runWorker({ workerIndex, shardIndexes, childEntry })))
    : [];
  const fanIn = evaluateEditableParam11610FanIn({ preflight, workers });

  return {
    schema: "editable-param-11610-harness-terminal/v1",
    status: fanIn.passed ? "GREEN" : "RED",
    duration_ms: Date.now() - startedAt,
    manifest_total: fanIn.manifestTotal,
    unique_template_ids: fanIn.uniqueTemplateIds,
    manifest_sha256: preflight.terminal?.manifest_sha256 ?? null,
    predicate_contract_sha256: preflight.terminal?.predicate_contract_sha256 ?? null,
    worker_count: workers.length,
    free_physical_bytes_at_start: freePhysicalBytesAtStart,
    execution_profile: {
      external_jest_workers: 1,
      reusable_child_workers: 2,
      contiguous_chunks: EXPECTED_SHARD_COUNT,
      child_old_space_mib: 1536,
      explicit_gc_between_chunks: true,
      cache_clear_scope: "per_chunk",
    },
    preflight,
    workers,
    shards: fanIn.shards,
    blockers: fanIn.blockers,
  };
}
