import { evaluateAndroidEmulatorIosBuildSubmitGateGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("android_emulator_ios_build_submit_gate architecture ratchet", () => {
  it("passes with permanent runner, profiles, artifacts, and redaction proof", () => {
    const matrix = {
      android: { aab_used_for_direct_install: false, google_play_submit: false },
      ios: { simulator_build_used_for_submit: false },
      ota: { used: false, production_ota_used: false },
      ai_role_screen_e2e: { auth_admin_used: false, service_role_used: false, list_users_used: false },
      secrets: { credentials_in_cli_args: false, credentials_printed: false, artifacts_redacted: true },
    };
    const result = evaluateAndroidEmulatorIosBuildSubmitGateGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "eas.json") {
          return '"preview" "buildType": "apk" "channel": "preview" "production" "distribution": "store" "simulator": false';
        }
        if (relativePath === "scripts/release/runAndroidEmulatorAndIosSubmitGate.ts") {
          return "runAndroidEmulatorAndIosSubmitGate ensureAndroidEmulatorReady preview production E2E_ALLOW_IOS_BUILD E2E_ALLOW_IOS_SUBMIT E2E_ALLOW_ANDROID_APK_BUILD buildIosSubmitArgs resolveExplicitAiRoleAuthEnv";
        }
        if (relativePath === "scripts/release/redactReleaseOutput.ts") {
          return "redactReleaseOutput EXPO_TOKEN EXPO_APPLE_APP_SPECIFIC_PASSWORD SUPABASE_SERVICE_ROLE_KEY";
        }
        if (relativePath === "maestro/flows/foundation/launch-and-login-screen.yaml") {
          return "appId: com.azisbek_dzhantaev.rikexpoapp launchApp";
        }
        if (relativePath.endsWith("_matrix.json")) return JSON.stringify(matrix);
        if (relativePath.endsWith("_android.json")) {
          return JSON.stringify({ build_profile: "preview", aab_used_for_direct_install: false, google_play_submit: false });
        }
        if (relativePath.endsWith("_ios.json")) {
          return JSON.stringify({ submit_profile: "production", simulator_build_used_for_submit: false });
        }
        if (relativePath.endsWith("_inventory.json")) return "{}";
        return "";
      },
    });

    expect(result.check.status).toBe("pass");
  });
});
