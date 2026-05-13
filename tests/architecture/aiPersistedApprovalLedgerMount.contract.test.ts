import fs from "node:fs";
import path from "node:path";

describe("AI persisted approval ledger mount architecture", () => {
  it("mounts submit/status/decision/execute paths to the persisted RPC ledger and central gateway", () => {
    const mountSource = fs.readFileSync(
      path.join(process.cwd(), "src", "features", "ai", "actionLedger", "aiActionLedgerRuntimeMount.ts"),
      "utf8",
    );
    const bffSource = fs.readFileSync(
      path.join(process.cwd(), "src", "features", "ai", "actionLedger", "aiActionLedgerBff.ts"),
      "utf8",
    );
    const submitToolSource = fs.readFileSync(
      path.join(process.cwd(), "src", "features", "ai", "tools", "submitForApprovalTool.ts"),
      "utf8",
    );
    const statusToolSource = fs.readFileSync(
      path.join(process.cwd(), "src", "features", "ai", "tools", "getActionStatusTool.ts"),
      "utf8",
    );

    expect(mountSource).toContain("createAiActionLedgerRpcRepository");
    expect(mountSource).toContain("submitActionForApprovalBff");
    expect(mountSource).toContain("getActionLedgerStatusBff");
    expect(mountSource).toContain("approveActionLedgerBff");
    expect(mountSource).toContain("rejectActionLedgerBff");
    expect(mountSource).toContain("executeApprovedActionLedgerBff");
    expect(bffSource).toContain("executeApprovedActionGateway");
    expect(bffSource).toContain("createAiActionLedgerRpcBackend");
    expect(submitToolSource).toContain("persisted: true");
    expect(submitToolSource).toContain("local_gate_only: false");
    expect(statusToolSource).toContain("lookup_performed: true");
    expect(statusToolSource).toContain("persisted: status.persistedLookup");
  });

  it("keeps UI and tool surfaces away from direct Supabase mutation and fake local green", () => {
    const combined = [
      "src/features/ai/tools/submitForApprovalTool.ts",
      "src/features/ai/tools/getActionStatusTool.ts",
      "src/features/ai/actionLedger/aiActionLedgerRuntimeMount.ts",
      "src/features/ai/actionLedger/aiActionLedgerBff.ts",
    ]
      .map((relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8"))
      .join("\n");

    expect(combined).toContain("fakeLocalApproval: false");
    expect(combined).not.toMatch(/fakeLocalApproval:\s*true|local_gate_only:\s*true|fake_status:\s*true/i);
    expect(combined).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY|auth\.admin|listUsers/i);
  });
});
