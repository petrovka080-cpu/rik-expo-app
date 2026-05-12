import fs from "fs";
import path from "path";

const ARTIFACT_PATH = path.join(
  process.cwd(),
  "artifacts",
  "S_AI_CORE_03B_EXPLICIT_ROLE_SECRETS_E2E_emulator.json",
);
const REQUIRED_ROLES = ["director", "foreman", "buyer", "accountant", "contractor"] as const;
const ALLOWED_BLOCKED = new Set([
  "BLOCKED_NO_E2E_ROLE_SECRETS",
  "BLOCKED_LOGIN_SCREEN_NOT_TARGETABLE_WITHOUT_STABLE_TESTIDS",
  "BLOCKED_AI_ASSISTANT_SURFACE_NOT_TARGETABLE",
  "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT",
  "BLOCKED_AI_ROLE_SCREEN_ASSERTION_FAILED",
  "BLOCKED_MAESTRO_AUTH_FLOW_RUNTIME_FAILURE",
]);

describe("AI explicit role secrets E2E artifact", () => {
  it("requires explicit secrets for green and encodes non-mutation invariants", () => {
    expect(fs.existsSync(ARTIFACT_PATH)).toBe(true);
    const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));

    expect(artifact.fake_pass_claimed).toBe(false);
    expect(artifact.service_role_discovery_used_for_green).toBe(false);
    expect(artifact.auth_admin_list_users_used_for_green).toBe(false);
    expect(artifact.db_seed_used).toBe(false);
    expect(artifact.auth_users_created).toBe(0);
    expect(artifact.auth_users_updated).toBe(0);
    expect(artifact.auth_users_deleted).toBe(0);
    expect(artifact.auth_users_invited).toBe(0);
    expect(artifact.credentials_in_cli_args).toBe(false);
    expect(artifact.credentials_printed).toBe(false);
    expect(artifact.stdout_redacted).toBe(true);
    expect(artifact.stderr_redacted).toBe(true);

    for (const role of REQUIRED_ROLES) {
      expect(typeof artifact.flows?.[role]).toBe("string");
    }

    if (
      artifact.final_status === "GREEN_AI_EXPLICIT_ROLE_SECRETS_E2E_CLOSEOUT" ||
      artifact.final_status === "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE"
    ) {
      expect(artifact.role_auth_source).toBe("explicit_env");
      expect(artifact.all_role_credentials_resolved).toBe(true);
      for (const role of REQUIRED_ROLES) {
        expect(artifact.flows?.[role]).toBe("PASS");
      }
      if (artifact.final_status === "GREEN_AI_ROLE_SCREEN_DETERMINISTIC_RELEASE_GATE") {
        expect(artifact.release_gate_status).toBe("PASS");
        expect(artifact.prompt_pipeline_status).toBe("PASS");
        expect(artifact.response_smoke_blocking_release).toBe(false);
        expect(["PASS", "BLOCKED_AI_RESPONSE_SMOKE_TIMEOUT_CANARY"]).toContain(
          artifact.response_smoke_status,
        );
      }
      expect(artifact.mutations_created).toBe(0);
      expect(artifact.approval_required_observed).toBe(true);
      expect(artifact.role_leakage_observed).toBe(false);
      return;
    }

    expect(ALLOWED_BLOCKED.has(String(artifact.final_status))).toBe(true);
    expect(typeof artifact.exactReason).toBe("string");
    expect(String(artifact.exactReason).length).toBeGreaterThan(0);
    if (artifact.final_status === "BLOCKED_NO_E2E_ROLE_SECRETS") {
      expect(artifact.role_auth_source).toBe("missing");
      expect(artifact.all_role_credentials_resolved).toBe(false);
    }
  });
});
