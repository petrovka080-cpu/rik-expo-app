import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type UnknownRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const artifactPath = path.join(projectRoot, "artifacts/warehouse-issue-queue-cutover-v1.json");
const runtimeSummaryPath = path.join(projectRoot, "artifacts/warehouse-issue-queue-runtime.summary.json");
const summaryOutPath = path.join(projectRoot, "artifacts/warehouse-issue-queue-backend-cutover.summary.json");
const fullOutPath = path.join(projectRoot, "artifacts/warehouse-issue-queue-backend-cutover.json");
const rpcPatchPath = path.join(
  projectRoot,
  "supabase/migrations/20260327110000_warehouse_issue_queue_scope_v4_contract_hardening.sql",
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

const runTsxScript = (scriptRelativePath: string) => {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawnSync(command, ["tsx", scriptRelativePath], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 10 * 60 * 1000,
  });
};

const getRows = (artifact: UnknownRecord | null, branch: "legacy" | "rpc", page: "page0Rows" | "page1Rows") => {
  const parent = artifact?.[branch];
  if (!parent || typeof parent !== "object") return [];
  const rows = (parent as UnknownRecord)[page];
  return Array.isArray(rows) ? (rows as UnknownRecord[]) : [];
};

const ensureBoolean = (value: unknown) => value === true || value === false;

function main() {
  const cutoverRun = runTsxScript("scripts/warehouse_issue_queue_cutover_v1.ts");
  const cutoverArtifact = readJson(artifactPath);
  const runtimeSummary = readJson(runtimeSummaryPath);

  const useReqHeadsSource = readText("src/screens/warehouse/hooks/useWarehouseReqHeads.ts");
  const warehouseApiSource = readText("src/screens/warehouse/warehouse.api.ts");
  const reqModalFlowSource = readText("src/screens/warehouse/hooks/useWarehouseReqModalFlow.ts");
  const expenseSliceSource = readText("src/screens/warehouse/hooks/useWarehouseExpenseQueueSlice.ts");
  const rpcPatchSource = fs.existsSync(rpcPatchPath) ? fs.readFileSync(rpcPatchPath, "utf8") : "";

  const page0LegacyRows = getRows(cutoverArtifact, "legacy", "page0Rows");
  const page1LegacyRows = getRows(cutoverArtifact, "legacy", "page1Rows");
  const page0RpcRows = getRows(cutoverArtifact, "rpc", "page0Rows");
  const page1RpcRows = getRows(cutoverArtifact, "rpc", "page1Rows");
  const rpcMeta = (cutoverArtifact?.rpc as UnknownRecord | undefined) ?? {};
  const parity = (cutoverArtifact?.parity as UnknownRecord | undefined) ?? {};

  const stableIdsOk =
    [...page0RpcRows, ...page1RpcRows].every((row) => String((row as UnknownRecord).request_id ?? "").trim()) &&
    new Set(
      [...page0RpcRows, ...page1RpcRows].map((row) => String((row as UnknownRecord).request_id ?? "").trim()),
    ).size === page0RpcRows.length + page1RpcRows.length;

  const booleanFlagsTypedOk = [...page0RpcRows, ...page1RpcRows].every((row) => {
    const typedRow = row as UnknownRecord;
    return (
      ensureBoolean(typedRow.visible_in_expense_queue) &&
      ensureBoolean(typedRow.can_issue_now) &&
      ensureBoolean(typedRow.waiting_stock) &&
      ensureBoolean(typedRow.all_done)
    );
  });

  const rowCountParityOk = page0LegacyRows.length === page0RpcRows.length && page1LegacyRows.length === page1RpcRows.length;
  const rowIdentityParityOk = [...page0LegacyRows, ...page1LegacyRows].every((row, index) => {
    const rpcRow = [...page0RpcRows, ...page1RpcRows][index] as UnknownRecord | undefined;
    return String((row as UnknownRecord).request_id ?? "").trim() === String(rpcRow?.request_id ?? "").trim();
  });
  const statusParityOk = parity.statusParityOk === true;
  const qtyParityOk = parity.qtyParityOk === true;
  const orderParityOk = parity.orderParityOk === true;
  const rowParityOk = parity.rowParityOk === true;
  const paginationMetaParityOk =
    Number(rpcMeta.page0RowCount ?? -1) === page0RpcRows.length &&
    Number(rpcMeta.page1RowCount ?? -1) === page1RpcRows.length &&
    Number(rpcMeta.totalRowCount ?? -1) >= page0RpcRows.length &&
    Number(rpcMeta.totalRowCount ?? -1) >= page1RpcRows.length;

  const clientPrimaryUsesStage = useReqHeadsSource.includes("apiFetchReqHeadsStaged");
  const clientPrimaryFallsBackToLegacy = warehouseApiSource.includes("const fallback = await apiFetchReqHeadsLegacyRaw");
  const serviceTypeHardCutOk =
    !/primaryOwner:\s*"rpc_scope_v4"\s*\|\s*"legacy_converged"/.test(warehouseApiSource) &&
    !/sourceKind:\s*"rpc:warehouse_issue_queue_scope_v4"\s*\|\s*"converged:req_heads"/.test(warehouseApiSource) &&
    !warehouseApiSource.includes('fallbackUsed: boolean;\n  sourceKind: "rpc:warehouse_issue_queue_scope_v4" | "converged:req_heads";') &&
    !/export async function apiFetchReqHeadsLegacy\s*\(/.test(warehouseApiSource);
  const modalFetchesRequestMeta = reqModalFlowSource.includes("fetchWarehouseRequestMeta");
  const modalParsesItemNotes = reqModalFlowSource.includes("parseReqHeaderContext");
  const modalPreservesPreviousTruth = expenseSliceSource.includes("prev.note ?? updated.note");
  const clientOwnedIssueTruthRemoved =
    !clientPrimaryUsesStage &&
    !clientPrimaryFallsBackToLegacy &&
    !modalFetchesRequestMeta &&
    !modalParsesItemNotes &&
    !modalPreservesPreviousTruth;

  const backendContractPatchPresent =
    rpcPatchSource.includes("'version', 'v4'") &&
    rpcPatchSource.includes("'payload_shape_version', 'v4'") &&
    rpcPatchSource.includes("'generated_at', timezone('utc', now())") &&
    rpcPatchSource.includes("'has_more'") &&
    rpcPatchSource.includes("'id', pr.request_id");

  const webPassed = runtimeSummary?.webPassed === true;
  const androidPassed = runtimeSummary?.androidPassed === true;
  const iosPassed = runtimeSummary?.iosPassed === true;
  const iosResidual =
    typeof runtimeSummary?.iosResidual === "string" && runtimeSummary.iosResidual.trim()
      ? runtimeSummary.iosResidual.trim()
      : null;
  const runtimeGateOk = webPassed && androidPassed && (iosPassed || !!iosResidual);

  const primaryOwner = String(cutoverArtifact?.primaryOwner ?? "rpc_scope_v4");
  const fallbackUsed = cutoverArtifact?.fallbackUsed === true;
  const cutoverArtifactPresent = cutoverArtifact != null;

  const summaryParityOk =
    rowCountParityOk &&
    rowIdentityParityOk &&
    rowParityOk &&
    orderParityOk &&
    statusParityOk &&
    qtyParityOk &&
    paginationMetaParityOk;

  const status =
    cutoverArtifactPresent &&
    primaryOwner === "rpc_scope_v4" &&
    fallbackUsed === false &&
    stableIdsOk &&
    booleanFlagsTypedOk &&
    summaryParityOk &&
    clientOwnedIssueTruthRemoved &&
    serviceTypeHardCutOk &&
    backendContractPatchPresent &&
    runtimeGateOk
      ? "passed"
      : "failed";

  const artifact = {
    status,
    gate: status === "passed" ? "GREEN" : "NOT_GREEN",
    primaryOwner,
    fallbackUsed,
    rowCountParityOk,
    rowIdentityParityOk,
    rowParityOk,
    orderParityOk,
    statusParityOk,
    qtyParityOk,
    paginationMetaParityOk,
    stableIdsOk,
    booleanFlagsTypedOk,
    clientOwnedIssueTruthRemoved,
    serviceTypeHardCutOk,
    backendContractPatchPresent,
    ownership: {
      clientPrimaryUsesStage,
      clientPrimaryFallsBackToLegacy,
      modalFetchesRequestMeta,
      modalParsesItemNotes,
      modalPreservesPreviousTruth,
    },
    runtime: {
      webPassed,
      androidPassed,
      iosPassed,
      iosResidual,
      runtimeGateOk,
      runtimeSummary,
    },
    cutoverRun: {
      status: cutoverRun.status,
      stdout: cutoverRun.stdout,
      stderr: cutoverRun.stderr,
    },
    legacy: cutoverArtifact?.legacy ?? null,
    rpc: cutoverArtifact?.rpc ?? null,
    parity: cutoverArtifact?.parity ?? null,
  };

  const summary = {
    status: artifact.status,
    gate: artifact.gate,
    primaryOwner: artifact.primaryOwner,
    fallbackUsed: artifact.fallbackUsed,
    rowCountParityOk: artifact.rowCountParityOk,
    rowIdentityParityOk: artifact.rowIdentityParityOk,
    rowParityOk: artifact.rowParityOk,
    orderParityOk: artifact.orderParityOk,
    statusParityOk: artifact.statusParityOk,
    qtyParityOk: artifact.qtyParityOk,
    paginationMetaParityOk: artifact.paginationMetaParityOk,
    stableIdsOk: artifact.stableIdsOk,
    booleanFlagsTypedOk: artifact.booleanFlagsTypedOk,
    clientOwnedIssueTruthRemoved: artifact.clientOwnedIssueTruthRemoved,
    serviceTypeHardCutOk: artifact.serviceTypeHardCutOk,
    backendContractPatchPresent: artifact.backendContractPatchPresent,
    webPassed,
    androidPassed,
    iosPassed,
    iosResidual,
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
