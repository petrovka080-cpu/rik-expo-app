import {
  CURRENT_VISIBLE500_FORBIDDEN_SCOPED_OUT_ENV,
  assertNoCurrentVisible500ScopedOutFinalProofEnv,
  detectCurrentVisible500ScopedOutFinalProofEnv,
} from "../../scripts/release/assertNoCurrentVisible500ScopedOutFinalProofEnv";

describe("current Visible500 final closeout scoped-out env guard", () => {
  it("passes when no scoped-out final proof env is set", () => {
    const report = assertNoCurrentVisible500ScopedOutFinalProofEnv({});

    expect(report.scoped_out_env_detected).toBe(false);
    expect(report.real500_api34_scoped_out).toBe(false);
    expect(report.api34_scoped_out).toBe(false);
    expect(report.full_jest_scoped_out).toBe(false);
    expect(report.release_verify_scoped_out).toBe(false);
    expect(report.fake_green_claimed).toBe(false);
  });

  it.each(CURRENT_VISIBLE500_FORBIDDEN_SCOPED_OUT_ENV)(
    "blocks %s in final closeout proof",
    (envName) => {
      const env = { [envName]: "1" };
      const report = detectCurrentVisible500ScopedOutFinalProofEnv(env);

      expect(report.scoped_out_env_detected).toBe(true);
      expect(report.detected_env_names).toEqual([envName]);
      expect(() => assertNoCurrentVisible500ScopedOutFinalProofEnv(env)).toThrow(
        "BLOCKED_SCOPED_OUT_ENV_USED_IN_FINAL_CLOSEOUT",
      );
    },
  );
});
