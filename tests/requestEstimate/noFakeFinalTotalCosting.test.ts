import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { calculateProfessionalCostForPassport } from "../../src/lib/estimate/professionalCostCalculator";
import { validateProfessionalCostingPolicy } from "../../src/lib/estimate/professionalCostingPolicy";

describe("no fake final total costing", () => {
  it("rejects contract final totals when price coverage is preliminary-only", () => {
    const passport = buildProfessionalWorkPassport("ventilated_facade_rom_concept_expanded_complex_v1");
    if (!passport) throw new Error("passport_missing");
    const result = calculateProfessionalCostForPassport(passport);
    const policy = validateProfessionalCostingPolicy({
      lines: result.lines,
      finalTotalClaimed: true,
    });

    expect(result.summary.preliminaryTotalAllowed).toBe(true);
    expect(result.summary.contractTotalAllowed).toBe(false);
    expect(policy.fakeFinalTotalRejected).toBe(false);
    expect(policy.failures).toEqual(expect.arrayContaining(["fake_final_total_without_contract_trust"]));
  });
});
