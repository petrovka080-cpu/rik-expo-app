import { allPayloads, historyBindingForPayload } from "./structuredPipelineTestHelpers";

describe("history structured estimate binding", () => {
  it("keeps generated PDF and marketplace state visible from history", () => {
    const payload = allPayloads()[2];
    const { history, binding } = historyBindingForPayload(payload);
    expect(history.length).toBeGreaterThan(0);
    expect(binding.rowsPreserved).toBe(true);
    expect(binding.pdfCount).toBeGreaterThan(0);
    expect(binding.marketplaceStatus).toBe("sent");
  });
});
