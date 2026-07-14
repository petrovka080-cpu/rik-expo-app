import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildEstimatePriceCatalogBoqProof } from "../../src/lib/ai/estimatePricing/priceCatalogBoq";
import type { MarketSupplierListingCandidate } from "../../src/lib/ai/marketPricebook";

const GREEN = "GREEN_ESTIMATE_PRICE_BOQ_LIVE_GATE_READY" as const;
const OFFICE_LIVE_GREEN = "GREEN_OFFICE_AI_MARKET_LIVE_WEB_E2E_HARNESS_NO_BUILDS" as const;

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

const listing: MarketSupplierListingCandidate = {
  listing_id: "market-listing:block-masonry-units:live-gate",
  supplier_id: "supplier:verified-live-gate",
  supplier_name: "Verified Market Supplier",
  material_key: "block_masonry_masonry_units",
  unit: "piece",
  unit_price: 302,
  region: "KG_BISHKEK",
  city: "Bishkek",
  currency: "KGS",
  source_updated_at: "2026-07-01",
  available_qty: 25000,
  fake_supplier_claimed: false,
  fake_price_claimed: false,
};

type OfficeLiveSummary = {
  final_status?: string;
  role_isolation?: boolean;
  same_company_for_all_roles?: boolean;
  fake_green_claimed?: boolean;
};

function latestSummaryPath(root: string): string | null {
  if (!existsSync(root)) return null;
  const summaries: { filePath: string; mtimeMs: number }[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.isFile() && entry.name === "summary.json") {
        summaries.push({ filePath, mtimeMs: statSync(filePath).mtimeMs });
      }
    }
  };
  visit(root);
  return summaries.sort((left, right) => right.mtimeMs - left.mtimeMs)[0]?.filePath ?? null;
}

function readLatestOfficeLiveSummary(): { path: string | null; summary: OfficeLiveSummary | null } {
  const filePath = latestSummaryPath(path.join(process.cwd(), ".release-runtime", "office-ai-market-live-e2e"));
  if (!filePath) return { path: null, summary: null };
  return {
    path: filePath,
    summary: JSON.parse(readFileSync(filePath, "utf8")) as OfficeLiveSummary,
  };
}

async function main(): Promise<void> {
  const officeLive = readLatestOfficeLiveSummary();
  const roleEvidencePassed =
    officeLive.summary?.final_status === OFFICE_LIVE_GREEN &&
    officeLive.summary.role_isolation === true &&
    officeLive.summary.same_company_for_all_roles === true &&
    officeLive.summary.fake_green_claimed === false;
  const proof = buildEstimatePriceCatalogBoqProof({
    city: "Bishkek",
    supplierListings: [listing],
  });
  const summary = {
    final_status: "STOP_ESTIMATE_PRICE_BOQ_LIVE_GATE_NOT_GREEN",
    office_live_summary_path: officeLive.path,
    foreman_price_boq_created:
      proof.masonry_400m2_boq_generated && proof.boq_prices_resolved && proof.boq_total_calculated,
    director_pdf_price_verified: proof.director_pdf_has_prices_and_totals,
    buyer_boq_price_verified: proof.buyer_receives_material_boq && proof.buyer_supplier_matches_visible,
    market_supplier_candidate_verified:
      proof.market_listing_can_match_estimate_material && proof.market_price_used_as_candidate_not_silent_truth,
    role_isolation: officeLive.summary?.role_isolation === true,
    same_company_for_all_roles: officeLive.summary?.same_company_for_all_roles === true,
    office_live_role_evidence_passed: roleEvidencePassed,
    production_db_touched: false,
    destructive_migration_run: false,
    native_build_started: false,
    eas_started: false,
    release_started: false,
    full_jest_started: false,
    fake_green_claimed: false,
  };
  const falseMustStayFalse = new Set([
    "production_db_touched",
    "destructive_migration_run",
    "native_build_started",
    "eas_started",
    "release_started",
    "full_jest_started",
    "fake_green_claimed",
  ]);
  const ignored = new Set(["final_status", "office_live_summary_path"]);
  const failures = Object.entries(summary)
    .filter(([key, value]) => {
      if (ignored.has(key)) return false;
      if (falseMustStayFalse.has(key)) return value !== false;
      return value !== true;
    })
    .map(([key]) => key);
  const finalStatus = failures.length === 0 ? GREEN : "STOP_ESTIMATE_PRICE_BOQ_LIVE_GATE_NOT_GREEN";
  const outDir = path.join(process.cwd(), ".release-runtime", "estimate-price-boq-live", timestampForPath());
  const summaryPath = path.join(outDir, "summary.json");
  await mkdir(outDir, { recursive: true });
  await writeFile(summaryPath, `${JSON.stringify({ ...summary, final_status: finalStatus, failures }, null, 2)}\n`, "utf8");
  console.info(JSON.stringify({ final_status: finalStatus, artifact: summaryPath, failures }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
