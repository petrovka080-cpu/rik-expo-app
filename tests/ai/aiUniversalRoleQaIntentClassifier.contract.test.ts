import { classifyUniversalRoleQaIntent } from "../../src/lib/ai/universalRoleQa";

describe("S_AI_UNIVERSAL_ROLE_QA: intent classifier", () => {
  it("classifies app, warehouse, finance, document, construction and marketplace questions", () => {
    expect(classifyUniversalRoleQaIntent("сколько заявок за май")).toBe("app_data_count");
    expect(classifyUniversalRoleQaIntent("куда ушёл ГКЛ")).toBe("warehouse_issue_trace");
    expect(classifyUniversalRoleQaIntent("какие платежи без документов")).toBe("finance_payment_review");
    expect(classifyUniversalRoleQaIntent("что в этом PDF")).toBe("document_pdf_explanation");
    expect(classifyUniversalRoleQaIntent("дай смету на асфальт 100 м²")).toBe("construction_estimate");
    expect(classifyUniversalRoleQaIntent("найди поставщиков ГКЛ")).toBe("marketplace_supplier_search");
  });
});
