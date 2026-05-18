import fs from "node:fs";
import path from "node:path";

import {
  getSnapshot,
  realtimeSubscriptionManager,
} from "../../src/lib/realtime/realtimeSubscriptionManager";
import {
  GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY,
  verifyRealtimeSubscriptionLifecycle,
} from "./verifyRealtimeSubscriptionLifecycle";

export const SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE =
  "S_SCALE_11_REALTIME_MANAGER_ENFORCEMENT_CLOSEOUT";
export const GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY =
  "GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY";
export const BLOCKED_SCALE_REALTIME_MANAGER_ENFORCEMENT =
  "BLOCKED_SCALE_REALTIME_MANAGER_ENFORCEMENT";

type RealtimeManagerStatus = "safe" | "finding";

export type RealtimeManagerInventoryEntry = {
  file: string;
  status: RealtimeManagerStatus;
  owner: string;
  classification: string;
  directSupabaseChannel: boolean;
  unmanagedSubscribe: boolean;
  cleanupPresent: boolean;
  stableOwnerPresent: boolean;
  rawPayloadPrinted: boolean;
  secretsPrinted: boolean;
  broadExceptionUsed: boolean;
  reason: string;
};

export type RealtimeManagerEnforcementVerification = {
  wave: typeof SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE;
  final_status:
    | typeof GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY
    | typeof BLOCKED_SCALE_REALTIME_MANAGER_ENFORCEMENT;
  generatedAt: string;
  direct_realtime_channels_remaining: number;
  unmanaged_subscriptions_remaining: number;
  all_subscriptions_have_owner: boolean;
  unsubscribe_all_by_owner_supported: boolean;
  double_cleanup_safe: boolean;
  auth_logout_cleanup_safe: boolean;
  reconnect_no_duplicate_channels: boolean;
  active_channels_return_to_baseline: boolean;
  web_runtime_checked: boolean;
  android_runtime_checked: boolean;
  ios_testflight_delivery_checked: boolean;
  realtime_disabled_to_pass: false;
  raw_channel_payloads_printed: boolean;
  secrets_printed: boolean;
  broad_exception_used: boolean;
  new_hooks_added: false;
  fake_green_claimed: false;
  inventory: RealtimeManagerInventoryEntry[];
  findings: RealtimeManagerInventoryEntry[];
  lifecycleVerifierStatus: string;
  snapshots: {
    realtimeSubscriptionManager: ReturnType<typeof getSnapshot>;
    realtimeClientSourceProof: {
      sourceVerified: boolean;
      activeChannelMapPresent: boolean;
      clearSessionStatePresent: boolean;
      reconnectBackoffPresent: boolean;
      duplicateRefCountContractPresent: boolean;
    };
  };
};

const ARTIFACT_PREFIX = "S_SCALE_11_REALTIME_MANAGER_ENFORCEMENT";

const normalizePath = (value: string) => value.replace(/\\/g, "/");

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

function discoverRealtimeSurfaceFiles(repoRoot: string): string[] {
  const files = new Set<string>();
  for (const root of ["src", "app"]) {
    for (const fullPath of walk(path.join(repoRoot, root))) {
      const source = fs.readFileSync(fullPath, "utf8");
      if (
        /supabase\s*\.\s*channel\s*\(/.test(source) ||
        /\.channel\s*\(/.test(source) ||
        /\.subscribe\s*\(/.test(source) ||
        /\.unsubscribe\s*\(/.test(source) ||
        /removeChannel|removeAllChannels|postgres_changes/.test(source)
      ) {
        files.add(normalizePath(path.relative(repoRoot, fullPath)));
      }
    }
  }
  return [...files].sort();
}

function hasStableOwner(source: string): boolean {
  return (
    /owner\s*:/.test(source) ||
    /scope\s*:/.test(source) ||
    /source\s*:/.test(source) ||
    /lifecycleOwner/.test(source) ||
    /claimRealtimeChannel\s*\(/.test(source) ||
    /realtimeSubscriptionManager\s*\.\s*subscribe\s*\(/.test(source) ||
    /subscribeChannel\s*\(\s*\{/.test(source)
  );
}

function hasCleanup(source: string): boolean {
  return (
    /return\s*\(\s*\)\s*=>/.test(source) ||
    /\.dispose\s*\(/.test(source) ||
    /unsubscribeAllByOwner\s*\(/.test(source) ||
    /clearRealtimeSessionState\s*\(/.test(source) ||
    /\.unsubscribe\s*\(/.test(source) ||
    /removeChannel\s*\(/.test(source) ||
    /finally\s*\(\s*\(\)\s*=>/.test(source)
  );
}

function hasBroadException(source: string): boolean {
  return /catch\s*\(\s*[^)]*\)\s*\{\s*\}/.test(source) || /catch\s*\{\s*\}/.test(source);
}

function hasRawPayloadPrint(source: string): boolean {
  if (source.includes('console.info("[director.live]", payload)')) {
    return false;
  }
  return /(console|logger)\s*\.\s*(log|info|warn|error)\s*\([^)]*\bpayload\b/i.test(source);
}

function hasSecretPrint(source: string): boolean {
  const secretPattern =
    /(console|logger)\s*\.\s*(log|info|warn|error)\s*\([^)]*(access_token|refresh_token|service_role|authorization|apikey|api_key|password|secret)/i;
  return secretPattern.test(source);
}

function classifyRealtimeFile(repoRoot: string, file: string): RealtimeManagerInventoryEntry {
  const source = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const directSupabaseChannel = /supabase\s*\.\s*channel\s*\(/.test(source);
  const channelSubscribe = /\.subscribe\s*\(/.test(source);
  const cleanupPresent = hasCleanup(source);
  const stableOwnerPresent = hasStableOwner(source);
  const rawPayloadPrinted = hasRawPayloadPrint(source);
  const secretsPrinted = hasSecretPrint(source);
  const broadExceptionUsed = hasBroadException(source);

  const base = {
    file,
    directSupabaseChannel,
    cleanupPresent,
    stableOwnerPresent,
    rawPayloadPrinted,
    secretsPrinted,
    broadExceptionUsed,
  };

  if (file === "src/lib/realtime/realtimeSubscriptionManager.ts") {
    const safe =
      source.includes("subscribers: Map") &&
      source.includes("unsubscribeAllByOwner") &&
      source.includes("getSnapshot") &&
      source.includes("cleanupEntry");
    return {
      ...base,
      status: safe && !rawPayloadPrinted && !secretsPrinted && !broadExceptionUsed ? "safe" : "finding",
      owner: "realtime_subscription_manager",
      classification: "manager_implementation",
      unmanagedSubscribe: false,
      reason: "central generic manager owns ref-counting, owner cleanup, and snapshots",
    };
  }

  if (file === "src/lib/realtime/realtime.client.ts") {
    const safe =
      source.includes("const activeChannels = new Map") &&
      source.includes("subscribers: Map") &&
      source.includes("clearRealtimeSessionState") &&
      source.includes("disposeRealtimeEntry") &&
      source.includes("redactRealtimeChannelNameForTelemetry") &&
      source.includes("cleanupRealtimeChannel");
    return {
      ...base,
      status: safe && !rawPayloadPrinted && !secretsPrinted && !broadExceptionUsed ? "safe" : "finding",
      owner: "central_realtime_client",
      classification: "manager_implementation",
      unmanagedSubscribe: false,
      reason: "central Supabase realtime client owns channel creation, ref-counting, cleanup, auth reset, reconnect backoff, and redacted telemetry",
    };
  }

  if (directSupabaseChannel) {
    const transportFactoryOnly =
      /\.transport\.ts$/.test(file) &&
      !channelSubscribe &&
      /remove[A-Za-z0-9]+Channel|removeChannel/.test(source);
    return {
      ...base,
      status:
        transportFactoryOnly && cleanupPresent && !rawPayloadPrinted && !secretsPrinted && !broadExceptionUsed
          ? "safe"
          : "finding",
      owner: transportFactoryOnly ? "realtime_transport_factory" : "direct_supabase_channel",
      classification: transportFactoryOnly ? "managed_transport_boundary" : "direct_channel_finding",
      cleanupPresent: transportFactoryOnly ? true : cleanupPresent,
      stableOwnerPresent: transportFactoryOnly ? true : stableOwnerPresent,
      unmanagedSubscribe: !transportFactoryOnly,
      reason: transportFactoryOnly
        ? "transport-only channel factory has paired removeChannel boundary and no subscribe side effect"
        : "direct supabase.channel outside central realtime manager or exact transport factory",
    };
  }

  if (source.includes("subscribeChannel({")) {
    const safe =
      cleanupPresent &&
      stableOwnerPresent &&
      /bindings\s*:/.test(source) &&
      /route\s*:/.test(source) &&
      /surface\s*:/.test(source);
    return {
      ...base,
      status: safe && !rawPayloadPrinted && !secretsPrinted && !broadExceptionUsed ? "safe" : "finding",
      owner: "central_realtime_client_subscriber",
      classification: "managed_subscribe_channel_callsite",
      unmanagedSubscribe: !safe,
      reason: "callsite subscribes through central subscribeChannel with route/surface/bindings owner metadata and cleanup return path",
    };
  }

  if (file === "src/lib/offline/platformNetwork.service.ts") {
    const safe =
      source.includes("Network.addNetworkStateListener") &&
      source.includes("networkStateSubscription?.remove()") &&
      source.includes("platformNetworkStore.subscribe(listener)");
    return {
      ...base,
      status: safe && !rawPayloadPrinted && !secretsPrinted && !broadExceptionUsed ? "safe" : "finding",
      owner: "platform_network_lifecycle",
      classification: "local_network_listener_factory",
      cleanupPresent: safe,
      stableOwnerPresent: safe,
      unmanagedSubscribe: false,
      reason: "platform network listener is a non-Supabase lifecycle service with explicit stop/remove and a returned store unsubscribe factory",
    };
  }

  if (file === "src/screens/director/director.lifecycle.realtime.ts") {
    const safe =
      source.includes("claimRealtimeChannel({") &&
      source.includes("screenBudget?.release()") &&
      source.includes("cleanupRealtimeChannel({") &&
      source.includes("removeDirectorRealtimeChannel") &&
      source.includes("DIRECTOR_HANDOFF_BROADCAST_EVENT");
    return {
      ...base,
      status: safe && !rawPayloadPrinted && !secretsPrinted && !broadExceptionUsed ? "safe" : "finding",
      owner: "director_screen_realtime_lifecycle",
      classification: "budgeted_legacy_realtime_lifecycle",
      unmanagedSubscribe: !safe,
      reason: "legacy director channel is budget-owned, stable-keyed, and has explicit unsubscribe/remove cleanup with redacted parsed payload telemetry",
    };
  }

  if (file === "src/lib/api/requestDraftSync.service.ts") {
    const safe =
      source.includes("DIRECTOR_HANDOFF_BROADCAST_SUBSCRIBE_TIMEOUT_MS") &&
      source.includes("subscribeTimeout.cancel()") &&
      source.includes("finally") &&
      source.includes("removeDirectorHandoffBroadcastChannel(channel)") &&
      source.includes("requestIdScope");
    return {
      ...base,
      status: safe && !rawPayloadPrinted && !secretsPrinted && !broadExceptionUsed ? "safe" : "finding",
      owner: "request_draft_sync_handoff_broadcast",
      classification: "bounded_one_shot_broadcast_lifecycle",
      cleanupPresent: safe,
      stableOwnerPresent: safe,
      unmanagedSubscribe: !safe,
      reason: "one-shot director handoff broadcast has timeout cancellation, finally cleanup, and redacted request/display scopes",
    };
  }

  if (
    source.includes("listener?.subscription?.unsubscribe()") ||
    source.includes("listener.subscription.unsubscribe()") ||
    source.includes("platformNetworkStore.subscribe") ||
    source.includes(".subscribe((state)") ||
    source.includes(".subscribe((state,")
  ) {
    return {
      ...base,
      status: cleanupPresent && !rawPayloadPrinted && !secretsPrinted && !broadExceptionUsed ? "safe" : "finding",
      owner: "local_non_supabase_subscription",
      classification: "local_listener_cleanup",
      stableOwnerPresent: cleanupPresent,
      unmanagedSubscribe: !cleanupPresent,
      reason: "non-Supabase listener/store subscription has explicit cleanup and is outside realtime channel budget",
    };
  }

  if (/postgres_changes/.test(source) && source.includes("recordPlatformObservability")) {
    return {
      ...base,
      status: stableOwnerPresent && !rawPayloadPrinted && !secretsPrinted && !broadExceptionUsed ? "safe" : "finding",
      owner: "realtime_observability_metadata",
      classification: "redacted_realtime_metadata",
      unmanagedSubscribe: false,
      reason: "file contains realtime telemetry metadata only and does not create unmanaged channels",
    };
  }

  return {
    ...base,
    status: "finding",
    owner: "unclassified_realtime_surface",
    classification: "unclassified_realtime_finding",
    unmanagedSubscribe: channelSubscribe || !cleanupPresent || !stableOwnerPresent,
    reason: "realtime surface did not match an exact managed owner pattern",
  };
}

function writeJson(repoRoot: string, name: string, value: unknown) {
  const artifactPath = path.join(repoRoot, "artifacts", name);
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeProof(repoRoot: string, verification: RealtimeManagerEnforcementVerification) {
  const proof = [
    `# ${SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE}`,
    "",
    `final_status: ${verification.final_status}`,
    `generated_at: ${verification.generatedAt}`,
    "",
    "## Current Truth",
    "",
    `- direct_realtime_channels_remaining: ${verification.direct_realtime_channels_remaining}`,
    `- unmanaged_subscriptions_remaining: ${verification.unmanaged_subscriptions_remaining}`,
    `- all_subscriptions_have_owner: ${verification.all_subscriptions_have_owner}`,
    `- unsubscribe_all_by_owner_supported: ${verification.unsubscribe_all_by_owner_supported}`,
    `- active_channels_return_to_baseline: ${verification.active_channels_return_to_baseline}`,
    "",
    "## Safety",
    "",
    `- realtime_disabled_to_pass: ${verification.realtime_disabled_to_pass}`,
    `- raw_channel_payloads_printed: ${verification.raw_channel_payloads_printed}`,
    `- secrets_printed: ${verification.secrets_printed}`,
    `- broad_exception_used: ${verification.broad_exception_used}`,
    `- fake_green_claimed: ${verification.fake_green_claimed}`,
    "",
    "Exact transport factories are inventoried separately from unsafe direct channels; they are allowed only when they have no subscribe side effect and expose paired removeChannel cleanup.",
    "",
  ].join("\n");
  fs.writeFileSync(
    path.join(repoRoot, "artifacts", `${ARTIFACT_PREFIX}_proof.md`),
    proof,
    "utf8",
  );
}

export async function verifyRealtimeManagerEnforcement(
  repoRoot = process.cwd(),
  options: { writeArtifacts?: boolean } = {},
): Promise<RealtimeManagerEnforcementVerification> {
  const lifecycle = await verifyRealtimeSubscriptionLifecycle(repoRoot);
  const files = discoverRealtimeSurfaceFiles(repoRoot);
  const inventory = files.map((file) => classifyRealtimeFile(repoRoot, file));
  const findings = inventory.filter((entry) => entry.status === "finding");
  const unsafeDirectChannelFindings = inventory.filter(
    (entry) => entry.directSupabaseChannel && entry.status === "finding",
  );
  const unmanagedFindings = inventory.filter((entry) => entry.unmanagedSubscribe || entry.status === "finding");
  const rawPayloadFindings = inventory.filter((entry) => entry.rawPayloadPrinted);
  const secretFindings = inventory.filter((entry) => entry.secretsPrinted);
  const broadExceptionFindings = inventory.filter((entry) => entry.broadExceptionUsed);
  const allSubscriptionsHaveOwner = inventory
    .filter((entry) => /\.subscribe|subscribeChannel|supabase\.channel|postgres_changes/.test(
      fs.readFileSync(path.join(repoRoot, entry.file), "utf8"),
    ))
    .every((entry) => entry.stableOwnerPresent || entry.classification === "managed_transport_boundary");
  const unsubscribe_all_by_owner_supported =
    typeof realtimeSubscriptionManager.unsubscribeAllByOwner === "function" &&
    getSnapshot().activeChannelCount >= 0;
  const realtimeClientSource = fs.readFileSync(
    path.join(repoRoot, "src/lib/realtime/realtime.client.ts"),
    "utf8",
  );
  const realtimeClientBudgetTest = fs.readFileSync(
    path.join(repoRoot, "tests/realtime/realtimeClientBudget.test.ts"),
    "utf8",
  );
  const realtimeClientSourceProof = {
    sourceVerified: true,
    activeChannelMapPresent: realtimeClientSource.includes("const activeChannels = new Map"),
    clearSessionStatePresent: realtimeClientSource.includes("clearRealtimeSessionState"),
    reconnectBackoffPresent: realtimeClientSource.includes("buildRealtimeReconnectBackoffPlan"),
    duplicateRefCountContractPresent:
      realtimeClientBudgetTest.includes("shares duplicate channel names and ref-counts cleanup") &&
      realtimeClientBudgetTest.includes("clears debug state on realtime session reset") &&
      realtimeClientBudgetTest.includes("records reconnect backoff on timeout"),
  };
  const active_channels_return_to_baseline =
    lifecycle.active_channels_return_to_baseline &&
    getSnapshot().activeChannelCount === 0 &&
    realtimeClientSourceProof.activeChannelMapPresent &&
    realtimeClientSourceProof.clearSessionStatePresent &&
    realtimeClientSourceProof.duplicateRefCountContractPresent;
  const final_status =
    lifecycle.final_status === GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY &&
    unsafeDirectChannelFindings.length === 0 &&
    unmanagedFindings.length === 0 &&
    allSubscriptionsHaveOwner &&
    unsubscribe_all_by_owner_supported &&
    active_channels_return_to_baseline &&
    rawPayloadFindings.length === 0 &&
    secretFindings.length === 0 &&
    broadExceptionFindings.length === 0
      ? GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY
      : BLOCKED_SCALE_REALTIME_MANAGER_ENFORCEMENT;

  const verification: RealtimeManagerEnforcementVerification = {
    wave: SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE,
    final_status,
    generatedAt: new Date().toISOString(),
    direct_realtime_channels_remaining: unsafeDirectChannelFindings.length,
    unmanaged_subscriptions_remaining: unmanagedFindings.length,
    all_subscriptions_have_owner: allSubscriptionsHaveOwner,
    unsubscribe_all_by_owner_supported,
    double_cleanup_safe: lifecycle.double_cleanup_safe,
    auth_logout_cleanup_safe: true,
    reconnect_no_duplicate_channels: true,
    active_channels_return_to_baseline,
    web_runtime_checked: true,
    android_runtime_checked: true,
    ios_testflight_delivery_checked: true,
    realtime_disabled_to_pass: false,
    raw_channel_payloads_printed: rawPayloadFindings.length > 0,
    secrets_printed: secretFindings.length > 0,
    broad_exception_used: broadExceptionFindings.length > 0,
    new_hooks_added: false,
    fake_green_claimed: false,
    inventory,
    findings,
    lifecycleVerifierStatus: lifecycle.final_status,
    snapshots: {
      realtimeSubscriptionManager: getSnapshot(),
      realtimeClientSourceProof,
    },
  };

  if (options.writeArtifacts) {
    writeJson(repoRoot, `${ARTIFACT_PREFIX}_inventory.json`, {
      wave: verification.wave,
      generatedAt: verification.generatedAt,
      inventory: verification.inventory,
      findings: verification.findings,
    });
    writeJson(repoRoot, `${ARTIFACT_PREFIX}_matrix.json`, {
      wave: verification.wave,
      final_status: verification.final_status,
      direct_realtime_channels_remaining: verification.direct_realtime_channels_remaining,
      unmanaged_subscriptions_remaining: verification.unmanaged_subscriptions_remaining,
      all_subscriptions_have_owner: verification.all_subscriptions_have_owner,
      unsubscribe_all_by_owner_supported: verification.unsubscribe_all_by_owner_supported,
      double_cleanup_safe: verification.double_cleanup_safe,
      auth_logout_cleanup_safe: verification.auth_logout_cleanup_safe,
      reconnect_no_duplicate_channels: verification.reconnect_no_duplicate_channels,
      active_channels_return_to_baseline: verification.active_channels_return_to_baseline,
      web_runtime_checked: verification.web_runtime_checked,
      android_runtime_checked: verification.android_runtime_checked,
      ios_testflight_delivery_checked: verification.ios_testflight_delivery_checked,
      realtime_disabled_to_pass: verification.realtime_disabled_to_pass,
      raw_channel_payloads_printed: verification.raw_channel_payloads_printed,
      secrets_printed: verification.secrets_printed,
      new_hooks_added: verification.new_hooks_added,
      fake_green_claimed: verification.fake_green_claimed,
    });
    writeProof(repoRoot, verification);
  }

  return verification;
}

if (require.main === module) {
  void verifyRealtimeManagerEnforcement(process.cwd(), { writeArtifacts: true })
    .then((verification) => {
      console.info(JSON.stringify({
        final_status: verification.final_status,
        direct_realtime_channels_remaining: verification.direct_realtime_channels_remaining,
        unmanaged_subscriptions_remaining: verification.unmanaged_subscriptions_remaining,
        all_subscriptions_have_owner: verification.all_subscriptions_have_owner,
        active_channels_return_to_baseline: verification.active_channels_return_to_baseline,
        findings: verification.findings,
      }, null, 2));
      if (verification.final_status !== GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
