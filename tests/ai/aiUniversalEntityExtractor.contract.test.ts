import { extractUniversalEntity } from "../../src/lib/ai/liveUi";

describe("S_AI_UNIVERSAL_CONTEXT_LEARNING_WEB_ANSWERING_CORE: entity extractor", () => {
  it("extracts core entities from Russian construction and app-data questions", () => {
    expect(extractUniversalEntity("сколько заявок было за май")).toBe("procurement_request");
    expect(extractUniversalEntity("дай смету на асфальт 100 м2")).toBe("construction_work_type");
    expect(extractUniversalEntity("найди поставщиков ГКЛ")).toBe("material");
    expect(extractUniversalEntity("какие платежи без документов")).toBe("payment");
  });
});
