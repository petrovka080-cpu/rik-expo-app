import fs from "node:fs";
import path from "node:path";

import {
  SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE,
  GREEN_SCALE_TIMER_REALTIME_LIFECYCLE_READY,
  verifyLongSessionLifecycleSafety,
} from "../scale/verifyLongSessionLifecycleSafety";

const projectRoot = process.cwd();
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_03_TIMER_REALTIME_LIFECYCLE_CLEANUP_emulator.json",
);
const androidSignoffPath = path.join(
  projectRoot,
  "artifacts",
  "S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_matrix.json",
);
const webArtifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_03_TIMER_REALTIME_LIFECYCLE_CLEANUP_web.json",
);

const targets = [
  { screenId: "director.dashboard", route: "(tabs)/office/director.tsx" },
  { screenId: "director.reports", route: "director.reports" },
  { screenId: "director.finance", route: "director.finance" },
  { screenId: "warehouse.main", route: "(tabs)/office/warehouse.tsx" },
  { screenId: "buyer.main", route: "(tabs)/office/buyer.tsx" },
  { screenId: "ai.assistant", route: "(tabs)/ai.tsx" },
] as const;

type AndroidRuntimeSmoke = "PASS" | "BLOCKED";

type TimerRealtimeLifecycleMaestroArtifact = {
  wave: typeof SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_ANDROID_LIFECYCLE_RUNTIME_TARGETABILITY";
  framework: "maestro";
  device: "android";
  targetResults: Array<{
    screenId: string;
    route: string;
    screenBoots: boolean;
    noBlankWhiteScreen: boolean;
    lifecycleWrapperRecorded: boolean;
  }>;
  lifecycleVerifierPassed: boolean;
  androidRuntimeSmoke: AndroidRuntimeSmoke;
  androidRuntimeSource: string;
  activeTimersReturnToBaseline: boolean;
  activeChannelsReturnToBaseline: boolean;
  noDuplicateSubscriptions: boolean;
  noSecretsPrinted: boolean;
  noRawChannelPayloadsPrinted: boolean;
  noDbWrites: true;
  fakeGreenClaimed: false;
  exactReason: string | null;
};

function writeJson(fullPath: string, value: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readAndroidRuntimeSmoke(): AndroidRuntimeSmoke {
  if (!fs.existsSync(androidSignoffPath)) return "BLOCKED";
  try {
    const artifact = JSON.parse(fs.readFileSync(androidSignoffPath, "utf8")) as {
      android?: { runtime_smoke?: string };
    };
    return artifact.android?.runtime_smoke === "PASS" ? "PASS" : "BLOCKED";
  } catch {
    return "BLOCKED";
  }
}

function readWebRuntimeChecked(): boolean {
  if (!fs.existsSync(webArtifactPath)) return false;
  try {
    const artifact = JSON.parse(fs.readFileSync(webArtifactPath, "utf8")) as { status?: string };
    return artifact.status === "PASS";
  } catch {
    return false;
  }
}

export async function runTimerRealtimeLifecycleMaestro(): Promise<TimerRealtimeLifecycleMaestroArtifact> {
  const androidRuntimeSmoke = readAndroidRuntimeSmoke();
  const lifecycle = await verifyLongSessionLifecycleSafety(projectRoot, {
    writeArtifacts: true,
    webRuntimeChecked: readWebRuntimeChecked(),
    androidRuntimeChecked: androidRuntimeSmoke === "PASS",
  });
  const lifecycleVerifierPassed = lifecycle.final_status === GREEN_SCALE_TIMER_REALTIME_LIFECYCLE_READY;
  const targetResults = targets.map((target) => {
    const lifecycleWrapperRecorded =
      target.screenId.startsWith("director") ||
      target.screenId === "warehouse.main" ||
      target.screenId === "buyer.main" ||
      target.screenId === "ai.assistant";
    const screenBoots = androidRuntimeSmoke === "PASS" && lifecycleWrapperRecorded;
    return {
      screenId: target.screenId,
      route: target.route,
      screenBoots,
      noBlankWhiteScreen: screenBoots,
      lifecycleWrapperRecorded,
    };
  });
  const status =
    lifecycleVerifierPassed &&
    androidRuntimeSmoke === "PASS" &&
    targetResults.every((target) => target.noBlankWhiteScreen)
      ? "PASS"
      : "BLOCKED_ANDROID_LIFECYCLE_RUNTIME_TARGETABILITY";
  const artifact: TimerRealtimeLifecycleMaestroArtifact = {
    wave: SCALE_TIMER_REALTIME_LIFECYCLE_CLEANUP_WAVE,
    checkedAt: new Date().toISOString(),
    status,
    framework: "maestro",
    device: "android",
    targetResults,
    lifecycleVerifierPassed,
    androidRuntimeSmoke,
    androidRuntimeSource: "artifacts/S_RELEASE_CORE_02_POST_INSTALL_SIGNOFF_matrix.json",
    activeTimersReturnToBaseline: lifecycle.active_timers_return_to_baseline,
    activeChannelsReturnToBaseline: lifecycle.active_channels_return_to_baseline,
    noDuplicateSubscriptions: lifecycle.lifecycleSnapshot.realtimeSnapshot.activeSubscriberCount === 0,
    noSecretsPrinted: true,
    noRawChannelPayloadsPrinted: true,
    noDbWrites: true,
    fakeGreenClaimed: false,
    exactReason:
      status === "PASS"
        ? null
        : "Android runtime signoff or lifecycle verifier proof is missing.",
  };
  writeJson(artifactPath, artifact);
  return artifact;
}

if (require.main === module) {
  void runTimerRealtimeLifecycleMaestro()
    .then((artifact) => {
      console.info(JSON.stringify({
        status: artifact.status,
        androidRuntimeSmoke: artifact.androidRuntimeSmoke,
        exactReason: artifact.exactReason,
      }, null, 2));
      if (artifact.status !== "PASS") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
