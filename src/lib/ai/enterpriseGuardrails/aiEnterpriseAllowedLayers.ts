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
