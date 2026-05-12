import { evaluateAiPersistentActionLedgerGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI persistent action ledger architecture", () => {
  it("passes the persistent approval/action ledger architecture ratchet", () => {
    const result = evaluateAiPersistentActionLedgerGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "ai_persistent_action_ledger",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toEqual(
      expect.objectContaining({
        ledgerFilesPresent: true,
        migrationProposalPresent: true,
        auditStorageProposalPresent: true,
        rlsPolicyProposalPresent: true,
        rpcContractProposalPresent: true,
        rpcBackendAdapterPresent: true,
        writeRpcMountProposalPresent: true,
        lifecycleDbGuardProposalPresent: true,
        noServiceRoleGrantInLedgerBackend: true,
        bffRoutesPresent: true,
        submitForApprovalPersistsPending: true,
        getActionStatusReadsPersistedStatus: true,
        idempotencyRequired: true,
        auditRequired: true,
        evidenceRequired: true,
        lifecycleTransitionsEnforced: true,
        executeApprovedGatePresent: true,
        domainExecutorBlockedWhenMissing: true,
        noFakeLocalApproval: true,
        noDirectExecutionPath: true,
        noUiSupabaseImport: true,
        noUiModelProviderImport: true,
        noRawLedgerPayloadFields: true,
        e2eRunnerPresent: true,
      }),
    );
  });
});
