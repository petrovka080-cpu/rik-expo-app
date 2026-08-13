import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 as BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3, INTERIOR_FINISHES_DOMAIN_INVENTORY } from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { batch001ParamOverrides } from "./batch001R2TestSupport";

describe("BATCH001 R2 durable history all works", () => {
  test.each(BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3)(
    "round-trips and immutably revises %s",
    (catalogId) => {
    const runtime = createAiEstimateRuntime();
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId)!;
      const revision = runtime.createDraft({
        estimateDraftId: `batch001-durable-${catalogId}`,
        rawInput: inventory.localized_name_ru,
        selectedTemplateId: `domain-passport:${catalogId}:v1`,
        selectedWorkKey: inventory.work_key,
        city: "Bishkek",
        currency: "KGS",
        countryCode: "KG",
        paramOverrides: batch001ParamOverrides(catalogId),
        createdAt: "2026-08-13T06:00:00.000Z",
      }).revision;
      expect(revision.missingInputs).toEqual([]);
      expect(revision.resolvedIdentity?.requestedCatalogWorkId).toBe(catalogId);
      expect(revision.boq.rows.length).toBeGreaterThan(11);
      const reopened = JSON.parse(JSON.stringify(revision)) as typeof revision;
      expect(reopened.boq).toEqual(revision.boq);
      expect(reopened.params).toEqual(revision.params);
      const edited = runtime.applyParameterOverride({
        revision: reopened,
        operation: "update_param",
        paramKey: "area_m2",
        rawValue: "135",
        createdAt: "2026-08-13T06:01:00.000Z",
        revisionIndex: 2,
      });
      expect(edited.revision.previousRevisionId).toBe(revision.revisionId);
      expect(edited.revision.resolvedIdentity?.requestedCatalogWorkId).toBe(catalogId);
      expect(edited.diff.changedRows.length).toBeGreaterThan(0);
      expect(revision.boq).toEqual(reopened.boq);
    },
  );
});
