import {
  buildWorkEstimateSemanticCriticalCases,
  runWorkEstimateSemanticCriticalCase,
} from "../../scripts/estimate/workEstimateSemanticCriticalCases";

jest.setTimeout(120_000);

describe("work estimate semantic PDF and buyer handoff", () => {
  it("creates snapshot-bound PDFs and procurement-only buyer handoff for semantic critical families", () => {
    const seenGroups = new Set<string>();
    const cases = buildWorkEstimateSemanticCriticalCases().filter((testCase) => {
      if (seenGroups.has(testCase.expected_group_key)) return false;
      seenGroups.add(testCase.expected_group_key);
      return true;
    });
    const proofs = cases.map(runWorkEstimateSemanticCriticalCase);

    expect(cases).toHaveLength(21);
    expect(proofs.every((proof) => proof.passed)).toBe(true);
    expect(proofs.every((proof) => proof.snapshot_created)).toBe(true);
    expect(proofs.every((proof) => proof.pdf_generated_from_snapshot)).toBe(true);
    expect(proofs.every((proof) => proof.pdf_rows_bound_to_snapshot)).toBe(true);
    expect(proofs.every((proof) => proof.pdf_storage_object_exists)).toBe(true);
    expect(proofs.every((proof) => proof.pdf_body_length > 0)).toBe(true);
    expect(proofs.every((proof) => proof.buyer_handoff_created)).toBe(true);
    expect(proofs.every((proof) => proof.buyer_handoff_procurement_subset_valid)).toBe(true);
    expect(proofs.every((proof) => proof.buyer_work_rows_count === 0)).toBe(true);
    expect(proofs.every((proof) => proof.no_fake_final_total_without_source)).toBe(true);
  });
});
