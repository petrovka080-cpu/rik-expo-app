import { readProjectFile } from "./aiUniversalSmokeTestHelpers";

describe("universal smoke semantic bug regressions", () => {
  it("locks the construction semantic regressions found by live smoke", () => {
    const source = readProjectFile("scripts/e2e/runAiUniversalQaSmokeToReleaseGate.ts");

    expect(source).toContain("laminate_not_classified_as_masonry");
    expect(source).toContain("metal_structures_not_classified_as_windows");
    expect(source).toContain("foundation_waterproofing_not_flattened_to_foundation");
    expect(source).toContain("painting_classified_as_painting");
    expect(source).toContain("accountant_invoice_count_not_single_invoice_detail");
    expect(source).toContain("laminate_100m2_typo_returns_laminate_estimate");
    expect(source).toContain("semantic regression failed");
  });
});
