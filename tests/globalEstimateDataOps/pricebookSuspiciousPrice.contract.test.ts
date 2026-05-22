import {
  previewGlobalEstimateDataImport,
  type GlobalEstimateDataOpsActor,
} from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops suspicious price contract", () => {
  it("blocks impossible or source-less price rows before approval", () => {
    const actor: GlobalEstimateDataOpsActor = { userId: "editor", role: "data_ops_admin" };
    const preview = previewGlobalEstimateDataImport({
      actor,
      format: "xlsx",
      rows: [{
        rowNumber: 1,
        entityType: "material_rate",
        operation: "update",
        reason: "bad import row",
        payload: {
          materialKey: "bad_rate",
          countryCode: "US",
          unit: "sq_ft",
          priceMin: 10,
          priceMax: 5,
          priceDefault: 7,
          currency: "USD",
        },
      }],
    });

    expect(preview.blockedRows).toBe(1);
    expect(preview.suspiciousPriceFindings.length).toBeGreaterThan(0);
    expect(preview.validations[0]?.blockers).toEqual(
      expect.arrayContaining(["GLOBAL_ESTIMATE_DATA_OPS_PRICE_MIN_GT_MAX_BLOCKED"]),
    );
  });
});
