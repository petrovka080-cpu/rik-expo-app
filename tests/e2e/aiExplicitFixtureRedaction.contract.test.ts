import {
  redactAiE2eFixtureRecord,
  redactAiE2eFixtureText,
} from "../../src/features/ai/e2eFixtures/aiE2eFixtureRedaction";
import type { AiE2eFixtureEnvKey } from "../../src/features/ai/e2eFixtures/aiE2eFixtureTypes";
import { resolveAiExplicitFixturesForArtifact } from "../../scripts/e2e/resolveAiExplicitFixtures";

const fixtureEnv: Record<AiE2eFixtureEnvKey, string> = {
  E2E_PROCUREMENT_REQUEST_REF: "request-ref-000000000001",
  E2E_APPROVED_PROCUREMENT_ACTION_REF: "action-approved-0000001",
  E2E_PENDING_APPROVAL_ACTION_REF: "action-pending-0000001",
  E2E_COMMAND_CENTER_SCREEN_REF: "screen-command-center-001",
  E2E_WAREHOUSE_ITEM_REF: "warehouse-item-0000001",
  E2E_FINANCE_COMPANY_REF: "finance-company-0000001",
  E2E_CONTRACTOR_OWN_SUBCONTRACT_REF: "contractor-subcontract-0001",
  E2E_ROLE_MODE: "developer_full_access_or_separate_roles",
};
const env: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  ...fixtureEnv,
};

describe("explicit AI E2E fixture redaction", () => {
  it("redacts fixture values before artifact serialization", () => {
    const redacted = redactAiE2eFixtureRecord(fixtureEnv);

    expect(redacted.E2E_PROCUREMENT_REQUEST_REF).toBe("<redacted-fixture:0001>");
    expect(JSON.stringify(redacted)).not.toContain("request-ref-000000000001");
  });

  it("keeps resolver artifact output free from raw fixture refs", () => {
    const artifact = resolveAiExplicitFixturesForArtifact(env);
    const serialized = redactAiE2eFixtureText(JSON.stringify(artifact), Object.values(fixtureEnv));

    expect(serialized).not.toContain("request-ref-000000000001");
    expect(serialized).not.toContain("action-approved-0000001");
    expect(serialized).toContain("<redacted-fixture:");
    expect(artifact).toMatchObject({
      source: "explicit_env",
      status: "loaded",
      rawFixtureValuesPrinted: false,
    });
  });
});
