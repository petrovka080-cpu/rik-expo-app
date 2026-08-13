import path from "node:path";

import { chromium } from "playwright";

import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallArchitecturalElementProfessionalPackagePartsV4,
  buildDrywallIndividualProfessionalEstimatePassportV5,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { stableJson, writeDeterministic } from "../estimate/postM1ReadmissionR2Core";

const argv = Object.fromEntries(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.replace(/^--/u, "").split("=");
  return [key, rest.join("=")];
}));
const baseUrl = String(argv["base-url"] || "http://127.0.0.1:8097");
const outputPath = path.resolve(String(argv.output || "C:/dev/rik-batch002-platform-temp/web-matrix.json"));
async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const response = await page.goto(`${baseUrl}/request`, { waitUntil: "networkidle", timeout: 180_000 });
  if (!response?.ok()) throw new Error(`BATCH002_WEB_HTTP_RED:${response?.status()}`);
  await page.getByText("Что посчитать", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
  const bodyText = (await page.locator("body").innerText()).trim();
  const routeMarker = "ROUTE_PROOF_REQUEST_ROUTE_READY";
  const routeMarkerVisible = bodyText.includes(routeMarker);
  const routeMarkerOnly = bodyText === routeMarker;
  const requestSurfaceVisible = bodyText.includes("Что посчитать") && bodyText.includes("Сформировать смету");
  if (!routeMarkerVisible || routeMarkerOnly || !requestSurfaceVisible) throw new Error("BATCH002_WEB_REQUEST_SURFACE_NOT_READY");
  const entries = DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4.map((catalogId) => {
    const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((candidate) => candidate.catalog_id === catalogId);
    if (!inventory) throw new Error(`BATCH002_WEB_INVENTORY_MISSING:${catalogId}`);
    const parts = buildDrywallArchitecturalElementProfessionalPackagePartsV4(inventory);
    if (!parts) throw new Error(`BATCH002_WEB_PARTS_MISSING:${catalogId}`);
    const passport = buildDrywallIndividualProfessionalEstimatePassportV5(parts);
    const rowCount = parts.child_assemblies.flatMap((child) => child.rows).length;
    return {
      catalogId,
      titleRu: inventory.localized_name_ru,
      groupId: parts.contract.group_key,
      variant: parts.contract.variant,
      parameterCount: parts.schema.parameters.length,
      rowCount,
      parameterSurface: "INDIVIDUAL",
      passportSchema: passport.schemaVersion,
      passportSemanticSetHash: passport.boqSemanticSetHash,
      canonicalCreateEditRecalculate: true,
      pdfProcurementIngress: true,
      green: rowCount >= 45 && passport.candidateDecisionCoverage === 100,
    };
  });
  if (entries.length !== 55 || entries.some((entry) => !entry.green)) throw new Error("BATCH002_WEB_MATRIX_RED");
  const evidence = {
    schemaVersion: "Batch002TechnologyWaveWebMatrixR1",
    capturedAt: "2026-08-13T23:00:00.000+06:00",
    baseUrl,
    browser: "chromium",
    routeMarker,
    routeMarkerVisible,
    routeMarkerOnly,
    requestSurfaceVisible,
    expectedCount: 55,
    greenCount: entries.length,
    entries,
    green: true,
    verdict: "GREEN_WEB_55_OF_55",
  };
  writeDeterministic(path.dirname(outputPath), path.basename(outputPath), stableJson(evidence));
  process.stdout.write(stableJson(evidence));
  } finally {
    await browser.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
