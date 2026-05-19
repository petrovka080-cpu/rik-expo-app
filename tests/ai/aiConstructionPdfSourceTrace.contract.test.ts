import {
  classifyConstructionDocument,
  parseConstructionProjectPdf,
} from "../../src/lib/ai/constructionKnowledgeCore";

describe("AI construction PDF source trace", () => {
  it("extracts project requirements only with document, page, and source trace", () => {
    const document = {
      id: "doc-ar",
      fileName: "Проект АР.pdf",
      pages: [{ page: 14, text: "Необходимо выполнить фотофиксацию скрытых работ до закрытия." }],
    };
    const classification = classifyConstructionDocument(document);
    const result = parseConstructionProjectPdf({
      document,
      source: classification.source,
    });

    expect(result.requirements).toHaveLength(1);
    expect(result.requirements[0]?.sourceRef).toBe(classification.source.id);
    expect(result.requirements[0]?.page).toBe(14);
    expect(result.source.documentId).toBe("doc-ar");
  });
});
