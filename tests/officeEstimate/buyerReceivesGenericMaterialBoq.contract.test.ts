import {
  confirmProfessionalEstimateCalculatorHandoff,
  createProfessionalEstimateCalculatorPreview,
  representativeProfessionalEstimateCalculatorInput,
} from "../../src/lib/ai/professionalEstimateCalculator";

describe("buyer receives generic material BOQ", () => {
  it("sends procurement rows with quantities matching the estimate and excludes work rows", () => {
    const preview = createProfessionalEstimateCalculatorPreview(representativeProfessionalEstimateCalculatorInput());
    expect(preview.status).toBe("NEEDS_USER_CONFIRMATION");
    if (preview.status !== "NEEDS_USER_CONFIRMATION") return;

    const confirmed = confirmProfessionalEstimateCalculatorHandoff({
      preview,
      userConfirmed: true,
      actorUserId: "buyer-generic-boq-test",
      createdAt: "2026-07-02T00:00:00.000Z",
    });
    const requestRowsByCode = new Map(confirmed.buyerProcurementHandoff.rows.map((row) => [row.rik_code, row]));

    expect(confirmed.buyerProcurementHandoff.rows.length).toBeGreaterThan(0);
    expect(confirmed.buyerProcurementHandoff.rows.every((row) => row.meta.kind === "material")).toBe(true);
    for (const row of preview.requestDraftLines) {
      expect(requestRowsByCode.get(row.rik_code)?.qty).toBe(row.qty);
    }
  });
});
