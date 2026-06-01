import { estimateFor } from "../entrypoints/liveB2cEstimateRealityTestHelpers";
import {
  CONCRETE_SCREED_PROMPT,
  CONCRETE_SLAB_PROMPT,
} from "./concretePedestalTestHelpers";

describe("concrete slab and screed routing", () => {
  it("keeps concrete slabs on concrete_slab", () => {
    const estimate = estimateFor("/request", CONCRETE_SLAB_PROMPT);

    expect(estimate.work.workKey).toBe("concrete_slab");
    expect(estimate.work.workKey).not.toBe("concrete_pedestal_pour");
  });

  it("keeps concrete floor screeds on floor_screed", () => {
    const estimate = estimateFor("/request", CONCRETE_SCREED_PROMPT);

    expect(estimate.work.workKey).toBe("floor_screed");
    expect(estimate.work.workKey).not.toBe("concrete_pedestal_pour");
  });
});
