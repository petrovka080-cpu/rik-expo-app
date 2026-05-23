import { expectProfessionalBoqEstimate } from "../estimateIntent/anyEstimateTestHelpers";

describe("window estimate", () => {
  it("prices window installation through backend estimate engine", () => {
    const result = expectProfessionalBoqEstimate("смета поставить пластиковое окно 1 шт", "window_installation");

    expect(result.work.category).toBe("doors_windows");
    expect(result.input.unit).toBe("pcs");
  });
});
