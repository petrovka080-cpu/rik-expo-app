import {
  evaluateAiApprovedProcurementExecutorGuardrail,
} from "../../scripts/architecture_anti_regression_suite";

describe("approved procurement executor architecture contract", () => {
  it("locks approved-only execution, idempotency, evidence, audit, and no UI mutation", () => {
    const result = evaluateAiApprovedProcurementExecutorGuardrail({
      projectRoot: process.cwd(),
    });

    expect(result.check).toEqual({
      name: "ai_approved_procurement_executor",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      centralExecuteGatePresent: true,
      approvedStatusRequired: true,
      idempotencyRequired: true,
      auditRequired: true,
      evidenceRequired: true,
      bffMutationBoundaryRequired: true,
      pendingCannotExecute: true,
      rejectedCannotExecute: true,
      expiredCannotExecute: true,
      duplicateExecutionBlocked: true,
      noDirectSupabaseFromUi: true,
      noUiExecutorImport: true,
      noExecutorModelProviderImport: true,
      noDirectSupabaseMutationInExecutor: true,
    });
  });
});
