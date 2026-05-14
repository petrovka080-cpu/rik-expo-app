import {
  AI_FOREMAN_REPORT_DRAFT_ENGINE_CONTRACT,
  buildAiFieldContext,
  draftAiForemanReport,
} from "../../src/features/ai/field/aiForemanReportDraftEngine";
import type { AiFieldContextSnapshot } from "../../src/features/ai/field/aiFieldWorkCopilotTypes";

const fieldContext: AiFieldContextSnapshot = {
  scope: "foreman_project_scope",
  objectId: "object:redacted",
  objectName: "redacted object",
  periodStart: "2026-05-14",
  periodEnd: "2026-05-14",
  workSummary: "Redacted field work summary from scoped context.",
  sourceEvidenceRefs: ["field:report_context:redacted"],
  documents: [
    {
      documentType: "photo",
      evidenceRef: "field:document:photo:redacted",
    },
  ],
};

describe("AI foreman report draft engine", () => {
  it("builds role-scoped redacted field context without mutation", async () => {
    const result = await buildAiFieldContext({
      auth: { userId: "foreman-user", role: "foreman" },
      input: { fieldContext },
    });

    expect(AI_FOREMAN_REPORT_DRAFT_ENGINE_CONTRACT).toMatchObject({
      backendFirst: true,
      draftOnly: true,
      directSupabaseFromUi: false,
      mutationCount: 0,
      reportPublished: false,
      fakeFieldCards: false,
    });
    expect(result).toMatchObject({
      status: "loaded",
      roleScoped: true,
      roleScope: "foreman_project_scope",
      roleIsolationE2eClaimed: false,
      mutationCount: 0,
      dbWrites: 0,
      externalLiveFetch: false,
      finalExecution: 0,
      providerCalled: false,
      rawRowsReturned: false,
      reportPublished: false,
      roleLeakageObserved: false,
    });
    expect(result.evidenceRefs.length).toBeGreaterThan(0);
    expect(result.allContextHasEvidence).toBe(true);
  });

  it("creates only a draft_report preview from evidence-backed foreman context", async () => {
    const draft = await draftAiForemanReport({
      auth: { userId: "foreman-user", role: "foreman" },
      input: { fieldContext, reportKind: "daily" },
    });

    expect(draft.status).toBe("draft");
    expect(draft.suggestedToolId).toBe("draft_report");
    expect(draft.suggestedMode).toBe("draft_only");
    expect(draft.evidenceBacked).toBe(true);
    expect(draft.mutationCount).toBe(0);
    expect(draft.finalExecution).toBe(0);
    expect(draft.reportPublished).toBe(false);
    expect(draft.rawPromptReturned).toBe(false);
    expect(draft.hardcodedAiAnswer).toBe(false);
    expect(draft.draft).toMatchObject({
      persisted: false,
      mutation_count: 0,
      final_pdf_send: 0,
      final_submit: 0,
      report_published: 0,
      requires_approval: true,
    });
  });

  it("does not let contractor draft a foreman report from the report engine", async () => {
    const draft = await draftAiForemanReport({
      auth: { userId: "contractor-user", role: "contractor" },
      input: { fieldContext: { ...fieldContext, scope: "contractor_own_scope" } },
    });

    expect(draft).toMatchObject({
      status: "blocked",
      suggestedToolId: null,
      suggestedMode: "forbidden",
      mutationCount: 0,
      reportPublished: false,
      fakeFieldCards: false,
    });
  });
});
