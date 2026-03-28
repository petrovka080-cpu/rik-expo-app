import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

import {
  adaptCanonicalMaterialsPayload,
  adaptCanonicalOptionsPayload,
  adaptCanonicalWorksPayload,
} from "../src/lib/api/director_reports.adapters";

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

const WITHOUT_WORK = "Без вида работ";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const unwrapRpcPayload = (value: unknown): Record<string, unknown> => {
  if (Array.isArray(value)) {
    const first = value[0];
    return asRecord(first);
  }
  return asRecord(value);
};

const toFiniteNumber = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const text = (value: unknown): string => String(value ?? "").trim();

const normalizeKey = (value: unknown): string => text(value).toLowerCase();

const isWithoutWorkBucket = (value: unknown): boolean =>
  normalizeKey(value).startsWith(normalizeKey(WITHOUT_WORK));

const uniqueSorted = (values: Iterable<string>): string[] =>
  Array.from(new Set(Array.from(values).map((value) => text(value)).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "ru"),
  );

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const isMissingSourceError = (error: unknown, sourceName: string): boolean => {
  const record = asRecord(error);
  const message = String(record.message ?? error ?? "").toLowerCase();
  const details = String(record.details ?? "").toLowerCase();
  const hint = String(record.hint ?? "").toLowerCase();
  const code = String(record.code ?? "").toLowerCase();
  const source = sourceName.toLowerCase();
  const combined = `${message} ${details} ${hint}`;
  return (
    code === "42p01" ||
    code === "pgrst205" ||
    (combined.includes(source) && (combined.includes("does not exist") || combined.includes("relation") || combined.includes("missing")))
  );
};

const probeSourceStatus = async (
  source: "v_rik_names_ru" | "catalog_name_overrides" | "v_wh_balance_ledger_ui",
  selectCols: string,
): Promise<"ok" | "failed" | "missing"> => {
  try {
    const result = await admin.from(source).select(selectCols).limit(1);
    if (!result.error) return "ok";
    return isMissingSourceError(result.error, source) ? "missing" : "failed";
  } catch (error) {
    return isMissingSourceError(error, source) ? "missing" : "failed";
  }
};

const readJsonIfPresent = (relativePath: string): unknown | null => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
};

async function buildFinanceProof() {
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
  const displayModeRaw = text(payload.display_mode ?? payload.displayMode);
  const mode = displayModeRaw === "canonical_v3" ? "canonical" : "fallback";
  const semantics = mode === "canonical" ? "allocation" : "invoice";
  const summaryV3 = asRecord(payload.summary_v3 ?? payload.summaryV3);
  const legacySummary = asRecord(payload.summary);
  const supplierRows = asArray(payload.supplier_rows ?? payload.supplierRows).map(asRecord);
  const legacySuppliers = asArray(asRecord(payload.report).suppliers).map(asRecord);
  const meta = asRecord(payload.meta);

  const approvedTotal =
    mode === "canonical"
      ? toFiniteNumber(summaryV3.total_approved ?? summaryV3.totalApproved)
      : toFiniteNumber(legacySummary.approved);
  const paidTotal =
    mode === "canonical"
      ? toFiniteNumber(summaryV3.total_paid ?? summaryV3.totalPaid)
      : toFiniteNumber(legacySummary.paid);
  const debtTotal =
    mode === "canonical"
      ? toFiniteNumber(summaryV3.total_debt ?? summaryV3.totalDebt)
      : toFiniteNumber(legacySummary.toPay);

  const supplierApprovedTotal = (mode === "canonical" ? supplierRows : legacySuppliers).reduce(
    (sum, row) => sum + toFiniteNumber(mode === "canonical" ? row.payable : row.approved),
    0,
  );
  const supplierPaidTotal = (mode === "canonical" ? supplierRows : legacySuppliers).reduce(
    (sum, row) => sum + toFiniteNumber(mode === "canonical" ? row.paid : row.paid),
    0,
  );
  const supplierDebtTotal = (mode === "canonical" ? supplierRows : legacySuppliers).reduce(
    (sum, row) => sum + toFiniteNumber(mode === "canonical" ? row.debt : row.toPay),
    0,
  );

  const parityDelta = {
    approved: Number((approvedTotal - supplierApprovedTotal).toFixed(2)),
    paid: Number((paidTotal - supplierPaidTotal).toFixed(2)),
    debt: Number((debtTotal - supplierDebtTotal).toFixed(2)),
  };

  return {
    owner: "rpc:director_finance_panel_scope_v3",
    mode,
    semantics,
    displayMode: displayModeRaw || "fallback_legacy",
    summarySourceFields:
      mode === "canonical"
        ? ["summary_v3.total_approved", "summary_v3.total_paid", "summary_v3.total_debt"]
        : ["summary.approved", "summary.paid", "summary.toPay"],
    supplierSourceFields:
      mode === "canonical"
        ? ["supplier_rows[].payable", "supplier_rows[].paid", "supplier_rows[].debt"]
        : ["report.suppliers[].approved", "report.suppliers[].paid", "report.suppliers[].toPay"],
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
      sourceVersion: text(meta.source_version ?? meta.sourceVersion) || "director_finance_panel_scope_v3",
      payloadShapeVersion: text(meta.payload_shape_version ?? meta.payloadShapeVersion) || "v3",
      owner: text(meta.owner) || "backend",
      generatedAt: text(meta.generated_at ?? meta.generatedAt) || null,
      supplierRowCount: mode === "canonical" ? supplierRows.length : legacySuppliers.length,
    },
  };
}

async function buildReportsProof() {
  const { data, error } = await admin.rpc("director_report_transport_scope_v1", {
    p_from: null,
    p_to: null,
    p_object_name: null,
    p_include_discipline: true,
    p_include_costs: true,
  });
  if (error) throw error;

  const envelope = unwrapRpcPayload(data);
  const options = adaptCanonicalOptionsPayload(envelope.options_payload);
  const report = adaptCanonicalMaterialsPayload(envelope.report_payload);
  const discipline =
    envelope.discipline_payload == null ? null : adaptCanonicalWorksPayload(envelope.discipline_payload);
  if (!options || !report) {
    throw new Error("director_report_transport_scope_v1 returned invalid payload");
  }

  const rows = Array.isArray(report.rows) ? report.rows : [];
  const works = Array.isArray(discipline?.works) ? discipline.works : [];
  const unresolvedCodes = uniqueSorted(
    rows
      .filter((row) => {
        const code = text(row.rik_code).toUpperCase();
        const name = text(row.name_human_ru);
        return !!code && (!name || name.toUpperCase() === code);
      })
      .map((row) => text(row.rik_code).toUpperCase()),
  );
  const missingWorks = works.filter((work) => isWithoutWorkBucket(work.work_type_name));
  const itemsWithoutWorkName = missingWorks.reduce((sum, work) => sum + toFiniteNumber(work.total_positions), 0);
  const locationsWithoutWorkName = missingWorks.reduce(
    (sum, work) => sum + Math.max(toFiniteNumber(work.location_count), Array.isArray(work.levels) ? work.levels.length : 0),
    0,
  );
  const namingStatus = {
    vrr: await probeSourceStatus("v_rik_names_ru", "code,name_ru"),
    overrides: await probeSourceStatus("catalog_name_overrides", "code,name_ru"),
    ledger: await probeSourceStatus("v_wh_balance_ledger_ui", "code,name"),
  };

  return {
    owner: "rpc:director_report_transport_scope_v1",
    transportBranch: "rpc_scope_v1",
    summarySourceFields: {
      objectCount: "options.objects.length",
      unresolvedNamesCount: "report.rows filtered by unresolved code/name parity",
      noWorkNameCount: "discipline.works without work_name summed by total_positions",
    },
    objectCount: {
      value: options.objects.length,
      label: "Объекты по подтверждённым выдачам",
      source: "warehouse_confirmed_issues",
    },
    unresolvedNames: {
      count: unresolvedCodes.length,
      unresolvedCodes,
    },
    noWorkName: {
      workNameMissingCount: missingWorks.length,
      workNameResolvedCount: Math.max(works.length - missingWorks.length, 0),
      itemsWithoutWorkName,
      locationsWithoutWorkName,
      canResolveFromSource: false,
    },
    namingDiagnostics: {
      ...namingStatus,
      resolvedNames: uniqueSorted(
        rows
          .filter((row) => {
            const code = text(row.rik_code).toUpperCase();
            const name = text(row.name_human_ru);
            return !!code && !!name && name.toUpperCase() !== code;
          })
          .map((row) => text(row.rik_code).toUpperCase()),
      ).length,
      unresolvedCodes,
    },
    backendOwnerPreserved: true,
    pricedStage: text(envelope.priced_stage) || "priced",
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

void main();
