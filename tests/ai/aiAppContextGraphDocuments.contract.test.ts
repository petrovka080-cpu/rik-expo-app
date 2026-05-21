import { makeAiSourceRefId, validateAiContextGraphAnswer } from "../../src/lib/ai/appContextGraph";
import { answerAiAppContextGraphFixture } from "./aiAppContextGraphTestHelpers";

describe("S_AI_APP_CONTEXT_GRAPH_DEEP_LINKED_SOURCE_REFS documents", () => {
  it("answers PDF questions with document refs and a PDF viewer link", () => {
    const answer = answerAiAppContextGraphFixture("что в этом PDF", "accountant");
    const pdfRef = answer.sourceRefs.find((ref) => ref.id === makeAiSourceRefId("pdf_document", "pdf-45"));

    expect(answer.answerRu.shortRu).toContain("счет");
    expect(pdfRef?.appLink?.route).toBe("/pdf-viewer");
    expect(pdfRef?.appLink?.page).toBe(1);
    expect(pdfRef?.appLink?.highlightText).toBe("125 000 KGS");
    expect(answer.answerRu.openLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceRefId: makeAiSourceRefId("pdf_document", "pdf-45"), enabled: true }),
    ]));
    expect(validateAiContextGraphAnswer(answer).passed).toBe(true);
  });
});
