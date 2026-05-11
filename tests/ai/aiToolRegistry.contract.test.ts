import { AI_TOOL_NAMES, AI_TOOL_REGISTRY, getAiToolDefinition, listAiToolDefinitions } from "../../src/features/ai/tools/aiToolRegistry";
import type { AiToolDefinition, AiToolJsonObjectSchema } from "../../src/features/ai/tools/aiToolTypes";

const expectedTools = [
  "search_catalog",
  "compare_suppliers",
  "get_warehouse_status",
  "get_finance_summary",
  "draft_request",
  "draft_report",
  "draft_act",
  "submit_for_approval",
  "get_action_status",
] as const;

const forbiddenToolNames = [
  "create_order",
  "confirm_supplier",
  "change_warehouse_status",
  "change_payment_status",
  "direct_supabase_query",
  "raw_db_export",
  "delete_data",
  "bypass_approval",
  "expose_secrets",
] as const;

function expectObjectSchema(schema: AiToolJsonObjectSchema): void {
  expect(schema.type).toBe("object");
  expect(schema.additionalProperties).toBe(false);
  expect(Array.isArray(schema.required)).toBe(true);
  expect(Object.keys(schema.properties).length).toBeGreaterThan(0);
}

function expectCompleteMetadata(tool: AiToolDefinition): void {
  expect(tool.name).toBeTruthy();
  expect(tool.description.trim().length).toBeGreaterThan(12);
  expect(tool.domain).toBeTruthy();
  expect(tool.riskLevel).toMatch(/^(safe_read|draft_only|approval_required)$/);
  expectObjectSchema(tool.inputSchema);
  expectObjectSchema(tool.outputSchema);
  expect(tool.requiredRoles.length).toBeGreaterThan(0);
  expect(tool.requiredRoles).not.toContain("unknown");
  expect(typeof tool.approvalRequired).toBe("boolean");
  expect(typeof tool.idempotencyRequired).toBe("boolean");
  expect(tool.auditEvent).toMatch(/^ai\./);
  expect(tool.rateLimitScope.trim().length).toBeGreaterThan(0);
  expect(typeof tool.cacheAllowed).toBe("boolean");
  expect(typeof tool.evidenceRequired).toBe("boolean");
}

describe("AI tool registry", () => {
  it("registers only the initial permanent tool set", () => {
    expect(AI_TOOL_NAMES).toEqual(expectedTools);
    expect(AI_TOOL_REGISTRY.map((tool) => tool.name)).toEqual(expectedTools);
    for (const forbidden of forbiddenToolNames) {
      expect(AI_TOOL_REGISTRY.map((tool) => tool.name)).not.toContain(forbidden);
    }
  });

  it("exposes metadata, schemas, risk policy, audit metadata, and evidence requirements for every tool", () => {
    for (const tool of AI_TOOL_REGISTRY) {
      expectCompleteMetadata(tool);
      if (tool.riskLevel === "approval_required") {
        expect(tool.approvalRequired).toBe(true);
        expect(tool.idempotencyRequired).toBe(true);
        expect(tool.cacheAllowed).toBe(false);
      } else {
        expect(tool.approvalRequired).toBe(false);
        expect(tool.idempotencyRequired).toBe(false);
      }
      if (tool.riskLevel !== "safe_read") {
        expect(tool.cacheAllowed).toBe(false);
      }
      expect(tool.evidenceRequired).toBe(true);
    }
  });

  it("keeps marketplace catalog search scoped to the already-approved cache and rate route", () => {
    const searchCatalog = getAiToolDefinition("search_catalog");
    expect(searchCatalog).toMatchObject({
      name: "search_catalog",
      domain: "marketplace",
      riskLevel: "safe_read",
      rateLimitScope: "marketplace.catalog.search",
      cacheAllowed: true,
    });
    expect(AI_TOOL_REGISTRY.filter((tool) => tool.cacheAllowed).map((tool) => tool.name)).toEqual([
      "search_catalog",
    ]);
  });

  it("returns defensive registry copies and lookup results without live execution hooks", () => {
    const listed = listAiToolDefinitions();
    expect(listed).toEqual(AI_TOOL_REGISTRY);
    expect(listed).not.toBe(AI_TOOL_REGISTRY);
    expect(getAiToolDefinition("submit_for_approval")).toMatchObject({
      approvalRequired: true,
      auditEvent: "ai.action.approval_required",
    });
  });
});
