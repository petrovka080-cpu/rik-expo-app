import fs from "fs";
import path from "path";

import {
  AI_PERSISTENT_APPROVAL_QUEUE_READINESS,
  getCompatiblePersistentApprovalQueueCandidates,
  getPersistentApprovalQueueBlockers,
} from "../../src/features/ai/approval/aiApprovalTypes";
import { runSubmitForApprovalToolGate } from "../../src/features/ai/tools/submitForApprovalTool";

const artifactDir = path.join(process.cwd(), "artifacts");
const matrixPath = path.join(
  artifactDir,
  "S_AI_APPROVAL_02_PERSISTENT_APPROVAL_QUEUE_GATE_matrix.json",
);
const inventoryPath = path.join(
  artifactDir,
  "S_AI_APPROVAL_02_PERSISTENT_APPROVAL_QUEUE_GATE_inventory.json",
);
const proofPath = path.join(
  artifactDir,
  "S_AI_APPROVAL_02_PERSISTENT_APPROVAL_QUEUE_GATE_proof.md",
);
const proposalPath = path.join(
  artifactDir,
  "S_AI_APPROVAL_02_PERSISTENT_APPROVAL_QUEUE_GATE_migration_proposal.md",
);

describe("persistent approval queue readiness contract", () => {
  it("documents the allowed blocker instead of claiming a fake persistent queue", () => {
    expect(AI_PERSISTENT_APPROVAL_QUEUE_READINESS).toMatchObject({
      finalStatus: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
      greenStatus: "GREEN_AI_PERSISTENT_APPROVAL_QUEUE_READY",
      persistentBackendFound: false,
      compatibleCandidateCount: 0,
      fakeLocalApproval: false,
      migrationProposalOnly: true,
      migrationApplied: false,
      dbWritesPerformed: false,
      authAdminUsed: false,
      listUsersUsed: false,
      serviceRoleUsed: false,
    });

    expect(getCompatiblePersistentApprovalQueueCandidates()).toEqual([]);
    expect(getPersistentApprovalQueueBlockers()).toEqual(
      expect.arrayContaining([
        expect.stringContaining("public.approval_queue: missing idempotency_key"),
        expect.stringContaining("public.approval_ledger: director approval side-effect ledger"),
        expect.stringContaining("public.submit_jobs: worker job queue lifecycle"),
        expect.stringContaining("local_ai_approval_gate: local policy gate only"),
      ]),
    );
  });

  it("keeps the current submit_for_approval path explicitly local-only until storage exists", async () => {
    await expect(
      runSubmitForApprovalToolGate({
        auth: { userId: "director-user", role: "director" },
        input: {
          draft_id: "draft-request-1",
          approval_target: "request",
          screen_id: "director.dashboard",
          domain: "control",
          summary: "Submit request for approval",
          idempotency_key: "approval-persistent-gate-0001",
          evidence_refs: ["approval:test:evidence"],
        },
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        action_status: "pending",
        persisted: false,
        local_gate_only: true,
        mutation_count: 0,
        final_execution: 0,
        provider_called: false,
        db_accessed: false,
        direct_execution_enabled: false,
      },
    });
  });

  it("writes redacted blocker artifacts and a proposal-only migration document", () => {
    for (const filePath of [matrixPath, inventoryPath, proofPath, proposalPath]) {
      expect(fs.existsSync(filePath)).toBe(true);
    }

    const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
    const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
    const proof = fs.readFileSync(proofPath, "utf8");
    const proposal = fs.readFileSync(proposalPath, "utf8");

    expect(matrix).toMatchObject({
      final_status: "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND",
      fake_local_approval: false,
      migration_proposal_only: true,
      migration_applied: false,
      db_writes_performed: false,
      service_role_used: false,
      auth_admin_used: false,
      list_users_used: false,
    });
    expect(inventory.candidates).toHaveLength(
      AI_PERSISTENT_APPROVAL_QUEUE_READINESS.candidates.length,
    );
    expect(proof).toContain("BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND");
    expect(proposal).toContain("PROPOSAL ONLY");
    expect(proposal).toContain("agent_action_approvals");
    expect(proposalPath).not.toContain("supabase/migrations");
  });
});
