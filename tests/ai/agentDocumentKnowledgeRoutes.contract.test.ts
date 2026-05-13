import {
  AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT,
  getAgentDocumentKnowledge,
  previewAgentDocumentSummary,
  searchAgentDocuments,
} from "../../src/features/ai/agent/agentDocumentKnowledgeRoutes";
import { AGENT_BFF_ROUTE_DEFINITIONS } from "../../src/features/ai/agent/agentBffRouteShell";

describe("Agent document knowledge BFF routes", () => {
  const auth = { userId: "director-control", role: "director" as const };

  it("mounts read/search/summarize-preview routes as read-only BFF contracts", () => {
    expect(AGENT_DOCUMENT_KNOWLEDGE_BFF_CONTRACT.endpoints).toEqual([
      "GET /agent/documents/knowledge",
      "POST /agent/documents/search",
      "POST /agent/documents/summarize-preview",
    ]);

    const routes = AGENT_BFF_ROUTE_DEFINITIONS.filter((route) =>
      route.operation.startsWith("agent.documents."),
    );
    expect(routes).toHaveLength(3);
    expect(routes.every((route) => route.mutates === false)).toBe(true);
    expect(routes.every((route) => route.callsModelProvider === false)).toBe(true);
    expect(routes.every((route) => route.callsDatabaseDirectly === false)).toBe(true);
  });

  it("returns role-scoped redacted document knowledge with no mutation path", () => {
    const knowledge = getAgentDocumentKnowledge({ auth });
    const search = searchAgentDocuments({ auth, input: { query: "pdf", limit: 5 } });
    const summary = previewAgentDocumentSummary({ auth, input: { documentId: "pdf_exports" } });

    expect(knowledge.ok).toBe(true);
    expect(search.ok).toBe(true);
    expect(summary.ok).toBe(true);
    if (!knowledge.ok || !search.ok || !summary.ok) return;
    if (
      knowledge.data.documentType !== "agent_document_knowledge" ||
      search.data.documentType !== "agent_document_search_preview" ||
      summary.data.documentType !== "agent_document_summary_preview"
    ) return;

    expect(knowledge.data.result.cards.length).toBeGreaterThan(0);
    expect(search.data.result.rawContentReturned).toBe(false);
    expect(summary.data.result.rawRowsReturned).toBe(false);
    expect(summary.data.result.evidenceRefs.length).toBeGreaterThan(0);
    expect(summary.data.mutationCount).toBe(0);
    expect(summary.data.dbWrites).toBe(0);
    expect(summary.data.externalLiveFetch).toBe(false);
  });

  it("blocks unauthenticated and role-blocked document access", () => {
    expect(getAgentDocumentKnowledge({ auth: null }).ok).toBe(false);
    const contractorSummary = previewAgentDocumentSummary({
      auth: { userId: "contractor", role: "contractor" },
      input: { documentId: "finance_documents" },
    });

    expect(contractorSummary.ok).toBe(true);
    if (!contractorSummary.ok) return;
    if (contractorSummary.data.documentType !== "agent_document_summary_preview") return;
    expect(contractorSummary.data.result.status).toBe("blocked");
    expect(contractorSummary.data.result.rawContentReturned).toBe(false);
    expect(contractorSummary.data.result.fakeDocuments).toBe(false);
  });
});
