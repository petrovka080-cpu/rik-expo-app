import { expectExpectedRows } from "./globalEstimateTemplateRatebookTestHelpers";

describe("asphalt global estimate template rows", () => {
  it("uses asphalt-specific material, equipment, and labor rows", () => {
    expectExpectedRows("asphalt_paving");
  });
});
