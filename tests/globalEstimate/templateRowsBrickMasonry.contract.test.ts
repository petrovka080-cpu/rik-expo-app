import { expectExpectedRows } from "./globalEstimateTemplateRatebookTestHelpers";

describe("brick masonry global estimate template rows", () => {
  it("uses masonry-specific material and labor rows", () => {
    expectExpectedRows("brick_masonry");
  });
});
