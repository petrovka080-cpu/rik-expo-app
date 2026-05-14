import {
  AI_MCP_SECURITY_POLICY_CONTRACT,
  buildAiMcpSecurityPolicyMatrix,
  evaluateAiMcpSecurityPolicy,
  listAiMcpSecurityPolicies,
} from "../../src/features/ai/mcp/aiMcpSecurityPolicy";

describe("AI MCP security policy", () => {
  it("enforces role scope, redaction, budgets, and no external execution", () => {
    const policies = listAiMcpSecurityPolicies();
    const matrix = buildAiMcpSecurityPolicyMatrix();

    expect(AI_MCP_SECURITY_POLICY_CONTRACT).toMatchObject({
      contractId: "ai_mcp_security_policy_v1",
      boundedRequestRequired: true,
      dtoOnly: true,
      redactionRequired: true,
      evidenceRequired: true,
      auditRequired: true,
      roleScopeRequired: true,
      directUiMutationAllowed: false,
      directDatabaseAccessAllowed: false,
      externalHostExecutionAllowed: false,
      modelProviderInvocationAllowed: false,
      privilegedBackendRoleAllowed: false,
      rawRowsReturned: false,
      rawPromptReturned: false,
      rawProviderPayloadReturned: false,
      secretsReturned: false,
    });
    expect(policies).toHaveLength(9);
    expect(matrix).toMatchObject({
      all_tools_have_security_policy: true,
      all_tools_role_scoped: true,
      all_tools_bounded: true,
      all_tools_dto_only: true,
      all_tools_redacted: true,
      all_tools_have_budget: true,
      all_tools_have_rate_budget: true,
      direct_ui_mutation_allowed: false,
      direct_database_access_allowed: false,
      external_host_execution_allowed: false,
      model_provider_invocation_allowed: false,
      privileged_backend_role_allowed: false,
      raw_rows_returned: false,
      raw_prompt_returned: false,
      raw_provider_payload_returned: false,
      secrets_returned: false,
    });
  });

  it("blocks unknown tools, forbidden payloads, missing evidence, and missing idempotency", () => {
    expect(evaluateAiMcpSecurityPolicy({ toolName: "unknown", role: "director" })).toMatchObject({
      allowed: false,
      reason: "unknown_tool",
    });
    expect(
      evaluateAiMcpSecurityPolicy({
        toolName: "get_finance_summary",
        role: "contractor",
        evidenceRefs: ["finance:evidence:redacted"],
      }),
    ).toMatchObject({
      allowed: false,
      reason: "role_not_allowed",
    });
    expect(
      evaluateAiMcpSecurityPolicy({
        toolName: "search_catalog",
        role: "buyer",
        payload: { rawDbRows: [{ id: "row:redacted" }] },
        evidenceRefs: ["catalog:evidence:redacted"],
      }),
    ).toMatchObject({
      allowed: false,
      reason: "forbidden_payload_key",
    });
    expect(
      evaluateAiMcpSecurityPolicy({
        toolName: "submit_for_approval",
        role: "buyer",
        payload: { draftId: "draft:redacted" },
        evidenceRefs: ["approval:evidence:redacted"],
      }),
    ).toMatchObject({
      allowed: false,
      reason: "idempotency_required",
    });
    expect(
      evaluateAiMcpSecurityPolicy({
        toolName: "search_catalog",
        role: "buyer",
        payload: { query: "cement" },
      }),
    ).toMatchObject({
      allowed: false,
      reason: "evidence_required",
    });
  });

  it("allows only bounded evidence-backed tool calls", () => {
    expect(
      evaluateAiMcpSecurityPolicy({
        toolName: "search_catalog",
        role: "buyer",
        payload: { query: "cement" },
        requestedLimit: 5,
        evidenceRefs: ["catalog:evidence:redacted"],
      }),
    ).toMatchObject({
      allowed: true,
      reason: "allowed",
      mutationCount: 0,
      providerCalled: false,
      dbAccessed: false,
    });
  });
});
