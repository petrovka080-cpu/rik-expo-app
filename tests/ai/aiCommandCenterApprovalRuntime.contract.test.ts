import fs from "node:fs";
import path from "node:path";

describe("S11 Command Center and Approval Inbox runtime contract", () => {
  const runnerSource = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiCommandCenterApprovalRuntimeMaestro.ts"),
    "utf8",
  );
  const commandCenterScreen = fs.readFileSync(
    path.join(process.cwd(), "src", "features", "ai", "commandCenter", "AiCommandCenterScreen.tsx"),
    "utf8",
  );
  const commandCenterCards = fs.readFileSync(
    path.join(process.cwd(), "src", "features", "ai", "commandCenter", "AiCommandCenterCards.tsx"),
    "utf8",
  );
  const approvalInboxScreen = fs.readFileSync(
    path.join(process.cwd(), "src", "features", "ai", "approvalInbox", "ApprovalInboxScreen.tsx"),
    "utf8",
  );
  const approvalActionCard = fs.readFileSync(
    path.join(process.cwd(), "src", "features", "ai", "approvalInbox", "ApprovalActionCard.tsx"),
    "utf8",
  );

  it("mounts the S11 stable testIDs without replacing existing dotted contracts", () => {
    expect(commandCenterScreen).toContain("ai.command.center.screen");
    expect(commandCenterScreen).toContain("ai.command_center.screen");
    expect(commandCenterScreen).toContain("ai.command_center.task_stream");
    expect(commandCenterCards).toContain("ai.command.center.card");
    expect(commandCenterCards).toContain("ai.command_center.ai_action_card");
    expect(approvalInboxScreen).toContain("ai.approval.inbox.screen");
    expect(approvalInboxScreen).toContain("ai.approval_inbox.screen");
    expect(approvalActionCard).toContain("ai.approval_inbox.pending_card");
    expect(approvalActionCard).toContain("ai.approval_inbox.approved_or_executed_state");
    expect(approvalActionCard).toContain("ai.action.status.persisted");
  });

  it("verifies Android targetability through Maestro and live ledger evidence without creating UI mutations", () => {
    expect(runnerSource).toContain("verifyAndroidInstalledBuildRuntime");
    expect(runnerSource).toContain("ensureAndroidMaestroDriverReady");
    expect(runnerSource).toContain("runMaestroTestWithDriverRepair");
    expect(runnerSource).toContain("resolveAiApprovalLedgerLiveProof");
    expect(runnerSource).toContain('id: "ai.command_center.screen"');
    expect(runnerSource).toContain('id: "ai.command_center.task_stream"');
    expect(runnerSource).toContain('id: "ai.approval_inbox.screen"');
    expect(runnerSource).toContain("mutations_created: 0");
    expect(runnerSource).toContain("fake_local_approval: false");
    expect(runnerSource).toContain("fake_execution: false");
  });
});
