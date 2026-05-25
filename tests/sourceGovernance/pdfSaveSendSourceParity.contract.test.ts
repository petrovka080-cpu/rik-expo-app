import { buildGovernedPayloadSet } from "./sourceGovernanceTestHelpers";

describe("PDF/save/send source governance parity", () => {
  it("keeps governed source fields across draft save, PDF generation and send payloads", async () => {
    const { parity, governance, payloads } = await buildGovernedPayloadSet();
    expect(parity.passed).toBe(true);
    expect(governance.every((item) => item.passed)).toBe(true);
    expect(governance.some((item) => item.priceWithoutSourceFound)).toBe(false);
    expect(governance.some((item) => item.fakeAvailabilityFound)).toBe(false);
    expect(governance.some((item) => item.fakeStockFound)).toBe(false);
    expect(governance.some((item) => item.fakeSupplierFound)).toBe(false);
    expect(payloads.draftSave.items.some((item) => item.sourceId)).toBe(true);
    expect(payloads.pdfGeneration.items).toEqual(payloads.draftSave.items);
    expect(payloads.marketplaceSend.items).toEqual(payloads.draftSave.items);
  });
});
