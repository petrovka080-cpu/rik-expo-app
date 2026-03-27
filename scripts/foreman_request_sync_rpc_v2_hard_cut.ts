import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const artifactOutPath = path.join(projectRoot, "artifacts/foreman-request-sync-rpc-v2-hard-cut.json");
const summaryOutPath = path.join(projectRoot, "artifacts/foreman-request-sync-rpc-v2-hard-cut.summary.json");

const quoteWindowsArg = (value: string) =>
  /[\s"]/u.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;

const runNodeCommand = (args: string[], timeoutMs: number) => {
  const result =
    process.platform === "win32"
      ? spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npx ${args.map(quoteWindowsArg).join(" ")}`], {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: timeoutMs,
        })
      : spawnSync("npx", args, {
          cwd: projectRoot,
          encoding: "utf8",
          timeout: timeoutMs,
        });
  return {
    passed: result.status === 0,
    stdout: String(result.stdout ?? "").trim(),
    stderr: String(result.stderr ?? "").trim(),
  };
};

const readJson = <T,>(relativePath: string): T => {
  const fullPath = path.join(projectRoot, relativePath);
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
};

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const requestDraftSyncSource = fs.readFileSync(
  path.join(projectRoot, "src/lib/api/requestDraftSync.service.ts"),
  "utf8",
);
const localDraftSource = fs.readFileSync(path.join(projectRoot, "src/screens/foreman/foreman.localDraft.ts"), "utf8");
const subcontractSource = fs.readFileSync(
  path.join(projectRoot, "src/screens/foreman/ForemanSubcontractTab.tsx"),
  "utf8",
);

const eslint = runNodeCommand(
  [
    "eslint",
    "src/lib/api/requestDraftSync.service.ts",
    "src/screens/foreman/foreman.localDraft.ts",
    "src/screens/foreman/foreman.draftSync.repository.ts",
    "src/screens/foreman/foreman.draftBoundary.helpers.ts",
    "src/screens/foreman/ForemanSubcontractTab.tsx",
    "scripts/foreman_request_sync_web_smoke.mjs",
    "scripts/foreman_request_sync_runtime_verify.ts",
    "scripts/foreman_request_sync_rpc_v2_hard_cut.ts",
  ],
  120_000,
);

const tsc = runNodeCommand(["tsc", "--noEmit", "--pretty", "false"], 120_000);
const fieldReliability = runNodeCommand(["tsx", "scripts/foreman_field_reliability_smoke.ts"], 120_000);
const runtime = runNodeCommand(["tsx", "scripts/foreman_request_sync_runtime_verify.ts"], 900_000);

const fieldReliabilitySummary = readJson<Record<string, unknown>>("artifacts/foreman-field-reliability.summary.json");
const runtimeSummary = readJson<Record<string, unknown>>("artifacts/foreman-request-sync-runtime.summary.json");

const requestSyncV2OnlyOk =
  requestDraftSyncSource.includes('request_sync_draft_v2') &&
  !requestDraftSyncSource.includes('request_sync_draft_v1') &&
  !requestDraftSyncSource.includes('sourceBranch: "rpc_v2" | "rpc_v1"');

const localDraftHardCutOk =
  !localDraftSource.includes("syncForemanLocalDraftSnapshotLegacy") &&
  !localDraftSource.includes("legacy_fallback") &&
  !localDraftSource.includes("submitRequestToDirector(") &&
  !localDraftSource.includes('sourcePath: "rpc_v1"');

const subcontractHardCutOk =
  !subcontractSource.includes("isForemanAtomicDraftSyncEnabled(") &&
  !subcontractSource.includes("submitRequestToDirector(") &&
  !subcontractSource.includes("requestCreateDraft(") &&
  !subcontractSource.includes("addRequestItemsFromRikBatch(") &&
  !subcontractSource.includes("patchForemanRequestLink(");

const reliabilitySummaryOk = fieldReliabilitySummary.status === "passed";
const runtimeSummaryOk = runtimeSummary.status === "passed";
const webPassed = runtimeSummary.webPassed === true;
const androidPassed = runtimeSummary.androidPassed === true;
const iosPassed = runtimeSummary.iosPassed === true;
const iosResidual = typeof runtimeSummary.iosResidual === "string" ? runtimeSummary.iosResidual : null;

const artifact = {
  status:
    eslint.passed &&
    tsc.passed &&
    fieldReliability.passed &&
    runtime.passed &&
    requestSyncV2OnlyOk &&
    localDraftHardCutOk &&
    subcontractHardCutOk &&
    reliabilitySummaryOk &&
    runtimeSummaryOk &&
    webPassed &&
    androidPassed
      ? "passed"
      : "failed",
  gate:
    eslint.passed &&
    tsc.passed &&
    fieldReliability.passed &&
    runtime.passed &&
    requestSyncV2OnlyOk &&
    localDraftHardCutOk &&
    subcontractHardCutOk &&
    reliabilitySummaryOk &&
    runtimeSummaryOk &&
    webPassed &&
    androidPassed
      ? "GREEN"
      : "NOT_GREEN",
  primaryOwner: "rpc_v2",
  fallbackUsed: false,
  requestSyncV2OnlyOk,
  localDraftHardCutOk,
  subcontractHardCutOk,
  reliabilitySummaryOk,
  runtimeSummaryOk,
  clientOwnedSyncFallbackRemoved: true,
  tscPassed: tsc.passed,
  eslintPassed: eslint.passed,
  fieldReliabilityPassed: fieldReliability.passed,
  webPassed,
  androidPassed,
  iosPassed,
  iosResidual,
  commands: {
    eslint,
    tsc,
    fieldReliability,
    runtime,
  },
  summaries: {
    fieldReliability: fieldReliabilitySummary,
    runtime: runtimeSummary,
  },
};

const summary = {
  status: artifact.status,
  gate: artifact.gate,
  primaryOwner: artifact.primaryOwner,
  fallbackUsed: artifact.fallbackUsed,
  requestSyncV2OnlyOk: artifact.requestSyncV2OnlyOk,
  localDraftHardCutOk: artifact.localDraftHardCutOk,
  subcontractHardCutOk: artifact.subcontractHardCutOk,
  clientOwnedSyncFallbackRemoved: artifact.clientOwnedSyncFallbackRemoved,
  fieldReliabilityPassed: artifact.fieldReliabilityPassed,
  tscPassed: artifact.tscPassed,
  eslintPassed: artifact.eslintPassed,
  webPassed: artifact.webPassed,
  androidPassed: artifact.androidPassed,
  iosPassed: artifact.iosPassed,
  iosResidual: artifact.iosResidual,
};

writeJson(artifactOutPath, artifact);
writeJson(summaryOutPath, summary);
console.log(JSON.stringify(summary, null, 2));

if (artifact.status !== "passed") {
  process.exitCode = 1;
}
