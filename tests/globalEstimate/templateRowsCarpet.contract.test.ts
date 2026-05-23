import { expectExpectedRows } from "./globalEstimateTemplateRatebookTestHelpers";

describe("carpet global estimate template rows", () => {
  it("uses carpet-specific material and labor rows", () => {
    expectExpectedRows("carpet_laying");
  });
});
