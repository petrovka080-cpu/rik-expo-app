import {
  previewGlobalEstimateDataImport,
  type GlobalEstimateDataOpsActor,
} from "../../src/lib/ai/globalEstimate";

describe("Global Estimate Data Ops pricebook import contract", () => {
  it("parses import rows as preview-only changes with no direct DB writes", () => {
    const actor: GlobalEstimateDataOpsActor = { userId: "editor", role: "data_ops_admin" };
    const preview = previewGlobalEstimateDataImport({
      actor,
      format: "csv",
      rows: [{
        rowNumber: 1,
        entityType: "material_rate",
        operation: "update",
        reason: "approved source refresh",
        payload: {
          materialKey: "laminate_board",
          countryCode: "US",
          unit: "sq_ft",
          priceMin: 2,
          priceMax: 5,
          priceDefault: 3,
          currency: "USD",
          sourceLabel: "Configured reference",
          checkedAt: new Date().toISOString(),
        },
      }],
    });

    expect(preview.dryRunOnly).toBe(true);
    expect(preview.willWriteToDb).toBe(false);
    expect(preview.requiresApproval).toBe(true);
    expect(preview.acceptedRows).toBe(1);
  });
});
