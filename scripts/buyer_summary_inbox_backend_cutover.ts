import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type UnknownRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const cutoverArtifactPath = path.join(projectRoot, "artifacts/buyer-summary-inbox-cutover-v1.json");
const runtimeSummaryPath = path.join(projectRoot, "artifacts/buyer-summary-inbox-runtime.summary.json");
const summaryOutPath = path.join(projectRoot, "artifacts/buyer-summary-inbox-backend-cutover.summary.json");
const fullOutPath = path.join(projectRoot, "artifacts/buyer-summary-inbox-backend-cutover.json");
const migrationPath = path.join(
  projectRoot,
  "supabase/migrations/20260326170000_buyer_summary_inbox_scope_v1.sql",
);

const readJson = (fullPath: string): UnknownRecord | null => {
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as UnknownRecord;
};

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const runNpx = (args: string[], timeoutMs = 10 * 60 * 1000) => {
  if (process.platform === "win32") {
    return spawnSync("cmd.exe", ["/d", "/s", "/c", `npx ${args.join(" ")}`], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: timeoutMs,
    });
  }
  return spawnSync("npx", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: timeoutMs,
  });
};

const isPassedRuntimeSummary = (summary: UnknownRecord | null) => summary?.status === "passed";

function main() {
  const tscRun = runNpx(["tsc", "--noEmit", "--pretty", "false"]);
  const eslintRun = runNpx([
    "eslint",
    "src/screens/buyer/buyer.fetchers.ts",
    "src/screens/buyer/buyer.fetchers.data.ts",
    "src/screens/buyer/hooks/useBuyerLoadingController.ts",
    "scripts/buyer_summary_inbox_cutover_v1.ts",
    "scripts/buyer_summary_inbox_runtime_verify.ts",
    "scripts/buyer_summary_inbox_backend_cutover.ts",
  ]);
  const cutoverRun = runNpx(["tsx", "scripts/buyer_summary_inbox_cutover_v1.ts"]);
  const existingRuntimeSummary = readJson(runtimeSummaryPath);
  const shouldReuseRuntimeSummary = isPassedRuntimeSummary(existingRuntimeSummary);
  const runtimeRun = shouldReuseRuntimeSummary
    ? {
        status: 0,
        stdout: "Reused existing passed buyer summary inbox runtime summary artifact.",
        stderr: "",
      }
    : runNpx(["tsx", "scripts/buyer_summary_inbox_runtime_verify.ts"], 20 * 60 * 1000);

  const cutoverArtifact = readJson(cutoverArtifactPath);
  const runtimeSummary = shouldReuseRuntimeSummary ? existingRuntimeSummary : readJson(runtimeSummaryPath);
  const fetchersSource = readText("src/screens/buyer/buyer.fetchers.ts");
  const fetchersDataSource = readText("src/screens/buyer/buyer.fetchers.data.ts");
  const summaryServiceSource = readText("src/screens/buyer/buyer.summary.service.ts");
  const loadingControllerSource = readText("src/screens/buyer/hooks/useBuyerLoadingController.ts");
  const migrationSource = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";

  const primary = (cutoverArtifact?.primary as UnknownRecord | undefined) ?? {};
  const primarySourceMeta = ((primary.sourceMeta as UnknownRecord | undefined) ?? {});
  const parity = (cutoverArtifact?.parity as UnknownRecord | undefined) ?? {};
  const searchScenario = (cutoverArtifact?.searchScenario as UnknownRecord | null) ?? null;
  const searchParity = ((searchScenario?.parity as UnknownRecord | undefined) ?? {});

  const primaryOwner = String(primarySourceMeta.primaryOwner ?? "rpc_scope_v1");
  const fallbackUsed = primarySourceMeta.fallbackUsed === true;
  const backendFirstPrimary = primarySourceMeta.backendFirstPrimary === true;

  const fetchersUseRpcScope = fetchersSource.includes('supabase.rpc("buyer_summary_inbox_scope_v1" as never');
  const fetchersDeclareRpcOwner =
    fetchersSource.includes('primaryOwner: "rpc_scope_v1"') &&
    fetchersSource.includes("backendFirstPrimary: true");
  const legacyWindowTokensRemoved =
    !fetchersSource.includes("legacy_client_group_window") &&
    !fetchersSource.includes("BUYER_INBOX_LEGACY_SOURCE_KIND") &&
    !fetchersSource.includes("rpc:list_buyer_inbox+client_group_window") &&
    !fetchersSource.includes("sliceBuyerInboxRowsWindow");
  const summaryServiceUsesRpcWrapper =
    summaryServiceSource.includes("loadBuyerInboxData({") &&
    summaryServiceSource.includes("supabase,") &&
    !summaryServiceSource.includes("listBuyerInbox,");
  const loadingControllerUsesWindowScope =
    loadingControllerSource.includes("const BUYER_INBOX_GROUP_PAGE_SIZE = 12;") &&
    loadingControllerSource.includes("const inbox = await loadBuyerInboxWindowData({");
  const typedAdapterPresent =
    fetchersDataSource.includes("adaptBuyerSummaryInboxScopeEnvelope") &&
    fetchersDataSource.includes("mapScopeInboxRows");

  const backendContractPatchPresent =
    migrationSource.includes("create or replace function public.buyer_summary_inbox_scope_v1") &&
    migrationSource.includes("grouped_rows as (") &&
    migrationSource.includes("filtered_groups as (") &&
    migrationSource.includes("page_groups as (") &&
    migrationSource.includes("'returned_group_count'") &&
    migrationSource.includes("'total_group_count'") &&
    migrationSource.includes("'has_more'") &&
    migrationSource.includes("'backend_first_primary', true");

  const clientOwnedInboxTruthMateriallyRemoved =
    primaryOwner === "rpc_scope_v1" &&
    fallbackUsed === false &&
    backendFirstPrimary &&
    fetchersUseRpcScope &&
    fetchersDeclareRpcOwner &&
    legacyWindowTokensRemoved &&
    summaryServiceUsesRpcWrapper &&
    loadingControllerUsesWindowScope &&
    typedAdapterPresent;

  const webPassed = runtimeSummary?.webPassed === true;
  const androidPassed = runtimeSummary?.androidPassed === true;
  const iosPassed = runtimeSummary?.iosPassed === true;
  const iosResidual =
    typeof runtimeSummary?.iosResidual === "string" && runtimeSummary.iosResidual.trim()
      ? runtimeSummary.iosResidual.trim()
      : null;
  const runtimeGateOk = webPassed && androidPassed && (iosPassed || !!iosResidual);

  const status =
    tscRun.status === 0 &&
    eslintRun.status === 0 &&
    cutoverRun.status === 0 &&
    runtimeRun.status === 0 &&
    primaryOwner === "rpc_scope_v1" &&
    fallbackUsed === false &&
    backendFirstPrimary &&
    parity.requestGroupOrderParityOk === true &&
    parity.rowSignatureParityOk === true &&
    parity.totalGroupCountParityOk === true &&
    parity.returnedGroupCountParityOk === true &&
    parity.hasMoreParityOk === true &&
    (!searchScenario ||
      (
        searchParity.requestGroupOrderParityOk === true &&
        searchParity.rowSignatureParityOk === true &&
        searchParity.totalGroupCountParityOk === true &&
        searchParity.returnedGroupCountParityOk === true &&
        searchParity.hasMoreParityOk === true
      )) &&
    clientOwnedInboxTruthMateriallyRemoved &&
    backendContractPatchPresent &&
    runtimeGateOk
      ? "passed"
      : "failed";

  const artifact = {
    status,
    gate: status === "passed" ? "GREEN" : "NOT_GREEN",
    primaryOwner,
    fallbackUsed,
    backendFirstPrimary,
    requestGroupOrderParityOk: parity.requestGroupOrderParityOk === true,
    rowSignatureParityOk: parity.rowSignatureParityOk === true,
    totalGroupCountParityOk: parity.totalGroupCountParityOk === true,
    returnedGroupCountParityOk: parity.returnedGroupCountParityOk === true,
    hasMoreParityOk: parity.hasMoreParityOk === true,
    searchScenarioParityOk:
      !searchScenario ||
      (
        searchParity.requestGroupOrderParityOk === true &&
        searchParity.rowSignatureParityOk === true &&
        searchParity.totalGroupCountParityOk === true &&
        searchParity.returnedGroupCountParityOk === true &&
        searchParity.hasMoreParityOk === true
      ),
    clientOwnedInboxTruthMateriallyRemoved,
    backendContractPatchPresent,
    ownership: {
      fetchersUseRpcScope,
      fetchersDeclareRpcOwner,
      legacyWindowTokensRemoved,
      summaryServiceUsesRpcWrapper,
      loadingControllerUsesWindowScope,
      typedAdapterPresent,
    },
    runtime: {
      reusedExistingSummary: shouldReuseRuntimeSummary,
      webPassed,
      androidPassed,
      iosPassed,
      iosResidual,
      runtimeGateOk,
      runtimeRun: {
        status: runtimeRun.status,
        stdout: runtimeRun.stdout,
        stderr: runtimeRun.stderr,
      },
      runtimeSummary,
    },
    staticChecks: {
      tscPassed: tscRun.status === 0,
      eslintPassed: eslintRun.status === 0,
      cutoverPassed: cutoverRun.status === 0,
      tscRun: {
        status: tscRun.status,
        stdout: tscRun.stdout,
        stderr: tscRun.stderr,
      },
      eslintRun: {
        status: eslintRun.status,
        stdout: eslintRun.stdout,
        stderr: eslintRun.stderr,
      },
      cutoverRun: {
        status: cutoverRun.status,
        stdout: cutoverRun.stdout,
        stderr: cutoverRun.stderr,
      },
    },
    cutoverArtifact,
  };

  const summary = {
    status: artifact.status,
    gate: artifact.gate,
    primaryOwner: artifact.primaryOwner,
    fallbackUsed: artifact.fallbackUsed,
    backendFirstPrimary: artifact.backendFirstPrimary,
    requestGroupOrderParityOk: artifact.requestGroupOrderParityOk,
    rowSignatureParityOk: artifact.rowSignatureParityOk,
    totalGroupCountParityOk: artifact.totalGroupCountParityOk,
    returnedGroupCountParityOk: artifact.returnedGroupCountParityOk,
    hasMoreParityOk: artifact.hasMoreParityOk,
    searchScenarioParityOk: artifact.searchScenarioParityOk,
    clientOwnedInboxTruthMateriallyRemoved: artifact.clientOwnedInboxTruthMateriallyRemoved,
    backendContractPatchPresent: artifact.backendContractPatchPresent,
    tscPassed: artifact.staticChecks.tscPassed,
    eslintPassed: artifact.staticChecks.eslintPassed,
    cutoverPassed: artifact.staticChecks.cutoverPassed,
    webPassed,
    androidPassed,
    iosPassed,
    iosResidual,
    runtimeSummaryReused: shouldReuseRuntimeSummary,
    runtimeGateOk,
    ownership: artifact.ownership,
  };

  writeJson(fullOutPath, artifact);
  writeJson(summaryOutPath, summary);

  console.log(JSON.stringify(summary, null, 2));
  if (status !== "passed") {
    process.exitCode = 1;
  }
}

main();
