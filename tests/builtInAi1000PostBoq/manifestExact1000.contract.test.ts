import {
  BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES,
  BUILT_IN_AI_1000_POST_BOQ_ESTIMATE_CASES,
  BUILT_IN_AI_1000_POST_BOQ_PRODUCT_CASES,
  BUILT_IN_AI_1000_POST_BOQ_REQUIRED_ANCHORS,
} from "../../src/lib/ai/builtInAi1000/builtInAi1000PostBoqCatalogCases";
import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ manifest", () => {
  it("contains exactly 1000 post-BOQ/catalog cases and mandatory anchors", async () => {
    const ids = BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.map((testCase) => testCase.id);
    const anchors = new Set(BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES.map((testCase) => testCase.postBoqAnchor).filter(Boolean));
    const artifacts = await getAi1000PostBoqArtifacts();

    expect(BUILT_IN_AI_1000_POST_BOQ_CATALOG_CASES).toHaveLength(1000);
    expect(BUILT_IN_AI_1000_POST_BOQ_ESTIMATE_CASES).toHaveLength(971);
    expect(BUILT_IN_AI_1000_POST_BOQ_PRODUCT_CASES).toHaveLength(28);
    expect(new Set(ids).size).toBe(1000);
    expect(ids[0]).toBe("0001");
    expect(ids[999]).toBe("1000");
    expect(BUILT_IN_AI_1000_POST_BOQ_REQUIRED_ANCHORS.every((anchor) => anchors.has(anchor))).toBe(true);
    expect(artifacts.matrix.cases_total).toBe(1000);
    expect(artifacts.failures).toEqual([]);
  });
});
