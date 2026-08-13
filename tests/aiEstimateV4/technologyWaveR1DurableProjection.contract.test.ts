import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import {
  DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  migrateDrywallArchitecturalElementRevisionV4,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { technologyWaveParamOverrides } from "./technologyWaveR1TestSupport";

const DURABLE_GROUPS = [...new Set(DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4
  .map((catalogId) => catalogId.replace(/_(large_area|small_area|standard|technical_room|wet_zone)$/u, "")))];

describe("technology-domain wave R1 durable/history/PDF/procurement", () => {
  test.each(DURABLE_GROUPS)("creates, edits, reopens and projects all five exact revisions in %s", (groupRoot) => {
    const runtime = createAiEstimateRuntime();
    const catalogIds = DRYWALL_ARCHITECTURAL_ELEMENT_PROFESSIONAL_CATALOG_IDS_V4.filter((catalogId) => catalogId.startsWith(`${groupRoot}_`));
    expect(catalogIds).toHaveLength(5);
    for (const catalogId of catalogIds) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId)!;
      const revision = runtime.createDraft({
        estimateDraftId: `technology-wave-durable-${catalogId}`,
        rawInput: inventory.localized_name_ru,
        selectedTemplateId: `domain-passport:${catalogId}:v1`,
        selectedWorkKey: inventory.work_key,
        city: "Bishkek", currency: "KGS", countryCode: "KG",
        paramOverrides: technologyWaveParamOverrides(catalogId),
        createdAt: "2026-08-13T12:00:00.000Z",
      }).revision;
      expect(revision.missingInputs).toEqual([]);
      expect(revision.resolvedIdentity?.requestedCatalogWorkId).toBe(catalogId);
      expect(revision.resolvedIdentity?.legacyFallbackUsed).not.toBe(true);
      const reopened = JSON.parse(JSON.stringify(revision)) as typeof revision;
      expect(reopened.boq).toEqual(revision.boq);
      expect(reopened.params).toEqual(revision.params);
      const edited = runtime.applyParameterOverride({ revision: reopened, operation: "update_param", paramKey: "area_m2", rawValue: "108", createdAt: "2026-08-13T12:01:00.000Z", revisionIndex: 2 });
      expect(edited.revision.previousRevisionId).toBe(revision.revisionId);
      expect(edited.revision.resolvedIdentity?.requestedCatalogWorkId).toBe(catalogId);
      expect(edited.revision.resolvedIdentity?.legacyFallbackUsed).toBe(false);
      expect(edited.diff.changedRows.length).toBeGreaterThan(0);
      const pdf = runtime.buildPdfSnapshot({ revision: edited.revision });
      expect(pdf.snapshot.rows).toEqual(edited.revision.boq.rows);
      expect(pdf.pdf.revisionId).toBe(edited.revision.revisionId);
      expect(pdf.pdf.rowsEqualLatestRevision).toBe(true);
      const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
      expect(validateAiEstimateBuyerPackageParity({ snapshot: buyer.snapshot, buyerPackage: buyer.buyerPackage })).toBe(true);
      const secondMigration = migrateDrywallArchitecturalElementRevisionV4(migrateDrywallArchitecturalElementRevisionV4(edited.revision));
      expect(secondMigration).toBe(edited.revision);
    }
  });
});
