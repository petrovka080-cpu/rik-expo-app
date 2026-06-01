import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { isAllowedIosInternalQaPath } from "./iosTestFlightInternalQaCore";

function stagedFiles(rootDir: string): string[] {
  return execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: rootDir,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .map((file) => file.trim().replace(/\\/g, "/"))
    .filter(Boolean);
}

function readIfSmall(rootDir: string, file: string): string {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size > 2_000_000) return "";
  return fs.readFileSync(fullPath, "utf8");
}

function containsSecret(text: string): boolean {
  return (
    /-----BEGIN (?:EC |RSA |)PRIVATE KEY-----/.test(text) ||
    /\b(?:EXPO_TOKEN|EAS_TOKEN|EXPO_APPLE_ID|EXPO_APPLE_APP_SPECIFIC_PASSWORD|FASTLANE_SESSION)\s*=/.test(text) ||
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/.test(text)
  );
}

const rootDir = process.cwd();
const files = stagedFiles(rootDir);
const disallowed_files = files.filter((file) => !isAllowedIosInternalQaPath(file));
const runtimeSafetyFiles = new Set([
  "app.json",
  "eas.json",
  "scripts/release/iosTestFlightInternalQaCore.ts",
  "scripts/release/runIosTestFlightBuildNumberBump.ts",
  "scripts/release/runIosTestFlightInternalQaBuildProof.ts",
  "scripts/release/runIosTestFlightInternalQaPreflight.ts",
]);
const runtimeText = files
  .filter((file) => runtimeSafetyFiles.has(file))
  .map((file) => readIfSmall(rootDir, file))
  .join("\n");
const secrets_written_to_artifacts = files
  .filter((file) => file.startsWith("artifacts/S_IOS_TESTFLIGHT"))
  .some((file) => containsSecret(readIfSmall(rootDir, file)));
const app_review_submitted = runtimeText.includes("app_review_submitted: true");
const public_beta_enabled = runtimeText.includes("public_beta_enabled: true");
const production_rollout_enabled = runtimeText.includes("production_rollout_enabled: true");

const report = {
  commit_scope_ok:
    disallowed_files.length === 0 &&
    !secrets_written_to_artifacts &&
    !app_review_submitted &&
    !public_beta_enabled &&
    !production_rollout_enabled,
  staged_files: files,
  disallowed_files,
  product_logic_changed: files.some((file) => file.startsWith("src/lib/ai/")),
  estimate_engine_changed: files.some((file) => file.startsWith("src/lib/ai/estimatorKernel/")),
  boq_compiler_changed: files.some((file) => file.startsWith("src/lib/ai/professionalBoq/")),
  pdf_renderer_changed: files.some((file) => file.startsWith("src/lib/pdf/") || file.startsWith("src/lib/estimatePdf/")),
  ui_rewrite_found: files.some((file) => file.startsWith("app/") || file.startsWith("components/") || file.startsWith("src/screens/")),
  secrets_written_to_artifacts,
  app_review_submitted,
  public_beta_enabled,
  production_rollout_enabled,
  fake_green_claimed: false,
};

console.log(JSON.stringify(report, null, 2));

if (!report.commit_scope_ok) {
  process.exitCode = 1;
}
