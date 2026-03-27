import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type UnknownRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const cutoverArtifactPath = path.join(projectRoot, "artifacts/warehouse-incoming-queue-cutover-v1.json");
const runtimeSummaryPath = path.join(projectRoot, "artifacts/warehouse-incoming-queue-runtime.summary.json");
const summaryOutPath = path.join(projectRoot, "artifacts/warehouse-incoming-queue-backend-cutover.summary.json");
const fullOutPath = path.join(projectRoot, "artifacts/warehouse-incoming-queue-backend-cutover.json");
const migrationPath = path.join(
  projectRoot,
  "supabase/migrations/20260327113000_warehouse_incoming_queue_scope_v1.sql",
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
    "src/screens/warehouse/warehouse.incoming.ts",
    "src/screens/warehouse/warehouse.incoming.repo.ts",
    "src/screens/warehouse/presentation/warehouseRowAdapters.ts",
    "src/screens/warehouse/hooks/useWarehouseReceiveFlow.ts",
    "src/screens/warehouse/components/IncomingItemsSheet.tsx",
    "src/screens/warehouse/warehouse.types.ts",
    "scripts/warehouse_incoming_queue_runtime_verify.ts",
    "scripts/warehouse_incoming_queue_cutover_v1.ts",
    "scripts/warehouse_incoming_queue_backend_cutover.ts",
  ]);
  const cutoverRun = runNpx(["tsx", "scripts/warehouse_incoming_queue_cutover_v1.ts"]);
  const existingRuntimeSummary = readJson(runtimeSummaryPath);
  const shouldReuseRuntimeSummary = isPassedRuntimeSummary(existingRuntimeSummary);
  const runtimeRun = shouldReuseRuntimeSummary
    ? {
        status: 0,
        stdout: "Reused existing passed warehouse incoming runtime summary artifact.",
        stderr: "",
      }
    : runNpx(["tsx", "scripts/warehouse_incoming_queue_runtime_verify.ts"], 20 * 60 * 1000);

  const cutoverArtifact = readJson(cutoverArtifactPath);
  const runtimeSummary = shouldReuseRuntimeSummary ? existingRuntimeSummary : readJson(runtimeSummaryPath);
  const incomingHookSource = readText("src/screens/warehouse/warehouse.incoming.ts");
  const incomingRepoSource = readText("src/screens/warehouse/warehouse.incoming.repo.ts");
  const receiveFlowSource = readText("src/screens/warehouse/hooks/useWarehouseReceiveFlow.ts");
  const rowAdaptersSource = readText("src/screens/warehouse/presentation/warehouseRowAdapters.ts");
  const migrationSource = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";

  const parity = (cutoverArtifact?.parity as UnknownRecord | undefined) ?? {};
  const primaryOwner = String(cutoverArtifact?.primaryOwner ?? "rpc_scope_v1");
  const fallbackUsed = cutoverArtifact?.fallbackUsed === true;

  const queuePrimaryUsesRpc = incomingHookSource.includes("fetchWarehouseIncomingHeadsWindow(pageIndex, PAGE_SIZE)");
  const itemsPrimaryUsesRpc = incomingHookSource.includes("fetchWarehouseIncomingItemsWindow(incomingId)");
  const runtimeHasLegacyFallbackImports =
    incomingHookSource.includes("fetchWarehouseIncomingHeadsPageLegacy") ||
    incomingHookSource.includes("fetchWarehouseIncomingItemsLegacy") ||
    incomingHookSource.includes("fetch_incoming_fallback") ||
    incomingHookSource.includes("fetch_incoming_items_fallback");
  const queueClientStillSorts = incomingHookSource.includes("queue.sort(") || incomingHookSource.includes("rowsRaw.map((x) => ({");
  const itemsClientStillFilters =
    incomingHookSource.includes("codeU.startsWith(\"MAT-\")") ||
    incomingHookSource.includes("Math.max(0, nz(r.qty_expected, 0) - nz(r.qty_received, 0))");
  const receiveUsesBackendLeft = receiveFlowSource.includes("nz(row.qty_left, exp - rec)");
  const cardsUseBackendLeft = rowAdaptersSource.includes("nz(row.qty_left_sum, 0)");
  const repoHasRpcContracts =
    incomingRepoSource.includes("warehouse_incoming_queue_scope_v1") &&
    incomingRepoSource.includes("warehouse_incoming_items_scope_v1");
  const repoHasLegacyFallbackBranches =
    incomingRepoSource.includes("fetchWarehouseIncomingHeadsPageLegacy") ||
    incomingRepoSource.includes("fetchWarehouseIncomingItemsLegacy") ||
    incomingRepoSource.includes("legacy_view_page") ||
    incomingRepoSource.includes("legacy_view");
  const repoHardCutToRpcOnly =
    repoHasRpcContracts &&
    incomingRepoSource.includes('primaryOwner: "rpc_scope_v1";') &&
    !repoHasLegacyFallbackBranches;

  const clientOwnedIncomingTruthRemoved =
    queuePrimaryUsesRpc &&
    itemsPrimaryUsesRpc &&
    !runtimeHasLegacyFallbackImports &&
    receiveUsesBackendLeft &&
    cardsUseBackendLeft &&
    repoHardCutToRpcOnly &&
    !queueClientStillSorts &&
    !itemsClientStillFilters;

  const backendContractPatchPresent =
    migrationSource.includes("create or replace function public.warehouse_incoming_queue_scope_v1") &&
    migrationSource.includes("'version', 'v1'") &&
    migrationSource.includes("'rawWindowRowCount'") &&
    migrationSource.includes("'totalVisibleCount'") &&
    migrationSource.includes("create or replace function public.warehouse_incoming_items_scope_v1") &&
    migrationSource.includes("'qty_left'");

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
    parity.page0RowCountParityOk === true &&
    parity.page1RowCountParityOk === true &&
    parity.page0RowSignatureParityOk === true &&
    parity.page1RowSignatureParityOk === true &&
    parity.page0IdOrderParityOk === true &&
    parity.page1IdOrderParityOk === true &&
    parity.page0HasMoreParityOk === true &&
    parity.page1HasMoreParityOk === true &&
    parity.itemCountParityOk === true &&
    parity.itemSignatureParityOk === true &&
    parity.itemQtyParityOk === true &&
    parity.stableIdsOk === true &&
    clientOwnedIncomingTruthRemoved &&
    backendContractPatchPresent &&
    runtimeGateOk
      ? "passed"
      : "failed";

  const artifact = {
    status,
    gate: status === "passed" ? "GREEN" : "NOT_GREEN",
    primaryOwner,
    fallbackUsed,
    page0RowCountParityOk: parity.page0RowCountParityOk === true,
    page1RowCountParityOk: parity.page1RowCountParityOk === true,
    page0RowSignatureParityOk: parity.page0RowSignatureParityOk === true,
    page1RowSignatureParityOk: parity.page1RowSignatureParityOk === true,
    page0IdOrderParityOk: parity.page0IdOrderParityOk === true,
    page1IdOrderParityOk: parity.page1IdOrderParityOk === true,
    page0HasMoreParityOk: parity.page0HasMoreParityOk === true,
    page1HasMoreParityOk: parity.page1HasMoreParityOk === true,
    itemCountParityOk: parity.itemCountParityOk === true,
    itemSignatureParityOk: parity.itemSignatureParityOk === true,
    itemQtyParityOk: parity.itemQtyParityOk === true,
    stableIdsOk: parity.stableIdsOk === true,
    totalVisibleCountTypedOk: parity.totalVisibleCountTypedOk === true,
    clientOwnedIncomingTruthRemoved,
    backendContractPatchPresent,
    ownership: {
      queuePrimaryUsesRpc,
      itemsPrimaryUsesRpc,
      runtimeHasLegacyFallbackImports,
      queueClientStillSorts,
      itemsClientStillFilters,
      receiveUsesBackendLeft,
      cardsUseBackendLeft,
      repoHasRpcContracts,
      repoHasLegacyFallbackBranches,
      repoHardCutToRpcOnly,
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
    page0RowCountParityOk: artifact.page0RowCountParityOk,
    page1RowCountParityOk: artifact.page1RowCountParityOk,
    page0RowSignatureParityOk: artifact.page0RowSignatureParityOk,
    page1RowSignatureParityOk: artifact.page1RowSignatureParityOk,
    page0IdOrderParityOk: artifact.page0IdOrderParityOk,
    page1IdOrderParityOk: artifact.page1IdOrderParityOk,
    page0HasMoreParityOk: artifact.page0HasMoreParityOk,
    page1HasMoreParityOk: artifact.page1HasMoreParityOk,
    itemCountParityOk: artifact.itemCountParityOk,
    itemSignatureParityOk: artifact.itemSignatureParityOk,
    itemQtyParityOk: artifact.itemQtyParityOk,
    stableIdsOk: artifact.stableIdsOk,
    totalVisibleCountTypedOk: artifact.totalVisibleCountTypedOk,
    clientOwnedIncomingTruthRemoved: artifact.clientOwnedIncomingTruthRemoved,
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
