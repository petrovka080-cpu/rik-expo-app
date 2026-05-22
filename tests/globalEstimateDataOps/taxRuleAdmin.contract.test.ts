import {
  buildGlobalEstimateDataOpsImportPreview,
  type GlobalEstimateDataOpsActor,
} from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops tax rule admin contract", () => {
  it("requires tax rules to have source evidence and precision warnings where needed", () => {
    const actor: GlobalEstimateDataOpsActor = { userId: "tax-editor", role: "tax_admin" };
    const preview = buildGlobalEstimateDataOpsImportPreview({
      actor,
      rows: [{
        rowNumber: 1,
        entityType: "tax_rule",
        operation: "update",
        reason: "source-less tax rule must be blocked",
        payload: {
          countryCode: "US",
          taxType: "sales_tax",
          taxRate: 0.08,
          taxLabel: "Country-only sales tax",
        },
      }],
    });

    expect(preview.blockedRows).toBe(1);
    expect(preview.validations[0]?.blockers).toEqual(
      expect.arrayContaining([
        "GLOBAL_ESTIMATE_DATA_OPS_TAX_SOURCE_REQUIRED",
        "GLOBAL_ESTIMATE_DATA_OPS_US_SALES_TAX_COUNTRY_ONLY_BLOCKED",
      ]),
    );
  });
});
