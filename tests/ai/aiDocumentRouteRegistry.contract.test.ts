import {
  AI_DOCUMENT_ROUTE_GREEN_STATUS,
  getAiDocumentRouteRegistryEntry,
  verifyAiDocumentRouteRegistry,
} from "../../src/features/ai/documents/aiDocumentRouteRegistry";

describe("AI document route registry", () => {
  it("closes documents.main through a canonical BFF alias without inventing a UI route", () => {
    const entry = getAiDocumentRouteRegistryEntry("documents.main");
    const summary = verifyAiDocumentRouteRegistry();

    expect(entry).not.toBeNull();
    expect(entry).toMatchObject({
      screenId: "documents.main",
      auditRoute: "/documents",
      auditRouteStatus: "route_missing_or_not_registered",
      uiRouteRegistered: false,
      routeRegisteredOrAliased: true,
      canonicalAliasId: "agent.documents.knowledge",
      canonicalAliasKind: "bff_document_knowledge_alias",
      noUiRewrite: true,
      noSigning: true,
      noFinalSubmit: true,
      noDocumentDeletion: true,
      noFakeDocuments: true,
    });
    expect(summary.finalStatus).toBe(AI_DOCUMENT_ROUTE_GREEN_STATUS);
    expect(summary.documentsMainRouteClosedByCanonicalAlias).toBe(true);
    expect(summary.uiRouteRegistered).toBe(false);
  });

  it("covers safe-read, draft, approval, and forbidden document actions with existing routes or sentinels", () => {
    const summary = verifyAiDocumentRouteRegistry();

    expect(summary.requiredBffRoutes).toEqual(
      expect.arrayContaining([
        "GET /agent/documents/knowledge",
        "POST /agent/documents/search",
        "POST /agent/documents/summarize-preview",
        "POST /agent/action/submit-for-approval",
      ]),
    );
    expect(summary.actionIds).toEqual(
      expect.arrayContaining([
        "documents.main.safe_read",
        "documents.main.draft",
        "documents.main.approval",
        "documents.main.forbidden",
      ]),
    );
    expect(summary.safeReadCovered).toBe(true);
    expect(summary.draftCovered).toBe(true);
    expect(summary.approvalCovered).toBe(true);
    expect(summary.forbiddenCovered).toBe(true);
    expect(summary.documentedContextRouteGap).toBe(true);
  });
});
