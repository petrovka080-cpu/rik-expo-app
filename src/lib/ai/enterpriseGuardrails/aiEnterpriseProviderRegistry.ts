export type AiEnterpriseProviderKind =
  | "app_context_graph"
  | "app_data"
  | "pdf_document"
  | "internal_marketplace"
  | "supplier_history"
  | "external_web"
  | "general_construction_knowledge"
  | "accounting_reference";

export type AiEnterpriseProviderDefinition = {
  id: AiEnterpriseProviderKind;
  ownerLayer:
    | "appContextGraph"
    | "universalRoleQa"
    | "externalKnowledge"
    | "safeActions"
    | "evaluation";
  screenMayCallDirectly: false;
  answerPathMayWriteDb: false;
  requiresSourceRefForInternalFact: boolean;
};

export const AI_ENTERPRISE_PROVIDER_REGISTRY: AiEnterpriseProviderDefinition[] = [
  {
    id: "app_context_graph",
    ownerLayer: "appContextGraph",
    screenMayCallDirectly: false,
    answerPathMayWriteDb: false,
    requiresSourceRefForInternalFact: true,
  },
  {
    id: "app_data",
    ownerLayer: "universalRoleQa",
    screenMayCallDirectly: false,
    answerPathMayWriteDb: false,
    requiresSourceRefForInternalFact: true,
  },
  {
    id: "pdf_document",
    ownerLayer: "universalRoleQa",
    screenMayCallDirectly: false,
    answerPathMayWriteDb: false,
    requiresSourceRefForInternalFact: true,
  },
  {
    id: "internal_marketplace",
    ownerLayer: "universalRoleQa",
    screenMayCallDirectly: false,
    answerPathMayWriteDb: false,
    requiresSourceRefForInternalFact: true,
  },
  {
    id: "supplier_history",
    ownerLayer: "universalRoleQa",
    screenMayCallDirectly: false,
    answerPathMayWriteDb: false,
    requiresSourceRefForInternalFact: true,
  },
  {
    id: "external_web",
    ownerLayer: "externalKnowledge",
    screenMayCallDirectly: false,
    answerPathMayWriteDb: false,
    requiresSourceRefForInternalFact: false,
  },
  {
    id: "general_construction_knowledge",
    ownerLayer: "externalKnowledge",
    screenMayCallDirectly: false,
    answerPathMayWriteDb: false,
    requiresSourceRefForInternalFact: false,
  },
  {
    id: "accounting_reference",
    ownerLayer: "externalKnowledge",
    screenMayCallDirectly: false,
    answerPathMayWriteDb: false,
    requiresSourceRefForInternalFact: false,
  },
];
