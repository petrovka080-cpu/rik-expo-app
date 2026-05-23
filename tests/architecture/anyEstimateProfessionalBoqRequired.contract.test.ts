import { calculateEstimateForPrompt } from "../estimateIntent/anyEstimateTestHelpers";

describe("any estimate professional BOQ required", () => {
  it("requires intro, assumptions, materials, labor, totals, tax, risks, and questions", () => {
    const { result, answerText } = calculateEstimateForPrompt("кирпичная кладка 50 м2");

    expect(result.outputContract).toMatchObject({
      format: "professional_boq",
      hasIntro: true,
      hasAssumptions: true,
      hasMaterialsSection: true,
      hasLaborSection: true,
      hasGrandTotal: true,
      hasTaxStatus: true,
      hasRegionalRisks: true,
      hasClarifyingQuestions: true,
    });
    expect(answerText).toContain("| № |");
  });
});
