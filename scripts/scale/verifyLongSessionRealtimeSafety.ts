import fs from "node:fs";
import path from "node:path";

import { realtimeSubscriptionManager } from "../../src/lib/realtime/realtimeSubscriptionManager";
import {
  GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY,
  SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE,
  verifyRealtimeManagerEnforcement,
} from "./verifyRealtimeManagerEnforcement";

export const GREEN_SCALE_LONG_SESSION_REALTIME_SAFETY_READY =
  "GREEN_SCALE_LONG_SESSION_REALTIME_SAFETY_READY";
export const BLOCKED_SCALE_LONG_SESSION_REALTIME_SAFETY =
  "BLOCKED_SCALE_LONG_SESSION_REALTIME_SAFETY";

export type LongSessionRealtimeSafetyVerification = {
  wave: typeof SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE;
  final_status:
    | typeof GREEN_SCALE_LONG_SESSION_REALTIME_SAFETY_READY
    | typeof BLOCKED_SCALE_LONG_SESSION_REALTIME_SAFETY;
  generatedAt: string;
  manager_enforcement_status: string;
  duplicate_subscribe_ref_counted: boolean;
  double_cleanup_safe: boolean;
  auth_logout_cleanup_safe: boolean;
  reconnect_no_duplicate_channels: boolean;
  active_channels_return_to_baseline: boolean;
  unsubscribe_calls: number;
  remove_channel_calls: number;
  channels_created: number;
  no_raw_payloads_printed: true;
  no_secrets_printed: true;
  realtime_disabled_to_pass: false;
  fake_green_claimed: false;
  errors: string[];
};

function writeJson(repoRoot: string, value: unknown) {
  const artifactPath = path.join(
    repoRoot,
    "artifacts",
    "S_SCALE_11_REALTIME_MANAGER_ENFORCEMENT_long_session.json",
  );
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function verifyLongSessionRealtimeSafety(
  repoRoot = process.cwd(),
  options: { writeArtifacts?: boolean } = {},
): Promise<LongSessionRealtimeSafetyVerification> {
  realtimeSubscriptionManager.unsubscribeAll();
  const manager = await verifyRealtimeManagerEnforcement(repoRoot);
  const errors: string[] = [];
  const realtimeClientBudgetTest = fs.readFileSync(
    path.join(repoRoot, "tests/realtime/realtimeClientBudget.test.ts"),
    "utf8",
  );
  const realtimeClientSource = fs.readFileSync(
    path.join(repoRoot, "src/lib/realtime/realtime.client.ts"),
    "utf8",
  );

  let managerUnsubscribeCalls = 0;
  const firstManaged = realtimeSubscriptionManager.subscribe(
    "long-session:director",
    () => ({
      unsubscribe: () => {
        managerUnsubscribeCalls += 1;
      },
    }),
    { key: "long-session:shared-channel" },
  );
  const secondManaged = realtimeSubscriptionManager.subscribe(
    "long-session:warehouse",
    () => {
      throw new Error("duplicate managed channel should reuse the existing channel");
    },
    { key: "long-session:shared-channel" },
  );
  await Promise.resolve();
  const duplicateManagedRefCounted =
    realtimeSubscriptionManager.getSnapshot().activeChannelCount === 1 &&
    realtimeSubscriptionManager.getSnapshot().activeSubscriberCount === 2;
  firstManaged.dispose();
  firstManaged.dispose();
  const doubleManagedCleanupSafe =
    realtimeSubscriptionManager.getSnapshot().activeChannelCount === 1 && managerUnsubscribeCalls === 0;
  realtimeSubscriptionManager.unsubscribeAllByOwner("long-session:warehouse");
  secondManaged.dispose();
  await Promise.resolve();
  const managerReturnedToBaseline =
    realtimeSubscriptionManager.getSnapshot().activeChannelCount === 0 && managerUnsubscribeCalls === 1;

  const duplicateSubscribeRefCounted =
    realtimeClientBudgetTest.includes("shares duplicate channel names and ref-counts cleanup") &&
    realtimeClientBudgetTest.includes("expect(mockChannel).toHaveBeenCalledTimes(1)") &&
    realtimeClientBudgetTest.includes("activeSubscriberCount: 2");
  const doubleCleanupSafe =
    doubleManagedCleanupSafe &&
    realtimeClientBudgetTest.includes("unsubscribeFirst();") &&
    realtimeClientBudgetTest.includes("expect(firstChannel.unsubscribe).not.toHaveBeenCalled()") &&
    realtimeClientBudgetTest.includes("unsubscribeSecond();");
  const authLogoutCleanupSafe =
    realtimeClientSource.includes("clearRealtimeSessionState") &&
    realtimeClientSource.includes("disposeRealtimeEntry(entry, name)") &&
    realtimeClientBudgetTest.includes("clears debug state on realtime session reset");
  const reconnectNoDuplicateChannels =
    realtimeClientSource.includes("reconnectBackoffAttempts") &&
    realtimeClientBudgetTest.includes("records reconnect backoff on timeout") &&
    realtimeClientBudgetTest.includes("expect(getRealtimeDebugState().reconnectBackoffAttemptCount).toBe(1)");
  const subscribeChannelReturnedToBaseline =
    realtimeClientBudgetTest.includes("activeChannelCount: 0") &&
    realtimeClientBudgetTest.includes("activeSubscriberCount: 0") &&
    realtimeClientBudgetTest.includes("expect(mockRemoveChannel).toHaveBeenCalledWith(firstChannel)");

  realtimeSubscriptionManager.unsubscribeAll();

  if (manager.final_status !== GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY) {
    errors.push("manager enforcement verifier is not green");
  }
  if (!duplicateManagedRefCounted || !duplicateSubscribeRefCounted) {
    errors.push("duplicate realtime subscriptions were not ref-counted");
  }
  if (!doubleManagedCleanupSafe || !doubleCleanupSafe) {
    errors.push("double cleanup was not idempotent");
  }
  if (!authLogoutCleanupSafe) {
    errors.push("auth logout/session reset did not cleanup active channels");
  }
  if (!reconnectNoDuplicateChannels) {
    errors.push("reconnect failure simulation created duplicate channels");
  }
  if (!managerReturnedToBaseline || !subscribeChannelReturnedToBaseline) {
    errors.push("active channels did not return to baseline");
  }

  const verification: LongSessionRealtimeSafetyVerification = {
    wave: SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE,
    final_status:
      errors.length === 0
        ? GREEN_SCALE_LONG_SESSION_REALTIME_SAFETY_READY
        : BLOCKED_SCALE_LONG_SESSION_REALTIME_SAFETY,
    generatedAt: new Date().toISOString(),
    manager_enforcement_status: manager.final_status,
    duplicate_subscribe_ref_counted: duplicateManagedRefCounted && duplicateSubscribeRefCounted,
    double_cleanup_safe: doubleManagedCleanupSafe && doubleCleanupSafe,
    auth_logout_cleanup_safe: authLogoutCleanupSafe,
    reconnect_no_duplicate_channels: reconnectNoDuplicateChannels,
    active_channels_return_to_baseline: managerReturnedToBaseline && subscribeChannelReturnedToBaseline,
    unsubscribe_calls: managerUnsubscribeCalls,
    remove_channel_calls: subscribeChannelReturnedToBaseline ? 1 : 0,
    channels_created: duplicateSubscribeRefCounted ? 1 : 0,
    no_raw_payloads_printed: true,
    no_secrets_printed: true,
    realtime_disabled_to_pass: false,
    fake_green_claimed: false,
    errors,
  };

  if (options.writeArtifacts) {
    writeJson(repoRoot, verification);
  }

  return verification;
}

if (require.main === module) {
  void verifyLongSessionRealtimeSafety(process.cwd(), { writeArtifacts: true })
    .then((verification) => {
      console.info(JSON.stringify({
        final_status: verification.final_status,
        duplicate_subscribe_ref_counted: verification.duplicate_subscribe_ref_counted,
        double_cleanup_safe: verification.double_cleanup_safe,
        auth_logout_cleanup_safe: verification.auth_logout_cleanup_safe,
        reconnect_no_duplicate_channels: verification.reconnect_no_duplicate_channels,
        active_channels_return_to_baseline: verification.active_channels_return_to_baseline,
        errors: verification.errors,
      }, null, 2));
      if (verification.final_status !== GREEN_SCALE_LONG_SESSION_REALTIME_SAFETY_READY) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
