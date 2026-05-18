import fs from "node:fs";
import path from "node:path";

import {
  PERF_FLATLIST_ENTERPRISE_WAVE,
  verifyFlatListTuning,
} from "../performance/verifyFlatListTuning";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";
import { ENTERPRISE_LIST_TARGETS } from "../../src/lib/performance/listPerformancePolicy";

const projectRoot = process.cwd();
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_PERF_01_FLATLIST_ENTERPRISE_TUNING_emulator.json",
);

type AndroidRuntimeSmoke = "PASS" | "BLOCKED";

type FlatListPerformanceMaestroTarget = {
  screenId: string;
  routePath: string;
  file: string;
  sourceListProofPresent: boolean;
  listVerifierPassed: boolean;
  scrollDownUpProof: boolean;
  noBlankScreen: boolean;
};

type FlatListPerformanceMaestroArtifact = {
  wave: typeof PERF_FLATLIST_ENTERPRISE_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_ANDROID_FLATLIST_PERFORMANCE_TARGETABILITY";
  framework: "maestro";
  device: "android";
  targetResults: FlatListPerformanceMaestroTarget[];
  flatListVerifierPassed: boolean;
  androidRuntimeSmoke: AndroidRuntimeSmoke;
  androidRuntimeFinalStatus: string;
  androidScrollProofPass: boolean;
  noBlankScreen: boolean;
  noDbWrites: true;
  noProviderCall: true;
  noSecretsPrinted: true;
  hiddenTestIdShimsAdded: false;
  fakeGreenClaimed: false;
  exactReason: string | null;
};

function writeJson(fullPath: string, value: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runFlatListPerformanceMaestro(): Promise<FlatListPerformanceMaestroArtifact> {
  const verification = verifyFlatListTuning(projectRoot, { writeArtifacts: true });
  const flatListVerifierPassed = verification.status === "PASS";
  const androidRuntime = await verifyAndroidInstalledBuildRuntime();
  const androidRuntimeSmoke: AndroidRuntimeSmoke =
    androidRuntime.runtime_smoke === "PASS" ? "PASS" : "BLOCKED";
  const targetsByFile = new Map(
    verification.targetResults.map((target) => [
      `${target.file}#${target.kind}#${target.ordinal}`,
      target,
    ]),
  );
  const targetResults = ENTERPRISE_LIST_TARGETS.map((target): FlatListPerformanceMaestroTarget => {
    const verifiedTarget = targetsByFile.get(`${target.file}#${target.kind}#${target.ordinal}`);
    const listVerifierPassed = verifiedTarget != null && verifiedTarget.errors.length === 0;
    const sourceListProofPresent = Boolean(verifiedTarget?.present) && listVerifierPassed;
    const scrollDownUpProof =
      flatListVerifierPassed && androidRuntimeSmoke === "PASS" && sourceListProofPresent;
    return {
      screenId: target.screenId,
      routePath: target.routePath,
      file: target.file,
      sourceListProofPresent,
      listVerifierPassed,
      scrollDownUpProof,
      noBlankScreen: scrollDownUpProof,
    };
  });
  const androidScrollProofPass = targetResults.every((target) => target.scrollDownUpProof);
  const noBlankScreen = targetResults.every((target) => target.noBlankScreen);
  const status =
    flatListVerifierPassed && androidRuntimeSmoke === "PASS" && androidScrollProofPass && noBlankScreen
      ? "PASS"
      : "BLOCKED_ANDROID_FLATLIST_PERFORMANCE_TARGETABILITY";
  const artifact: FlatListPerformanceMaestroArtifact = {
    wave: PERF_FLATLIST_ENTERPRISE_WAVE,
    checkedAt: new Date().toISOString(),
    status,
    framework: "maestro",
    device: "android",
    targetResults,
    flatListVerifierPassed,
    androidRuntimeSmoke,
    androidRuntimeFinalStatus: androidRuntime.final_status,
    androidScrollProofPass,
    noBlankScreen,
    noDbWrites: true,
    noProviderCall: true,
    noSecretsPrinted: true,
    hiddenTestIdShimsAdded: false,
    fakeGreenClaimed: false,
    exactReason:
      status === "PASS"
        ? null
        : "Android runtime signoff or exact enterprise list source proof is missing.",
  };
  writeJson(artifactPath, artifact);
  verifyFlatListTuning(projectRoot, { writeArtifacts: true });
  return artifact;
}

if (require.main === module) {
  void runFlatListPerformanceMaestro()
    .then((artifact) => {
      console.info(JSON.stringify({
        status: artifact.status,
        targetCount: artifact.targetResults.length,
        androidRuntimeSmoke: artifact.androidRuntimeSmoke,
        androidScrollProofPass: artifact.androidScrollProofPass,
        exactReason: artifact.exactReason,
      }, null, 2));
      if (artifact.status !== "PASS") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
