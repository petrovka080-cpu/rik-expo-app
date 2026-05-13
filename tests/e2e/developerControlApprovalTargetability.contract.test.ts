import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("developer/control Approval Inbox targetability", () => {
  it("separates approval persistence from screen targetability", () => {
    const runner = read("scripts/e2e/runDeveloperControlFullAccessMaestro.ts");
    const approvalRunner = read("scripts/e2e/runAiApprovalInboxMaestro.ts");
    const tabRoute = read("app/(tabs)/ai.tsx");
    const directRoute = read("app/ai-approval-inbox.tsx");
    const screen = read("src/features/ai/approvalInbox/ApprovalInboxScreen.tsx");

    expect(tabRoute).toContain("approvalInbox");
    expect(directRoute).toContain("ApprovalInboxScreen");
    expect(screen).toContain("ai.approval.inbox.screen");
    expect(screen).toContain("ai.approval.inbox.empty-state");
    expect(screen).toContain("ai.approval.persistence.blocked");
    expect(approvalRunner).toContain("BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND");
    expect(runner).toContain("approval_persistence_blocks_targetability");
    expect(runner).toContain('approvalPersistenceStatus !== "BLOCKED_APPROVAL_PERSISTENCE_BACKEND_NOT_FOUND"');
  });
});
