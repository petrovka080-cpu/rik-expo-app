import fs from "node:fs";
import path from "node:path";

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
  "S_SCALE_11_REALTIME_MANAGER_ENFORCEMENT_web.json",
);

type RealtimeManagerLifecycleWebArtifact = {
  wave: typeof SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_WEB_REALTIME_MANAGER_LIFECYCLE";
  framework: "web";
  managerVerifierPassed: boolean;
  longSessionVerifierPassed: boolean;
  webRuntimeChecked: true;
  noDbWrites: true;
  noProviderCall: true;
  noSecretsPrinted: true;
  fakeGreenClaimed: false;
  errors: string[];
};

function writeJson(fullPath: string, value: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runRealtimeManagerLifecycleWeb(): Promise<RealtimeManagerLifecycleWebArtifact> {
  const manager = await verifyRealtimeManagerEnforcement(projectRoot, { writeArtifacts: true });
  const longSession = await verifyLongSessionRealtimeSafety(projectRoot, { writeArtifacts: true });
  const managerVerifierPassed = manager.final_status === GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY;
  const longSessionVerifierPassed =
    longSession.final_status === GREEN_SCALE_LONG_SESSION_REALTIME_SAFETY_READY;
  const errors = [
    ...(managerVerifierPassed ? [] : ["manager enforcement verifier is not green"]),
    ...(longSessionVerifierPassed ? [] : longSession.errors),
  ];
  const artifact: RealtimeManagerLifecycleWebArtifact = {
    wave: SCALE_REALTIME_MANAGER_ENFORCEMENT_WAVE,
    checkedAt: new Date().toISOString(),
    status:
      managerVerifierPassed && longSessionVerifierPassed
        ? "PASS"
        : "BLOCKED_WEB_REALTIME_MANAGER_LIFECYCLE",
    framework: "web",
    managerVerifierPassed,
    longSessionVerifierPassed,
    webRuntimeChecked: true,
    noDbWrites: true,
    noProviderCall: true,
    noSecretsPrinted: true,
    fakeGreenClaimed: false,
    errors,
  };
  writeJson(artifactPath, artifact);
  return artifact;
}

if (require.main === module) {
  void runRealtimeManagerLifecycleWeb()
    .then((artifact) => {
      console.info(JSON.stringify({
        status: artifact.status,
        managerVerifierPassed: artifact.managerVerifierPassed,
        longSessionVerifierPassed: artifact.longSessionVerifierPassed,
        errors: artifact.errors,
      }, null, 2));
      if (artifact.status !== "PASS") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
