import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });

type JsonRecord = Record<string, unknown>;
type JsonArray = JsonRecord[];

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");
const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const supabaseKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const phase = String(process.argv[2] ?? "after").trim().toLowerCase();

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

if (!["baseline", "after", "compare"].includes(phase)) {
  throw new Error(`Unsupported phase: ${phase}`);
}

const admin = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": `s6-director-finance-supplier-scope-${phase}` } },
});

const asRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};

const asArray = (value: unknown): JsonArray =>
  Array.isArray(value) ? value.map((entry) => asRecord(entry)) : [];

const text = (value: unknown): string => String(value ?? "").trim();
const nnum = (value: unknown): number => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
};

const median = (values: number[]): number => {
  const list = [...values].sort((a, b) => a - b);
  const mid = Math.floor(list.length / 2);
  if (!list.length) return 0;
  if (list.length % 2 === 0) return (list[mid - 1] + list[mid]) / 2;
  return list[mid];
};

const writeJson = (relativePath: string, payload: unknown) => {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(projectRoot, relativePath), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

function invoiceSignature(rows: JsonArray): string[] {
  return rows.map((row) =>
    [
      text(row.id),
      nnum(row.amount).toFixed(2),
      nnum(row.paid).toFixed(2),
      nnum(row.rest).toFixed(2),
      String(Boolean(row.isOverdue)),
      String(Boolean(row.isCritical)),
      text(row.approvedIso),
      text(row.invoiceIso),
      text(row.dueIso),
    ].join("|"),
  );
}

async function rpc(name: string, args: JsonRecord): Promise<JsonRecord> {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new Error(`${name} failed: ${error.message}`);
  return asRecord(data);
}

async function pickScenario(): Promise<{ supplier: string; kindName: string | null }> {
  const { data, error } = await admin
    .from("finance_proposal_summary_v1")
    .select("supplier_name, approved_date")
    .not("supplier_name", "is", null)
    .order("approved_date", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw new Error(`finance_proposal_summary_v1 sample failed: ${error.message}`);

  const bySupplier = new Map<string, number>();
  for (const row of asArray(data)) {
    const supplier = text(row.supplier_name);
    if (!supplier) continue;
    bySupplier.set(supplier, (bySupplier.get(supplier) ?? 0) + 1);
  }

  const rankedSuppliers = [...bySupplier.entries()].sort((a, b) => b[1] - a[1]);
  if (!rankedSuppliers.length) {
    throw new Error("No supplier sample available in finance_proposal_summary_v1");
  }

  for (const [supplier] of rankedSuppliers) {
    const spendProbe = await admin
      .from("v_director_finance_spend_kinds_v3")
      .select("kind_name")
      .eq("supplier", supplier)
      .not("kind_name", "is", null)
      .limit(20);
    if (spendProbe.error) {
      throw new Error(`v_director_finance_spend_kinds_v3 sample failed: ${spendProbe.error.message}`);
    }
    const firstKind = asArray(spendProbe.data)
      .map((row) => text(row.kind_name))
      .find(Boolean) || null;
    return { supplier, kindName: firstKind };
  }

  return { supplier: rankedSuppliers[0][0], kindName: null };
}

async function measureScenario(args: JsonRecord) {
  const durationsMs: number[] = [];
  let lastPayload: JsonRecord = {};
  for (let index = 0; index < 3; index += 1) {
    const startedAt = Date.now();
    lastPayload = await rpc("director_finance_supplier_scope_v2", args);
    durationsMs.push(Date.now() - startedAt);
  }
  return {
    durationsMs,
    medianMs: median(durationsMs),
    maxMs: Math.max(...durationsMs),
    invoiceCount: asArray(lastPayload.invoices).length,
    payloadBytes: JSON.stringify(lastPayload).length,
    meta: asRecord(lastPayload.meta),
    payload: lastPayload,
  };
}

async function computeExpectedOverpayment(args: JsonRecord): Promise<number> {
  let query = admin
    .from("v_director_finance_spend_kinds_v3")
    .select("overpay_alloc")
    .eq("supplier", text(args.p_supplier));

  if (text(args.p_kind_name)) {
    query = query.eq("kind_name", text(args.p_kind_name));
  }
  if (text(args.p_from)) {
    query = query.gte("director_approved_at", `${text(args.p_from)}T00:00:00.000Z`);
  }
  if (text(args.p_to)) {
    query = query.lte("director_approved_at", `${text(args.p_to)}T23:59:59.999Z`);
  }

  const { data, error } = await query.limit(5000);
  if (error) throw new Error(`overpayment probe failed: ${error.message}`);
  return asArray(data).reduce((sum, row) => sum + nnum(row.overpay_alloc), 0);
}

function compareV1Parity(v2: JsonRecord, v1: JsonRecord) {
  const v2Invoices = invoiceSignature(asArray(v2.invoices));
  const v1Invoices = invoiceSignature(asArray(v1.invoices));
  return {
    amountMatch: nnum(v2.amount) === nnum(v1.amount),
    countMatch: nnum(v2.count) === nnum(v1.count),
    approvedMatch: nnum(v2.approved) === nnum(v1.approved),
    paidMatch: nnum(v2.paid) === nnum(v1.paid),
    toPayMatch: nnum(v2.toPay) === nnum(v1.toPay),
    overdueCountMatch: nnum(v2.overdueCount) === nnum(v1.overdueCount),
    criticalCountMatch: nnum(v2.criticalCount) === nnum(v1.criticalCount),
    invoiceSignatureMatch: JSON.stringify(v2Invoices) === JSON.stringify(v1Invoices),
    invoiceCount: v2Invoices.length,
  };
}

async function runPhase(currentPhase: "baseline" | "after") {
  const scenario = await pickScenario();
  const supplierArgs = {
    p_supplier: scenario.supplier,
    p_kind_name: null,
    p_object_id: null,
    p_from: null,
    p_to: null,
    p_due_days: 7,
    p_critical_days: 14,
  };
  const kindArgs = {
    ...supplierArgs,
    p_kind_name: scenario.kindName,
  };
  const customDueArgs = {
    ...supplierArgs,
    p_due_days: 10,
  };

  const supplierOnly = await measureScenario(supplierArgs);
  const kindFiltered = scenario.kindName ? await measureScenario(kindArgs) : null;
  const customDue = await measureScenario(customDueArgs);

  const legacySupplier = await rpc("director_finance_supplier_scope_v1", {
    p_supplier: supplierArgs.p_supplier,
    p_kind_name: supplierArgs.p_kind_name,
    p_from: supplierArgs.p_from,
    p_to: supplierArgs.p_to,
    p_due_days: supplierArgs.p_due_days,
    p_critical_days: supplierArgs.p_critical_days,
  });
  const legacyCustomDue = await rpc("director_finance_supplier_scope_v1", {
    p_supplier: customDueArgs.p_supplier,
    p_kind_name: customDueArgs.p_kind_name,
    p_from: customDueArgs.p_from,
    p_to: customDueArgs.p_to,
    p_due_days: customDueArgs.p_due_days,
    p_critical_days: customDueArgs.p_critical_days,
  });

  const expectedSupplierOverpayment = await computeExpectedOverpayment(supplierArgs);
  const expectedKindOverpayment = scenario.kindName ? await computeExpectedOverpayment(kindArgs) : null;

  const artifact = {
    phase: currentPhase,
    generatedAt: new Date().toISOString(),
    target: supabaseUrl,
    scenario,
    supplierOnly: {
      durationsMs: supplierOnly.durationsMs,
      medianMs: supplierOnly.medianMs,
      maxMs: supplierOnly.maxMs,
      invoiceCount: supplierOnly.invoiceCount,
      payloadBytes: supplierOnly.payloadBytes,
      meta: supplierOnly.meta,
      parityToV1: compareV1Parity(supplierOnly.payload, legacySupplier),
      expectedOverpayment: expectedSupplierOverpayment,
      overpaymentMatches: Math.abs(nnum(supplierOnly.payload.overpayment) - expectedSupplierOverpayment) <= 0.001,
    },
    kindFiltered: kindFiltered
      ? {
          durationsMs: kindFiltered.durationsMs,
          medianMs: kindFiltered.medianMs,
          maxMs: kindFiltered.maxMs,
          invoiceCount: kindFiltered.invoiceCount,
          payloadBytes: kindFiltered.payloadBytes,
          meta: kindFiltered.meta,
          parityToV1: compareV1Parity(
            kindFiltered.payload,
            await rpc("director_finance_supplier_scope_v1", {
              p_supplier: kindArgs.p_supplier,
              p_kind_name: kindArgs.p_kind_name,
              p_from: kindArgs.p_from,
              p_to: kindArgs.p_to,
              p_due_days: kindArgs.p_due_days,
              p_critical_days: kindArgs.p_critical_days,
            }),
          ),
          expectedOverpayment: expectedKindOverpayment,
          overpaymentMatches:
            expectedKindOverpayment == null
              ? true
              : Math.abs(nnum(kindFiltered.payload.overpayment) - expectedKindOverpayment) <= 0.001,
        }
      : null,
    customDueFallback: {
      durationsMs: customDue.durationsMs,
      medianMs: customDue.medianMs,
      maxMs: customDue.maxMs,
      meta: customDue.meta,
      parityToV1: compareV1Parity(customDue.payload, legacyCustomDue),
      financeRowsSource: text(customDue.meta.financeRowsSource),
      pathOwner: text(customDue.meta.pathOwner),
    },
  };

  const outPath =
    currentPhase === "baseline"
      ? "artifacts/S6_director_finance_supplier_scope_baseline.json"
      : "artifacts/S6_director_finance_supplier_scope_after.json";
  writeJson(outPath, artifact);
  console.log(JSON.stringify(artifact, null, 2));
}

function runCompare() {
  const baselinePath = path.join(projectRoot, "artifacts/S6_director_finance_supplier_scope_baseline.json");
  const afterPath = path.join(projectRoot, "artifacts/S6_director_finance_supplier_scope_after.json");
  if (!fs.existsSync(baselinePath) || !fs.existsSync(afterPath)) {
    throw new Error("Missing baseline or after artifact for compare phase");
  }

  const baseline = asRecord(JSON.parse(fs.readFileSync(baselinePath, "utf8")));
  const after = asRecord(JSON.parse(fs.readFileSync(afterPath, "utf8")));
  const baselineSupplier = asRecord(baseline.supplierOnly);
  const afterSupplier = asRecord(after.supplierOnly);
  const baselineKind = asRecord(after.kindFiltered ? baseline.kindFiltered : {});
  const afterKind = asRecord(after.kindFiltered);
  const customDue = asRecord(after.customDueFallback);

  const compareArtifact = {
    generatedAt: new Date().toISOString(),
    target: supabaseUrl,
    scenario: asRecord(after.scenario),
    supplierOnly: {
      baselineMedianMs: nnum(baselineSupplier.medianMs),
      afterMedianMs: nnum(afterSupplier.medianMs),
      baselineMaxMs: nnum(baselineSupplier.maxMs),
      afterMaxMs: nnum(afterSupplier.maxMs),
      medianImprovementMs: nnum(baselineSupplier.medianMs) - nnum(afterSupplier.medianMs),
      maxImprovementMs: nnum(baselineSupplier.maxMs) - nnum(afterSupplier.maxMs),
      baselineMeta: asRecord(baselineSupplier.meta),
      afterMeta: asRecord(afterSupplier.meta),
      parityToV1: asRecord(afterSupplier.parityToV1),
      overpaymentMatches: afterSupplier.overpaymentMatches === true,
    },
    kindFiltered:
      Object.keys(afterKind).length > 0
        ? {
            baselineMedianMs: nnum(baselineKind.medianMs),
            afterMedianMs: nnum(afterKind.medianMs),
            baselineMaxMs: nnum(baselineKind.maxMs),
            afterMaxMs: nnum(afterKind.maxMs),
            medianImprovementMs: nnum(baselineKind.medianMs) - nnum(afterKind.medianMs),
            maxImprovementMs: nnum(baselineKind.maxMs) - nnum(afterKind.maxMs),
            baselineMeta: asRecord(baselineKind.meta),
            afterMeta: asRecord(afterKind.meta),
            parityToV1: asRecord(afterKind.parityToV1),
            overpaymentMatches: afterKind.overpaymentMatches === true,
          }
        : null,
    customDueFallback: {
      financeRowsSource: text(customDue.financeRowsSource),
      pathOwner: text(customDue.pathOwner),
      parityToV1: asRecord(customDue.parityToV1),
    },
  };

  writeJson("artifacts/S6_director_finance_supplier_scope_compare.json", compareArtifact);
  console.log(JSON.stringify(compareArtifact, null, 2));
}

if (phase === "compare") {
  runCompare();
} else {
  void runPhase(phase as "baseline" | "after").catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
