import fs from "node:fs";
import path from "node:path";

import {
  ANDROID_PROBE_RUN_TIMEOUT_MAX_MS,
  isProcessAlive,
  runTerminalProbeCase,
  withSingleAndroidUiObserver,
  writeJsonAtomic,
  type ProbeCaseContext,
  type ProbeTerminalArtifact,
} from "./androidWarmDeepLinkProbeHarness";

const RUNTIME_DIR = path.join(process.cwd(), ".release-runtime");
const AGGREGATE_PATH = path.join(
  RUNTIME_DIR,
  "android-probe-harness-self-test.json",
);
const LOCK_PATH = path.join(RUNTIME_DIR, "android-probe-ui-observer.lock");
const DEVICE_ID = process.env.ANDROID_PROBE_DEVICE_ID ?? "emulator-5554";
const KNOWN_ELEMENT = "ROUTE_PROOF_APP_ROOT_READY";
const IMPOSSIBLE_ELEMENT =
  "ANDROID_PROBE_IMPOSSIBLE_ELEMENT_7CF63C82E93A4FDF";

function terminalPath(caseId: string): string {
  return path.join(RUNTIME_DIR, `android-probe-self-test-${caseId}.json`);
}

async function captureUiHierarchy(
  context: ProbeCaseContext,
  runId: string,
): Promise<{ xml: string; commands: Record<string, unknown>[] }> {
  const devicePath = `/sdcard/android_probe_self_test_${runId.replace(/[^a-z0-9_-]/gi, "_")}.xml`;
  const commands: Record<string, unknown>[] = [];
  const removeBefore = await context.runCommand(
    "adb",
    ["-s", DEVICE_ID, "shell", "rm", "-f", devicePath],
    8_000,
  );
  commands.push(removeBefore);
  const dump = await context.runCommand(
    "adb",
    [
      "-s",
      DEVICE_ID,
      "shell",
      "timeout",
      "15",
      "uiautomator",
      "dump",
      devicePath,
    ],
    20_000,
  );
  commands.push(dump);
  if (dump.exitCode !== 0 || dump.timedOut) {
    throw new Error(
      `ANDROID_UI_DUMP_FAILED:exit=${dump.exitCode}:timeout=${dump.timedOut}`,
    );
  }
  const read = await context.runCommand(
    "adb",
    ["-s", DEVICE_ID, "exec-out", "cat", devicePath],
    12_000,
    2_000_000,
  );
  commands.push(read);
  await context.runCommand(
    "adb",
    ["-s", DEVICE_ID, "shell", "rm", "-f", devicePath],
    8_000,
  );
  if (read.exitCode !== 0 || read.timedOut || !read.stdout.includes("<hierarchy")) {
    throw new Error(
      `ANDROID_UI_DUMP_READ_FAILED:exit=${read.exitCode}:timeout=${read.timedOut}`,
    );
  }
  return { xml: read.stdout, commands };
}

async function main(): Promise<void> {
  const startedAtMs = Date.now();
  const runId = `android-probe-self-test:${startedAtMs.toString(36)}`;
  let sharedXml = "";
  let known: ProbeTerminalArtifact;
  let impossible: ProbeTerminalArtifact;
  let hung: ProbeTerminalArtifact;
  let hungCleanupObserved = false;

  await withSingleAndroidUiObserver(LOCK_PATH, async () => {
    known = await runTerminalProbeCase({
      artifactPath: terminalPath("known-element"),
      runId,
      caseId: "known-element",
      launchId: `${runId}:known`,
      timeoutMs: 45_000,
      execute: async (context) => {
        const capture = await captureUiHierarchy(context, runId);
        sharedXml = capture.xml;
        const visible = sharedXml.includes(KNOWN_ELEMENT);
        return {
          passed: visible,
          reason: visible
            ? "known_element_visible"
            : "known_element_missing",
          evidence: {
            expectedElement: KNOWN_ELEMENT,
            hierarchyBytes: Buffer.byteLength(sharedXml),
            commandCount: capture.commands.length,
          },
        };
      },
      cleanup: async () => ({ ok: true, detail: "known_element_cleanup_green" }),
    });

    impossible = await runTerminalProbeCase({
      artifactPath: terminalPath("impossible-element"),
      runId,
      caseId: "impossible-element",
      launchId: `${runId}:impossible`,
      timeoutMs: 5_000,
      execute: async () => {
        const visible = sharedXml.includes(IMPOSSIBLE_ELEMENT);
        return {
          passed: visible,
          reason: visible
            ? "impossible_element_unexpectedly_visible"
            : "assertion_failed_impossible_element_missing",
          evidence: {
            expectedElement: IMPOSSIBLE_ELEMENT,
            hierarchyBytes: Buffer.byteLength(sharedXml),
          },
        };
      },
      cleanup: async () => ({
        ok: true,
        detail: "impossible_element_cleanup_green",
      }),
    });

    hung = await runTerminalProbeCase({
      artifactPath: terminalPath("hung-child"),
      runId,
      caseId: "hung-child",
      launchId: `${runId}:hung`,
      timeoutMs: 1_500,
      execute: async (context) => {
        const result = await context.runCommand(
          process.execPath,
          ["-e", "setInterval(() => {}, 1000)"],
          60_000,
        );
        if (result.pid == null) {
          throw new Error("HUNG_CHILD_PID_MISSING");
        }
        return new Promise<never>(() => undefined);
      },
      cleanup: async () => {
        hungCleanupObserved = true;
        return { ok: true, detail: "hung_child_cleanup_green" };
      },
    });
  });

  const cases = {
    knownElement: known!,
    impossibleElement: impossible!,
    hungChild: hung!,
  };
  const hungPid = cases.hungChild.childProcesses.launchedPids[0] ?? null;
  const checks = {
    knownElementPass:
      cases.knownElement.status === "PASS" &&
      cases.knownElement.terminal === true,
    impossibleElementDeterministicRed:
      cases.impossibleElement.status === "RED" &&
      cases.impossibleElement.terminalReason ===
        "assertion_failed_impossible_element_missing",
    hungChildTimedOut:
      cases.hungChild.status === "TIMEOUT" &&
      cases.hungChild.childProcesses.terminationAttemptedPids.length > 0,
    hungChildStopped:
      hungPid != null &&
      !isProcessAlive(hungPid) &&
      cases.hungChild.childProcesses.activePidsAtTerminalWrite.length === 0,
    hungCleanupObserved:
      hungCleanupObserved && cases.hungChild.cleanup.ok,
    distinctLaunchIds:
      new Set(Object.values(cases).map((item) => item.launchId)).size === 3,
    singleUiObserver: Object.values(cases).every(
      (item) => item.singleUiObserver,
    ),
    terminalArtifactsExist: Object.keys(cases).every((caseId) =>
      fs.existsSync(
        terminalPath(
          caseId === "knownElement"
            ? "known-element"
            : caseId === "impossibleElement"
              ? "impossible-element"
              : "hung-child",
        ),
      ),
    ),
    runWithinBudget:
      Date.now() - startedAtMs <= ANDROID_PROBE_RUN_TIMEOUT_MAX_MS,
  };
  const passed = Object.values(checks).every(Boolean);
  const aggregate = {
    schemaVersion: 1,
    terminal: true,
    runId,
    status: passed ? "PASS" : "RED",
    startedAt: new Date(startedAtMs).toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAtMs,
    maxRunTimeoutMs: ANDROID_PROBE_RUN_TIMEOUT_MAX_MS,
    deviceId: DEVICE_ID,
    checks,
    cases,
  };
  writeJsonAtomic(AGGREGATE_PATH, aggregate);
  if (!passed) {
    console.error("ANDROID_WARM_DEEP_LINK_PROBE_HARNESS_SELF_TEST_RED");
    process.exitCode = 1;
    return;
  }
  console.info("GREEN_ANDROID_WARM_DEEP_LINK_PROBE_HARNESS_SELF_TEST");
}

void main().catch((error) => {
  const terminal = {
    schemaVersion: 1,
    terminal: true,
    status: "ERROR",
    finishedAt: new Date().toISOString(),
    error:
      error instanceof Error
        ? error.message
        : String(error),
  };
  writeJsonAtomic(AGGREGATE_PATH, terminal);
  console.error("ANDROID_WARM_DEEP_LINK_PROBE_HARNESS_SELF_TEST_ERROR");
  process.exitCode = 1;
});
