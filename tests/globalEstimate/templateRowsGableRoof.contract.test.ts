import { expectExpectedRows } from "./globalEstimateTemplateRatebookTestHelpers";

describe("gable roof global estimate template rows", () => {
  it("uses roof-specific material and installation rows", () => {
    expectExpectedRows("gable_roof_installation");
  });
});
