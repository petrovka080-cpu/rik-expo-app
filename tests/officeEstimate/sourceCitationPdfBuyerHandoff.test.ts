import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { renderEstimateSourcesSection } from "../../src/features/pdf/renderEstimateSourcesSection";
import { renderBuyerHandoffSourceTrace } from "../../src/features/procurement/renderBuyerHandoffSourceTrace";

describe("source citation PDF and buyer handoff", () => {
  it("renders PDF source section and buyer handoff trace with citations", () => {
    const passport = buildProfessionalWorkPassport("village_water_supply_rom_concept_expanded_complex_v1");
    if (!passport) throw new Error("passport_missing");

    const pdfSection = renderEstimateSourcesSection({ passport });
    const buyerTrace = renderBuyerHandoffSourceTrace({ passport });

    expect(pdfSection.rows.length).toBeGreaterThan(0);
    expect(pdfSection.rows.every((row) => row.citation.includes("normSourceId="))).toBe(true);
    expect(pdfSection.missing_price_policy).toBe("missing_price_policy_quantity_only_2026_07");
    expect(buyerTrace.procurement_rows_count).toBeGreaterThan(0);
    expect(buyerTrace.work_or_labor_rows_excluded).toBe(true);
    expect(buyerTrace.rows.every((row) => row.citation.includes("quality="))).toBe(true);
    expect(buyerTrace.rows.every((row) => row.quantity_trace.includes("normSource="))).toBe(true);
  });
});
