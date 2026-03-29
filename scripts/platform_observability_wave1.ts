import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import type { Database } from "../src/lib/database.types";

const projectRoot = process.cwd();
for (const file of [".env.local", ".env"]) {
  const full = path.join(projectRoot, file);
  if (fs.existsSync(full)) loadDotenv({ path: full, override: false });
}

process.env.RIK_QUEUE_WORKER_USE_SERVICE_ROLE = "true";

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
).trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "platform-observability-wave1" } },
});

const now = () => new Date();
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error ?? "");

const writeArtifact = (relativePath: string, payload: unknown) => {
  const full = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(payload, null, 2)}\n`);
};

type ScenarioResult = {
  status: "passed" | "failed";
  durationMs: number;
  details: Record<string, unknown>;
};

async function main() {
  const [
    platformObservability,
    buyerFetchers,
    accountantInboxService,
    accountantHistoryService,
    contractorLoadWorksService,
    contractorProfileService,
    contractorUtils,
    contractorStatus,
    directorFinanceScopeService,
    directorReportsScopeService,
  ] = await Promise.all([
    import("../src/lib/observability/platformObservability"),
    import("../src/screens/buyer/buyer.fetchers"),
    import("../src/screens/accountant/accountant.inbox.service"),
    import("../src/screens/accountant/accountant.history.service"),
    import("../src/screens/contractor/contractor.loadWorksService"),
    import("../src/screens/contractor/contractor.profileService"),
    import("../src/screens/contractor/contractor.utils"),
    import("../src/screens/contractor/contractor.status"),
    import("../src/lib/api/directorFinanceScope.service"),
    import("../src/lib/api/directorReportsScope.service"),
  ]);

  const {
    resetPlatformObservabilityEvents,
    beginPlatformObservability,
    getPlatformObservabilityEvents,
    summarizePlatformObservabilityEvents,
  } = platformObservability;
  resetPlatformObservabilityEvents();

  const today = now();
  const periodFrom = isoDate(addDays(today, -30));
  const periodTo = isoDate(today);

  const scenarioResults: Record<string, ScenarioResult> = {};

  const runScenario = async (
    name: string,
    fn: () => Promise<Record<string, unknown>>,
  ) => {
    const startedAt = Date.now();
    try {
      const details = await fn();
      scenarioResults[name] = {
        status: "passed",
        durationMs: Date.now() - startedAt,
        details,
      };
    } catch (error) {
      scenarioResults[name] = {
        status: "failed",
        durationMs: Date.now() - startedAt,
        details: {
          error: toErrorMessage(error),
        },
      };
    }
  };

  await runScenario("warehouse_stock", async () => {
    const observation = beginPlatformObservability({
      screen: "warehouse",
      surface: "stock_list",
      category: "fetch",
      event: "fetch_stock",
      sourceKind: "view:v_wh_balance_ledger_truth_ui",
    });
    const { data, error } = await supabase
      .from("v_wh_balance_ledger_truth_ui")
      .select("code, uom_id, qty_available, updated_at")
      .order("code", { ascending: true })
      .range(0, 399);
    if (error) {
      observation.error(error, {
        rowCount: 0,
        errorStage: "view:v_wh_balance_ledger_truth_ui",
      });
      throw error;
    }
    const rows = Array.isArray(data) ? data : [];
    observation.success({
      rowCount: rows.length,
    });
    return {
      rows: rows.length,
    };
  });

  await runScenario("warehouse_req_heads", async () => {
    const observation = beginPlatformObservability({
      screen: "warehouse",
      surface: "req_heads",
      category: "fetch",
      event: "fetch_req_heads",
      sourceKind: "view:v_wh_issue_req_heads_ui",
    });
    const { data, error } = await supabase
      .from("v_wh_issue_req_heads_ui")
      .select("request_id, submitted_at")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .range(0, 49);
    if (error) {
      observation.error(error, {
        rowCount: 0,
        errorStage: "view:v_wh_issue_req_heads_ui",
      });
      throw error;
    }
    const rows = Array.isArray(data) ? data : [];
    observation.success({
      rowCount: rows.length,
    });
    return {
      rows: rows.length,
    };
  });

  await runScenario("buyer_summary", async () => {
    const inbox = await buyerFetchers.loadBuyerInboxData({
      supabase,
    });
    const buckets = await buyerFetchers.loadBuyerBucketsData({ supabase });
    return {
      inboxRows: inbox.rows.length,
      requestIds: inbox.requestIds.length,
      pending: buckets.pending.length,
      approved: buckets.approved.length,
      rejected: buckets.rejected.length,
    };
  });

  await runScenario("accountant_inbox", async () => {
    const inbox = await accountantInboxService.loadAccountantInboxViaRpc({
      tab: "К оплате",
      triedRpcOk: true,
    });
    return {
      rows: inbox.data.length,
      rpcFailed: inbox.rpcFailed,
      nextTriedRpcOk: inbox.nextTriedRpcOk,
    };
  });

  await runScenario("accountant_history", async () => {
    const rows = await accountantHistoryService.loadAccountantHistoryRows({
      dateFrom: periodFrom,
      dateTo: periodTo,
      histSearch: "",
      toRpcDateOrNull: (value) => {
        const trimmed = String(value ?? "").trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
      },
    });
    return {
      rows: rows.length,
    };
  });

  await runScenario("contractor_profiles", async () => {
    const profile = await contractorProfileService.loadCurrentContractorUserProfile({
      supabaseClient: supabase,
      normText: contractorUtils.normText,
    });
    const contractor = await contractorProfileService.loadCurrentContractorProfile({
      supabaseClient: supabase,
      normText: contractorUtils.normText,
    });
    return {
      userProfileLoaded: !!profile,
      contractorProfileLoaded: !!contractor,
    };
  });

  await runScenario("contractor_works_bundle", async () => {
    const userProfile = await contractorProfileService.loadCurrentContractorUserProfile({
      supabaseClient: supabase,
      normText: contractorUtils.normText,
    });
    const contractorProfile = await contractorProfileService.loadCurrentContractorProfile({
      supabaseClient: supabase,
      normText: contractorUtils.normText,
    });
    const result = await contractorLoadWorksService.loadContractorWorksBundle({
      supabaseClient: supabase,
      normText: contractorUtils.normText,
      looksLikeUuid: contractorUtils.looksLikeUuid,
      pickWorkProgressRow: contractorUtils.pickWorkProgressRow,
      myContractorId: String(contractorProfile?.id ?? "").trim(),
      myUserId: String(userProfile?.id ?? "").trim(),
      myContractorInn: contractorProfile?.inn ?? null,
      myContractorCompany: contractorProfile?.company_name ?? null,
      myContractorFullName: contractorProfile?.full_name ?? null,
      isStaff: userProfile?.is_contractor === false,
      isExcludedWorkCode: contractorUtils.isExcludedWorkCode,
      isApprovedForOtherStatus: contractorStatus.isApprovedForOtherStatus,
    });
    return {
      rows: result.rows.length,
      subcontractCards: result.subcontractCards.length,
      totalApproved: result.debug.totalApproved,
    };
  });

  await runScenario("director_finance_scope", async () => {
    const result = await directorFinanceScopeService.loadDirectorFinanceScreenScope({
      periodFromIso: periodFrom,
      periodToIso: periodTo,
      includeSupportRows: false,
    });
    return {
      panelScope: result.sourceMeta.panelScope,
      financeRows: result.financeRows.length,
      spendRows: result.spendRows.length,
      issues: result.issues.length,
    };
  });

  await runScenario("director_reports_scope", async () => {
    const result = await directorReportsScopeService.loadDirectorReportUiScope({
      from: periodFrom,
      to: periodTo,
      objectName: null,
      includeDiscipline: true,
      skipDisciplinePrices: false,
      bypassCache: true,
    });
    return {
      optionsObjects: result.optionsState.objects.length,
      reportRows: result.report?.rows?.length ?? 0,
      disciplineWorks: result.discipline?.works?.length ?? 0,
      fromCache: result.reportFromCache,
      reportBranch: result.reportMeta?.branch ?? null,
    };
  });

  const events = getPlatformObservabilityEvents();
  const summary = summarizePlatformObservabilityEvents(events);
  const status = Object.values(scenarioResults).every((value) => value.status === "passed")
    ? "passed"
    : "partial";
  const artifact = {
    status,
    periodFrom,
    periodTo,
    scenarioResults,
    totalEvents: events.length,
    summary,
    events,
  };

  writeArtifact("artifacts/platform-observability-wave1.json", artifact);
  writeArtifact("artifacts/platform-observability-wave1.summary.json", {
    status: artifact.status,
    periodFrom,
    periodTo,
    scenarios: Object.fromEntries(
      Object.entries(scenarioResults).map(([key, value]) => [key, value.status]),
    ),
    totalEvents: events.length,
    summary,
  });

  console.log(JSON.stringify({
    status: artifact.status,
    totalEvents: events.length,
    topSlowFetches: summary.topSlowFetches.slice(0, 5),
  }, null, 2));
}

void main();
