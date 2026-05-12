import fs from "fs";
import path from "path";

import {
  AI_PERSISTENT_APPROVAL_QUEUE_REQUIRED_FIELDS,
  AI_PERSISTENT_APPROVAL_QUEUE_READINESS,
} from "../../src/features/ai/approval/aiApprovalTypes";
import { runSubmitForApprovalToolGate } from "../../src/features/ai/tools/submitForApprovalTool";

const proposalPath = path.join(
  process.cwd(),
  "artifacts",
  "S_AI_APPROVAL_02_PERSISTENT_APPROVAL_QUEUE_GATE_migration_proposal.md",
);

describe("approval idempotency readiness contract", () => {
  it("keeps idempotency and audit fields mandatory for the future persistent queue", () => {
    expect(AI_PERSISTENT_APPROVAL_QUEUE_REQUIRED_FIELDS).toEqual(
      expect.arrayContaining(["action_id", "idempotency_key", "audit_event", "redacted_payload"]),
    );
    expect(AI_PERSISTENT_APPROVAL_QUEUE_READINESS.requiredDecisionStatuses).toEqual(
      expect.arrayContaining(["pending", "approved", "rejected", "expired", "executed"]),
    );
  });

  it("rejects approval submission without a strong idempotency key", async () => {
    await expect(
      runSubmitForApprovalToolGate({
        auth: { userId: "buyer-user", role: "buyer" },
        input: {
          draft_id: "draft-request-2",
          approval_target: "request",
          screen_id: "buyer.main",
          domain: "procurement",
          summary: "Submit buyer request",
          idempotency_key: "short",
          evidence_refs: ["request:evidence:1"],
        },
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "SUBMIT_FOR_APPROVAL_INVALID_INPUT",
        message: expect.stringContaining("idempotency_key"),
      },
    });
  });

  it("proposal-only schema includes an idempotency uniqueness boundary and audit event", () => {
    const proposal = fs.readFileSync(proposalPath, "utf8");

    expect(proposal).toContain("idempotency_key");
    expect(proposal).toContain("audit_event");
    expect(proposal).toContain("unique");
    expect(proposal).toContain("ux_agent_action_approvals_idempotency_key");
    expect(proposal).not.toContain("apply this migration");
  });
});
