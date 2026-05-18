import fs from "node:fs";
import path from "node:path";

import {
  GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY,
  SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE,
  verifySupabaseRpcRateLimitRuntimeEnforcement,
  writeSupabaseRpcRateLimitRuntimeArtifacts,
} from "../architecture/verifySupabaseRpcRateLimitRuntimeEnforcement";
import { verifyAndroidInstalledBuildRuntime } from "../release/verifyAndroidInstalledBuildRuntime";

const projectRoot = process.cwd();
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_12_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_emulator.json",
);

type RpcRateLimitRuntimeMaestroArtifact = {
  wave: typeof SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_ANDROID_RPC_RATE_LIMIT_RUNTIME";
  framework: "maestro";
  device: "android";
  verifierPassed: boolean;
  runtimeEnforcementEnabled: boolean;
  directRpcBypassRemaining: number;
  androidRuntimeSmoke: "PASS" | "BLOCKED";
  androidRuntimeFinalStatus: string;
  noDbWrites: true;
  noProviderCall: true;
  fakeGreenClaimed: false;
  exactReason: string | null;
};

function writeJson(fullPath: string, value: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runRpcRateLimitRuntimeMaestro(): Promise<RpcRateLimitRuntimeMaestroArtifact> {
  const verification = verifySupabaseRpcRateLimitRuntimeEnforcement(projectRoot);
  writeSupabaseRpcRateLimitRuntimeArtifacts(projectRoot, verification);
  const androidRuntime = await verifyAndroidInstalledBuildRuntime();
  const verifierPassed =
    verification.final_status === GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY &&
    verification.findings.length === 0;
  const androidRuntimeSmoke = androidRuntime.runtime_smoke === "PASS" ? "PASS" : "BLOCKED";
  const status =
    verifierPassed && androidRuntimeSmoke === "PASS"
      ? "PASS"
      : "BLOCKED_ANDROID_RPC_RATE_LIMIT_RUNTIME";
  const artifact: RpcRateLimitRuntimeMaestroArtifact = {
    wave: SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE,
    checkedAt: new Date().toISOString(),
    status,
    framework: "maestro",
    device: "android",
    verifierPassed,
    runtimeEnforcementEnabled: verification.metrics.runtimeEnforcementEnabled,
    directRpcBypassRemaining: verification.metrics.directRpcBypassRemaining,
    androidRuntimeSmoke,
    androidRuntimeFinalStatus: androidRuntime.final_status,
    noDbWrites: true,
    noProviderCall: true,
    fakeGreenClaimed: false,
    exactReason:
      status === "PASS"
        ? null
        : "Android runtime signoff or RPC runtime enforcement verifier is missing.",
  };
  writeJson(artifactPath, artifact);
  return artifact;
}

if (require.main === module) {
  void runRpcRateLimitRuntimeMaestro()
    .then((artifact) => {
      console.info(JSON.stringify({
        status: artifact.status,
        androidRuntimeSmoke: artifact.androidRuntimeSmoke,
        verifierPassed: artifact.verifierPassed,
        directRpcBypassRemaining: artifact.directRpcBypassRemaining,
        exactReason: artifact.exactReason,
      }, null, 2));
      if (artifact.status !== "PASS") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
