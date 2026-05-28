import { professionalBoqFor } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("parametric BOQ compiler exclusions and questions", () => {
  it("carries exclusions and clarifying questions from the primitive graph", () => {
    const boq = professionalBoqFor("estimate ventilation cafe 120 sq_m");
    expect(boq.exclusions.length).toBeGreaterThan(0);
    expect(boq.clarifyingQuestions.length).toBeGreaterThan(0);
    expect(boq.assumptions.length).toBeGreaterThan(0);
  });
});
