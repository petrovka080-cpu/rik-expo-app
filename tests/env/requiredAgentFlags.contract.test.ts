import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  REQUIRED_AGENT_OWNER_FLAGS,
  buildRequiredAgentFlagsReport,
  loadAgentOwnerFlagsIntoEnv,
} from "../../scripts/env/checkRequiredAgentFlags";

function createTempProject(envFileContents: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-flags-"));
  fs.writeFileSync(path.join(root, ".env.agent.staging.local"), envFileContents, "utf8");
  return root;
}

describe("required agent explicit flags", () => {
  it("reports owner approval keys by name without printing values", () => {
    const root = createTempProject(`
S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED=true
S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED=true
S_PRODUCTION_DB_MIGRATION_APPLY_APPROVED=true
S_PRODUCTION_DB_MIGRATION_VERIFY_APPROVED=true
S_AI_ACTION_LEDGER_MIGRATION_APPLY_APPROVED=true
S_AI_ACTION_LEDGER_MIGRATION_VERIFY_APPROVED=true
S_AI_ACTION_LEDGER_MIGRATION_ROLLBACK_PLAN_APPROVED=true
E2E_DIRECTOR_EMAIL=director@example.test
E2E_DIRECTOR_PASSWORD=director-password
`);

    const report = buildRequiredAgentFlagsReport({}, root);
    const serialized = JSON.stringify(report);

    expect(report.status).toBe("GREEN_EXPLICIT_ENV_OWNER_GATES_NORMALIZED");
    expect(report.ownerFlags.map((flag) => flag.key)).toEqual([...REQUIRED_AGENT_OWNER_FLAGS]);
    expect(report.missingOwnerFlags).toEqual([]);
    expect(report.valuesPrinted).toBe(false);
    expect(report.secretsPrinted).toBe(false);
    expect(serialized).not.toContain("director@example.test");
    expect(serialized).not.toContain("director-password");
  });

  it("returns the exact blocker when a required owner flag is absent or disabled", () => {
    const root = createTempProject(`
S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED=true
S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED=false
`);

    const report = buildRequiredAgentFlagsReport({}, root);

    expect(report.status).toBe("BLOCKED_REQUIRED_OWNER_FLAGS_MISSING");
    expect(report.missingOwnerFlags).toEqual([
      "S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED",
      "S_PRODUCTION_DB_MIGRATION_APPLY_APPROVED",
      "S_PRODUCTION_DB_MIGRATION_VERIFY_APPROVED",
      "S_AI_ACTION_LEDGER_MIGRATION_APPLY_APPROVED",
      "S_AI_ACTION_LEDGER_MIGRATION_VERIFY_APPROVED",
      "S_AI_ACTION_LEDGER_MIGRATION_ROLLBACK_PLAN_APPROVED",
    ]);
  });

  it("loads only owner approval flags into process env for release guard consumption", () => {
    const root = createTempProject(`
S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED=true
S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED=true
S_PRODUCTION_DB_MIGRATION_APPLY_APPROVED=true
S_PRODUCTION_DB_MIGRATION_VERIFY_APPROVED=true
S_AI_ACTION_LEDGER_MIGRATION_APPLY_APPROVED=true
S_AI_ACTION_LEDGER_MIGRATION_VERIFY_APPROVED=true
S_AI_ACTION_LEDGER_MIGRATION_ROLLBACK_PLAN_APPROVED=true
E2E_DIRECTOR_PASSWORD=should-not-load
`);
    const env: Record<string, string | undefined> = {};

    loadAgentOwnerFlagsIntoEnv(env, root);

    expect(env.S_PRODUCTION_MIGRATION_GAP_APPLY_OR_REPAIR_APPROVED).toBe("true");
    expect(env.S_PROVIDERS_PRODUCTION_DB_WRITE_APPROVED).toBe("true");
    expect(env.E2E_DIRECTOR_PASSWORD).toBeUndefined();
  });
});
