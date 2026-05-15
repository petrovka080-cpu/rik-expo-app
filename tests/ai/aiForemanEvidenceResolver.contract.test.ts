import {
  AI_FOREMAN_EVIDENCE_RESOLVER_CONTRACT,
  resolveAiForemanEvidence,
} from "../../src/features/ai/foreman/aiForemanEvidenceResolver";
import type { AiFieldContextSnapshot } from "../../src/features/ai/field/aiFieldWorkCopilotTypes";

const fieldContext: AiFieldContextSnapshot = {
  scope: "foreman_project_scope",
  objectId: "object:redacted",
  subcontractId: "subcontract:redacted",
  periodStart: "2026-05-15",
  periodEnd: "2026-05-15",
  workSummary: "Redacted field closeout summary.",
  sourceEvidenceRefs: ["field:screen_state:redacted"],
  workItems: [
    {
      workId: "work:redacted",
      name: "redacted work item",
      quantity: 1,
      unit: "scope",
      status: "ready_for_act",
      evidenceRefs: ["field:work_item:redacted"],
    },
  ],
  documents: [{ documentType: "photo", evidenceRef: "field:document:redacted" }],
};

describe("AI foreman evidence resolver", () => {
  it("loads role-scoped evidence for all foreman closeout screens without side effects", async () => {
    const screens = ["foreman.main", "foreman.ai.quick_modal", "foreman.subcontract"] as const;
    const results = await Promise.all(
      screens.map((screenId) =>
        resolveAiForemanEvidence({
          auth: { userId: "foreman-user", role: "foreman" },
          screenId,
          input: { fieldContext },
        }),
      ),
    );

    expect(AI_FOREMAN_EVIDENCE_RESOLVER_CONTRACT).toMatchObject({
      safeReadOnly: true,
      draftOnly: true,
      finalSubmitAllowed: false,
      signingAllowed: false,
      directSubcontractMutationAllowed: false,
      mutationCount: 0,
      fakeFieldEvidence: false,
    });
    for (const result of results) {
      expect(result.status).toBe("loaded");
      expect(result.evidenceBacked).toBe(true);
      expect(result.coversForemanMain).toBe(true);
      expect(result.coversForemanAiQuickModal).toBe(true);
      expect(result.coversForemanSubcontract).toBe(true);
      expect(result.mutationCount).toBe(0);
      expect(result.dbWrites).toBe(0);
      expect(result.finalSubmitAllowed).toBe(false);
      expect(result.signingAllowed).toBe(false);
      expect(result.directSubcontractMutationAllowed).toBe(false);
      expect(result.rawRowsReturned).toBe(false);
      expect(result.rawProviderPayloadReturned).toBe(false);
    }
  });

  it("blocks unknown foreman screens instead of widening scope", async () => {
    const result = await resolveAiForemanEvidence({
      auth: { userId: "foreman-user", role: "foreman" },
      screenId: "foreman.unknown",
      input: { fieldContext },
    });

    expect(result.status).toBe("blocked");
    expect(result.evidenceBacked).toBe(false);
    expect(result.mutationCount).toBe(0);
    expect(result.exactReason).toContain("only covers");
  });
});
