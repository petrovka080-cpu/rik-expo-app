import {
  evaluatePostInstallReleaseSignoffGateGuardrail,
} from "../../scripts/architecture_anti_regression_suite";

describe("post install release signoff architecture gate", () => {
  it("fails if post-install runtime or submit proof can be faked", () => {
    const result = evaluatePostInstallReleaseSignoffGateGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("_matrix.json")) {
          return JSON.stringify({
            android: { apk_installed_on_emulator: false, runtime_smoke: "BLOCKED", google_play_submit: true },
            ios: { submit_started: false, submit_status_captured: false },
            ai_role_screen_e2e: { auth_admin_used: false, service_role_used: false, list_users_used: false },
            ota: { used: true, production_ota_used: true },
            secrets: { credentials_in_cli_args: true, credentials_printed: true, artifacts_redacted: false },
          });
        }
        if (relativePath.endsWith("_android.json")) {
          return JSON.stringify({ apk_installed_on_emulator: false, runtime_smoke: "BLOCKED", fake_emulator_pass: true });
        }
        if (relativePath.endsWith("_ios.json")) {
          return JSON.stringify({ submit_started: false, submit_status_captured: false, fake_submit_pass: true });
        }
        return "";
      },
    });

    expect(result.check.status).toBe("fail");
    expect(result.check.errors).toEqual(
      expect.arrayContaining([
        "android_post_install_runtime_smoke_not_proven",
        "ios_submit_status_not_proven",
        "android_play_submit_not_blocked",
        "production_ota_not_blocked",
        "fake_pass_claim_possible",
      ]),
    );
  });
});
