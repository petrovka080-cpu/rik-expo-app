import { buildProfessionalEstimateSnapshot } from "../../src/lib/ai/professionalEstimateTemplates/professionalEstimateSnapshot";

describe("estimate missing price UX contract", () => {
  it("keeps missing prices explicit and never converts unknown price to zero amount", () => {
    const snapshot = buildProfessionalEstimateSnapshot({
      selected_work_key: "carpet_laying",
      quantity: 1500,
      unit: "m2",
      region: "KG_BISHKEK",
    });
    const missingRequiredRows = snapshot.lines.filter(
      (line) => line.price_required && line.price.price_status === "PRICE_MISSING",
    );

    expect(missingRequiredRows.length).toBeGreaterThan(0);
    expect(
      missingRequiredRows.every(
        (line) => line.price.unit_price === null && line.price.line_total === null,
      ),
    ).toBe(true);
    expect(snapshot.totals.estimate_total_status).toBe("PARTIAL_PRICE_MISSING");
    expect(snapshot.totals.known_total).toBeNull();
  });
});
