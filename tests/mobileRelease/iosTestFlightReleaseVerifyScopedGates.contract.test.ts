import { REQUIRED_RELEASE_GATES } from "../../scripts/release/releaseGuard.shared";
import {
  IOS_TESTFLIGHT_RELEASE_VERIFY_REQUIRED_GATE_NAMES,
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
  expect(artifact.final_status).toBe("GREEN_IOS_TESTFLIGHT_RELEASE_VERIFY_SCOPE_READY");
  expect(artifact.fake_green_claimed).toBe(false);
  expect(artifact.public_beta_enabled).toBe(false);
  expect(artifact.production_rollout_enabled).toBe(false);
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
});
