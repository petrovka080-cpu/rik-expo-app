import { classifyUniversalIntent } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: intent classifier", () => {
  it("understands app data, construction, marketplace, document and role questions first", () => {
    expect(classifyUniversalIntent("сколько заявок было за май")).toBe("app_data_count");
    expect(classifyUniversalIntent("дай смету на асфальт 100 м2")).toBe("construction_estimate");
    expect(classifyUniversalIntent("найди поставщиков ГКЛ")).toBe("marketplace_supplier_search");
    expect(classifyUniversalIntent("что в этом PDF документе")).toBe("document_pdf_explanation");
    expect(classifyUniversalIntent("что мне решить сегодня")).toBe("director_decision_summary");
  });
});
