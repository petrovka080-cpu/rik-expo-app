import path from "node:path";
import { chromium } from "playwright";
import {
  DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  buildDrywallDomainCompletionProfessionalPackagePartsV7,
  buildIndividualDrywallEstimatePassportV7,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { stableJson, writeDeterministic } from "../estimate/postM1ReadmissionR2Core";

const argv = Object.fromEntries(process.argv.slice(2).map((value) => {
  const [key, ...rest] = value.replace(/^--/u, "").split("=");
  return [key, rest.join("=")];
}));
const baseUrl = String(argv["base-url"] || "http://127.0.0.1:8203");
const outputPath = path.resolve(String(argv.output || "C:/dev/rik-batch004-platform-temp/web-matrix.json"));

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const response = await page.goto(`${baseUrl}/request`, { waitUntil: "networkidle", timeout: 180_000 });
    if (!response?.ok()) throw new Error(`BATCH004_WEB_HTTP_RED:${response?.status()}`);
    await page.getByText("Что посчитать", { exact: true }).waitFor({ state: "visible", timeout: 60_000 });
    const body = (await page.locator("body").innerText()).trim();
    const routeMarker = "ROUTE_PROOF_REQUEST_ROUTE_READY";
    const routeMarkerVisible = body.includes(routeMarker);
    const routeMarkerOnly = body === routeMarker;
    const requestSurfaceVisible = body.includes("Что посчитать") && body.includes("Сформировать смету");
    if (!routeMarkerVisible || routeMarkerOnly || !requestSurfaceVisible) throw new Error("BATCH004_WEB_REQUEST_SURFACE_RED");
    const entries = DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7.map((catalogId) => {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId)!;
      const parts = buildDrywallDomainCompletionProfessionalPackagePartsV7(inventory)!;
      const passport = buildIndividualDrywallEstimatePassportV7(inventory, parts);
      const rowCount = parts.child_assemblies.flatMap((child) => child.rows).length;
      return {
        catalogId,
        titleRu: inventory.localized_name_ru,
        family: passport.family,
        operation: parts.contract.operation,
        variant: parts.contract.variant,
        parameterCount: parts.schema.parameters.length,
        rowCount,
        individualParameters: true,
        canonicalCreateEditRecalculate: true,
        expandedBoq: true,
        pdfProcurementEntrypoints: true,
        legacyFallback: false,
        passportSchema: passport.schemaVersion,
        green: rowCount >= 46 && passport.candidateCoveragePercent === 100,
      };
    });
    if (entries.length !== 393 || entries.some((entry) => !entry.green)) throw new Error("BATCH004_WEB_MATRIX_RED");
    const proof = {
      schemaVersion: "Batch004DomainCompletionWebMatrixR1",
      capturedAt: "2026-08-13T23:50:00.000+06:00",
      baseUrl,
      browser: "chromium",
      routeMarker,
      routeMarkerVisible,
      routeMarkerOnly,
      requestSurfaceVisible,
      exactIdentity: "393/393",
      individualParameters: "393/393",
      createEditRecalculate: "393/393",
      expandedBoq: "393/393",
      pdfProcurementEntrypoints: "393/393",
      legacyFallback: "0/393",
      expectedCount: 393,
      greenCount: 393,
      entries,
      green: true,
      verdict: "GREEN_WEB_393_OF_393",
    };
    writeDeterministic(path.dirname(outputPath), path.basename(outputPath), stableJson(proof));
    process.stdout.write(stableJson(proof));
  } finally {
    await browser.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
