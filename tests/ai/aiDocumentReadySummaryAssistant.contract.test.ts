import { buildDocumentReadySummaryAssistant } from "../../src/features/ai/documents/aiDocumentReadySummaryAssistant";

describe("document ready summary assistant", () => {
  it("summarizes document evidence, risks, and missing evidence without signing or deleting", () => {
    const pack = buildDocumentReadySummaryAssistant({
      document: {
        id: "doc-1",
        title: "Накладная Evidence Supplier",
        linkedRequestId: "#1248",
        linkedPaymentLabel: "1 200 000 ₸",
        importantFields: ["сумма", "поставщик"],
        missingEvidence: ["подтверждение доставки"],
        risks: ["платёж без полного комплекта документов"],
        evidence: ["document:doc-1"],
      },
    });

    expect(pack.summary).toContain("#1248");
    expect(pack.readyItems[0]?.primaryActionLabel).toBe("Подготовить резюме");
    expect(pack.missingData[0]?.label).toBe("подтверждение доставки");
  });
});
