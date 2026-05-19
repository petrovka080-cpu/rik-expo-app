import {
  aiEngineeringProjectProvider,
  type ConstructionKnowledgeSource,
} from "../../src/lib/ai/constructionKnowledgeCore";

describe("AI construction engineering provider", () => {
  it("keeps engineering requirements tied to engineering PDF source", () => {
    const source: ConstructionKnowledgeSource = {
      id: "source:engineering:vk:8",
      type: "engineering_pdf",
      labelRu: "Проект ВК.pdf",
      documentId: "doc-vk",
      fileName: "Проект ВК.pdf",
      page: 8,
      confidence: "high",
    };
    const result = aiEngineeringProjectProvider({
      document: {
        id: "doc-vk",
        fileName: "Проект ВК.pdf",
        pages: [{ page: 8, text: "Необходимо выполнить испытания трубопровода." }],
      },
      source,
    });
    expect(result.requirements[0]?.sourceRef).toBe(source.id);
    expect(result.requirements[0]?.discipline).toBe("plumbing");
  });
});
