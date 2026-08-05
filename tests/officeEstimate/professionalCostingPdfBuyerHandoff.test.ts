import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { calculateProfessionalCostForPassport } from "../../src/lib/estimate/professionalCostCalculator";
import { renderProfessionalCostSection } from "../../src/features/pdf/renderProfessionalCostSection";
import { renderProfessionalPriceSourcesSection } from "../../src/features/pdf/renderProfessionalPriceSourcesSection";
import { createBuyerHandoffCostPackage } from "../../src/features/procurement/createBuyerHandoffCostPackage";

describe("professional costing PDF and buyer handoff", () => {
  it("renders cost policy, price sources, missing-price state, and procurement-only buyer rows", () => {
    const passport = buildProfessionalWorkPassport("village_water_supply_rom_concept_expanded_complex_v1");
    if (!passport) throw new Error("passport_missing");
    const result = calculateProfessionalCostForPassport(passport);
    const costSection = renderProfessionalCostSection({ summary: result.summary, lines: result.lines });
    const sourcesSection = renderProfessionalPriceSourcesSection({ lines: result.lines });
    const buyer = createBuyerHandoffCostPackage({
      templateId: passport.templateId,
      summary: result.summary,
      lines: result.lines,
    });

    expect(costSection).toContain("Cost summary");
    expect(costSection).toContain("Contract total not claimed");
    expect(costSection).toContain("Missing price rows");
    expect(sourcesSection).toContain("Price source section");
    expect(costSection).not.toMatch(/contract_total_claimed=true/);
    expect(buyer.rows.length).toBeGreaterThan(0);
    expect(buyer.buyer_handoff_procurement_rows_have_price_state).toBe(true);
    expect(buyer.buyer_handoff_missing_price_visible).toBe(true);
    expect(buyer.buyer_handoff_fake_price_count).toBe(0);
    expect(buyer.buyer_handoff_work_rows_count).toBe(0);
  });

  it("projects an exact required-price input when coverage is below the preliminary threshold", () => {
    const passport = buildProfessionalWorkPassport(
      "private_house_construction_preliminary_boq_expanded_complex_v1",
    );
    if (!passport) throw new Error("passport_missing");
    const result = calculateProfessionalCostForPassport(passport);
    const costSection = renderProfessionalCostSection({ summary: result.summary, lines: result.lines });
    const buyer = createBuyerHandoffCostPackage({
      templateId: passport.templateId,
      summary: result.summary,
      lines: result.lines,
    });

    expect(result.summary.resolution).toBe("PRICE_INPUT_REQUIRED");
    expect(result.summary.preliminaryTotalAllowed).toBe(false);
    expect(result.summary.preliminaryTotal).toBeNull();
    expect(result.summary.requiredPriceInputRowIds.length).toBeGreaterThan(0);
    expect(costSection).toContain("cost_resolution=PRICE_INPUT_REQUIRED");
    for (const rowId of result.summary.requiredPriceInputRowIds) {
      expect(costSection).toContain(`required_price_input=${rowId}`);
    }
    expect(buyer.cost_resolution).toBe("PRICE_INPUT_REQUIRED");
    expect(buyer.required_price_input_row_ids).toEqual(result.summary.requiredPriceInputRowIds);
    expect(buyer.buyer_handoff_required_price_inputs_complete).toBe(true);
    expect(buyer.buyer_handoff_fake_price_count).toBe(0);
  });
});
