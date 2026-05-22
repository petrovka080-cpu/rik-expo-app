import { buildGlobalEstimateFixture } from "../globalEstimate/globalEstimateTestHarness";

describe("global estimate professional BOQ required", () => {
  it("rejects generic chat answers by requiring professional BOQ structure", async () => {
    const { result, answer } = await buildGlobalEstimateFixture({ text: "Need laminate installation for 1000 sq ft in Dallas TX 75201" });
    expect(result.outputContract).toMatchObject({
      format: "professional_boq",
      hasMaterialsSection: true,
      hasLaborSection: true,
      hasGrandTotal: true,
      hasTaxStatus: true,
    });
    expect(answer).toContain("| No. | Materials and work | Qty / Volume | Unit price | Total |");
  });
});
