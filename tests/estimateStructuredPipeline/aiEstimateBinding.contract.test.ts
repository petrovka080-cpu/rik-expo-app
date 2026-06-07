import { allPayloads, foremanMessageForPayload } from "./structuredPipelineTestHelpers";

describe("AI estimate structured binding", () => {
  it("binds AI assistant messages to the structured presentation rows", () => {
    const payload = allPayloads()[1];
    const message = foremanMessageForPayload(payload);
    expect(message.estimatePresentation).toBeTruthy();
    expect(message.estimatePdfSource?.structuredEstimate).toBeTruthy();
    expect(message.estimatePresentation?.rows.map((row) => row.name)).toEqual(payload.presentation.rows.map((row) => row.name));
  });
});
