import {
  BUILT_IN_AI_10000_POST_BOQ_CASES,
  BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES,
  BUILT_IN_AI_10000_POST_BOQ_PRODUCT_CASES,
} from "../../src/lib/ai/builtInAi10000";
import { getAi10000PostBoqArtifacts } from "./ai10000PostBoqTestHelpers";

describe("built-in AI 10000 post-BOQ manifest", () => {
  it("contains exactly 10000 governed post-BOQ/catalog cases", async () => {
    const artifacts = await getAi10000PostBoqArtifacts();
    const ids = BUILT_IN_AI_10000_POST_BOQ_CASES.map((testCase) => testCase.id);

    expect(BUILT_IN_AI_10000_POST_BOQ_CASES).toHaveLength(10000);
    expect(BUILT_IN_AI_10000_POST_BOQ_ESTIMATE_CASES.length).toBeGreaterThan(9000);
    expect(BUILT_IN_AI_10000_POST_BOQ_PRODUCT_CASES.length).toBeGreaterThan(500);
    expect(new Set(ids).size).toBe(10000);
    expect(ids[0]).toBe("00001");
    expect(ids[9999]).toBe("10000");
    expect(artifacts.matrix.cases_total).toBe(10000);
    expect(artifacts.failures).toEqual([]);
  });
});
