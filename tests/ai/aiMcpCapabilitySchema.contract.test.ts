import {
  AI_MCP_CAPABILITY_SCHEMA_CONTRACT,
  buildAiMcpCapabilitySchemaMatrix,
  listAiMcpCapabilitySchemas,
  validateAiMcpCapabilitySchemas,
} from "../../src/features/ai/mcp/aiMcpCapabilitySchema";

describe("AI MCP capability schema", () => {
  it("keeps all capability schemas DTO-only, evidence-backed, and non-executing", () => {
    const schemas = listAiMcpCapabilitySchemas();
    const matrix = buildAiMcpCapabilitySchemaMatrix();

    expect(AI_MCP_CAPABILITY_SCHEMA_CONTRACT).toMatchObject({
      contractId: "ai_mcp_capability_schema_v1",
      inputDtoOnly: true,
      outputDtoOnly: true,
      evidenceRefsRequired: true,
      blockedReasonAllowed: true,
      redactionRequired: true,
      roleScopeRequired: true,
      approvalPolicyRequired: true,
      securityPolicyRequired: true,
      directExecutionAllowed: false,
      externalHostExecutionAllowed: false,
    });
    expect(validateAiMcpCapabilitySchemas()).toBe(true);
    expect(matrix).toMatchObject({
      all_tools_have_capability_schema: true,
      all_inputs_dto_only: true,
      all_outputs_dto_only: true,
      evidence_refs_required: true,
      redaction_required: true,
      role_scope_required: true,
      approval_policy_required: true,
      security_policy_required: true,
      direct_execution_allowed: false,
      external_host_execution_allowed: false,
    });
    expect(schemas.find((schema) => schema.toolName === "compare_suppliers")).toMatchObject({
      capabilityKind: "safe_read",
      aiCapability: "compare",
    });
    expect(schemas.find((schema) => schema.toolName === "draft_act")).toMatchObject({
      capabilityKind: "draft_preview",
      aiCapability: "draft",
    });
  });
});
