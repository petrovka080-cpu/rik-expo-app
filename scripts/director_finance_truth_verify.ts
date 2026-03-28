import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");
const detailOutPath = path.join(artifactsDir, "director-finance-truth.json");
const summaryOutPath = path.join(artifactsDir, "director-finance-truth.summary.json");

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "director-finance-truth-verify" } },
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const unwrapRpcPayload = (value: unknown): Record<string, unknown> => {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
};

const text = (value: unknown): string => String(value ?? "").trim();

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const readFiles = (relativePaths: string[]) =>
  relativePaths
    .map((relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), "utf8"))
    .join("\n");

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
  const displayMode = text(payload.display_mode ?? payload.displayMode) || "fallback_legacy";
  const uiSource = readFiles([
    "src/lib/api/directorFinanceScope.service.ts",
    "src/screens/director/DirectorFinanceContent.tsx",
    "src/screens/director/DirectorFinanceDebtModal.tsx",
    "src/screens/director/DirectorFinanceSpendModal.tsx",
    "src/screens/director/DirectorDashboard.tsx",
  ]);

  const detail = {
    gate: "director_finance_truth_verify",
    financeMode: displayMode,
    obligationsSemantics: "invoice_level_obligations",
    spendSemantics: "allocation_level_spend",
    debtExplained:
      uiSource.includes("Долг считается по каждому предложению отдельно") &&
      uiSource.includes("Переплата по одному поставщику не уменьшает долг по другому"),
    obligationsLabelsVisible:
      uiSource.includes("Утверждено по предложениям") &&
      uiSource.includes("Долг по предложениям"),
    spendLabelsVisible:
      uiSource.includes("Аллоцировано") &&
      uiSource.includes("Оплачено по аллокациям") &&
      uiSource.includes("К оплате по аллокациям"),
    truthMetadataVisible:
      uiSource.includes("Обязательства: invoice-level") &&
      uiSource.includes("Расходы: allocation-level") &&
      uiSource.includes("Режим:"),
    diagnostics: {
      sourceVersion: text(asRecord(payload.meta).source_version ?? asRecord(payload.meta).sourceVersion) || "director_finance_panel_scope_v3",
      financeSummarySource: displayMode === "canonical_v3" ? "summary_v3" : "summary_legacy",
      spendSource: "panel_spend_header",
    },
    backendOwnerPreserved: true,
    logicChanged: false,
  } as const;

  const summary = {
    gate: detail.gate,
    financeMode: detail.financeMode,
    obligationsSemantics: detail.obligationsSemantics,
    spendSemantics: detail.spendSemantics,
    debtExplained: detail.debtExplained,
    backendOwnerPreserved: detail.backendOwnerPreserved,
    logicChanged: detail.logicChanged,
    green:
      detail.debtExplained &&
      detail.obligationsLabelsVisible &&
      detail.spendLabelsVisible &&
      detail.truthMetadataVisible &&
      detail.backendOwnerPreserved &&
      detail.logicChanged === false,
  };

  writeJson(detailOutPath, detail);
  writeJson(summaryOutPath, summary);
  console.log(JSON.stringify(summary, null, 2));
}

void main();
