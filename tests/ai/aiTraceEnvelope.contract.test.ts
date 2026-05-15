import {
  buildAiTraceEnvelopeForActionEntry,
  buildAiTraceId,
  listAiTraceEnvelopesForAuditedActions,
  stableAiTraceHash,
  verifyAiTraceEnvelopeCoverage,
} from "../../src/features/ai/observability/aiTraceEnvelope";
import {
  getAiRolePermissionActionMatrixEntry,
  listAiRolePermissionActionMatrixEntries,
} from "../../src/features/ai/security/aiRolePermissionActionMatrix";

describe("AI trace envelope", () => {
  it("creates deterministic per-screen/action trace envelopes for every audited action", () => {
    const entries = listAiRolePermissionActionMatrixEntries();
    const summary = verifyAiTraceEnvelopeCoverage(entries);
    const traceIds = new Set(summary.envelopes.map((envelope) => envelope.traceId));

    expect(entries).toHaveLength(112);
    expect(summary.coverageComplete).toBe(true);
    expect(summary.missingTraceIdActions).toEqual([]);
    expect(summary.duplicateTraceIds).toEqual([]);
    expect(summary.envelopes).toHaveLength(112);
    expect(traceIds.size).toBe(112);
  });

  it("binds action kind, role, risk, budget, and redaction flags into the envelope", () => {
    const entry = getAiRolePermissionActionMatrixEntry("buyer.main.approval");
    expect(entry).not.toBeNull();

    const envelope = buildAiTraceEnvelopeForActionEntry(entry!, {
      role: "buyer",
      createdAt: "2026-05-15T10:00:00.000Z",
    });

    expect(envelope).toMatchObject({
      screenId: "buyer.main",
      actionId: "buyer.main.approval",
      role: "buyer",
      actionKind: "approval_required",
      mutationRisk: "approval_required",
      eventName: "ai.approval.submitted",
      approvalRequired: true,
      forbidden: false,
      rawPromptExposed: false,
      rawProviderPayloadExposed: false,
      rawDbRowsExposed: false,
      credentialsExposed: false,
      providerPayloadStored: false,
      dbWriteInEnvelope: false,
      providerCalled: false,
    });
    expect(envelope.traceId).toBe(
      buildAiTraceId({
        screenId: "buyer.main",
        actionId: "buyer.main.approval",
        role: "buyer",
        eventName: "ai.approval.submitted",
      }),
    );
    expect(envelope.actionIdHash).toBe(stableAiTraceHash("buyer.main:buyer.main.approval"));
    expect(envelope.evidenceRefs.length).toBeGreaterThan(0);
  });

  it("keeps forbidden actions traceable without enabling provider or DB work", () => {
    const forbidden = getAiRolePermissionActionMatrixEntry("security.screen.forbidden");
    expect(forbidden).not.toBeNull();

    const envelope = buildAiTraceEnvelopeForActionEntry(forbidden!);

    expect(envelope.eventName).toBe("ai.action.blocked");
    expect(envelope.forbidden).toBe(true);
    expect(envelope.approvalRequired).toBe(false);
    expect(envelope.providerCalled).toBe(false);
    expect(envelope.dbWriteInEnvelope).toBe(false);
  });

  it("lists the same envelope coverage as the verifier", () => {
    const envelopes = listAiTraceEnvelopesForAuditedActions();
    const summary = verifyAiTraceEnvelopeCoverage();

    expect(envelopes.map((envelope) => envelope.traceId).sort()).toEqual(
      summary.envelopes.map((envelope) => envelope.traceId).sort(),
    );
  });
});
