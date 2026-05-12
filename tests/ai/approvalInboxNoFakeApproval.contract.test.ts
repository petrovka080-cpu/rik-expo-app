import fs from "node:fs";
import path from "node:path";

describe("Approval Inbox no-fake contract", () => {
  function read(relativePath: string): string {
    return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
  }

  it("does not include fake approval, fake status, or fake execution paths", () => {
    const source = [
      "src/features/ai/approvalInbox/approvalInboxRuntime.ts",
      "src/features/ai/approvalInbox/approvalInboxTypes.ts",
      "src/features/ai/approvalInbox/approvalInboxViewModel.ts",
      "src/features/ai/approvalInbox/ApprovalInboxScreen.tsx",
      "src/features/ai/approvalInbox/ApprovalActionCard.tsx",
      "src/features/ai/approvalInbox/ApprovalReviewPanel.tsx",
    ].map(read).join("\n");

    expect(source).toContain("fakeLocalApproval: false");
    expect(source).toContain("fakeActions: false");
    expect(source).toContain('testID="ai.approval.review.panel"');
    expect(source).toContain('testID="ai.approval.action.approve"');
    expect(source).toContain("disabled");
    expect(source).not.toMatch(/fakeLocalApproval:\s*true|fakeActions:\s*true|fake approval|fake status|fake execution/i);
    expect(source).not.toMatch(/\bdomainExecutor\.execute\b|createOrder|confirmSupplier|changePaymentStatus|changeWarehouseStatus|sendDocument/);
  });
});
