import {
  classifyConstructionDocument,
} from "../../src/lib/ai/constructionKnowledgeCore";

describe("AI construction document classifier", () => {
  it("classifies PDFs into construction document types and source traces", () => {
    const estimate = classifyConstructionDocument({
      id: "doc-estimate",
      fileName: "Смета объекта.pdf",
      text: "Локальная смета. EST-77 перегородки 42 м2 итого",
    });
    expect(estimate.documentType).toBe("estimate");
    expect(estimate.source.type).toBe("estimate_pdf");
    expect(estimate.source.documentId).toBe("doc-estimate");
    expect(estimate.confidence).not.toBe("low");

    const hiddenAct = classifyConstructionDocument({
      id: "doc-hidden-act",
      fileName: "Акт скрытых работ.pdf",
      text: "Акт скрытых работ по армированию фундамента",
    });
    expect(hiddenAct.documentType).toBe("hidden_work_act");
    expect(hiddenAct.source.type).toBe("act");
  });
});
