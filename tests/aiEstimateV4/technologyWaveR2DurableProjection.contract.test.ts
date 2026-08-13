import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import {
  DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  migrateDrywallArchitecturalElementRevisionV4,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { technologyWaveR2ParamOverrides } from "./technologyWaveR2TestSupport";

const GROUPS = [...new Set(DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6
  .map((id) => id.replace(/_(large_area|small_area|standard|technical_room|wet_zone|high_load)$/u, "")))];

describe("technology-domain wave R2 durable/history/PDF/procurement", () => {
  test.each(GROUPS)("round-trips every exact revision in %s", (root) => {
    const runtime = createAiEstimateRuntime();
    const catalogIds = DRYWALL_FLAT_CEILING_PROFESSIONAL_CATALOG_IDS_V6.filter((id) => id.startsWith(`${root}_`));
    expect(catalogIds.length).toBeGreaterThanOrEqual(5);
    for (const catalogId of catalogIds) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId)!;
      const revision = runtime.createDraft({
        estimateDraftId: `technology-wave-r2-${catalogId}`,
        rawInput: inventory.localized_name_ru,
        selectedTemplateId: `domain-passport:${catalogId}:v1`, selectedWorkKey: inventory.work_key,
        city: "Bishkek", currency: "KGS", countryCode: "KG",
        paramOverrides: technologyWaveR2ParamOverrides(catalogId), createdAt: "2026-08-13T18:00:00.000Z",
      }).revision;
      expect(revision.missingInputs).toEqual([]);
      expect(revision.resolvedIdentity?.requestedCatalogWorkId).toBe(catalogId);
      expect(revision.resolvedIdentity?.legacyFallbackUsed).toBe(false);
      const reopened = JSON.parse(JSON.stringify(revision)) as typeof revision;
      expect(reopened.boq).toEqual(revision.boq);
      const edited = runtime.applyParameterOverride({ revision: reopened, operation: "update_param", paramKey: "quantity_scope_condition_survey", rawValue: "2", createdAt: "2026-08-13T18:01:00.000Z", revisionIndex: 2 });
      expect(edited.revision.previousRevisionId).toBe(revision.revisionId);
      expect(edited.diff.changedRows.length).toBeGreaterThan(0);
      const pdf = runtime.buildPdfSnapshot({ revision: edited.revision });
      expect(pdf.snapshot.rows).toEqual(edited.revision.boq.rows);
      const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
      expect(validateAiEstimateBuyerPackageParity({ snapshot: buyer.snapshot, buyerPackage: buyer.buyerPackage })).toBe(true);
      const migrated = migrateDrywallArchitecturalElementRevisionV4(edited.revision);
      const twice = migrateDrywallArchitecturalElementRevisionV4(migrated);
      expect(twice).toEqual(migrated);
      expect(twice.boq.rows).toHaveLength(edited.revision.boq.rows.length);
    }
  });
});
