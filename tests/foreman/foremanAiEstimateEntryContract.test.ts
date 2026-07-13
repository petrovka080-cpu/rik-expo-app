import {
  buildForemanAiEstimateEntryContractMatrix,
  buildForemanAiEstimateEntries,
  validateForemanAiEstimateEntries,
} from "../../src/lib/foreman";

describe("foreman AI estimate entry contract", () => {
  it("declares materials and subcontracts as shared AI estimate entry points", () => {
    const entries = buildForemanAiEstimateEntries();
    const validations = validateForemanAiEstimateEntries(entries);
    const matrix = buildForemanAiEstimateEntryContractMatrix(entries);

    expect(validations.every((item) => item.valid)).toBe(true);
    expect(entries).toHaveLength(2);
    expect(matrix).toMatchObject({
      foreman_ai_estimate_entry_contract_created: true,
      foreman_materials_entry_created: true,
      foreman_subcontracts_entry_created: true,
      materials_entry_uses_shared_ai_estimate_engine: true,
      subcontracts_entry_uses_shared_ai_estimate_engine: true,
      old_picker_not_used: true,
      generic_draft_not_used: true,
      fake_green_claimed: false,
    });
    expect(entries.map((entry) => entry.estimateButtonTestId).sort()).toEqual([
      "foreman-materials-estimate-open",
      "foreman-subcontracts-estimate-open",
    ]);
  });
});
