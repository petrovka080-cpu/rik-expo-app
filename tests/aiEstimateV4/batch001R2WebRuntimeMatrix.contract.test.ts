import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import {
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 as BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { batch001ParamOverrides } from "./batch001R2TestSupport";

describe("BATCH001 R2 Web runtime matrix", () => {
  test("the platform-neutral production runtime compiles exact identities and editable BOQs for 16/16", () => {
    const runtime = createAiEstimateRuntime();
    const matrix = BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3.map((catalogId) => {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId)!;
      const revision = runtime.createDraft({
        estimateDraftId: `batch001-web-${catalogId}`,
        rawInput: inventory.localized_name_ru,
        selectedTemplateId: `domain-passport:${catalogId}:v1`,
        selectedWorkKey: inventory.work_key,
        city: "Bishkek",
        currency: "KGS",
        countryCode: "KG",
        paramOverrides: batch001ParamOverrides(catalogId),
        createdAt: "2026-08-13T06:00:00.000Z",
      }).revision;
      return {
        catalogId,
        requestedCatalogId: revision.resolvedIdentity?.requestedCatalogWorkId,
        professionalWorkId: revision.professionalWorkId,
        rows: revision.boq.rows.length,
        missing: revision.missingInputs.length,
        formulas: revision.boq.rows.filter((row) => row.sourceParameters?.formulaGraphV3).length,
        priceRoutes: revision.boq.rows.filter((row) => row.sourceParameters?.priceRouteV3).length,
      };
    });
    expect(matrix).toHaveLength(16);
    expect(matrix.every((item) =>
      item.requestedCatalogId === item.catalogId &&
      item.professionalWorkId != null &&
      item.rows > 11 &&
      item.missing === 0 &&
      item.formulas === item.rows &&
      item.priceRoutes === item.rows,
    )).toBe(true);
  });
});
