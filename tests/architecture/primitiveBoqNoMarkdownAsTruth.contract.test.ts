import { readSource } from "../constructionPrimitives/primitiveBoqTestHelpers";

describe("primitive BOQ PDF truth source", () => {
  it("keeps PDF output tied to structured global estimate payloads", () => {
    const types = readSource("src/lib/estimatePdf/estimatePdfTypes.ts");
    const builder = readSource("src/lib/estimatePdf/buildEstimatePdfViewModel.ts");
    expect(types).toContain("GlobalEstimateResult");
    expect(`${types}\n${builder}`).not.toMatch(/markdown.*source.*truth|parseMarkdown/i);
  });
});
