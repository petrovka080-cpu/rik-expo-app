import {
  compileProductionExpandedEstimate10000,
  isProfessionalNormPackSourceId,
} from "../../src/lib/ai/estimateTemplate10000";

describe("Gerflor Design Skirting source-backed quantity", () => {
  it("keeps measured perimeter one-to-one and exposes the 2 m product length", () => {
    const compiled = compileProductionExpandedEstimate10000({
      workKey: "flooring_interior_baseboard_install_standard",
      quantity: 55,
      countryCode: "KG",
    });
    const row = compiled.rows.find((candidate) =>
      isProfessionalNormPackSourceId(candidate.normSourceId) &&
      candidate.normSourceId.includes("baseboards_gerflor_design_skirting")
    );

    expect(row?.unit).toBe("linear_m");
    expect(row?.quantity).toBe(55);
    expect(row?.sourceParameters.formulaContext).toMatchObject({
      normFactor: 1,
      packageSize: 2,
      wastePercent: 0,
    });
  });
});
