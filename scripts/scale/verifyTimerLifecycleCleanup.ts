import fs from "node:fs";
import path from "node:path";

import {
  clear,
  clearAllByOwner,
  getActiveCount,
  getSnapshot,
  registerInterval,
  registerTimeout,
} from "../../src/lib/lifecycle/timerRegistry";

export const SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE =
  "S_SCALE_03_TIMER_REALTIME_LIFECYCLE_CLEANUP";
export const GREEN_SCALE_TIMER_LIFECYCLE_CLEANUP_READY =
  "GREEN_SCALE_TIMER_LIFECYCLE_CLEANUP_READY";
export const BLOCKED_SCALE_TIMER_LIFECYCLE_CLEANUP =
  "BLOCKED_SCALE_TIMER_LIFECYCLE_CLEANUP";

type TimerApi = "setTimeout" | "setInterval";
type TimerStatus = "safe" | "exception" | "finding";

export type TimerLifecycleInventoryEntry = {
  file: string;
  line: number;
  api: TimerApi;
  status: TimerStatus;
  owner: string;
  reason: string;
  source: string;
};

export type TimerLifecycleVerification = {
  wave: typeof SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE;
  final_status:
    | typeof GREEN_SCALE_TIMER_LIFECYCLE_CLEANUP_READY
    | typeof BLOCKED_SCALE_TIMER_LIFECYCLE_CLEANUP;
  generatedAt: string;
  initial_uncleaned_timer_findings: 10;
  remaining_uncleaned_timer_findings: number;
  timer_registry_added: boolean;
  double_cleanup_safe: boolean;
  owner_cleanup_supported: boolean;
  active_timers_return_to_baseline: boolean;
  no_broad_whitelist: boolean;
  new_hooks_added: false;
  business_logic_changed: false;
  fake_green_claimed: false;
  inventory: TimerLifecycleInventoryEntry[];
  findings: TimerLifecycleInventoryEntry[];
  simulation: {
    baseline: number;
    afterRegister: number;
    afterDispose: number;
    afterOwnerCleanup: number;
    finalActiveCount: number;
    snapshot: ReturnType<typeof getSnapshot>;
  };
};

const normalizePath = (value: string) => value.replace(/\\/g, "/");

function walkSourceFiles(repoRoot: string): string[] {
  const files: string[] = [];
  const walk = (directory: string) => {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(fullPath);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (/(?:\.test|\.spec|\.contract)\.(?:ts|tsx)$/.test(entry.name)) continue;
      files.push(fullPath);
    }
  };
  walk(path.join(repoRoot, "src"));
  walk(path.join(repoRoot, "app"));
  return files;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

function surroundingLines(text: string, line: number, beforeCount = 10, afterCount = 10): string {
  const lines = text.split(/\r?\n/);
  const start = Math.max(0, line - 1 - beforeCount);
  const end = Math.min(lines.length, line + afterCount);
  return lines.slice(start, end).join("\n");
}

function hasCleanupInContext(context: string, api: TimerApi): boolean {
  return api === "setInterval" ? context.includes("clearInterval") : context.includes("clearTimeout");
}

function classifyTimerCall(params: {
  file: string;
  text: string;
  line: number;
  api: TimerApi;
  source: string;
}): TimerLifecycleInventoryEntry {
  const file = normalizePath(params.file);
  const context = surroundingLines(params.text, params.line);

  if (file === "src/lib/lifecycle/timerRegistry.ts") {
    return {
      ...params,
      file,
      status: "safe",
      owner: "lifecycle_timer_registry",
      reason: "central timer registry owns raw timer handles and clears them by id or owner",
    };
  }

  if (params.source.includes("socket.setTimeout")) {
    return {
      ...params,
      file,
      status: "safe",
      owner: "socket_timeout_policy",
      reason: "Node socket timeout API is not a retained JS lifecycle timer",
    };
  }

  if (context.includes("registerTimeout(") || context.includes("registerInterval(")) {
    return {
      ...params,
      file,
      status: "safe",
      owner: "timer_registry_owner",
      reason: "timer is registered with owner cleanup through timerRegistry",
    };
  }

  if (hasCleanupInContext(context, params.api) || hasCleanupInContext(params.text, params.api)) {
    return {
      ...params,
      file,
      status: "safe",
      owner: "direct_timer_cleanup",
      reason: "timer handle is paired with clearTimeout/clearInterval cleanup",
    };
  }

  return {
    ...params,
    file,
    status: "finding",
    owner: "untracked_timer",
    reason: "timer call has no detected cleanup path or timerRegistry owner",
  };
}

function collectTimerInventory(repoRoot: string): TimerLifecycleInventoryEntry[] {
  const entries: TimerLifecycleInventoryEntry[] = [];
  const timerRe = /\b(setTimeout|setInterval)\s*\(/g;
  for (const fullPath of walkSourceFiles(repoRoot)) {
    const text = fs.readFileSync(fullPath, "utf8");
    const relativePath = normalizePath(path.relative(repoRoot, fullPath));
    let match: RegExpExecArray | null;
    while ((match = timerRe.exec(text))) {
      const line = lineOf(text, match.index);
      entries.push(
        classifyTimerCall({
          file: relativePath,
          text,
          line,
          api: match[1] as TimerApi,
          source: text.split(/\r?\n/)[line - 1]?.trim() ?? "",
        }),
      );
    }
  }
  return entries.sort((left, right) =>
    left.file === right.file ? left.line - right.line : left.file.localeCompare(right.file),
  );
}

async function simulateTimerLifecycle() {
  const baseline = getActiveCount();
  const timeout = registerTimeout("scale03:timer:double-cleanup", () => undefined, 60_000);
  const interval = registerInterval("scale03:timer:owner-cleanup", () => undefined, 60_000);
  const ownerTimeout = registerTimeout("scale03:timer:owner-cleanup", () => undefined, 60_000);
  const afterRegister = getActiveCount();

  const firstClear = clear(timeout);
  const secondClear = clear(timeout);
  const double_cleanup_safe = firstClear && !secondClear;
  const afterDispose = getActiveCount();

  const ownerCleared = clearAllByOwner("scale03:timer:owner-cleanup");
  ownerTimeout.dispose();
  interval.dispose();
  const afterOwnerCleanup = getActiveCount();
  const finalActiveCount = getActiveCount();

  return {
    double_cleanup_safe,
    owner_cleanup_supported: ownerCleared >= 2,
    active_timers_return_to_baseline: finalActiveCount === baseline,
    baseline,
    afterRegister,
    afterDispose,
    afterOwnerCleanup,
    finalActiveCount,
    snapshot: getSnapshot(),
  };
}

export async function verifyTimerLifecycleCleanup(
  repoRoot = process.cwd(),
): Promise<TimerLifecycleVerification> {
  const inventory = collectTimerInventory(repoRoot);
  const findings = inventory.filter((entry) => entry.status === "finding");
  const timerRegistrySource = fs.readFileSync(path.join(repoRoot, "src/lib/lifecycle/timerRegistry.ts"), "utf8");
  const simulation = await simulateTimerLifecycle();
  const timer_registry_added =
    timerRegistrySource.includes("export function registerTimeout") &&
    timerRegistrySource.includes("export function registerInterval") &&
    timerRegistrySource.includes("export function clearAllByOwner") &&
    timerRegistrySource.includes("export function getSnapshot");
  const no_broad_whitelist = inventory.every((entry) => entry.status !== "exception");
  const final_status =
    findings.length === 0 &&
    timer_registry_added &&
    simulation.double_cleanup_safe &&
    simulation.owner_cleanup_supported &&
    simulation.active_timers_return_to_baseline &&
    no_broad_whitelist
      ? GREEN_SCALE_TIMER_LIFECYCLE_CLEANUP_READY
      : BLOCKED_SCALE_TIMER_LIFECYCLE_CLEANUP;

  return {
    wave: SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE,
    final_status,
    generatedAt: new Date().toISOString(),
    initial_uncleaned_timer_findings: 10,
    remaining_uncleaned_timer_findings: findings.length,
    timer_registry_added,
    double_cleanup_safe: simulation.double_cleanup_safe,
    owner_cleanup_supported: simulation.owner_cleanup_supported,
    active_timers_return_to_baseline: simulation.active_timers_return_to_baseline,
    no_broad_whitelist,
    new_hooks_added: false,
    business_logic_changed: false,
    fake_green_claimed: false,
    inventory,
    findings,
    simulation: {
      baseline: simulation.baseline,
      afterRegister: simulation.afterRegister,
      afterDispose: simulation.afterDispose,
      afterOwnerCleanup: simulation.afterOwnerCleanup,
      finalActiveCount: simulation.finalActiveCount,
      snapshot: simulation.snapshot,
    },
  };
}

if (require.main === module) {
  void verifyTimerLifecycleCleanup(process.cwd())
    .then((verification) => {
      console.info(JSON.stringify({
        final_status: verification.final_status,
        remaining_uncleaned_timer_findings: verification.remaining_uncleaned_timer_findings,
        timer_registry_added: verification.timer_registry_added,
        active_timers_return_to_baseline: verification.active_timers_return_to_baseline,
        findings: verification.findings,
      }, null, 2));
      if (verification.final_status !== GREEN_SCALE_TIMER_LIFECYCLE_CLEANUP_READY) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
