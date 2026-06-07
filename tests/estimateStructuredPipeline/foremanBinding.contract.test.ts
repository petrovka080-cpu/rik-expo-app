import { allPayloads, foremanBindingForPayload } from "./structuredPipelineTestHelpers";

describe("foreman structured estimate binding", () => {
  it("keeps foreman AI rows, PDF source and actions on the structured payload", () => {
    const payload = allPayloads()[1];
    const binding = foremanBindingForPayload(payload);
    expect(binding.presentation.rows.map((row) => row.name)).toEqual(payload.presentation.rows.map((row) => row.name));
    expect(binding.estimatePdfSource.structuredEstimate).toBe(payload.sourceEstimate);
    expect(binding.actions.some((action) => action.id === "make_estimate_pdf" && action.visibleWhen === "message_has_estimate_payload")).toBe(true);
  });
});
