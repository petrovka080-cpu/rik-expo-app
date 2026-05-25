import { BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES } from "../../src/lib/ai/builtInAi10000";
import { getAi10000PostBoqArtifacts } from "./ai10000PostBoqTestHelpers";

describe("built-in AI 10000 post-BOQ PDF policy", () => {
  it("keeps estimate PDF actions structured and regression guarded", async () => {
    const artifacts = await getAi10000PostBoqArtifacts();

    expect(BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES.every((testCase) => testCase.requiresPdfAction)).toBe(true);
    expect(artifacts.matrix.pdf_payload_regression_passed).toBe(true);
    expect(artifacts.matrix.legacy_pdf_regression_passed).toBe(true);
  });
});
