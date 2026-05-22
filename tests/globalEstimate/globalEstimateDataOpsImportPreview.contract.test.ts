import {
  buildGlobalEstimateDataOpsImportPreview,
  type GlobalEstimateDataOpsActor,
} from "../../src/lib/ai/globalEstimate";

const actor: GlobalEstimateDataOpsActor = {
  userId: "data_ops_admin",
  role: "data_ops_admin",
};

describe("global estimate data ops import preview", () => {
  it("previews imports without writing and blocks invalid price rows", () => {
    const preview = buildGlobalEstimateDataOpsImportPreview({
      actor,
      rows: [
        {
          rowNumber: 1,
          entityType: "material_rate",
          operation: "update",
          reason: "approved source refresh",
          payload: {
            materialKey: "laminate_board",
            unit: "sq_m",
            countryCode: "KG",
            priceMin: 500,
            priceMax: 900,
            priceDefault: 650,
            currency: "KGS",
            sourceLabel: "Configured Bishkek source",
            checkedAt: new Date().toISOString(),
          },
        },
        {
          rowNumber: 2,
          entityType: "material_rate",
          operation: "update",
          reason: "bad import proves validation",
          payload: {
            materialKey: "laminate_board",
            unit: "sq_m",
            countryCode: "KG",
            priceMin: 900,
            priceMax: 500,
            priceDefault: 650,
            currency: "KGS",
          },
        },
      ],
    });

    expect(preview.dryRunOnly).toBe(true);
    expect(preview.willWriteToDb).toBe(false);
    expect(preview.acceptedRows).toBe(1);
    expect(preview.blockedRows).toBe(1);
    expect(preview.validations[1]?.blockers).toEqual(
      expect.arrayContaining([
        "GLOBAL_ESTIMATE_DATA_OPS_PRICE_MIN_GT_MAX_BLOCKED",
        "GLOBAL_ESTIMATE_DATA_OPS_PRICE_SOURCE_REQUIRED",
      ]),
    );
  });
});
