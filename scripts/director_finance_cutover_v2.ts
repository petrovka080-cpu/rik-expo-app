import fs from "fs";
import path from "path";

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

const DUE_DAYS_DEFAULT = 7;
const CRITICAL_DAYS = 14;

type NumericParity = {
  left: number;
  right: number;
  delta: number;
  match: boolean;
};

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "director-finance-cutover-v2" } },
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const toFiniteNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const compareNumber = (left: unknown, right: unknown, epsilon = 0.001): NumericParity => {
  const safeA = toFiniteNumber(left);
  const safeB = toFiniteNumber(right);
  const delta = safeA - safeB;
  return {
    left: safeA,
    right: safeB,
    delta,
    match: Math.abs(delta) <= epsilon,
  };
};

async function main() {
  const { data, error } = await supabase.rpc("director_finance_panel_scope_v4", {
    p_object_id: null,
    p_date_from: null,
    p_date_to: null,
    p_due_days: DUE_DAYS_DEFAULT,
    p_critical_days: CRITICAL_DAYS,
    p_limit: 50,
    p_offset: 0,
  });
  if (error) throw error;

  const root = asRecord(data);
  const canonical = asRecord(root.canonical);
  const summary = asRecord(canonical.summary);
  const spend = asRecord(asRecord(canonical.spend).header);
  const suppliers = asArray(canonical.suppliers);
  const objects = asArray(canonical.objects);
  const spendKindRows = asArray(asRecord(canonical.spend).kindRows);
  const meta = asRecord(root.meta);

  const supplierApproved = suppliers.reduce((sum, row) => sum + toFiniteNumber(row.approvedTotal), 0);
  const supplierPaid = suppliers.reduce((sum, row) => sum + toFiniteNumber(row.paidTotal), 0);
  const supplierDebt = suppliers.reduce((sum, row) => sum + toFiniteNumber(row.debtTotal), 0);

  const summaryParity = {
    approved: compareNumber(summary.approvedTotal, supplierApproved),
    paid: compareNumber(summary.paidTotal, supplierPaid),
    debt: compareNumber(summary.debtTotal, supplierDebt),
    overdueCountPresent: Number.isFinite(toFiniteNumber(summary.overdueCount)),
    criticalCountPresent: Number.isFinite(toFiniteNumber(summary.criticalCount)),
  };

  const spendProof = {
    approved: toFiniteNumber(spend.approved),
    paid: toFiniteNumber(spend.paid),
    toPay: toFiniteNumber(spend.toPay),
    overpay: toFiniteNumber(spend.overpay),
    kindRows: spendKindRows.length,
  };

  const status =
    root.document_type === "director_finance_panel_scope" &&
    root.version === "v4" &&
    meta.owner === "backend" &&
    meta.sourceVersion === "director_finance_panel_scope_v4" &&
    Object.values(summaryParity)
      .filter((entry): entry is NumericParity => typeof entry === "object")
      .every((entry) => entry.match)
      ? "passed"
      : "failed";

  const artifact = {
    status,
    generatedAt: new Date().toISOString(),
    sourceMeta: {
      primaryOwner: "rpc_v4",
      sourceVersion: meta.sourceVersion,
      owner: meta.owner,
      payloadShapeVersion: meta.payloadShapeVersion,
      financeRowsSource: meta.financeRowsSource,
      spendRowsSource: meta.spendRowsSource,
    },
    canonical: {
      suppliers: suppliers.length,
      objects: objects.length,
      spendKindRows: spendKindRows.length,
    },
    summaryParity,
    spendProof,
  };

  const summaryOut = {
    status,
    primaryOwner: artifact.sourceMeta.primaryOwner,
    backendOwner: artifact.sourceMeta.owner,
    sourceVersion: artifact.sourceMeta.sourceVersion,
    supplierCount: suppliers.length,
    objectCount: objects.length,
    spendKindRows: spendKindRows.length,
    summaryParityOk: Object.values(summaryParity)
      .filter((entry): entry is NumericParity => typeof entry === "object")
      .every((entry) => entry.match),
  };

  const artifactsDir = path.join(process.cwd(), "artifacts");
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, "director-finance-cutover-v2.json"),
    JSON.stringify(artifact, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, "director-finance-cutover-v2.summary.json"),
    JSON.stringify(summaryOut, null, 2),
    "utf8",
  );

  console.log(JSON.stringify(summaryOut, null, 2));
  if (status !== "passed") {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
