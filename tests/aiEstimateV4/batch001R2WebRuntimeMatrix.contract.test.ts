import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import {
  DRYWALL_CEILING_BULKHEAD_PROFESSIONAL_CATALOG_IDS_V3 as BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3,
  INTERIOR_FINISHES_DOMAIN_INVENTORY,
} from "../../src/lib/estimate/v4/domains/interiorFinishesComplete";
import { batch001ParamOverrides } from "./batch001R2TestSupport";

describe("BATCH001 R2 Web runtime matrix", () => {
  test("the Web runtime preserves exact identities and delegates all 16 compiles to the canonical backend", () => {
    const matrix = BATCH001_DRYWALL_BULKHEAD_CATALOG_IDS_V3.map((catalogId) => {
      const inventory = INTERIOR_FINISHES_DOMAIN_INVENTORY.find((item) => item.catalog_id === catalogId)!;
      const result = buildEstimateFromInlineWorkPrompt({
        rawInput: inventory.localized_name_ru,
        selectedTemplateId: `domain-passport:${catalogId}:v1`,
        selectedWorkKey: inventory.work_key,
        city: "Bishkek",
        currency: "KGS",
        countryCode: "KG",
        paramOverrides: batch001ParamOverrides(catalogId),
      });
      return {
        catalogId,
        matchedTemplateId: result.parseResult.matchedTemplate?.templateId,
        matchedWorkKey: result.parseResult.matchedTemplate?.family,
        blockingReason: result.blockingReason,
        localDraft: result.draft,
        localCompileAllowed: result.canBuildPreliminaryEstimate,
        backendParameterCount: result.parseResult.missingInputs.length,
      };
    });
    expect(matrix).toHaveLength(16);
    expect(matrix.every((item) =>
      item.matchedTemplateId === `domain-passport:${item.catalogId}:v1` &&
      item.matchedWorkKey != null &&
      item.blockingReason === "CANONICAL_BACKEND_REQUIRED" &&
      item.localDraft === null &&
      item.localCompileAllowed === false &&
      item.backendParameterCount > 0,
    )).toBe(true);
  });
});
