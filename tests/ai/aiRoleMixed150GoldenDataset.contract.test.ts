import {
  getAiGoldenBusinessDataset,
  validateAiGoldenBusinessDataset,
} from "../../src/lib/ai/evaluation/goldenBusinessDataset";

describe("S_AI_ROLE_MIXED_150: golden business dataset", () => {
  it("contains the required linked real-answer facts for evaluation only", () => {
    const dataset = getAiGoldenBusinessDataset();
    const integrity = validateAiGoldenBusinessDataset(dataset);

    expect(dataset.purpose).toBe("deterministic_evaluation_only_not_production_user_data");
    expect(dataset.procurement.may2026Total).toBe(14);
    expect(dataset.procurement.statuses).toMatchObject({
      approved: 8,
      pending: 3,
      revision: 2,
      closed: 1,
    });
    expect(dataset.procurement.mainRequest.number).toBe(124);
    expect(dataset.procurement.mainRequest.requiredSheets).toBe(80);
    expect(dataset.warehouse.gkl.issuedSheets).toBe(20);
    expect(dataset.warehouse.gkl.remainingSheets).toBe(0);
    expect(dataset.warehouse.gkl.shortageSheets).toBe(60);
    expect(dataset.finance.paymentsMissingDocsCount).toBe(3);
    expect(dataset.finance.paymentsMissingDocsSumKgs).toBe(245000);
    expect(dataset.documents.pdfInvoice45.linkedPaymentId).toBe("payment_77");
    expect(dataset.documents.pdfInvoice45.linkedRequestId).toBe("req_124");
    expect(integrity).toMatchObject({ passed: true, failures: [] });
  });
});
