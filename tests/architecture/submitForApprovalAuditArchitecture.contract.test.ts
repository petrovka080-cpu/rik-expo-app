import { evaluateSubmitForApprovalAuditTrailGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("submit_for_approval audit trail architecture", () => {
  it("passes the project scanner ratchet", () => {
    const result = evaluateSubmitForApprovalAuditTrailGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "submit_for_approval_audit_trail",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      auditFilesPresent: true,
      submitToolUsesAuditTrail: true,
      transportUsesAuditPolicy: true,
      evidenceRequired: true,
      idempotencyRequired: true,
      auditEventRequired: true,
      pendingStatusOnly: true,
      noFinalExecution: true,
      noFakeLocalApproval: true,
      noProviderImports: true,
      noSupabaseImports: true,
      noRawPayloadFields: true,
      e2eRunnerPresent: true,
    });
  });

  it("fails if submit_for_approval transport omits audit policy", () => {
    const result = evaluateSubmitForApprovalAuditTrailGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath.endsWith("submitForApprovalAuditTypes.ts")) {
          return "evidenceRequired: true\nidempotencyRequired: true\nfinalExecution: false\nfakeLocalApproval: false";
        }
        if (relativePath.endsWith("submitForApprovalAuditPolicy.ts")) {
          return "assertSubmitForApprovalAuditPolicy\nevidence_required\nidempotency_required";
        }
        if (relativePath.endsWith("submitForApprovalAuditEvent.ts")) {
          return "createAiActionLedgerAuditEvent\nai.action.submitted_for_approval";
        }
        if (relativePath.endsWith("submitForApprovalRedaction.ts")) return "redactSubmitForApprovalAuditPayload";
        if (relativePath.endsWith("submitForApproval.transport.ts")) return "submit_for_approval_without_audit";
        if (relativePath.endsWith("submitForApprovalTool.ts")) {
          return [
            "audit_trail_ref",
            "audit_event_count",
            "audit_redacted",
            "evidence_refs",
            "idempotency_key",
            'action_status: "pending"',
            "final_execution: 0",
            "local_gate_only: false",
          ].join("\n");
        }
        if (relativePath.endsWith("aiToolSchemas.ts")) return "audit_trail_ref\naudit_event_count\naudit_redacted";
        if (relativePath.endsWith("runAiSubmitForApprovalAuditMaestro.ts")) return "submit_for_approval";
        return "";
      },
    });

    expect(result.check.status).toBe("fail");
    expect(result.check.errors).toEqual(
      expect.arrayContaining(["submit_for_approval_transport_missing_audit_policy"]),
    );
  });
});
