import { REAL_WORK_ONTOLOGY_10000_CASES, resolveConstructionWorkOntologyIntent } from "./workOntologyTestHelpers";

describe("work ontology selected work key propagation", () => {
  it("keeps selected work key identical across result, UI payload, and PDF payload", () => {
    for (const testCase of REAL_WORK_ONTOLOGY_10000_CASES.slice(0, 100)) {
      const result = resolveConstructionWorkOntologyIntent(testCase.user_input_ru);
      expect(result.selected_work_key).toBe(testCase.expected_canonical_work_key);
      expect(result.ui_payload.selected_work_key).toBe(result.selected_work_key);
      expect(result.pdf_payload.selected_work_key).toBe(result.selected_work_key);
      expect(result.ui_payload.visible_work_name_ru).toBe(result.visible_work_name_ru);
      expect(result.pdf_payload.visible_work_name_ru).toBe(result.visible_work_name_ru);
    }
  });
});
