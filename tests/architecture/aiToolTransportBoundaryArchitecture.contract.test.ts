import { evaluateAiToolTransportBoundaryGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI tool transport boundary architecture", () => {
  it("passes the project scanner ratchet", () => {
    const result = evaluateAiToolTransportBoundaryGuardrail({ projectRoot: process.cwd() });

    expect(result.check).toEqual({
      name: "ai_tool_transport_boundary",
      status: "pass",
      errors: [],
    });
    expect(result.summary).toMatchObject({
      transportTypesPresent: true,
      transportFilesPresent: true,
      allToolsHaveTransportContract: true,
      allRuntimeRoutesHaveTransportContract: true,
      runtimeRegistryExplicitBindings: true,
      runtimeRegistryNoPatternMatchers: true,
      toolsUseTransportBoundary: true,
      noToolDirectBffImports: true,
      transportDtoOnly: true,
      transportRedactionPresent: true,
      noUiTransportImports: true,
      noTransportProviderImports: true,
      noTransportSupabaseImports: true,
      boundedRequestContracts: true,
    });
  });

  it("fails if a tool bypasses the transport boundary", () => {
    const result = evaluateAiToolTransportBoundaryGuardrail({
      projectRoot: process.cwd(),
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/tools/transport/aiToolTransportTypes.ts") {
          return [
            'toolName: "search_catalog"',
            'toolName: "compare_suppliers"',
            'toolName: "get_warehouse_status"',
            'toolName: "get_finance_summary"',
            'toolName: "draft_request"',
            'toolName: "draft_report"',
            'toolName: "draft_act"',
            'toolName: "submit_for_approval"',
            'toolName: "get_action_status"',
            'runtimeName: "task_stream"',
            'runtimeName: "command_center"',
            'runtimeName: "tool_registry"',
            'runtimeName: "procurement_copilot"',
            'runtimeName: "document_knowledge"',
            'runtimeName: "construction_knowhow"',
            'runtimeName: "finance_copilot"',
            'runtimeName: "warehouse_copilot"',
            'runtimeName: "field_work_copilot"',
            'runtimeName: "external_intel"',
            'runtimeName: "screen_runtime"',
            'runtimeName: "approval_inbox"',
            'runtimeName: "approved_executor"',
            "dtoOnly: true",
            "rawRowsExposed: false",
            "boundedRequest: true",
            "hasForbiddenAiToolTransportKeys",
            "FORBIDDEN_TRANSPORT_KEYS",
            "clampAiToolTransportLimit",
            "idempotencyRequired",
          ].join("\n");
        }
        if (relativePath.includes("/transport/")) return "transport file";
        if (relativePath === "src/features/ai/tools/searchCatalogTool.ts") {
          return 'import { searchCatalogItems } from "../../../lib/catalog/catalog.search.service";';
        }
        if (relativePath.startsWith("src/features/ai/tools/")) {
          return 'import { readToolTransport } from "./transport/searchCatalog.transport";';
        }
        return "";
      },
    });

    expect(result.check.status).toBe("fail");
    expect(result.check.errors).toEqual(
      expect.arrayContaining(["ai_tool_direct_bff_imports_remain"]),
    );
  });
});
