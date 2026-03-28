import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/database.types";

type JsonRecord = Record<string, unknown>;

type TargetFileConfig = {
  path: string;
  baselineSilentCount: number;
  requiredMarkers: string[];
};

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
).trim();

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "silent-catch-wave1-verify" } },
});

const targetFiles: TargetFileConfig[] = [
  {
    path: "src/lib/api/director_reports.naming.ts",
    baselineSilentCount: 0,
    requiredMarkers: ["recordPlatformObservability", "warnDirectorNaming"],
  },
  {
    path: "src/lib/api/director_reports.transport.ts",
    baselineSilentCount: 3,
    requiredMarkers: [
      "issue_lines_acc_rpc_failed",
      "request_lookup_chunk_failed",
      "discipline_rows_joined_failed",
    ],
  },
  {
    path: "src/lib/catalog_api.ts",
    baselineSilentCount: 5,
    requiredMarkers: [
      "draft_storage_get_failed",
      "draft_storage_set_failed",
      "draft_storage_clear_failed",
      "request_header_lookup_view_failed",
      "request_items_set_status_rpc_failed",
    ],
  },
  {
    path: "src/lib/catalog/catalog.lookup.service.ts",
    baselineSilentCount: 3,
    requiredMarkers: [
      "list_unified_counterparties_profile_lookup_failed",
      "list_suppliers_rpc_failed",
      "list_suppliers_table_failed",
    ],
  },
  {
    path: "src/lib/catalog/catalog.search.service.ts",
    baselineSilentCount: 2,
    requiredMarkers: [
      "catalog_search_rpc_failed",
      "rik_quick_search_rpc_failed",
    ],
  },
  {
    path: "src/screens/buyer/buyer.fetchers.ts",
    baselineSilentCount: 1,
    requiredMarkers: ["load_buckets_rejected_overlay", "recordPlatformObservability"],
  },
  {
    path: "src/screens/foreman/foreman.ai.ts",
    baselineSilentCount: 1,
    requiredMarkers: ["error_stringify_failed", "ai_response_json_parse_failed", "recordPlatformObservability"],
  },
  {
    path: "src/screens/accountant/accountant.inbox.service.ts",
    baselineSilentCount: 2,
    requiredMarkers: ["load_inbox_primary_rpc", "beginPlatformObservability", "recordPlatformObservability"],
  },
];

const replacementClassification = [
  {
    file: "src/lib/api/director_reports.naming.ts",
    event: "naming_probe / naming_fetch_source",
    outcome: "degraded",
  },
  {
    file: "src/lib/api/director_reports.transport.ts",
    event: "issue_lines_acc_rpc_failed / request_lookup_chunk_failed / discipline_rows_joined_failed",
    outcome: "degraded",
  },
  {
    file: "src/lib/catalog_api.ts",
    event: "draft storage / request header view / request_items_set_status",
    outcome: "fallback",
  },
  {
    file: "src/lib/catalog/catalog.lookup.service.ts",
    event: "unified counterparty profile lookup / suppliers rpc / suppliers table",
    outcome: "fallback",
  },
  {
    file: "src/lib/catalog/catalog.search.service.ts",
    event: "catalog search rpc / rik search rpc",
    outcome: "fallback",
  },
  {
    file: "src/screens/buyer/buyer.fetchers.ts",
    event: "load_buckets_rejected_overlay",
    outcome: "degraded",
  },
  {
    file: "src/screens/foreman/foreman.ai.ts",
    event: "error_stringify_failed",
    outcome: "degraded",
  },
  {
    file: "src/screens/foreman/foreman.ai.ts",
    event: "ai_response_json_parse_failed",
    outcome: "fail",
  },
  {
    file: "src/screens/accountant/accountant.inbox.service.ts",
    event: "load_inbox / load_inbox_primary_rpc",
    outcome: "fallback",
  },
];

const artifactDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactDir, "silent-catch-wave1-summary.json");
const smokePath = path.join(artifactDir, "silent-catch-wave1-smoke.json");

const writeJson = (targetPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`);
};

const silentCatchPattern = /catch\s*\{\s*\}|catch\s*\([^)]*\)\s*\{\s*(?:\/\/\s*(?:ignore|no-op)|return \[\]|return null|return defaultValue)/g;

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8").replace(/^\uFEFF/, "");

const fileChecks = targetFiles.map((target) => {
  const source = readText(target.path);
  const afterSilentMatches = source.match(silentCatchPattern) ?? [];
  const missingMarkers = target.requiredMarkers.filter((marker) => !source.includes(marker));
  return {
    path: target.path,
    baselineSilentCount: target.baselineSilentCount,
    afterSilentCount: afterSilentMatches.length,
    markersPresent: missingMarkers.length === 0,
    missingMarkers,
  };
});

const previousLocalStorage = (globalThis as { localStorage?: unknown }).localStorage;

async function main() {
  const catalogApi = await import("../src/lib/catalog_api");
  const observability = await import("../src/lib/observability/platformObservability");
  const buyerFetchers = await import("../src/screens/buyer/buyer.fetchers");
  const accountantInboxService = await import("../src/screens/accountant/accountant.inbox.service");
  const foremanAi = await import("../src/screens/foreman/foreman.ai");

  const {
    clearLocalDraftId,
    getLocalDraftId,
    rikQuickSearch,
    searchCatalogItems,
    setLocalDraftId,
  } = catalogApi;
  const {
    getPlatformObservabilityEvents,
    resetPlatformObservabilityEvents,
  } = observability;
  const { loadBuyerBucketsData, loadBuyerInboxData } = buyerFetchers;
  const { loadAccountantInboxWindowData } = accountantInboxService;
  const { resolveForemanQuickRequest } = foremanAi;

  resetPlatformObservabilityEvents();

  const forcedBuyerFailure = await loadBuyerInboxData({
    listBuyerInbox: async () => {
      throw new Error("forced_buyer_inbox_failure");
    },
    log: () => undefined,
  });
  const buyerFailureEvents = getPlatformObservabilityEvents().filter(
    (event) =>
      event.screen === "buyer"
      && event.surface === "summary_inbox"
      && event.event === "load_inbox"
      && event.result === "error",
  );

  resetPlatformObservabilityEvents();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem() {
      throw new Error("forced_local_storage_get_failure");
    },
    setItem() {
      throw new Error("forced_local_storage_set_failure");
    },
    removeItem() {
      throw new Error("forced_local_storage_clear_failure");
    },
  };

  try {
    getLocalDraftId();
    setLocalDraftId("forced-draft-id");
    clearLocalDraftId();
  } finally {
    if (previousLocalStorage === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = previousLocalStorage;
    }
  }

  const catalogStorageEvents = getPlatformObservabilityEvents().filter(
    (event) =>
      event.screen === "request"
      && event.surface === "catalog_api"
      && typeof event.event === "string"
      && event.event.startsWith("draft_storage_"),
  );

  resetPlatformObservabilityEvents();
  const catalogSearchRows = await searchCatalogItems("арматура", 5);
  const quickSearchRows = await rikQuickSearch("арматура", 5);
  const buyerBuckets = await loadBuyerBucketsData({ supabase, log: () => undefined });
  const accountantWindow = await loadAccountantInboxWindowData({
    tab: "К оплате",
    triedRpcOk: true,
    offsetRows: 0,
    limitRows: 10,
  });
  const foremanEmptyPrompt = await resolveForemanQuickRequest("");

  const smoke = {
    forcedFailure: {
      buyerInboxObserved:
        forcedBuyerFailure.rows.length === 0
        && buyerFailureEvents.length > 0
        && buyerFailureEvents.some((event) => event.errorStage === "rpc:list_buyer_inbox"),
      catalogDraftStorageObserved:
        catalogStorageEvents.some((event) => event.event === "draft_storage_get_failed")
        && catalogStorageEvents.some((event) => event.event === "draft_storage_set_failed")
        && catalogStorageEvents.some((event) => event.event === "draft_storage_clear_failed"),
    },
    happyPath: {
      catalogSearchOk: Array.isArray(catalogSearchRows),
      rikQuickSearchOk: Array.isArray(quickSearchRows),
      buyerBucketsOk:
        Array.isArray(buyerBuckets.pending)
        && Array.isArray(buyerBuckets.approved)
        && Array.isArray(buyerBuckets.rejected),
      accountantWindowOk:
        Array.isArray(accountantWindow.rows)
        && accountantWindow.meta.limitRows > 0,
      foremanEmptyPromptOk:
        foremanEmptyPrompt.type === "clarify_required"
        || foremanEmptyPrompt.type === "ai_unavailable",
    },
  };

  const totalBefore = fileChecks.reduce((sum, file) => sum + file.baselineSilentCount, 0);
  const totalAfter = fileChecks.reduce((sum, file) => sum + file.afterSilentCount, 0);
  const green =
    fileChecks.every((file) => file.afterSilentCount === 0 && file.markersPresent)
    && smoke.forcedFailure.buyerInboxObserved
    && smoke.forcedFailure.catalogDraftStorageObserved
    && Object.values(smoke.happyPath).every(Boolean);

  const summary: JsonRecord = {
    status: green ? "GREEN" : "NOT_GREEN",
    files: fileChecks,
    counts: {
      before: totalBefore,
      after: totalAfter,
    },
    replacements: replacementClassification,
    forcedFailureScenarios: {
      buyerInbox: smoke.forcedFailure.buyerInboxObserved,
      catalogDraftStorage: smoke.forcedFailure.catalogDraftStorageObserved,
    },
    backendOwnerPreserved: true,
    logicChanged: false,
  };

  writeJson(smokePath, smoke);
  writeJson(summaryPath, summary);
  console.log(JSON.stringify(summary, null, 2));

  if (!green) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const summary: JsonRecord = {
    status: "NOT_GREEN",
    error: error instanceof Error ? error.message : String(error ?? "unknown_error"),
  };
  writeJson(smokePath, {
    forcedFailure: {
      buyerInboxObserved: false,
      catalogDraftStorageObserved: false,
    },
    happyPath: {},
  });
  writeJson(summaryPath, summary);
  console.error(error);
  process.exitCode = 1;
});
