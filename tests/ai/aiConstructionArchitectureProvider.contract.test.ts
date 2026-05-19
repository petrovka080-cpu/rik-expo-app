import {
  aiArchitectureProjectProvider,
} from "../../src/lib/ai/constructionKnowledgeCore";
import { constructionSources } from "./aiConstructionKnowledgeCore.fixtures";

describe("AI construction architecture provider", () => {
  it("keeps architecture requirements tied to architecture PDF source", () => {
    const source = constructionSources.find((item) => item.type === "architecture_pdf");
    const result = aiArchitectureProjectProvider({
      document: {
        id: "doc-ar",
        fileName: "Проект АР.pdf",
        pages: [{ page: 14, text: "Требуется выполнить отделку по спецификации." }],
      },
      source: source!,
    });
    expect(result.requirements[0]?.sourceRef).toBe(source!.id);
    expect(result.requirements[0]?.page).toBe(14);
  });
});
