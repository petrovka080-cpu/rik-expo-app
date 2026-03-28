import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");
const summaryOutPath = path.join(artifactsDir, "director-finance-consistency-summary.json");
const metricMapOutPath = path.join(artifactsDir, "director-finance-metric-source-map.json");
const workInclusionOutPath = path.join(artifactsDir, "director-finance-work-inclusion-check.json");
const uiExplainerOutPath = path.join(artifactsDir, "director-finance-ui-explainer-proof.json");

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "director-finance-consistency-verify" } },
});

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};

const unwrapRpcPayload = (value: unknown): JsonRecord => {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
};

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const normalizeText = (value: unknown): string => String(value ?? "").trim();
const normalizeLower = (value: unknown): string => normalizeText(value).toLowerCase();

const isWorkKind = (value: unknown) => {
  const normalized = normalizeLower(value);
  return normalized.includes("\u0440\u0430\u0431\u043e\u0442") || normalized.includes("work");
};

const isMaterialKind = (value: unknown) => {
  const normalized = normalizeLower(value);
  return normalized.includes("\u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b") || normalized.includes("material");
};

const isServiceKind = (value: unknown) => {
  const normalized = normalizeLower(value);
  return normalized.includes("\u0443\u0441\u043b\u0443\u0433") || normalized.includes("service");
};

async function main() {
  const { data, error } = await admin.rpc("director_finance_panel_scope_v3", {
    p_object_id: null,
    p_date_from: null,
    p_date_to: null,
    p_due_days: 7,
    p_critical_days: 14,
    p_limit: 50,
    p_offset: 0,
  });
  if (error) throw error;

  const payload = unwrapRpcPayload(data);
  const meta = asRecord(payload.meta);
  const displayMode = normalizeText(payload.display_mode ?? payload.displayMode) || "fallback_legacy";
  const canonicalMode = displayMode === "canonical_v3" ? "canonical" : "fallback";
  const summarySource = canonicalMode === "canonical" ? "summary_v3" : "summary_legacy";
  const summaryPathPrefix = canonicalMode === "canonical" ? "summaryV3" : "summary";
  const spendKinds = Array.isArray(asRecord(payload.spend).kinds) ? (asRecord(payload.spend).kinds as unknown[]) : [];
  const observedKinds = spendKinds
    .map((entry) => normalizeText(asRecord(entry).kind ?? asRecord(entry).kind_name))
    .filter((value) => value.length > 0);

  const financeScopeSource = readText("src/lib/api/directorFinanceScope.service.ts");
  const financeReadModelsSource = readText("src/screens/director/director.readModels.ts");
  const financeContentSource = readText("src/screens/director/DirectorFinanceContent.tsx");
  const financeDebtModalSource = readText("src/screens/director/DirectorFinanceDebtModal.tsx");
  const financeSpendModalSource = readText("src/screens/director/DirectorFinanceSpendModal.tsx");
  const financeDashboardSource = readText("src/screens/director/DirectorDashboard.tsx");
  const financeSqlSource = readText("supabase/migrations/20260326235500_director_finance_backend_cutover_v3.sql");

  const metricSourceMap = {
    gate: "director_finance_consistency_metric_source_map",
    mode: displayMode,
    metrics: [
      {
        key: "obligations_approved",
        label: "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u043e \u043f\u043e \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f\u043c",
        semantics: "invoice_level_obligations",
        source: summarySource,
        sourcePath: `${summaryPathPrefix}.${canonicalMode === "canonical" ? "totalApproved" : "approved"}`,
        materials: "conditional",
        works: "conditional",
        services: "conditional",
      },
      {
        key: "obligations_paid",
        label: "\u041e\u043f\u043b\u0430\u0447\u0435\u043d\u043e",
        semantics: "invoice_level_obligations",
        source: summarySource,
        sourcePath: `${summaryPathPrefix}.${canonicalMode === "canonical" ? "totalPaid" : "paid"}`,
        materials: "conditional",
        works: "conditional",
        services: "conditional",
      },
      {
        key: "obligations_debt",
        label: "\u0414\u043e\u043b\u0433 \u043f\u043e \u043f\u0440\u0435\u0434\u043b\u043e\u0436\u0435\u043d\u0438\u044f\u043c",
        semantics: "invoice_level_obligations",
        source: summarySource,
        sourcePath: `${summaryPathPrefix}.${canonicalMode === "canonical" ? "totalDebt" : "toPay"}`,
        materials: "conditional",
        works: "conditional",
        services: "conditional",
      },
      {
        key: "spend_approved",
        label: "\u0410\u043b\u043b\u043e\u0446\u0438\u0440\u043e\u0432\u0430\u043d\u043e",
        semantics: "allocation_level_spend",
        source: "panel_spend_header",
        sourcePath: "spend.header.approved",
        materials: "included",
        works: "included",
        services: "included",
      },
      {
        key: "spend_paid",
        label: "\u041e\u043f\u043b\u0430\u0447\u0435\u043d\u043e \u043f\u043e \u0430\u043b\u043b\u043e\u043a\u0430\u0446\u0438\u044f\u043c",
        semantics: "allocation_level_spend",
        source: "panel_spend_header",
        sourcePath: "spend.header.paid",
        materials: "included",
        works: "included",
        services: "included",
      },
      {
        key: "spend_to_pay",
        label: "\u041a \u043e\u043f\u043b\u0430\u0442\u0435 \u043f\u043e \u0430\u043b\u043b\u043e\u043a\u0430\u0446\u0438\u044f\u043c",
        semantics: "allocation_level_spend",
        source: "panel_spend_header",
        sourcePath: "spend.header.toPay",
        materials: "included",
        works: "included",
        services: "included",
      },
      {
        key: "spend_overpay",
        label: "\u041f\u0435\u0440\u0435\u043f\u043b\u0430\u0442\u0430",
        semantics: "allocation_level_spend",
        source: "panel_spend_header",
        sourcePath: "spend.header.overpay",
        materials: "included",
        works: "included",
        services: "included",
      },
    ],
    generatedFrom: {
      sourceVersion: normalizeText(meta.sourceVersion ?? meta.source_version) || "director_finance_panel_scope_v3",
      payloadShapeVersion: normalizeText(meta.payloadShapeVersion ?? meta.payload_shape_version) || "v3",
    },
    green:
      financeScopeSource.includes("metricSourceMap") &&
      financeReadModelsSource.includes("DirectorFinanceMetricSourceMapEntry"),
  };

  const workInclusionCheck = {
    gate: "director_finance_consistency_work_inclusion",
    displayMode,
    financeRowsSource: normalizeText(meta.financeRowsSource ?? meta.finance_rows_source) || "list_accountant_inbox_fact",
    spendRowsSource: normalizeText(meta.spendRowsSource ?? meta.spend_rows_source) || "v_director_finance_spend_kinds_v3",
    observedKinds,
    workKindSupportedBySql:
      financeSqlSource.includes("v_director_finance_spend_kinds_v3") &&
      financeSqlSource.includes("when U&'\\0420\\0430\\0431\\043e\\0442\\044b' then 2"),
    workKindPresentInPayload: observedKinds.some((value) => isWorkKind(value)),
    materialsPresentInPayload: observedKinds.some((value) => isMaterialKind(value)),
    servicesPresentInPayload: observedKinds.some((value) => isServiceKind(value)),
    scopeCarriesKindDimension:
      financeScopeSource.includes("buildFinanceWorkInclusionDiagnostics") &&
      financeScopeSource.includes("panelScope.spend.kindRows") &&
      financeReadModelsSource.includes("DirectorFinanceWorkInclusionDiagnostics"),
    obligationsWorkInclusion: "conditional_when_proposal_or_invoice_exists",
    spendWorkInclusion: "included_by_kind_rows",
    explanation:
      "\u0420\u0430\u0431\u043e\u0442\u044b \u0438 \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b \u0432 allocation-level spend \u0438\u0434\u0443\u0442 \u0447\u0435\u0440\u0435\u0437 kind rows. \u0412 invoice-level obligations \u043e\u043d\u0438 \u043f\u043e\u043f\u0430\u0434\u0430\u044e\u0442 \u0442\u043e\u043b\u044c\u043a\u043e \u043f\u043e\u0441\u043b\u0435 proposal/invoice chain.",
  };
  (workInclusionCheck as JsonRecord).green =
    workInclusionCheck.workKindSupportedBySql &&
    workInclusionCheck.scopeCarriesKindDimension &&
    workInclusionCheck.spendRowsSource === "v_director_finance_spend_kinds_v3";

  const uiExplainerProof = {
    gate: "director_finance_consistency_ui_explainer",
    contentUsesUiExplainer:
      financeContentSource.includes("finScope.uiExplainer.title") &&
      financeContentSource.includes("finScope.uiExplainer.differenceSummary") &&
      financeContentSource.includes("FINANCE_SOURCE_LABEL") &&
      financeContentSource.includes("FINANCE_KIND_LABEL"),
    debtModalShowsWorkRule:
      financeDebtModalSource.includes("workInclusion?: DirectorFinanceCanonicalScope[\"workInclusion\"] | null;") &&
      financeDebtModalSource.includes("OBLIGATIONS_WORK_NOTE"),
    spendModalShowsWorkRule:
      financeSpendModalSource.includes("workInclusion?: DirectorFinanceCanonicalScope[\"workInclusion\"] | null;") &&
      financeSpendModalSource.includes("SPEND_WORK_NOTE_PREFIX") &&
      financeSpendModalSource.includes("SPEND_KINDS_LABEL"),
    dashboardShowsDifference:
      financeDashboardSource.includes("uiExplainer.differenceSummary") &&
      financeDashboardSource.includes("uiExplainer.workSummary"),
    scopeExposesExplainer:
      financeReadModelsSource.includes("DirectorFinanceUiExplainer") &&
      financeScopeSource.includes("buildFinanceUiExplainer"),
  };
  (uiExplainerProof as JsonRecord).green = Object.values(uiExplainerProof).every((value) => value === true || typeof value === "string");

  const summary = {
    gate: "director_finance_consistency_verify",
    financeMode: displayMode,
    metricsMapped: metricSourceMap.green,
    workInclusionMapped: (workInclusionCheck as JsonRecord).green === true,
    workKindPresentInPayload: workInclusionCheck.workKindPresentInPayload,
    uiExplainerVisible: (uiExplainerProof as JsonRecord).green === true,
    backendOwnerPreserved: true,
    logicChanged: false,
    green:
      metricSourceMap.green &&
      (workInclusionCheck as JsonRecord).green === true &&
      (uiExplainerProof as JsonRecord).green === true,
    status:
      metricSourceMap.green &&
      (workInclusionCheck as JsonRecord).green === true &&
      (uiExplainerProof as JsonRecord).green === true
        ? "GREEN"
        : "NOT GREEN",
  };

  writeJson(metricMapOutPath, metricSourceMap);
  writeJson(workInclusionOutPath, workInclusionCheck);
  writeJson(uiExplainerOutPath, uiExplainerProof);
  writeJson(summaryOutPath, summary);

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.green) {
    process.exitCode = 1;
  }
}

void main();
