import {
  buildAiKnowledgePromptBlock,
  resolveAiAvailableEntities,
  resolveAiDocumentSources,
  resolveAiRoleScreenIntents,
  resolveAiScreenKnowledge,
} from "../../src/features/ai/knowledge/aiKnowledgeResolver";

describe("AI knowledge resolver", () => {
  it("resolves director/control with full-domain knowledge and approval boundary", () => {
    const director = resolveAiScreenKnowledge({ role: "director", screenId: "director.dashboard" });
    const control = resolveAiScreenKnowledge({ role: "control", screenId: "director.dashboard" });

    expect(director.fullDomainKnowledge).toBe(true);
    expect(control.fullDomainKnowledge).toBe(true);
    expect(director.allowedEntities).toEqual(expect.arrayContaining(["payment", "supplier", "warehouse_item", "accounting_posting"]));
    expect(director.allowedIntents.map((entry) => entry.intent)).toContain("execute_approved");
    expect(director.approvalBoundarySummary).toContain("aiApprovalGate");
  });

  it("strictly scopes non-director role knowledge", () => {
    expect(resolveAiAvailableEntities({ role: "foreman", screenId: "foreman.main" })).toEqual(
      expect.arrayContaining(["project", "request", "material", "report", "act", "subcontract"]),
    );
    expect(resolveAiAvailableEntities({ role: "buyer", screenId: "buyer.main" })).toEqual(
      expect.arrayContaining(["request", "supplier", "material"]),
    );
    expect(resolveAiAvailableEntities({ role: "buyer", screenId: "buyer.main" })).not.toContain("accounting_posting");
    expect(resolveAiAvailableEntities({ role: "accountant", screenId: "accountant.main" })).toEqual(
      expect.arrayContaining(["payment", "company_debt", "accounting_posting", "pdf_document"]),
    );
    expect(resolveAiAvailableEntities({ role: "warehouse", screenId: "warehouse.main" })).toEqual(
      expect.arrayContaining(["warehouse_item", "stock_movement", "request"]),
    );
    expect(resolveAiAvailableEntities({ role: "contractor", screenId: "contractor.main" })).toEqual(
      expect.arrayContaining(["subcontract", "contractor", "act", "report", "pdf_document"]),
    );
    expect(resolveAiScreenKnowledge({ role: "contractor", screenId: "contractor.main" }).contextPolicy).toBe("own_records_only");
  });

  it("denies unknown roles by default", () => {
    const resolved = resolveAiScreenKnowledge({ role: "unknown", screenId: "buyer.main" });

    expect(resolved.allowedEntities).toEqual([]);
    expect(resolved.allowedIntents).toEqual([]);
    expect(resolved.blockedIntents.length).toBeGreaterThan(0);
    expect(resolved.blockedIntents[0]?.reason).toContain("Unknown AI role is denied by default");
  });

  it("resolves document sources and prompt-safe knowledge blocks without raw content", () => {
    const sources = resolveAiDocumentSources({ role: "accountant", screenId: "accountant.main" });
    const sourceIds = sources.map((entry) => entry.sourceId);
    const prompt = buildAiKnowledgePromptBlock({ role: "buyer", screenId: "buyer.main" });

    expect(sourceIds).toEqual(expect.arrayContaining(["finance_documents", "acts", "pdf_exports"]));
    expect(prompt).toContain("AI APP KNOWLEDGE BLOCK");
    expect(prompt).toContain("professionalAnswerRequirements");
    expect(prompt).toContain("approval_required");
    expect(prompt).not.toContain("raw DB row");
    expect(prompt).not.toContain("raw_provider_payload");
    expect(prompt).not.toContain("access_token");
  });

  it("resolves role screen intents with draft and approval boundaries", () => {
    const buyerIntents = resolveAiRoleScreenIntents({ role: "buyer", screenId: "buyer.main" });

    expect(buyerIntents.find((entry) => entry.intent === "prepare_request")?.riskLevel).toBe("draft_only");
    expect(buyerIntents.find((entry) => entry.intent === "submit_for_approval")?.requiresApproval).toBe(true);
    expect(buyerIntents.find((entry) => entry.intent === "execute_approved")).toBeUndefined();
  });
});
