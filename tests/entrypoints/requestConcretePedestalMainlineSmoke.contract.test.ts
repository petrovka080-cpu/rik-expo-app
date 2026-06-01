import { estimateFor } from "./liveB2cEstimateRealityTestHelpers";
import { CONCRETE_PEDESTAL_PROMPT } from "../professionalQuality/concretePedestalTestHelpers";

describe("request concrete pedestal mainline smoke", () => {
  it("maps the exact pedestal request prompt to concrete_pedestal_pour", () => {
    const estimate = estimateFor("/request", CONCRETE_PEDESTAL_PROMPT);

    expect(estimate.work.workKey).toBe("concrete_pedestal_pour");
    expect(estimate.work.workKey).not.toBe("concrete_slab");
  });
});
