import { buildProfessionalWorkPassport } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { buildEstimateSourceCitationViewModels } from "../../src/features/requests/components/EstimateSourceCitations";
import { buildEstimateAssumptionLines } from "../../src/features/requests/components/EstimateAssumptionsAndSources";

describe("request estimate source citation UI contract", () => {
  it("builds visible source citations and assumptions without raw internal-only rows", () => {
    const passport = buildProfessionalWorkPassport("road_construction_rom_concept_expanded_complex_v1");
    if (!passport) throw new Error("passport_missing");

    const sourceRows = buildEstimateSourceCitationViewModels({ rows: passport.boqRecipe.allRows });
    const assumptions = buildEstimateAssumptionLines(passport);

    expect(sourceRows.length).toBeGreaterThan(0);
    expect(sourceRows.every((row) => row.citation.includes("quality="))).toBe(true);
    expect(sourceRows.some((row) => row.preliminary)).toBe(true);
    expect(assumptions.some((line) => line.includes("No final total"))).toBe(true);
  });
});
