import {
  REQUEST_PROMPTS,
  estimateForRequest,
  presentationForEstimate,
  requestDraft,
} from "./b2cRequestEmbeddedAiExpandedEstimateTestHelpers";

describe("/request draft rows come from GlobalEstimateResult", () => {
  it("maps GlobalEstimateResult rows into the consumer draft", () => {
    for (const prompt of Object.values(REQUEST_PROMPTS)) {
      const viewModel = presentationForEstimate(estimateForRequest(prompt));
      const draft = requestDraft(prompt);
      const draftNames = draft.items.map((item) => item.titleRu);
      expect(draft.items).toHaveLength(viewModel.rows.length);
      for (const row of viewModel.rows.slice(0, 6)) {
        expect(draftNames).toContain(`${row.rowNumber} ${row.name}`);
      }
    }
  });
});
