import { invariantMediaDocumentNotFinalFact } from "../../../src/lib/ai/contractRuntime";

describe("invariant media/document AI not final fact", () => {
  it("keeps media and document analysis as suggestions only", () => {
    expect(invariantMediaDocumentNotFinalFact(false).passed).toBe(true);
    expect(invariantMediaDocumentNotFinalFact(true).passed).toBe(false);
  });
});
