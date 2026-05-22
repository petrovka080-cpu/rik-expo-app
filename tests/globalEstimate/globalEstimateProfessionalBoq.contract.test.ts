import { buildGlobalEstimateFixture, expectProfessionalBoqShape } from "./globalEstimateTestHarness";

describe("global estimate professional BOQ delivery contract", () => {
  it("renders materials, labor, totals, tax status and clarifying questions", async () => {
    const { answer, result } = await buildGlobalEstimateFixture({
      text: "Need laminate installation for 1000 sq ft in Dallas TX 75201",
      language: "en",
    });

    expectProfessionalBoqShape(answer);
    expect(result.sections.some((section) => section.type === "materials")).toBe(true);
    expect(result.sections.some((section) => section.type === "labor")).toBe(true);
    expect(result.totals.grandTotal).toBeGreaterThan(0);
    expect(result.clarifyingQuestions.length).toBeGreaterThan(0);
  });
});
