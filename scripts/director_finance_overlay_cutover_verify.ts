import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const fullOutPath = path.join(projectRoot, "artifacts/director-finance-overlay-cutover.json");
const summaryOutPath = path.join(projectRoot, "artifacts/director-finance-overlay-cutover.summary.json");

dotenv.config({ path: path.join(projectRoot, ".env.local") });
dotenv.config({ path: path.join(projectRoot, ".env") });

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};

const toFiniteNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const compareNumber = (left: unknown, right: unknown, epsilon = 0.001) => {
  const a = toFiniteNumber(left);
  const b = toFiniteNumber(right);
  const delta = a - b;
  return {
    left: a,
    right: b,
    delta,
    match: Math.abs(delta) <= epsilon,
  };
};

const readJsonIfExists = (relativePath: string): JsonRecord | null => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8")) as JsonRecord;
};

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`);
};

async function main() {
  const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
  const supabaseAnonKey = String(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const financeScopeServicePath = path.join(projectRoot, "src/lib/api/directorFinanceScope.service.ts");
  const financeScopeServiceSource = fs.readFileSync(financeScopeServicePath, "utf8");
  const runtimeSummary = readJsonIfExists("artifacts/director-finance-runtime.summary.json");

  const [panelV2Result, panelV3Result] = await Promise.all([
    supabase.rpc("director_finance_panel_scope_v2", {
      p_limit: 50,
      p_offset: 0,
    }),
    supabase.rpc("director_finance_panel_scope_v3", {
      p_due_days: 7,
      p_critical_days: 14,
      p_limit: 50,
      p_offset: 0,
    }),
  ]);

  if (panelV2Result.error) {
    throw new Error(`director_finance_panel_scope_v2 failed: ${panelV2Result.error.message}`);
  }
  if (panelV3Result.error) {
    throw new Error(`director_finance_panel_scope_v3 failed: ${panelV3Result.error.message}`);
  }

  const panelV2 = asRecord(panelV2Result.data);
  const panelV3 = asRecord(panelV3Result.data);
  const summaryV2 = asRecord(panelV2.summary_v2 ?? panelV2.summaryV2);
  const summaryV3 = asRecord(panelV3.summary_v3 ?? panelV3.summaryV3);
  const metaV3 = asRecord(panelV3.meta);
  const supplierRowsV3 = Array.isArray(panelV3.supplierRows) ? panelV3.supplierRows : [];
  const rowsV2 = Array.isArray(panelV2.rows) ? panelV2.rows : [];
  const rowsV3 = Array.isArray(panelV3.rows) ? panelV3.rows : [];

  const summaryParity = {
    totalApproved: compareNumber(summaryV3.totalApproved, summaryV2.totalAmount),
    totalPayable: compareNumber(summaryV3.totalPayable, summaryV2.totalAmount),
    totalPaid: compareNumber(summaryV3.totalPaid, summaryV2.totalPaid),
    totalDebt: compareNumber(summaryV3.totalDebt, summaryV2.totalDebt),
    overdueAmount: compareNumber(summaryV3.overdueAmount, summaryV2.overdueAmount),
    supplierRowCount: compareNumber(summaryV3.supplierRowCount, supplierRowsV3.length),
    pageRowCount: compareNumber(rowsV3.length, rowsV2.length),
  };

  const overlayRemoved =
    /const summaryCompatibilityOverlay = false;/.test(financeScopeServiceSource) &&
    !/summaryCompatibilityOverlay:\s*true/.test(financeScopeServiceSource);
  const primaryScopeHardCutOk =
    !/fetchDirectorFinancePanelScopeV2ViaRpc\s*\(/.test(financeScopeServiceSource) &&
    !/fetchDirectorFinancePanelScopeViaRpc\s*\(/.test(financeScopeServiceSource) &&
    !/fetchDirectorFinanceSummaryViaRpc\s*\(/.test(financeScopeServiceSource);
  const runtimeGateOk =
    runtimeSummary?.status === "passed" &&
    runtimeSummary.webPassed === true &&
    runtimeSummary.androidPassed === true &&
    (runtimeSummary.iosPassed === true || typeof runtimeSummary.iosResidual === "string");
  const liveRpcOk =
    metaV3.owner === "backend" &&
    metaV3.payloadShapeVersion === "v3" &&
    metaV3.sourceVersion === "director_finance_panel_scope_v3";
  const summaryParityOk = Object.values(summaryParity).every((entry) => entry.match);

  const status =
    overlayRemoved && primaryScopeHardCutOk && runtimeGateOk && liveRpcOk && summaryParityOk
      ? "passed"
      : "failed";

  const artifact = {
    status,
    gate: status === "passed" ? "GREEN" : "NOT_GREEN",
    generatedAt: new Date().toISOString(),
    overlayRemoved,
    primaryScopeHardCutOk,
    runtimeGateOk,
    liveRpcOk,
    runtimeSummary,
    metaV3,
    summaryV2,
    summaryV3,
    summaryParity,
    supplierRowsV3: supplierRowsV3.length,
    rowsV2: rowsV2.length,
    rowsV3: rowsV3.length,
  };

  const summary = {
    status,
    gate: artifact.gate,
    overlayRemoved,
    primaryScopeHardCutOk,
    runtimeGateOk,
    liveRpcOk,
    summaryParityOk,
    supplierRowsV3: supplierRowsV3.length,
    rowsV2: rowsV2.length,
    rowsV3: rowsV3.length,
    metaV3,
  };

  writeJson(fullOutPath, artifact);
  writeJson(summaryOutPath, summary);

  if (status !== "passed") {
    throw new Error("director finance overlay cutover verify failed");
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  writeJson(fullOutPath, {
    status: "failed",
    gate: "NOT_GREEN",
    generatedAt: new Date().toISOString(),
    error: message,
  });
  writeJson(summaryOutPath, {
    status: "failed",
    gate: "NOT_GREEN",
    error: message,
  });
  console.error(message);
  process.exitCode = 1;
});
