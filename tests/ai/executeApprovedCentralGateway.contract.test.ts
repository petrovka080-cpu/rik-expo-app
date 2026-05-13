import fs from "node:fs";
import path from "node:path";

describe("execute approved central gateway contract", () => {
  const gatewaySource = fs.readFileSync(
    path.join(process.cwd(), "src", "features", "ai", "executors", "executeApprovedActionGateway.ts"),
    "utf8",
  );
  const liveRunnerSource = fs.readFileSync(
    path.join(process.cwd(), "scripts", "e2e", "runAiApprovalLedgerLiveActionE2E.ts"),
    "utf8",
  );

  it("executes only after persistent approval policy and writes executed status through the backend", () => {
    expect(gatewaySource).toContain("evaluateApprovedActionExecutionPolicy");
    expect(gatewaySource).toContain("createApprovedActionExecutionAuditEvent");
    expect(gatewaySource).toContain('record.status === "executed"');
    expect(gatewaySource).toContain("already_executed");
    expect(gatewaySource).toContain("params.backend.updateStatus");
    expect(gatewaySource).toContain('"executed"');
  });

  it("keeps final execution behind the route-scoped procurement executor boundary", () => {
    expect(gatewaySource).toContain("params.executors?.procurement");
    expect(gatewaySource).toContain("Procurement BFF mutation boundary is not mounted.");
    expect(gatewaySource).toContain("directMutationFromUi: false");
    expect(gatewaySource).toContain("directSupabaseFromUi: false");
    expect(gatewaySource).toContain("modelProviderFromExecutor: false");
    expect(liveRunnerSource).toContain("createProcurementRequestExecutor");
    expect(liveRunnerSource).toContain("createLiveProcurementBoundary");
  });
});
