import { evaluateAiExplicitRoleSecretsE2eGateGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI explicit role secrets e2e gate architecture ratchet", () => {
  it("passes for explicit-only runner, redactor, e2e suite, and honest local artifact", () => {
    const result = evaluateAiExplicitRoleSecretsE2eGateGuardrail({ projectRoot: process.cwd() });
    expect(result.check).toEqual({
      name: "ai_explicit_role_secrets_e2e_gate",
      status: "pass",
      errors: [],
    });
  });

  it("fails if discovery is used as a green path", () => {
    const result = evaluateAiExplicitRoleSecretsE2eGateGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "scripts/e2e/ensureAndroidEmulatorReady.ts") {
          return "ensureAndroidEmulatorReady -list-avds sys.boot_completed fakePassClaimed: false";
        }
        if (relativePath === "scripts/e2e/runAiRoleScreenKnowledgeMaestro.ts") {
          return [
            "runAiRoleScreenKnowledgeMaestro",
            "ensureAndroidEmulatorReady",
            "resolveAiRoleScreenKnowledgeAuthEnv",
            "resolveExplicitAiRoleAuthEnv",
            "redactE2eSecrets",
            "listUsers",
            "auth.admin",
            "mutations_created: 0",
            "approval_required_observed",
          ].join(" ");
        }
        if (relativePath === "scripts/e2e/resolveExplicitAiRoleAuthEnv.ts") {
          return "resolveExplicitAiRoleAuthEnv BLOCKED_NO_E2E_ROLE_SECRETS E2E_DIRECTOR_EMAIL";
        }
        if (relativePath === "scripts/e2e/redactE2eSecrets.ts") {
          return "redactE2eSecrets Authorization SUPABASE_SERVICE_ROLE_KEY EXPO_PUBLIC_SUPABASE_ANON_KEY";
        }
        if (relativePath.endsWith(".yaml")) return "role flow";
        if (relativePath.endsWith("_emulator.json")) {
          return JSON.stringify({
            final_status: "GREEN_AI_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT",
            role_auth_source: "existing_readonly_auth_discovery",
            all_role_credentials_resolved: true,
            service_role_discovery_used_for_green: true,
            auth_admin_list_users_used_for_green: true,
            db_seed_used: false,
            auth_users_created: 0,
            auth_users_updated: 0,
            auth_users_deleted: 0,
            auth_users_invited: 0,
            credentials_in_cli_args: false,
            credentials_printed: false,
            stdout_redacted: true,
            stderr_redacted: true,
            fake_pass_claimed: false,
            flows: {
              director: "PASS",
              foreman: "PASS",
              buyer: "PASS",
              accountant: "PASS",
              contractor: "PASS",
            },
            mutations_created: 0,
            approval_required_observed: true,
            role_leakage_observed: false,
          });
        }
        return "";
      },
    });

    expect(result.check.status).toBe("fail");
    expect(result.check.errors).toEqual(
      expect.arrayContaining([
        "e2e_runner_contains_auth_discovery_path",
        "e2e_artifact_auth_discovery_or_seed_used",
        "green_artifact_role_auth_source_not_explicit_env",
      ]),
    );
  });
});
