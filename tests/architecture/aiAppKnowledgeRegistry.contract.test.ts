import { evaluateAiAppKnowledgeRegistryGuardrail } from "../../scripts/architecture_anti_regression_suite";

describe("AI app knowledge registry architecture guardrail", () => {
  it("passes for the production AI knowledge registry", () => {
    const result = evaluateAiAppKnowledgeRegistryGuardrail({ projectRoot: process.cwd() });

    expect(result.check.status).toBe("pass");
    expect(result.summary.requiredDomainsRegistered).toBe(true);
    expect(result.summary.requiredScreenIdsRegistered).toBe(true);
    expect(result.summary.requiredDocumentSourcesRegistered).toBe(true);
    expect(result.summary.noDirectHighRiskIntent).toBe(true);
    expect(result.summary.registryProviderImports).toBe(0);
    expect(result.summary.resolverNetworkOrDbQueries).toBe(0);
  });

  it("fails if required knowledge surfaces disappear or provider imports leak in", () => {
    const result = evaluateAiAppKnowledgeRegistryGuardrail({
      projectRoot: process.cwd(),
      sourceFiles: ["src/screens/example/BadScreen.tsx"],
      readFile: (relativePath) => {
        if (relativePath === "src/features/ai/knowledge/aiKnowledgeTypes.ts") return "present";
        if (relativePath === "src/features/ai/knowledge/aiDomainKnowledgeRegistry.ts") return '"control" "projects"';
        if (relativePath === "src/features/ai/knowledge/aiEntityRegistry.ts") return "accounting_posting FINANCE_ROLES own_records_only";
        if (relativePath === "src/features/ai/knowledge/aiScreenKnowledgeRegistry.ts") return '"director.dashboard" own_records_only';
        if (relativePath === "src/features/ai/knowledge/aiDocumentSourceRegistry.ts") return '"director_reports"';
        if (relativePath === "src/features/ai/knowledge/aiIntentRegistry.ts") return 'intent: "execute_approved"\nexecutionBoundary: "direct"';
        if (relativePath === "src/features/ai/knowledge/aiKnowledgeResolver.ts") return "fetch('x')";
        if (relativePath === "src/features/ai/knowledge/aiKnowledgeRedaction.ts") return "raw_finance_context_for_non_finance_role";
        if (relativePath === "src/features/ai/controlPlane/aiControlPlaneKnowledgeBridge.ts") return "present";
        if (relativePath === "src/features/ai/assistantScopeContext.ts") return "missing";
        if (relativePath === "src/features/ai/assistantPrompts.ts") return "missing";
        if (relativePath === "src/screens/example/BadScreen.tsx") return "import { AiModelGateway } from '../../features/ai/model';";
        return "import { supabase } from '../../lib/supabaseClient';";
      },
    });

    expect(result.check.status).toBe("fail");
    expect(result.check.errors).toEqual(
      expect.arrayContaining([
        "assistant_scope_context_not_using_knowledge_resolver",
        "assistant_prompts_missing_app_knowledge_policy",
        "required_ai_screen_knowledge_ids_missing",
        "required_ai_domains_missing",
        "required_ai_document_sources_missing",
        "required_ai_intents_missing",
        "director_control_full_domain_knowledge_missing",
        "unknown_role_not_deny_by_default",
        "direct_high_risk_intent_detected",
        "knowledge_resolver_network_or_db_query:file=src/features/ai/knowledge/aiKnowledgeResolver.ts",
        "screen_ai_model_gateway_import:file=src/screens/example/BadScreen.tsx",
      ]),
    );
  });
});
