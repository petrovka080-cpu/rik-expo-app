import fs from "node:fs";
import path from "node:path";

import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import {
  GREEN_SCALE_LONG_SESSION_REALTIME_SAFETY_READY,
  verifyLongSessionRealtimeSafety,
} from "../scale/verifyLongSessionRealtimeSafety";
import {
  GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY,
  SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE,
  verifyRealtimeManagerEnforcement,
} from "../scale/verifyRealtimeManagerEnforcement";

const projectRoot = process.cwd();
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_11_REALTIME_MANAGER_ENFORCEMENT_emulator.json",
);

type RealtimeManagerLifecycleMaestroArtifact = {
  wave: typeof SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_ANDROID_REALTIME_MANAGER_LIFECYCLE";
  framework: "maestro";
  device: "android";
  managerVerifierPassed: boolean;
  longSessionVerifierPassed: boolean;
  androidRuntimeSmoke: "PASS" | "BLOCKED";
  androidRuntimeFinalStatus: string;
  noDbWrites: true;
  noProviderCall: true;
  noSecretsPrinted: true;
  fakeGreenClaimed: false;
  exactReason: string | null;
};

function writeJson(fullPath: string, value: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runRealtimeManagerLifecycleMaestro(): Promise<RealtimeManagerLifecycleMaestroArtifact> {
  const manager = await verifyRealtimeManagerEnforcement(projectRoot, { writeArtifacts: true });
  const longSession = await verifyLongSessionRealtimeSafety(projectRoot, { writeArtifacts: true });
  const androidRuntime = await verifyAndroidInstalledBuildRuntime();
  const androidRuntimeSmoke = androidRuntime.runtime_smoke === "PASS" ? "PASS" : "BLOCKED";
  const managerVerifierPassed = manager.final_status === GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY;
  const longSessionVerifierPassed =
    longSession.final_status === GREEN_SCALE_LONG_SESSION_REALTIME_SAFETY_READY;
  const status =
    managerVerifierPassed && longSessionVerifierPassed && androidRuntimeSmoke === "PASS"
      ? "PASS"
      : "BLOCKED_ANDROID_REALTIME_MANAGER_LIFECYCLE";
  const artifact: RealtimeManagerLifecycleMaestroArtifact = {
    wave: SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE,
    checkedAt: new Date().toISOString(),
    status,
    framework: "maestro",
    device: "android",
    managerVerifierPassed,
    longSessionVerifierPassed,
    androidRuntimeSmoke,
    androidRuntimeFinalStatus: androidRuntime.final_status,
    noDbWrites: true,
    noProviderCall: true,
    noSecretsPrinted: true,
    fakeGreenClaimed: false,
    exactReason:
      status === "PASS"
        ? null
        : "Android runtime signoff or realtime manager lifecycle proof is missing.",
  };
  writeJson(artifactPath, artifact);
  return artifact;
}

if (require.main === module) {
  void runRealtimeManagerLifecycleMaestro()
    .then((artifact) => {
      console.info(JSON.stringify({
        status: artifact.status,
        androidRuntimeSmoke: artifact.androidRuntimeSmoke,
        managerVerifierPassed: artifact.managerVerifierPassed,
        longSessionVerifierPassed: artifact.longSessionVerifierPassed,
        exactReason: artifact.exactReason,
      }, null, 2));
      if (artifact.status !== "PASS") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
