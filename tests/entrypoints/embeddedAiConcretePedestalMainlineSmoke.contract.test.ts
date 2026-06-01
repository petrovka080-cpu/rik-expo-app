import { estimateFor } from "./liveB2cEstimateRealityTestHelpers";
import { CONCRETE_PEDESTAL_PROMPT } from "../professionalQuality/concretePedestalTestHelpers";

describe("embedded AI concrete pedestal mainline smoke", () => {
  it("maps the foreman AI pedestal prompt to concrete_pedestal_pour", () => {
    const estimate = estimateFor("/ai?context=foreman", CONCRETE_PEDESTAL_PROMPT);

    expect(estimate.work.workKey).toBe("concrete_pedestal_pour");
    expect(estimate.work.workKey).not.toBe("concrete_slab");
  });
});
