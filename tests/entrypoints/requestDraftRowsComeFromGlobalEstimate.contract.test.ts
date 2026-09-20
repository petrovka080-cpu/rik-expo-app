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
      const supplemental = draft.items.filter((item) =>
        item.sourceParameters?.supplementalCompositionOwner === "professional-elevated-work-access-policy:v1",
      );
      const supplementalCodes = supplemental.map((item) => item.sourceParameters?.rowCode).sort();
      expect(draft.items).toHaveLength(viewModel.rows.length + supplemental.length);
      for (const row of viewModel.rows) {
        expect(draftNames).toContain(`${row.rowNumber} ${row.name}`);
      }
      expect(supplementalCodes).toEqual(prompt === REQUEST_PROMPTS.roofWaterproofing
        ? [
            "elevated_access_assembly_reposition_dismantle",
            "elevated_access_delivery_return",
            "elevated_access_equipment",
            "elevated_access_fall_protection_set",
          ]
        : []);
    }
  });
});
