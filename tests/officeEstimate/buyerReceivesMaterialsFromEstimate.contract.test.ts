import {
  confirmRealMaterialQuantityEstimate,
  createRealMaterialQuantityPreview,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("buyer receives materials from professional estimate", () => {
  it("hands only material rows to procurement and keeps quantities equal to the estimate", () => {
    const preview = createRealMaterialQuantityPreview({
      rawInput: "стяжка 100 м2 толщина 50 мм",
      parameters: {
        thickness_mm: 50,
      },
    });
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    if (preview.status !== "NEEDS_USER_CONFIRMATION") return;

    const confirmed = confirmRealMaterialQuantityEstimate({
      preview,
      userConfirmed: true,
      actorUserId: "user:test",
      companyId: "company:test",
      confirmedAt: "2026-07-01T00:00:00.000Z",
    });

    expect(confirmed.buyerProcurement.materialRowsOnly).toBe(true);
    expect(confirmed.buyerProcurement.rows.length).toBe(preview.materialRows.length);
    expect(confirmed.buyerProcurement.rows.every((row) => row.rowType === "material")).toBe(true);
    expect(confirmed.buyerProcurement.quantitiesMatchEstimate).toBe(true);
  });
});
