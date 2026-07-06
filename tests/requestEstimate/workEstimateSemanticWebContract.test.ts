import {
  buildWorkEstimateSemanticCriticalCases,
  validateWorkEstimateSemanticCriticalCases,
} from "../../scripts/estimate/workEstimateSemanticCriticalCases";
import {
  buildProfessionalEstimateSnapshot,
  type ProfessionalEstimateRowKind,
} from "../../src/lib/ai/professionalEstimateTemplates";

describe("work estimate semantic web contract corpus", () => {
  it("keeps the 150-case web semantic subset stable and work-specific", () => {
    const cases = buildWorkEstimateSemanticCriticalCases();
    const snapshots = cases.map((testCase) => buildProfessionalEstimateSnapshot({
      selected_work_key: testCase.expected_family,
      quantity: 10,
      unit: "m2",
      region: "KG_BISHKEK",
    }));

    expect(cases).toHaveLength(150);
    expect(validateWorkEstimateSemanticCriticalCases(cases)).toEqual([]);
    expect(new Set(cases.map((testCase) => testCase.case_id)).size).toBe(150);
    expect(new Set(cases.map((testCase) => testCase.expected_group_key)).size).toBeGreaterThanOrEqual(21);
    expect(cases.some((testCase) => testCase.high_risk_expected)).toBe(true);
    expect(snapshots.every((snapshot, index) => snapshot.selected_work_key === cases[index].expected_family)).toBe(true);
    expect(snapshots.every((snapshot, index) => snapshot.group_key === cases[index].expected_group_key)).toBe(true);
    expect(snapshots.every((snapshot) => snapshot.lines.length > 0 && snapshot.visible_rows.length > 0)).toBe(true);
    expect(snapshots.every((snapshot) => snapshot.all_hashes_match)).toBe(true);
    expect(snapshots.every((snapshot) => {
      const rowKinds = new Set(snapshot.lines.map((line) => line.row_kind));
      const requiredKinds: ProfessionalEstimateRowKind[] = ["material", "labor", "equipment"];
      return requiredKinds.every((kind) => rowKinds.has(kind));
    })).toBe(true);
  });
});
