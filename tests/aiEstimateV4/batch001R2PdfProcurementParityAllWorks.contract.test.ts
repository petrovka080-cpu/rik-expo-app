import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import {
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 as BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { batch001ParamOverrides } from "./batch001R2TestSupport";

describe("BATCH001 R2 PDF and procurement parity all works", () => {
  test("projects the same exact revision rows into PDF and buyer handoff for 16/16", () => {
    const runtime = createAiEstimateRuntime();
    let pdfGreen = 0;
    let procurementGreen = 0;
    for (const catalogId of BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3) {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId)!;
      const revision = runtime.createDraft({
        estimateDraftId: `batch001-projection-${catalogId}`,
        rawInput: inventory.localized_name_ru,
        selectedTemplateId: `domain-passport:${catalogId}:v1`,
        selectedWorkKey: inventory.work_key,
        city: "Bishkek",
        currency: "KGS",
        countryCode: "KG",
        paramOverrides: batch001ParamOverrides(catalogId),
        createdAt: "2026-08-13T06:00:00.000Z",
      }).revision;
      const pdf = runtime.buildPdfSnapshot({ revision });
      expect(pdf.snapshot.rows).toEqual(revision.boq.rows);
      expect(pdf.pdf.revisionId).toBe(revision.revisionId);
      expect(pdf.pdf.rowsHash).toBe(pdf.snapshot.rowsHash);
      expect(pdf.pdf.rowsEqualLatestRevision).toBe(true);
      expect(pdf.pdf.body).not.toMatch(/\b(?:undefined|NaN)\b/u);
      pdfGreen += 1;

      const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
      const expected = revision.boq.rows
        .filter((row) => row.includedInProcurement && !["work", "labor", "document", "other"].includes(row.rowType))
        .map((row) => row.rowId)
        .sort();
      expect(buyer.buyerPackage.items.map((item) => item.rowId).sort()).toEqual(expected);
      expect(validateAiEstimateBuyerPackageParity({
        snapshot: buyer.snapshot,
        buyerPackage: buyer.buyerPackage,
      })).toBe(true);
      procurementGreen += 1;
    }
    expect(pdfGreen).toBe(16);
    expect(procurementGreen).toBe(16);
  });
});
