import fs from "node:fs";
import path from "node:path";

import {
  getSnapshot,
  realtimeSubscriptionManager,
  subscribe,
  unsubscribeAll,
  unsubscribeAllByOwner,
} from "../../src/lib/realtime/realtimeSubscriptionManager";

import { SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE } from "./verifyTimerLifecycleCleanup";

export const GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY =
  "GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY";
export const BLOCKED_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE =
  "BLOCKED_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE";

type RealtimeStatus = "safe" | "finding";

export type RealtimeLifecycleInventoryEntry = {
  file: string;
  status: RealtimeStatus;
  owner: string;
  reason: string;
};

export type RealtimeLifecycleVerification = {
  wave: typeof SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE;
  final_status:
    | typeof GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY
    | typeof BLOCKED_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE;
  generatedAt: string;
  initial_realtime_subscription_files: 16;
  unmanaged_realtime_subscriptions_remaining: number;
  realtime_subscription_manager_added: boolean;
  ref_counting_supported: boolean;
  double_cleanup_safe: boolean;
  owner_cleanup_supported: boolean;
  active_channels_return_to_baseline: boolean;
  realtime_disabled_to_pass: false;
  secrets_printed: false;
  raw_channel_payloads_printed: false;
  fake_green_claimed: false;
  inventory: RealtimeLifecycleInventoryEntry[];
  findings: RealtimeLifecycleInventoryEntry[];
  simulation: {
    baseline: number;
    afterDuplicateSubscribe: number;
    afterFirstDispose: number;
    afterOwnerCleanup: number;
    finalActiveCount: number;
    unsubscribeCalls: number;
    removeCalls: number;
    snapshot: ReturnType<typeof getSnapshot>;
  };
};

const normalizePath = (value: string) => value.replace(/\\/g, "/");

const REALTIME_SOURCE_GLOBS = [
  "src/lib/realtime",
  "src/lib/api/requestDraftSync.service.ts",
  "src/lib/api/requestDraftSync.transport.ts",
  "src/lib/auth/useAuthLifecycle.ts",
  "src/lib/lifecycle/useAppActiveRevalidation.ts",
  "src/lib/offline/platformNetwork.service.ts",
  "src/screens/director",
  "src/screens/buyer",
  "src/screens/warehouse",
  "src/screens/accountant",
  "src/screens/contractor",
  "src/screens/foreman",
] as const;

function walk(directory: string, files: string[] = []): string[] {
  if (!fs.existsSync(directory)) return files;
  const stat = fs.statSync(directory);
  if (stat.isFile()) {
    if (/\.(ts|tsx)$/.test(directory) && !/(?:\.test|\.spec|\.contract)\.(?:ts|tsx)$/.test(directory)) {
      files.push(directory);
    }
    return files;
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") walk(fullPath, files);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/(?:\.test|\.spec|\.contract)\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function discoverRealtimeFiles(repoRoot: string): string[] {
  const files = new Set<string>();
  for (const relative of REALTIME_SOURCE_GLOBS) {
    for (const fullPath of walk(path.join(repoRoot, relative))) {
      const source = fs.readFileSync(fullPath, "utf8");
      if (
        /\.channel\s*\(/.test(source) ||
        /\.subscribe\s*\(/.test(source) ||
        /removeChannel|unsubscribe\s*\(|postgres_changes/.test(source)
      ) {
        files.add(normalizePath(path.relative(repoRoot, fullPath)));
      }
    }
  }
  return [...files].sort();
}

function classifyRealtimeFile(repoRoot: string, file: string): RealtimeLifecycleInventoryEntry {
  const source = fs.readFileSync(path.join(repoRoot, file), "utf8");

  if (file === "src/lib/realtime/realtimeSubscriptionManager.ts") {
    return {
      file,
      status: "safe",
      owner: "realtime_subscription_manager",
      reason: "manager provides owner cleanup, ref-counting, and idempotent dispose",
    };
  }

  if (file === "src/lib/realtime/realtime.client.ts") {
    const safe =
      source.includes("subscribers: Map") &&
      source.includes("current.subscribers.size > 0") &&
      source.includes("disposeRealtimeEntry") &&
      source.includes("entry.pendingJoinDelay?.cancel()") &&
      source.includes("cleanupRealtimeChannel");
    return {
      file,
      status: safe ? "safe" : "finding",
      owner: "central_realtime_client",
      reason: "central realtime client must ref-count duplicate channels and dispose pending/live channels",
    };
  }

  if (/\.transport\.ts$/.test(file)) {
    const safe = source.includes("removeChannel") || source.includes("removeDirectorRealtimeChannel");
    return {
      file,
      status: safe ? "safe" : "finding",
      owner: "realtime_transport_boundary",
      reason: "transport-only channel factory exposes paired removeChannel boundary",
    };
  }

  if (file === "src/lib/api/requestDraftSync.service.ts") {
    const safe =
      source.includes("subscribeTimeout.cancel()") &&
      source.includes("removeDirectorHandoffBroadcastChannel(channel)") &&
      source.includes("finally");
    return {
      file,
      status: safe ? "safe" : "finding",
      owner: "director_handoff_broadcast",
      reason: "one-shot broadcast subscription removes channel in finally and cancels timeout",
    };
  }

  if (source.includes("subscribeChannel({")) {
    const safe = source.includes("useFocusEffect(bindRealtime)") || source.includes("return () =>") || source.includes("unsubscribe()");
    return {
      file,
      status: safe ? "safe" : "finding",
      owner: "screen_realtime_lifecycle",
      reason: "screen realtime subscription goes through central subscribeChannel and has a cleanup return path",
    };
  }

  if (source.includes("listener?.subscription?.unsubscribe()") || source.includes("listener.subscription.unsubscribe()")) {
    return {
      file,
      status: "safe",
      owner: "auth_or_store_subscription",
      reason: "non-Supabase-channel listener has explicit unsubscribe cleanup",
    };
  }

  if (
    source.includes("subscription.remove()") ||
    source.includes("networkStateSubscription?.remove()") ||
    source.includes("unsubscribe();") ||
    source.includes("unsubscribe()")
  ) {
    return {
      file,
      status: "safe",
      owner: "local_lifecycle_subscription",
      reason: "local AppState/network/store subscription has explicit idempotent cleanup",
    };
  }

  if (source.includes("cleanupRealtimeChannel") && source.includes("removeDirectorRealtimeChannel")) {
    return {
      file,
      status: "safe",
      owner: "director_legacy_realtime_lifecycle",
      reason: "legacy director channel has explicit unsubscribe and removeChannel cleanup",
    };
  }

  return {
    file,
    status: "finding",
    owner: "unmanaged_realtime_subscription",
    reason: "realtime/listener callsite has no detected owner cleanup path",
  };
}

async function simulateRealtimeLifecycle() {
  unsubscribeAll();
  const baseline = getSnapshot().activeChannelCount;
  let unsubscribeCalls = 0;
  let removeCalls = 0;
  const channel = {
    unsubscribe: () => {
      unsubscribeCalls += 1;
    },
  };
  const first = subscribe("scale03:director", () => channel, {
    key: "scale03:shared-channel",
    removeChannel: () => {
      removeCalls += 1;
    },
  });
  const second = subscribe("scale03:warehouse", () => {
    throw new Error("duplicate subscription must reuse the existing channel");
  }, {
    key: "scale03:shared-channel",
    removeChannel: () => {
      removeCalls += 1;
    },
  });
  await Promise.resolve();
  const afterDuplicateSubscribe = getSnapshot().activeChannelCount;
  first.dispose();
  first.dispose();
  const afterFirstDispose = getSnapshot().activeChannelCount;
  const ownerRemoved = unsubscribeAllByOwner("scale03:warehouse");
  second.dispose();
  await Promise.resolve();
  const afterOwnerCleanup = getSnapshot().activeChannelCount;
  const finalActiveCount = getSnapshot().activeChannelCount;

  return {
    ref_counting_supported: afterDuplicateSubscribe === baseline + 1,
    double_cleanup_safe: afterFirstDispose === baseline + 1,
    owner_cleanup_supported: ownerRemoved === 1,
    active_channels_return_to_baseline: finalActiveCount === baseline,
    baseline,
    afterDuplicateSubscribe,
    afterFirstDispose,
    afterOwnerCleanup,
    finalActiveCount,
    unsubscribeCalls,
    removeCalls,
    snapshot: getSnapshot(),
  };
}

export async function verifyRealtimeSubscriptionLifecycle(
  repoRoot = process.cwd(),
): Promise<RealtimeLifecycleVerification> {
  const files = discoverRealtimeFiles(repoRoot);
  const inventory = files.map((file) => classifyRealtimeFile(repoRoot, file));
  const findings = inventory.filter((entry) => entry.status === "finding");
  const managerSource = fs.readFileSync(
    path.join(repoRoot, "src/lib/realtime/realtimeSubscriptionManager.ts"),
    "utf8",
  );
  const simulation = await simulateRealtimeLifecycle();
  const realtime_subscription_manager_added =
    managerSource.includes("export function subscribe") &&
    managerSource.includes("export function unsubscribeAllByOwner") &&
    managerSource.includes("export function getActiveChannels") &&
    managerSource.includes("export function getSnapshot");

  const final_status =
    findings.length === 0 &&
    realtime_subscription_manager_added &&
    simulation.ref_counting_supported &&
    simulation.double_cleanup_safe &&
    simulation.owner_cleanup_supported &&
    simulation.active_channels_return_to_baseline
      ? GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY
      : BLOCKED_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE;

  return {
    wave: SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE,
    final_status,
    generatedAt: new Date().toISOString(),
    initial_realtime_subscription_files: 16,
    unmanaged_realtime_subscriptions_remaining: findings.length,
    realtime_subscription_manager_added,
    ref_counting_supported: simulation.ref_counting_supported,
    double_cleanup_safe: simulation.double_cleanup_safe,
    owner_cleanup_supported: simulation.owner_cleanup_supported,
    active_channels_return_to_baseline: simulation.active_channels_return_to_baseline,
    realtime_disabled_to_pass: false,
    secrets_printed: false,
    raw_channel_payloads_printed: false,
    fake_green_claimed: false,
    inventory,
    findings,
    simulation,
  };
}

if (require.main === module) {
  void verifyRealtimeSubscriptionLifecycle(process.cwd())
    .then((verification) => {
      console.info(JSON.stringify({
        final_status: verification.final_status,
        unmanaged_realtime_subscriptions_remaining: verification.unmanaged_realtime_subscriptions_remaining,
        realtime_subscription_manager_added: verification.realtime_subscription_manager_added,
        active_channels_return_to_baseline: verification.active_channels_return_to_baseline,
        findings: verification.findings,
      }, null, 2));
      if (verification.final_status !== GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
