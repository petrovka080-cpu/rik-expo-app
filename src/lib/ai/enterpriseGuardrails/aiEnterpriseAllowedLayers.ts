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
    layer: "estimatorKernel",
    root: "src/lib/ai/estimatorKernel",
    purpose: "Universal estimator reasoning plan for parsable construction work, regulated safe estimate policy, and dynamic BOQ kernel orchestration.",
    screenMayImportDirectly: false,
  },
  {
    layer: "estimateRouting",
    root: "src/lib/ai/estimateRouting",
    purpose: "Universal estimate intent routing, priority guard, prompt extraction, and backend estimate tool dispatch.",
    screenMayImportDirectly: false,
  },
  {
    layer: "exactMaterialPriceEstimate",
    root: "src/lib/ai/exactMaterialPriceEstimate",
    purpose: "User-input exact material recipes, deterministic pricebook lookup, PRICE_MISSING policy, and UI/PDF parity model for construction estimates.",
    screenMayImportDirectly: false,
  },
  {
    layer: "pricebookRatebookGovernance",
    root: "src/lib/ai/pricebookRatebookGovernance",
    purpose: "Governed ratebook validation, verified supplier/source price lookup, stale/conflict blocking, and dry-run import checks for exact estimates.",
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
    layer: "workOntology",
    root: "src/lib/ai/workOntology",
    purpose: "Deterministic construction work intent ontology, ambiguity handling, recipe binding, and proof corpus for real user estimate inputs.",
    screenMayImportDirectly: false,
  },
  {
    layer: "globalLocalContext",
    root: "src/lib/ai/globalLocalContext",
    purpose: "Country, city, currency, units, tax warning, and local-context completeness policy for global local estimates.",
    screenMayImportDirectly: false,
  },
  {
    layer: "performance",
    root: "src/lib/ai/performance",
    purpose: "AI estimate latency measurement, performance budgets, metric collection, and budget validation without prompt or private payload leakage.",
    screenMayImportDirectly: false,
  },
  {
    layer: "cost",
    root: "src/lib/ai/cost",
    purpose: "AI estimate cost guard, proof-runner isolation, retry-loop prevention, and bounded user-visible degradation policy.",
    screenMayImportDirectly: false,
  },
  {
    layer: "rateLimit",
    root: "src/lib/ai/rateLimit",
    purpose: "Shared AI estimate rate-limit policy for request, PDF, catalog, source, and proof workloads.",
    screenMayImportDirectly: false,
  },
  {
    layer: "productionCanary",
    root: "src/lib/ai/productionCanary",
    purpose: "Default-off internal AI estimate canary policy, eligibility, feedback, replay, and error-budget contracts.",
    screenMayImportDirectly: false,
  },
  {
    layer: "observability",
    root: "src/lib/ai/observability",
    purpose: "Safe AI estimate telemetry event contracts and redaction validation for final readiness.",
    screenMayImportDirectly: false,
  },
  {
    layer: "killSwitch",
    root: "src/lib/ai/killSwitch",
    purpose: "AI estimate kill-switch policy for disabling embedded estimates, request drafts, PDF, catalog, source refresh, and canary cohorts.",
    screenMayImportDirectly: false,
  },
  {
    layer: "rollback",
    root: "src/lib/ai/rollback",
    purpose: "AI estimate rollback readiness plan and validation for safe final readiness and canary reversal.",
    screenMayImportDirectly: false,
  },
  {
    layer: "constructionPrimitives",
    root: "src/lib/ai/constructionPrimitives",
    purpose: "Construction primitive graph, open-world domain/object/operation/method/material policy, and graph validation for parametric BOQ compilation.",
    screenMayImportDirectly: false,
  },
  {
    layer: "constructionFormulas",
    root: "src/lib/ai/constructionFormulas",
    purpose: "Construction quantity formulas and unit semantics for semantic estimate work plans.",
    screenMayImportDirectly: false,
  },
  {
    layer: "constructionInterpreter",
    root: "src/lib/ai/constructionInterpreter",
    purpose: "Construction semantic work plan interpretation for domain, object, operation, method, and complexity.",
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
    layer: "professionalQuality",
    root: "src/lib/ai/professionalQuality",
    purpose: "Professional estimator benchmark fixtures and quality gates for semantic estimate correctness.",
    screenMayImportDirectly: false,
  },
  {
    layer: "localEstimatePolicy",
    root: "src/lib/ai/localEstimatePolicy",
    purpose: "Country, city, currency, tax, and source-warning policy for local construction estimates.",
    screenMayImportDirectly: false,
  },
  {
    layer: "localRateSources",
    root: "src/lib/ai/localRateSources",
    purpose: "Local rate/source hierarchy and priced-row source evidence validation for AI estimates.",
    screenMayImportDirectly: false,
  },
  {
    layer: "globalCatalogPolicy",
    root: "src/lib/ai/globalCatalogPolicy",
    purpose: "Region-aware catalog_items candidate policy, catalog-gap warnings, and fake supplier/stock/availability guard.",
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
  {
    layer: "rolloutGovernance",
    root: "src/lib/ai/rolloutGovernance",
    purpose: "Limited public beta allowlist, rollout policy, and feedback governance separated from canary execution.",
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
