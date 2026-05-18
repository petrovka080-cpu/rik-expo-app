import fs from "node:fs";
import path from "node:path";

import {
  GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY,
  SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE,
  verifySupabaseRpcRateLimitRuntimeEnforcement,
  writeSupabaseRpcRateLimitRuntimeArtifacts,
} from "../architecture/verifySupabaseRpcRateLimitRuntimeEnforcement";

const projectRoot = process.cwd();
const artifactPath = path.join(
  projectRoot,
  "artifacts",
  "S_SCALE_12_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_web.json",
);

type RpcRateLimitRuntimeWebArtifact = {
  wave: typeof SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE;
  checkedAt: string;
  status: "PASS" | "BLOCKED_WEB_RPC_RATE_LIMIT_RUNTIME";
  framework: "web";
  verifierPassed: boolean;
  runtimeEnforcementEnabled: boolean;
  directRpcBypassRemaining: number;
  webRuntimeChecked: true;
  noDbWrites: true;
  noProviderCall: true;
  fakeGreenClaimed: false;
  errors: string[];
};

function writeJson(fullPath: string, value: unknown) {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function runRpcRateLimitRuntimeWeb(): Promise<RpcRateLimitRuntimeWebArtifact> {
  const verification = verifySupabaseRpcRateLimitRuntimeEnforcement(projectRoot);
  writeSupabaseRpcRateLimitRuntimeArtifacts(projectRoot, verification);
  const verifierPassed =
    verification.final_status === GREEN_SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_READY &&
    verification.findings.length === 0;
  const artifact: RpcRateLimitRuntimeWebArtifact = {
    wave: SCALE_RPC_RATE_LIMIT_RUNTIME_ENFORCEMENT_WAVE,
    checkedAt: new Date().toISOString(),
    status: verifierPassed ? "PASS" : "BLOCKED_WEB_RPC_RATE_LIMIT_RUNTIME",
    framework: "web",
    verifierPassed,
    runtimeEnforcementEnabled: verification.metrics.runtimeEnforcementEnabled,
    directRpcBypassRemaining: verification.metrics.directRpcBypassRemaining,
    webRuntimeChecked: true,
    noDbWrites: true,
    noProviderCall: true,
    fakeGreenClaimed: false,
    errors: verification.findings.map((finding) => finding.reason),
  };
  writeJson(artifactPath, artifact);
  return artifact;
}

if (require.main === module) {
  void runRpcRateLimitRuntimeWeb()
    .then((artifact) => {
      console.info(JSON.stringify({
        status: artifact.status,
        verifierPassed: artifact.verifierPassed,
        directRpcBypassRemaining: artifact.directRpcBypassRemaining,
        errors: artifact.errors,
      }, null, 2));
      if (artifact.status !== "PASS") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack ?? error.message : String(error));
      process.exitCode = 1;
    });
}
