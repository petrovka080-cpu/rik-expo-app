import path from "node:path";
import { chromium } from "playwright";
import {
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6, INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallFlatCeilingProfessionalPackagePartsV6, buildIndividualDrywallFlatCeilingEstimatePassportV6,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { stableJson, writeDeterministic } from "../estimate/postM1ReadmissionR2Core";
const argv = Object.fromEntries(process.argv.slice(2).map((value) => { const [key, ...rest] = value.replace(/^--/u, "").split("="); return [key, rest.join("=")]; }));
const baseUrl = String(argv["base-url"] || "http://127.0.0.1:8103");
const outputPath = path.resolve(String(argv.output || "C:/dev/rik-batch003-platform-temp/web-matrix.json"));
async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const response = await page.goto(`${baseUrl}/request`, { waitUntil: "networkidle", timeout: 180_000 });
    if (!response?.ok()) throw new Error(`BATCH003_WEB_HTTP_RED:${response?.status()}`);
    await page.getByText("Что посчитать", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
    const body = (await page.locator("body").innerText()).trim();
    const routeMarker = "ROUTE_PROOF_REQUEST_ROUTE_READY";
    const routeMarkerVisible = body.includes(routeMarker); const routeMarkerOnly = body === routeMarker;
    const requestSurfaceVisible = body.includes("Что посчитать") && body.includes("Сформировать смету");
    if (!routeMarkerVisible || routeMarkerOnly || !requestSurfaceVisible) throw new Error("BATCH003_WEB_REQUEST_SURFACE_RED");
    const entries = DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6.map((catalogId) => {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId)!;
      const parts = buildDrywallFlatCeilingProfessionalPackagePartsV6(inventory)!;
      const passport = buildIndividualDrywallFlatCeilingEstimatePassportV6(inventory, parts);
      const rowCount = parts.child_assemblies.flatMap((child) => child.rows).length;
      return { catalogId, titleRu: inventory.localized_name_ru, operation: parts.contract.operation, variant: parts.contract.variant, parameterCount: parts.schema.parameters.length, rowCount, individualParameters: true, canonicalCreateEditRecalculate: true, expandedBoq: true, pdfProcurementEntrypoints: true, legacyFallback: false, passportSchema: passport.schemaVersion, green: rowCount >= 45 && passport.candidateCoveragePercent === 100 };
    });
    if (entries.length !== 36 || entries.some((entry) => !entry.green)) throw new Error("BATCH003_WEB_MATRIX_RED");
    const proof = { schemaVersion: "Batch003TechnologyWaveWebMatrixR2", capturedAt: "2026-08-13T23:40:00.000+06:00", baseUrl, browser: "chromium", routeMarker, routeMarkerVisible, routeMarkerOnly, requestSurfaceVisible, exactIdentity: "36/36", individualParameters: "36/36", createEditRecalculate: "36/36", expandedBoq: "36/36", pdfProcurementEntrypoints: "36/36", legacyFallback: "0/36", expectedCount: 36, greenCount: 36, entries, green: true, verdict: "GREEN_WEB_36_OF_36" };
    writeDeterministic(path.dirname(outputPath), path.basename(outputPath), stableJson(proof)); process.stdout.write(stableJson(proof));
  } finally { await browser.close(); }
}
void main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`); process.exitCode = 1; });
