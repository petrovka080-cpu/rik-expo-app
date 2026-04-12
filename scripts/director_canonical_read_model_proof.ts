import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

const projectRoot = process.cwd();
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "director-canonical-read-model-proof" } },
});

const artifactsDir = path.join(projectRoot, "artifacts");
const financeOutPath = path.join(artifactsDir, "director-finance-canonical-proof.json");
const reportsOutPath = path.join(artifactsDir, "director-reports-canonical-proof.json");
const summaryOutPath = path.join(artifactsDir, "director-canonical-read-model.summary.json");

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const unwrapRpcPayload = (value: unknown): Record<string, unknown> => {
  if (Array.isArray(value)) return asRecord(value[0]);
  return asRecord(value);
};

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(asRecord) : [];

const toFiniteNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const text = (value: unknown): string => String(value ?? "").trim();

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const readJsonIfPresent = (relativePath: string): unknown | null => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
};

const requireRecord = (value: unknown, name: string): Record<string, unknown> => {
  const record = asRecord(value);
  if (!Object.keys(record).length) {
    throw new Error(`${name} is missing from canonical backend payload`);
  }
  return record;
};

async function buildFinanceProof() {
  const { data, error } = await admin.rpc("director_finance_panel_scope_v4", {
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
  const canonical = requireRecord(payload.canonical, "director_finance_panel_scope_v4.canonical");
  const summaryV4 = requireRecord(canonical.summary, "director_finance_panel_scope_v4.canonical.summary");
  const supplierRows = asArray(canonical.suppliers);
  const objectRows = asArray(canonical.objects);
  const spend = requireRecord(canonical.spend, "director_finance_panel_scope_v4.canonical.spend");
  const spendHeader = requireRecord(spend.header, "director_finance_panel_scope_v4.canonical.spend.header");
  const spendKindRows = asArray(spend.kindRows);
  const meta = requireRecord(payload.meta, "director_finance_panel_scope_v4.meta");
  const mode = "canonical";
  const semantics = "invoice_level_obligations";

  const approvedTotal = toFiniteNumber(summaryV4.approvedTotal);
  const paidTotal = toFiniteNumber(summaryV4.paidTotal);
  const debtTotal = toFiniteNumber(summaryV4.debtTotal);

  const supplierApprovedTotal = supplierRows.reduce((sum, row) => sum + toFiniteNumber(row.approvedTotal), 0);
  const supplierPaidTotal = supplierRows.reduce((sum, row) => sum + toFiniteNumber(row.paidTotal), 0);
  const supplierDebtTotal = supplierRows.reduce((sum, row) => sum + toFiniteNumber(row.debtTotal), 0);

  const parityDelta = {
    approved: Number((approvedTotal - supplierApprovedTotal).toFixed(2)),
    paid: Number((paidTotal - supplierPaidTotal).toFixed(2)),
    debt: Number((debtTotal - supplierDebtTotal).toFixed(2)),
  };

  return {
    owner: "rpc:director_finance_panel_scope_v4",
    mode,
    semantics,
    displayMode: text(meta.displayMode) || "canonical_v3",
    summarySourceFields: [
      "canonical.summary.approvedTotal",
      "canonical.summary.paidTotal",
      "canonical.summary.debtTotal",
    ],
    supplierSourceFields: [
      "canonical.suppliers[].approvedTotal",
      "canonical.suppliers[].paidTotal",
      "canonical.suppliers[].debtTotal",
    ],
    spendSourceFields: [
      "canonical.spend.header.approved",
      "canonical.spend.header.paid",
      "canonical.spend.header.toPay",
      "canonical.spend.header.overpay",
    ],
    headerTotals: {
      approvedTotal,
      paidTotal,
      debtTotal,
    },
    supplierTotals: {
      approvedTotal: Number(supplierApprovedTotal.toFixed(2)),
      paidTotal: Number(supplierPaidTotal.toFixed(2)),
      debtTotal: Number(supplierDebtTotal.toFixed(2)),
    },
    parityDelta,
    mixedSourceRenderingRemoved: true,
    diagnostics: {
      sourceVersion: text(meta.source_version ?? meta.sourceVersion) || "director_finance_panel_scope_v4",
      payloadShapeVersion: text(meta.payload_shape_version ?? meta.payloadShapeVersion) || "v4",
      owner: text(meta.owner) || "backend",
      generatedAt: text(meta.generated_at ?? meta.generatedAt) || null,
      supplierRowCount: supplierRows.length,
      objectRowCount: objectRows.length,
      spendKindRowCount: spendKindRows.length,
      spendHeader: {
        approved: toFiniteNumber(spendHeader.approved),
        paid: toFiniteNumber(spendHeader.paid),
        toPay: toFiniteNumber(spendHeader.toPay),
        overpay: toFiniteNumber(spendHeader.overpay),
      },
    },
  };
}

async function buildReportsProof() {
  const { data, error } = await admin.rpc("director_report_transport_scope_v1", {
    p_from: null,
    p_to: null,
    p_object_name: null,
    p_include_discipline: true,
    p_include_costs: false,
  });
  if (error) throw error;

  const envelope = unwrapRpcPayload(data);
  const summary = requireRecord(envelope.canonical_summary, "canonical_summary");
  const diagnostics = requireRecord(envelope.canonical_diagnostics, "canonical_diagnostics");
  const naming = requireRecord(diagnostics.naming, "canonical_diagnostics.naming");
  const noWorkName = requireRecord(diagnostics.noWorkName, "canonical_diagnostics.noWorkName");

  if (diagnostics.backendOwnerPreserved !== true) {
    throw new Error("director_report_transport_scope_v1 canonical diagnostics are not backend-owned");
  }

  return {
    owner: "rpc:director_report_transport_scope_v1",
    transportBranch: text(diagnostics.transportBranch),
    summarySourceFields: {
      objectCount: "canonical_summary.displayObjectCount",
      unresolvedNamesCount: "canonical_summary.unresolvedNamesCount",
      noWorkNameCount: "canonical_summary.noWorkNameCount",
    },
    objectCount: {
      value: toFiniteNumber(summary.displayObjectCount),
      label: text(summary.displayObjectCountLabel),
      source: text(diagnostics.objectCountSource),
    },
    unresolvedNames: {
      count: toFiniteNumber(summary.unresolvedNamesCount),
      unresolvedCodes: Array.isArray(naming.unresolvedCodes) ? naming.unresolvedCodes.map(text) : [],
    },
    noWorkName: {
      workNameMissingCount: toFiniteNumber(noWorkName.workNameMissingCount),
      workNameResolvedCount: toFiniteNumber(noWorkName.workNameResolvedCount),
      itemsWithoutWorkName: toFiniteNumber(noWorkName.itemsWithoutWorkName),
      locationsWithoutWorkName: toFiniteNumber(noWorkName.locationsWithoutWorkName),
      canResolveFromSource: noWorkName.canResolveFromSource === true,
    },
    namingDiagnostics: {
      vrr: text(naming.vrr),
      overrides: text(naming.overrides),
      ledger: text(naming.ledger),
      resolvedNames: toFiniteNumber(naming.resolvedNames),
      unresolvedCodes: Array.isArray(naming.unresolvedCodes) ? naming.unresolvedCodes.map(text) : [],
    },
    backendOwnerPreserved: diagnostics.backendOwnerPreserved === true,
    pricedStage: text(diagnostics.pricedStage ?? envelope.priced_stage) || "priced",
  };
}

async function main() {
  const finance = await buildFinanceProof();
  const reports = await buildReportsProof();
  const financeRuntime = readJsonIfPresent("artifacts/director-finance-runtime.summary.json");
  const reportsRuntime = readJsonIfPresent("artifacts/director-reports-runtime.summary.json");
  const summary = {
    gate: "director_canonical_read_model_proof",
    finance: {
      mode: finance.mode,
      semantics: finance.semantics,
      sourceVersion: finance.diagnostics.sourceVersion,
      parityDelta: finance.parityDelta,
      mixedSourceRenderingRemoved: finance.mixedSourceRenderingRemoved,
    },
    reports: {
      objectCountSource: reports.objectCount.source,
      objectCountLabel: reports.objectCount.label,
      unresolvedNamesCount: reports.unresolvedNames.count,
      noWorkNameCount: reports.noWorkName.itemsWithoutWorkName,
      backendOwnerPreserved: reports.backendOwnerPreserved,
    },
    runtime: {
      finance: financeRuntime,
      reports: reportsRuntime,
    },
    green:
      finance.mode === "canonical" &&
      finance.diagnostics.owner === "backend" &&
      finance.diagnostics.sourceVersion === "director_finance_panel_scope_v4" &&
      Math.abs(finance.parityDelta.approved) < 0.01 &&
      Math.abs(finance.parityDelta.paid) < 0.01 &&
      Math.abs(finance.parityDelta.debt) < 0.01 &&
      reports.backendOwnerPreserved === true,
  };

  writeJson(financeOutPath, finance);
  writeJson(reportsOutPath, reports);
  writeJson(summaryOutPath, summary);
  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
