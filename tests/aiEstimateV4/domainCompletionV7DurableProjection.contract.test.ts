import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import {
  DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
  drywallDomainExpectedCandidatesV7,
  migrateDrywallArchitecturalElementRevisionV4,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { domainCompletionParameterValues } from "./domainCompletionV7TestSupport";

const SUBWAVE_FAMILIES = [
  ["drywall_partition", "fire_partition"],
  ["moisture_partition", "sound_partition"],
  ["joint", "niche"],
  ["revision_hatch", "shaft"],
  ["wall_cladding", "bulkhead", "curve", "drywall_ceiling"],
] as const;

function familyOf(catalogId: string): string {
  const match = catalogId.match(/^drywall_ceiling_interior_(.+)_(prepare|frame|align|insulate|clad|finish_joint|repair|install)_/u);
  if (!match) throw new Error(`BATCH004_DURABLE_ID_PARSE_RED:${catalogId}`);
  return match[1];
}

const ordinal = Number(process.env.BATCH004_SUBWAVE ?? "1");
if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 5) throw new Error(`BATCH004_DURABLE_SUBWAVE_RED:${ordinal}`);
const ids = DRYWALL_DOMAIN_COMPLETION_CATALOG_IDS_V7.filter((id) => SUBWAVE_FAMILIES[ordinal - 1].includes(familyOf(id) as never));

describe(`BATCH-004 SW-${String(ordinal).padStart(2, "0")} durable/history/PDF/procurement`, () => {
  test(`round-trips all ${ids.length} exact identities`, () => {
    const runtime = createAiEstimateRuntime();
    expect(ids.length).toBe([84, 83, 83, 83, 60][ordinal - 1]);
    for (const catalogId of ids) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((row) => row.catalog_id === catalogId)!;
      const paramOverrides = Object.fromEntries(Object.entries(domainCompletionParameterValues(catalogId)).map(([key, value]) => [key, { value: value.value, source: "user_input" as const, sourceText: value.source_id, lastChangedAt: "2026-08-13T18:30:00.000Z" }]));
      const revision = runtime.createDraft({
        estimateDraftId: `batch004-${catalogId}`,
        rawInput: inventory.localized_name_ru,
        selectedTemplateId: `domain-passport:${catalogId}:v1`, selectedWorkKey: inventory.work_key,
        city: "Bishkek", currency: "KGS", countryCode: "KG", paramOverrides, createdAt: "2026-08-13T18:30:00.000Z",
      }).revision;
      expect(revision.missingInputs).toEqual([]);
      expect(revision.resolvedIdentity?.requestedCatalogWorkId).toBe(catalogId);
      expect(revision.resolvedIdentity?.legacyFallbackUsed).toBe(false);
      const reopened = JSON.parse(JSON.stringify(revision)) as typeof revision;
      expect(reopened.boq).toEqual(revision.boq);
      const quantityKey = `quantity_${drywallDomainExpectedCandidatesV7(catalogId)[0].candidateId}`;
      const edited = runtime.applyParameterOverride({ revision: reopened, operation: "update_param", paramKey: quantityKey, rawValue: "2", createdAt: "2026-08-13T18:31:00.000Z", revisionIndex: 2 });
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
      expect(twice.resolvedIdentity?.formulaGraphVersion).toBe("FormulaGraphV7");
    }
  });
});
