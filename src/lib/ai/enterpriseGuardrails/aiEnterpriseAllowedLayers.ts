import { AI_ENTERPRISE_ARCHITECTURE_POLICY, type AiEnterpriseLayer } from "./aiEnterpriseArchitecturePolicy";

export type AiEnterpriseAllowedLayerDefinition = {
  layer: AiEnterpriseLayer;
  root: string;
  purpose: string;
  screenMayImportDirectly: boolean;
};

export type AiEnterpriseLegacyLayerDefinition = {
  root: string;
  reason: string;
  mayReceiveNewFeatureWork: false;
};

export const AI_ENTERPRISE_ALLOWED_LAYERS: AiEnterpriseAllowedLayerDefinition[] = [
  {
    layer: "builtInAi",
    root: "src/lib/ai/builtInAi",
    purpose: "Built-in AI ingress, intent routing, tool policy, domain tool orchestration, action building, and runtime trace.",
    screenMayImportDirectly: true,
  },
  {
    layer: "builtInAi1000",
    root: "src/lib/ai/builtInAi1000",
    purpose: "Machine-readable 1000-case construction estimate coverage catalog and source-backed proof metadata.",
    screenMayImportDirectly: false,
  },
  {
    layer: "builtInAi10000",
    root: "src/lib/ai/builtInAi10000",
    purpose: "Machine-readable 10000-case real-world estimate/product coverage catalog and source-backed proof metadata.",
    screenMayImportDirectly: false,
  },
  {
    layer: "builtInAi50000",
    root: "src/lib/ai/builtInAi50000",
    purpose: "Governed 50000-ready Phase 1 ontology, shard planner, case manifest, and runtime proof validators.",
    screenMayImportDirectly: false,
  },
  {
    layer: "alwaysOnExternalKnowledge",
    root: "src/lib/ai/alwaysOnExternalKnowledge",
    purpose: "Always-on public knowledge answer policy and source-aware external answer composition.",
    screenMayImportDirectly: false,
  },
  {
    layer: "appContextGraph",
    root: "src/lib/ai/appContextGraph",
    purpose: "Read-only app object graph, source refs, permissions, and deep links.",
    screenMayImportDirectly: false,
  },
  {
    layer: "estimateEngine",
    root: "src/lib/ai/estimateEngine",
    purpose: "Construction estimate intent, quantity, and price composition with answer-first guards.",
    screenMayImportDirectly: false,
  },
  {
    layer: "estimateRouting",
    root: "src/lib/ai/estimateRouting",
    purpose: "Universal estimate intent routing, priority guard, prompt extraction, and backend estimate tool dispatch.",
    screenMayImportDirectly: false,
  },
  {
    layer: "estimatePresentation",
    root: "src/lib/ai/estimatePresentation",
    purpose: "Shared estimate presentation view model, row formatting, actions, and generic-row validation for live entrypoints.",
    screenMayImportDirectly: true,
  },
  {
    layer: "estimatePdf",
    root: "src/lib/ai/estimatePdf",
    purpose: "Structured AI estimate to existing PDF lifecycle bridge. No markdown-as-truth and no second PDF framework.",
    screenMayImportDirectly: false,
  },
  {
    layer: "globalEstimate",
    root: "src/lib/ai/globalEstimate",
    purpose: "Backend-first global construction estimate engine with localization, units, regional rates, tax rules, and professional BOQ output.",
    screenMayImportDirectly: false,
  },
  {
    layer: "worldConstructionOntology",
    root: "src/lib/ai/worldConstructionOntology",
    purpose: "Open-world construction domain, object, operation, method, unit, risk, and material-system ontology.",
    screenMayImportDirectly: false,
  },
  {
    layer: "worldConstructionInterpreter",
    root: "src/lib/ai/worldConstructionInterpreter",
    purpose: "Construction prompt interpretation into governed primitives, ambiguity handling, and template-gap triage.",
    screenMayImportDirectly: false,
  },
  {
    layer: "professionalBoq",
    root: "src/lib/ai/professionalBoq",
    purpose: "Professional BOQ compiler, depth validation, work-specific rows, and no-generic-row enforcement.",
    screenMayImportDirectly: false,
  },
  {
    layer: "localEstimatePolicy",
    root: "src/lib/ai/localEstimatePolicy",
    purpose: "Country, city, currency, tax, and source-warning policy for local construction estimates.",
    screenMayImportDirectly: false,
  },
  {
    layer: "catalogBinding",
    root: "src/lib/ai/catalogBinding",
    purpose: "Shared catalog_items candidate binding and fake catalog/stock/supplier validation for AI estimate rows.",
    screenMayImportDirectly: false,
  },
  {
    layer: "changeControl",
    root: "src/lib/ai/changeControl",
    purpose: "Versioned template, rate, catalog, ontology, formula, tax, safety, and PDF contract lifecycle control.",
    screenMayImportDirectly: false,
  },
  {
    layer: "universalRoleQa",
    root: "src/lib/ai/universalRoleQa",
    purpose: "Question understanding, source planning, retrieval adapters, answer composition, and semantic guard.",
    screenMayImportDirectly: false,
  },
  {
    layer: "liveScreenCopilot",
    root: "src/lib/ai/liveScreenCopilot",
    purpose: "Screen manifests, button contracts, UI adapter policy, answer presenter, and live proof inventory.",
    screenMayImportDirectly: true,
  },
  {
    layer: "domainDataGateway",
    root: "src/lib/ai/domainDataGateway",
    purpose: "Typed, bounded, permission-scoped internal app data retrieval for AI answers and workflows.",
    screenMayImportDirectly: false,
  },
  {
    layer: "contextBudget",
    root: "src/lib/ai/contextBudget",
    purpose: "Role-specific AI context fact budgets before answer composition.",
    screenMayImportDirectly: false,
  },
  {
    layer: "sourceSanitizer",
    root: "src/lib/ai/sourceSanitizer",
    purpose: "Sanitizes provider/debug/source internals before AI-facing context.",
    screenMayImportDirectly: false,
  },
  {
    layer: "sourceIntelligence",
    root: "src/lib/ai/sourceIntelligence",
    purpose: "Source-backed price observation, refresh, matching, and evidence guard facade for built-in AI tools.",
    screenMayImportDirectly: false,
  },
  {
    layer: "contractRuntime",
    root: "src/lib/ai/contractRuntime",
    purpose: "Contract trace, invariant validation, root-cause proof, and no-symptom-patch enforcement.",
    screenMayImportDirectly: false,
  },
  {
    layer: "externalKnowledge",
    root: "src/lib/ai/externalKnowledge",
    purpose: "Verified public knowledge, regulations, manuals, and market references.",
    screenMayImportDirectly: false,
  },
  {
    layer: "roleBusinessCopilots",
    root: "src/lib/ai/roleBusinessCopilots",
    purpose: "Role-based workflow copilots that compose safe read/draft/approval business next steps.",
    screenMayImportDirectly: false,
  },
  {
    layer: "safeActions",
    root: "src/lib/ai/safeActions",
    purpose: "Draft-only and approval-required action plans. No final business mutations.",
    screenMayImportDirectly: false,
  },
  {
    layer: "approvalExecutionBoundary",
    root: "src/lib/ai/approvalExecutionBoundary",
    purpose: "Human approval ledger, precondition recheck, idempotency, and execution boundary for approved services.",
    screenMayImportDirectly: false,
  },
  {
    layer: "evaluation",
    root: "src/lib/ai/evaluation",
    purpose: "Question bank, evaluation runners, and regression scoring.",
    screenMayImportDirectly: false,
  },
  {
    layer: "enterpriseGuardrails",
    root: "src/lib/ai/enterpriseGuardrails",
    purpose: "Architecture scanners, anti-kostyl policy, and release gate matrix.",
    screenMayImportDirectly: false,
  },
];

export const AI_ENTERPRISE_GRANDFATHERED_LEGACY_LAYERS: AiEnterpriseLegacyLayerDefinition[] = [
  {
    root: "src/lib/ai/liveUi",
    reason: "Existing runtime UI adapter kept as legacy compatibility; new feature expansion must use approved layers.",
    mayReceiveNewFeatureWork: false,
  },
  {
    root: "src/lib/ai/accountantFinance",
    reason: "Existing role pack from previous waves; guarded but not an approved expansion layer.",
    mayReceiveNewFeatureWork: false,
  },
  {
    root: "src/lib/ai/buyerSourcing",
    reason: "Existing role pack from previous waves; guarded but not an approved expansion layer.",
    mayReceiveNewFeatureWork: false,
  },
  {
    root: "src/lib/ai/constructionDataGraph",
    reason: "Existing construction support module; future expansion goes through externalKnowledge/evaluation.",
    mayReceiveNewFeatureWork: false,
  },
  {
    root: "src/lib/ai/constructionKnowledgeCore",
    reason: "Existing construction support module; future expansion goes through externalKnowledge/evaluation.",
    mayReceiveNewFeatureWork: false,
  },
  {
    root: "src/lib/ai/directorCompany",
    reason: "Existing role pack from previous waves; guarded but not an approved expansion layer.",
    mayReceiveNewFeatureWork: false,
  },
  {
    root: "src/lib/ai/foremanIntelligence",
    reason: "Existing role pack from previous waves; guarded but not an approved expansion layer.",
    mayReceiveNewFeatureWork: false,
  },
  {
    root: "src/lib/ai/marketplaceIntake",
    reason: "Existing marketplace intake pack; future photo/product expansion goes through approved layers.",
    mayReceiveNewFeatureWork: false,
  },
  {
    root: "src/lib/ai/officeDocumentControl",
    reason: "Existing role pack from previous waves; guarded but not an approved expansion layer.",
    mayReceiveNewFeatureWork: false,
  },
  {
    root: "src/lib/ai/warehouseStock",
    reason: "Existing role pack from previous waves; guarded but not an approved expansion layer.",
    mayReceiveNewFeatureWork: false,
  },
];

export function getAiEnterpriseApprovedLayerRoots(): string[] {
  return AI_ENTERPRISE_ALLOWED_LAYERS.map((layer) => layer.root);
}

export function isAiEnterpriseLayerAllowed(layer: string): layer is AiEnterpriseLayer {
  return AI_ENTERPRISE_ARCHITECTURE_POLICY.allowedAiLayers.includes(layer as AiEnterpriseLayer);
}
