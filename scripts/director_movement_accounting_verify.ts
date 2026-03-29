import fs from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";

type GlobalDevFlag = typeof globalThis & { __DEV__?: boolean };

loadDotenv({ path: ".env.local", override: false });
loadDotenv({ path: ".env", override: false });
(globalThis as GlobalDevFlag).__DEV__ = false;

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");
const summaryPath = path.join(artifactsDir, "director-movement-accounting-summary.json");
const proofPath = path.join(artifactsDir, "director-movement-accounting-runtime-proof.json");
const priceScopePath = path.join(artifactsDir, "director-issue-price-scope-proof.json");

const supabaseUrl = String(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

if (!supabaseUrl || !serviceKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { "x-client-info": "director-movement-accounting-verify" } },
});

const writeJson = (fullPath: string, payload: unknown) => {
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const countLevels = (works: Array<{ levels?: unknown[] }> | null | undefined) =>
  (works ?? []).reduce((sum, work) => sum + (Array.isArray(work.levels) ? work.levels.length : 0), 0);

const countMaterials = (works: Array<{ levels?: Array<{ materials?: unknown[] }> }> | null | undefined) =>
  (works ?? []).reduce(
    (sum, work) =>
      sum +
      (Array.isArray(work.levels)
        ? work.levels.reduce(
            (levelSum, level) => levelSum + (Array.isArray(level.materials) ? level.materials.length : 0),
            0,
          )
        : 0),
    0,
  );

const sumMaterialAmounts = (
  works: Array<{
    levels?: Array<{
      materials?: Array<{ amount_sum?: number | null }>;
    }>;
  }>,
) =>
  works.reduce(
    (sum, work) =>
      sum +
      (Array.isArray(work.levels)
        ? work.levels.reduce(
            (levelSum, level) =>
              levelSum +
              (Array.isArray(level.materials)
                ? level.materials.reduce(
                    (materialSum, material) => materialSum + Number(material.amount_sum ?? 0),
                    0,
                  )
                : 0),
            0,
          )
        : 0),
    0,
  );

async function main() {
  const { loadDirectorReportTransportScope } = await import("../src/lib/api/directorReportsTransport.service");

  const transportScope = await loadDirectorReportTransportScope({
    from: "",
    to: "",
    objectName: null,
    includeDiscipline: true,
    skipDisciplinePrices: false,
    bypassCache: true,
  });

  const works = transportScope.discipline?.works ?? [];
  const levelsCount = countLevels(works);
  const materialsCount = countMaterials(works);
  const issueCostTotal = Number(transportScope.discipline?.summary.issue_cost_total ?? 0);
  const purchaseCostTotal = Number(transportScope.discipline?.summary.purchase_cost_total ?? 0);
  const unpricedIssuePct = Number(transportScope.discipline?.summary.unpriced_issue_pct ?? 0);
  const totalPositions = Number(transportScope.discipline?.summary.total_positions ?? 0);
  const withoutWorkPositions = works
    .filter((work) => String(work.work_type_name ?? "").trim().startsWith("Без вида работ"))
    .reduce((sum, work) => sum + Number(work.total_positions ?? 0), 0);
  const materialAmountSum = sumMaterialAmounts(works);
  const amountParityDelta = Math.abs(materialAmountSum - issueCostTotal);

  const sampleCodes = Array.from(
    new Set(
      works
        .flatMap((work) => work.levels ?? [])
        .flatMap((level) => level.materials ?? [])
        .map((material) => String(material.rik_code ?? "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ).slice(0, 20);

  const { data: priceScopeRows, error: priceScopeError } = await admin.rpc("director_report_fetch_issue_price_scope_v1", {
    p_request_item_ids: null,
    p_codes: sampleCodes.length ? sampleCodes : null,
    p_skip_purchase_items: false,
  });
  if (priceScopeError) throw priceScopeError;

  const pricedRows = Array.isArray(priceScopeRows)
    ? priceScopeRows.filter((row) => Number((row as Record<string, unknown>).unit_price ?? 0) > 0)
    : [];
  const pricedCodes = new Set(
    pricedRows
      .map((row) => String((row as Record<string, unknown>).rik_code ?? "").trim().toUpperCase())
      .filter(Boolean),
  );

  const proof = {
    gate: "director_movement_accounting_verify",
    transport: {
      source: transportScope.source,
      branch: transportScope.branchMeta.transportBranch,
      fallbackReason: transportScope.branchMeta.fallbackReason ?? null,
      pricedStage: transportScope.branchMeta.pricedStage ?? null,
    },
    counts: {
      works: works.length,
      levels: levelsCount,
      materials: materialsCount,
      totalPositions,
      withoutWorkPositions,
    },
    cost: {
      issueCostTotal,
      purchaseCostTotal,
      unpricedIssuePct,
      materialAmountSum,
      amountParityDelta,
    },
    priceScope: {
      requestedCodeCount: sampleCodes.length,
      returnedRowCount: Array.isArray(priceScopeRows) ? priceScopeRows.length : 0,
      pricedRowCount: pricedRows.length,
      pricedCodeCount: pricedCodes.size,
      sample: pricedRows.slice(0, 10),
    },
  };

  const green =
    transportScope.branchMeta.transportBranch === "rpc_scope_v1" &&
    (transportScope.branchMeta.pricedStage ?? null) === "priced" &&
    works.length > 0 &&
    levelsCount > 0 &&
    materialsCount > 0 &&
    totalPositions > 0 &&
    issueCostTotal > 0 &&
    amountParityDelta < 0.01 &&
    withoutWorkPositions < totalPositions &&
    pricedCodes.size > 0;

  const summary = {
    gate: "director_movement_accounting_verify",
    status: green ? "GREEN" : "NOT GREEN",
    transportBranch: transportScope.branchMeta.transportBranch,
    pricedStage: transportScope.branchMeta.pricedStage ?? null,
    issueCostTotal,
    purchaseCostTotal,
    unpricedIssuePct,
    works: works.length,
    levels: levelsCount,
    materials: materialsCount,
    withoutWorkPositions,
    totalPositions,
    amountParityDelta,
    pricedCodeCount: pricedCodes.size,
  };

  writeJson(proofPath, { ...proof, status: summary.status });
  writeJson(priceScopePath, {
    gate: "director_movement_accounting_verify",
    requestedCodeCount: sampleCodes.length,
    returnedRowCount: Array.isArray(priceScopeRows) ? priceScopeRows.length : 0,
    pricedCodeCount: pricedCodes.size,
    sampleCodes,
    sampleRows: pricedRows.slice(0, 20),
    status: summary.status,
  });
  writeJson(summaryPath, summary);

  console.log(JSON.stringify(summary, null, 2));
  if (!green) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
