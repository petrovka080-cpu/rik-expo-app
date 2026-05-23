import { expectExpectedRows } from "./globalEstimateTemplateRatebookTestHelpers";

describe("drywall global estimate template rows", () => {
  it("uses GKL-specific rows for partition and wall cladding", () => {
    expectExpectedRows("drywall_partition");
    expectExpectedRows("drywall_wall_cladding");
  });
});
