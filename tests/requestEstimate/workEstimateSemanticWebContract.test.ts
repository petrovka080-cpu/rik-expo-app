import { buildProfessionalEstimate1500Cases } from "../../scripts/e2e/professionalEstimate1500WorkCases";
import {
  buildProfessionalEstimateSnapshot,
  type ProfessionalEstimateRowKind,
} from "../../src/lib/ai/professionalEstimateTemplates";

describe("work estimate semantic web contract corpus", () => {
  it("keeps the 150-case web semantic subset stable and work-specific", () => {
    const cases = buildProfessionalEstimate1500Cases().slice(0, 150);
    const snapshots = cases.map((testCase) => buildProfessionalEstimateSnapshot({
      selected_work_key: testCase.expected_canonical_work_key ?? "",
      quantity: testCase.quantity,
      unit: testCase.unit,
      region: testCase.region,
    }));

    expect(cases).toHaveLength(150);
    expect(new Set(cases.map((testCase) => testCase.id)).size).toBe(150);
    expect(snapshots.every((snapshot, index) => snapshot.selected_work_key === cases[index].expected_canonical_work_key)).toBe(true);
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
