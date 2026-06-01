import { estimateFor } from "../entrypoints/liveB2cEstimateRealityTestHelpers";
import { CONCRETE_PEDESTAL_PROMPT } from "./concretePedestalTestHelpers";

describe("concrete pedestal entrypoint mapping", () => {
  it("does not repaint concrete pedestals as concrete slab", () => {
    const estimate = estimateFor("/request", CONCRETE_PEDESTAL_PROMPT);

    expect(estimate.work.workKey).toBe("concrete_pedestal_pour");
    expect(estimate.work.workKey).not.toBe("concrete_slab");
    expect(estimate.input.unit).toBe("pcs");
  });
});
