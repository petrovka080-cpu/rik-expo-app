import { matrixPartial, securityAnswer, runtimeAnswer, expectReadOnly, expectSources } from "./aiSecurityRuntimeTestHelpers";

describe("security runtime governance funnel", () => {
  it("builds a source-grounded read-only governance funnel without fake green", () => {
    const matrix = matrixPartial();
    expect(matrix.final_status).toBe("PARTIAL_AI_SECURITY_RUNTIME_GOVERNANCE_FUNNEL_READY");
    expect(matrix.security_screen_ready).toBe(true);
    expect(matrix.runtime_screen_dev_admin_only_ready).toBe(true);
    expect(matrix.fake_green_claimed).toBe(false);
    expect(matrix.release_verify_passed).toBe(false);

    const security = securityAnswer();
    const runtime = runtimeAnswer();
    expectSources(security);
    expectSources(runtime);
    expectReadOnly(security);
    expectReadOnly(runtime);
  });
});
