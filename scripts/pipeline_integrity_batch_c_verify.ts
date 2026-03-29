import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();
const artifactsDir = resolve(root, "artifacts");

const readText = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");
const readJson = <T>(relativePath: string): T | null => {
  const full = resolve(root, relativePath);
  if (!existsSync(full)) return null;
  return JSON.parse(readFileSync(full, "utf8")) as T;
};

const warehouseApiPath = "src/screens/warehouse/warehouse.api.ts";
const repairPath = "src/screens/warehouse/warehouse.reqHeads.repair.ts";
const hookPath = "src/screens/warehouse/hooks/useWarehouseReqHeads.ts";
const issueTabPath = "src/screens/warehouse/components/WarehouseIssueTab.tsx";
const emptyTextPath = "src/screens/warehouse/warehouse.tab.empty.ts";
const runtimeSummaryPath = "artifacts/warehouse-issue-queue-runtime.summary.json";
const draftGcSummaryPath = "artifacts/draft-gc-summary.json";

const warehouseApiText = readText(warehouseApiPath);
const repairText = readText(repairPath);
const hookText = readText(hookPath);
const issueTabText = readText(issueTabPath);
const emptyText = readText(emptyTextPath);
const runtimeSummary = readJson<{
  status?: string;
  runtimeVerified?: boolean;
  webPassed?: boolean;
  androidPassed?: boolean;
}>(runtimeSummaryPath);
const draftGcSummary = readJson<{
  status?: string;
  structural?: {
    reuseRpcPresent?: boolean;
    reusePathPresent?: boolean;
    gcMigrationPresent?: boolean;
  };
  runtime?: {
    reusedExistingDraft?: boolean;
    noNewDraftCreatedOnReuse?: boolean;
    gcDeletedOldEmpty?: boolean;
    gcPreservedRecentEmpty?: boolean;
    gcPreservedNonEmptyDraft?: boolean;
  };
}>(draftGcSummaryPath);

const canonicalization = {
  status:
    repairText.includes("export async function repairWarehouseReqHeadsPage0(") &&
    repairText.includes("export const compareWarehouseReqHeads") &&
    warehouseApiText.includes("await apiFetchReqHeadsLegacy(supabase, page, pageSize)") &&
    warehouseApiText.includes('primaryOwner: "rpc_scope_v4"') &&
    warehouseApiText.includes('primaryOwner: "legacy_converged"') &&
    warehouseApiText.includes("integrityState: WarehouseReqHeadsIntegrityState;")
      ? "GREEN"
      : "NOT_GREEN",
  files: [warehouseApiPath, repairPath],
  primaryRpcPresent: warehouseApiText.includes('rpc("warehouse_issue_queue_scope_v4"'),
  explicitLegacyFallbackPresent: warehouseApiText.includes("await apiFetchReqHeadsLegacy(supabase, page, pageSize)"),
  repairModulePresent: repairText.includes("export async function repairWarehouseReqHeadsPage0("),
  comparatorExportPresent: repairText.includes("export const compareWarehouseReqHeads"),
  integrityStateContractPresent: warehouseApiText.includes("integrityState: WarehouseReqHeadsIntegrityState;"),
};

const cooldownRedesign = {
  status:
    repairText.includes("REQUESTS_FALLBACK_LAST_GOOD_TTL_MS") &&
    repairText.includes("stale_last_known_good") &&
    repairText.includes("requests fallback cooldown; using last known good rows") &&
    hookText.includes("content_ready_stale_cache") &&
    hookText.includes('mode: "stale_last_known_good"') &&
    issueTabText.includes("selectWarehouseIssueBannerText") &&
    emptyText.includes("integrityState?.mode === \"error\"")
      ? "GREEN"
      : "NOT_GREEN",
  files: [repairPath, hookPath, issueTabPath, emptyTextPath],
  lastKnownGoodTtlPresent: repairText.includes("REQUESTS_FALLBACK_LAST_GOOD_TTL_MS"),
  staleModePresent: repairText.includes("stale_last_known_good"),
  cooldownUsesCacheMessagePresent: repairText.includes("requests fallback cooldown; using last known good rows"),
  hookPreservesCacheOnError: hookText.includes("content_ready_stale_cache"),
  hookErrorStatePresent: hookText.includes('mode: "error"'),
  uiBannerPresent: issueTabText.includes("selectWarehouseIssueBannerText"),
  emptyVsErrorTextSplit: emptyText.includes("integrityState?.mode === \"error\""),
};

const runtimeSmoke = {
  available: runtimeSummary != null,
  status:
    runtimeSummary?.status === "passed" &&
    runtimeSummary.runtimeVerified === true &&
    runtimeSummary.webPassed === true &&
    runtimeSummary.androidPassed === true
      ? "GREEN"
      : "NOT_GREEN",
  artifact: runtimeSummaryPath,
};

const draftGc = {
  available: draftGcSummary != null,
  status:
    draftGcSummary?.status === "GREEN" &&
    draftGcSummary.structural?.reuseRpcPresent === true &&
    draftGcSummary.structural?.reusePathPresent === true &&
    draftGcSummary.structural?.gcMigrationPresent === true &&
    draftGcSummary.runtime?.reusedExistingDraft === true &&
    draftGcSummary.runtime?.noNewDraftCreatedOnReuse === true &&
    draftGcSummary.runtime?.gcDeletedOldEmpty === true &&
    draftGcSummary.runtime?.gcPreservedRecentEmpty === true &&
    draftGcSummary.runtime?.gcPreservedNonEmptyDraft === true
      ? "GREEN"
      : "NOT_GREEN",
  artifact: draftGcSummaryPath,
};

mkdirSync(artifactsDir, { recursive: true });

writeFileSync(
  join(artifactsDir, "warehouse-canonicalization-summary.json"),
  `${JSON.stringify(canonicalization, null, 2)}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "warehouse-cooldown-redesign.json"),
  `${JSON.stringify(cooldownRedesign, null, 2)}\n`,
  "utf8",
);

const scopeStatus =
  canonicalization.status === "GREEN" &&
  cooldownRedesign.status === "GREEN" &&
  draftGc.status === "GREEN"
    ? "GREEN"
    : "NOT_GREEN";

writeFileSync(
  join(artifactsDir, "pipeline-batch-c-summary.json"),
  `${JSON.stringify(
    {
      status: scopeStatus,
      scope: ["C1", "C2", "C3"],
      canonicalizationStatus: canonicalization.status,
      cooldownRedesignStatus: cooldownRedesign.status,
      draftGcStatus: draftGc.status,
      runtimeSmokeStatus: runtimeSmoke.status,
      fullBatchCPendingScopes: ["C4"],
      fullBatchCStatus: "NOT_GREEN",
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      status: scopeStatus,
      canonicalizationStatus: canonicalization.status,
      cooldownRedesignStatus: cooldownRedesign.status,
      draftGcStatus: draftGc.status,
      runtimeSmokeStatus: runtimeSmoke.status,
      fullBatchCPendingScopes: ["C4"],
      fullBatchCStatus: "NOT_GREEN",
    },
    null,
    2,
  ),
);
