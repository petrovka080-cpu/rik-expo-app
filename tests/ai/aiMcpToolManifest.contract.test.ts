import {
  AI_MCP_TOOL_MANIFEST_CONTRACT,
  buildAiMcpToolManifestMatrix,
  listAiMcpToolManifestEntries,
  validateAiMcpToolManifest,
} from "../../src/features/ai/mcp/aiMcpToolManifest";
import { AI_TOOL_NAMES } from "../../src/features/ai/tools/aiToolRegistry";

describe("AI MCP tool manifest", () => {
  it("exports every registered tool through a provider-neutral safe manifest", () => {
    const entries = listAiMcpToolManifestEntries();
    const matrix = buildAiMcpToolManifestMatrix();

    expect(AI_MCP_TOOL_MANIFEST_CONTRACT).toMatchObject({
      contractId: "ai_mcp_tool_manifest_v1",
      providerNeutral: true,
      toolsFromRegistryOnly: true,
      securityPolicyRequired: true,
      approvalPolicyRequired: true,
      capabilitySchemaRequired: true,
      noLiveModelCall: true,
      noExternalHostExecution: true,
      noMutationWithoutApproval: true,
      noDirectUiMutation: true,
    });
    expect(entries.map((entry) => entry.toolName)).toEqual(AI_TOOL_NAMES);
    expect(validateAiMcpToolManifest()).toBe(true);
    expect(matrix).toMatchObject({
      manifest_status: "ready",
      tool_count: 9,
      all_tools_from_registry: true,
      all_tools_have_security_policy: true,
      all_tools_have_approval_policy: true,
      all_tools_have_capability_schema: true,
      all_tools_role_scoped: true,
      all_tools_evidence_required: true,
      all_tools_redacted: true,
      final_action_allowed: false,
      mutation_without_approval_allowed: false,
      direct_ui_mutation_allowed: false,
      external_host_execution_allowed: false,
      model_provider_invocation_allowed: false,
      raw_rows_returned: false,
      raw_prompt_returned: false,
      raw_provider_payload_returned: false,
      secrets_returned: false,
    });
  });

  it("marks submit_for_approval as approval-only and draft tools as draft-only", () => {
    const entries = listAiMcpToolManifestEntries();
    expect(entries.find((entry) => entry.toolName === "submit_for_approval")).toMatchObject({
      approvalMode: "approval_required",
      approvalRequired: true,
      idempotencyRequired: true,
      finalActionAllowed: false,
    });
    expect(entries.find((entry) => entry.toolName === "draft_request")).toMatchObject({
      approvalMode: "draft_only",
      draftOnly: true,
      finalActionAllowed: false,
    });
    expect(entries.find((entry) => entry.toolName === "search_catalog")).toMatchObject({
      approvalMode: "safe_read",
      safeReadOnly: true,
      finalActionAllowed: false,
    });
  });
});
