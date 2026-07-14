import {
  currentHeadAtWriteTime,
  sourceCodeHead,
  withProfessionalEstimateLineage,
} from "../../scripts/e2e/professionalEstimate1500WorkCases";

describe("professional estimate proof lineage", () => {
  it("anchors generated proof artifacts to the source-code head without SHA loops", () => {
    const sourceHead = sourceCodeHead();
    const currentHead = currentHeadAtWriteTime();
    const artifact = withProfessionalEstimateLineage({
      final_status: "GREEN_PROFESSIONAL_ESTIMATE_LINEAGE_NO_SHA_LOOP",
    });

    expect(currentHead).toBe(sourceHead);
    expect(artifact.source_code_head).toBe(sourceHead);
    expect(artifact.current_head_at_write_time).toBe(sourceHead);
    expect(artifact.fake_green_claimed).toBe(false);
  });
});
