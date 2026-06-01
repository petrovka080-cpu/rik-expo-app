import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import {
  IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE,
  IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES,
  IOS_TESTFLIGHT_SCOPED_OUT_GATE_STATUS,
  writeIosTestFlightReleaseVerifyScopeProof,
} from "../../scripts/release/runIosTestFlightReleaseVerifyScopeProof";

it("scopes release verify to iOS internal TestFlight gates without broad release fake-green", () => {
  expect(IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES).toEqual([
    "ios-testflight-release-scope-proof",
    "tsc",
    "expo-lint",
    "ios-testflight-test-weakening-scan",
    "jest-run-in-band",
    "git-diff-check",
  ]);

  expect(IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES).not.toContain(
    "android-api34-canonical-replay-b2c-expanded-estimate-binding-proof",
  );
  expect(IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES).not.toContain(
    "ai-estimate-limited-public-beta-allowlist-closeout-proof",
  );
  expect(IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES).not.toContain(
    "real-10000-diverse-construction-works-expanded-estimate-proof",
  );

  const artifact = writeIosTestFlightReleaseVerifyScopeProof();
  expect(artifact.current_release_wave).toBe("IOS_TESTFLIGHT_INTERNAL_QA");
  expect(artifact.release_verify_scope).toBe(IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE);
  expect(artifact.release_verify_scope_aware).toBe(true);
  expect(artifact.final_status).toBe("GREEN_IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE_READY");
  expect(artifact.required_gates_passed).toBe(false);
  expect(artifact.full_jest_passed).toBe(false);
  expect(artifact.release_verify_passed).toBe(false);
  expect(artifact.fake_green_claimed).toBe(false);
  expect(artifact.app_review_submitted).toBe(false);
  expect(artifact.external_beta_review_submitted).toBe(false);
  expect(artifact.public_beta_enabled).toBe(false);
  expect(artifact.production_rollout_enabled).toBe(false);
  expect(artifact.android_api34_global_replay_required).toBe(false);
  expect(artifact.real10000_required).toBe(false);
  expect(artifact.public_beta_allowlist_required).toBe(false);
  expect(artifact.built_in_ai10000_required).toBe(false);
  expect(artifact.fifty_k_required).toBe(false);
  expect(artifact.global_release_gates_removed).toBe(false);
  expect(artifact.global_release_gates_weakened).toBe(false);
  expect(artifact.global_release_verify_still_available).toBe(true);
  expect(artifact.scoped_out_gates_claimed_green).toBe(false);
  expect(artifact.scoped_out_gate_count).toBeGreaterThan(0);
  expect(artifact.scoped_out_gate_names).toEqual(
    expect.arrayContaining([
      "android-api34-canonical-replay-b2c-expanded-estimate-binding-proof",
      "ai-estimate-limited-public-beta-allowlist-closeout-proof",
      "real-10000-diverse-construction-works-expanded-estimate-proof",
    ]),
  );
  const requiredGateNames = new Set(IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES);
  expect(artifact.scoped_out_gate_count).toBe(
    REQUIRED_RELEASE_GATES.filter((gate) => !requiredGateNames.has(gate.name)).length,
  );
  expect(artifact.scoped_out_gates).toHaveLength(artifact.scoped_out_gate_count);
  expect(artifact.scoped_out_gates).toEqual(
    expect.arrayContaining([
      {
        gate: "android-api34-canonical-replay-b2c-expanded-estimate-binding-proof",
        status: IOS_TESTFLIGHT_SCOPED_OUT_GATE_STATUS,
        required_for_current_wave: false,
        required_for_ios_internal_testflight: false,
        green_claimed: false,
        fake_green_claimed: false,
      },
      {
        gate: "real-10000-diverse-construction-works-expanded-estimate-proof",
        status: IOS_TESTFLIGHT_SCOPED_OUT_GATE_STATUS,
        required_for_current_wave: false,
        required_for_ios_internal_testflight: false,
        green_claimed: false,
        fake_green_claimed: false,
      },
      {
        gate: "ai-estimate-limited-public-beta-allowlist-closeout-proof",
        status: IOS_TESTFLIGHT_SCOPED_OUT_GATE_STATUS,
        required_for_current_wave: false,
        required_for_ios_internal_testflight: false,
        green_claimed: false,
        fake_green_claimed: false,
      },
    ]),
  );
  expect(artifact.scoped_out_gates.every((gate) => gate.green_claimed === false)).toBe(true);
  expect(artifact.scoped_out_gates.every((gate) => gate.fake_green_claimed === false)).toBe(true);
  expect(REQUIRED_RELEASE_GATES.map((gate) => gate.name)).toEqual(
    expect.arrayContaining([
      "android-api34-canonical-replay-b2c-expanded-estimate-binding-proof",
      "ai-estimate-limited-public-beta-allowlist-closeout-proof",
      "real-10000-diverse-construction-works-expanded-estimate-proof",
    ]),
  );
});
