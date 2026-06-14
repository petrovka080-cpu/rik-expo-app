import {
  buildProfessionalEstimateMatrixSnapshot,
  gitOutput,
  readProfessionalEstimateJson,
  sourceCodeHead,
} from "../../scripts/e2e/professionalEstimate1500WorkCases";

describe("professional estimate matrix closeout evidence", () => {
  it("preserves closeout proof fields when audit runners refresh the matrix", () => {
    const closeout = readProfessionalEstimateJson("CLOSEOUT_PROOF.json");
    const matrix = buildProfessionalEstimateMatrixSnapshot();
    const head = gitOutput(["rev-parse", "HEAD"], "unknown");
    const originHead = gitOutput(["rev-parse", "@{u}"], "unknown");
    const closeoutMatchesSource = closeout?.source_code_head === sourceCodeHead();

    expect(closeout).not.toBeNull();
    expect(matrix.origin_head).toBe(originHead);
    expect(matrix.local_head_equals_origin_head).toBe(head === originHead);
    if (closeoutMatchesSource) {
      expect(matrix.platform_checks).toEqual(closeout?.platform_checks);
      expect(matrix.no_ios_runtime_claimed).toBe(true);
      expect(matrix.failures).toEqual([]);
    } else {
      expect(matrix.platform_checks).toBeUndefined();
      expect(matrix.no_ios_runtime_claimed).toBeUndefined();
      expect(matrix.failures).toBeUndefined();
    }
    expect(matrix.ios_build_started).toBe(false);
    expect(matrix.eas_build_started).toBe(false);
    expect(matrix.testflight_started).toBe(false);
    expect(matrix.production_db_write_attempted).toBe(false);
    expect(matrix.blockers).toEqual([]);
  });
});
