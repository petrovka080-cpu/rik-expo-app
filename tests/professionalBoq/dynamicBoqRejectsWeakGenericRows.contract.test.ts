import { requestEstimate, expectNoWeakGenericRows, UNIVERSAL_PROMPTS } from "../estimatorKernel/universalEstimatorTestHelpers";

describe("dynamic BOQ rejects weak generic rows", () => {
  it("does not expose standalone material/work/montage rows", () => {
    for (const prompt of Object.values(UNIVERSAL_PROMPTS)) {
      expectNoWeakGenericRows(requestEstimate(prompt));
    }
  });
});
