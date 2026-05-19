import type {
  ConstructionAccessScope,
  ConstructionKnowledgeSource,
  ConstructionRoleAccessPolicy,
} from "./constructionKnowledgeTypes";

export const CONSTRUCTION_ROLE_ACCESS_POLICIES: readonly ConstructionRoleAccessPolicy[] = [
  {
    role: "foreman",
    readableSourceTypes: ["general_construction_knowledge", "company_standard", "country_profile", "normative_pdf", "project_pdf", "architecture_pdf", "engineering_pdf", "estimate_pdf", "boq", "specification", "act", "report", "photo", "work", "object", "zone", "material", "warehouse_stock", "procurement_request", "approval", "chat_message"],
    canReadFinance: false,
    canReadAllBusinessDomains: false,
    ownRecordsOnly: false,
    forbiddenSourceTypes: ["payment", "supplier_offer"],
  },
  {
    role: "contractor",
    readableSourceTypes: ["general_construction_knowledge", "company_standard", "project_pdf", "architecture_pdf", "engineering_pdf", "specification", "act", "report", "photo", "work", "object", "zone", "material", "approval", "chat_message"],
    canReadFinance: false,
    canReadAllBusinessDomains: false,
    ownRecordsOnly: true,
    forbiddenSourceTypes: ["payment", "warehouse_stock", "supplier_offer"],
  },
  {
    role: "buyer",
    readableSourceTypes: ["general_construction_knowledge", "company_standard", "country_profile", "normative_pdf", "project_pdf", "architecture_pdf", "engineering_pdf", "estimate_pdf", "boq", "specification", "work", "object", "zone", "material", "warehouse_stock", "procurement_request", "supplier_offer", "approval", "chat_message"],
    canReadFinance: false,
    canReadAllBusinessDomains: false,
    ownRecordsOnly: false,
    forbiddenSourceTypes: ["payment"],
  },
  {
    role: "warehouse",
    readableSourceTypes: ["general_construction_knowledge", "company_standard", "project_pdf", "engineering_pdf", "estimate_pdf", "boq", "specification", "work", "object", "zone", "material", "warehouse_stock", "procurement_request", "act", "report", "approval", "chat_message"],
    canReadFinance: false,
    canReadAllBusinessDomains: false,
    ownRecordsOnly: false,
    forbiddenSourceTypes: ["payment", "supplier_offer"],
  },
  {
    role: "accountant",
    readableSourceTypes: ["general_construction_knowledge", "company_standard", "country_profile", "normative_pdf", "estimate_pdf", "boq", "specification", "act", "report", "material", "procurement_request", "supplier_offer", "payment", "approval", "object", "work", "chat_message"],
    canReadFinance: true,
    canReadAllBusinessDomains: false,
    ownRecordsOnly: false,
    forbiddenSourceTypes: ["warehouse_stock"],
  },
  {
    role: "documents",
    readableSourceTypes: ["general_construction_knowledge", "company_standard", "country_profile", "normative_pdf", "project_pdf", "architecture_pdf", "engineering_pdf", "estimate_pdf", "boq", "specification", "act", "report", "photo", "work", "object", "zone", "material", "procurement_request", "payment", "approval", "chat_message"],
    canReadFinance: false,
    canReadAllBusinessDomains: false,
    ownRecordsOnly: false,
    forbiddenSourceTypes: ["supplier_offer", "warehouse_stock"],
  },
  {
    role: "office",
    readableSourceTypes: ["general_construction_knowledge", "company_standard", "country_profile", "project_pdf", "estimate_pdf", "boq", "specification", "act", "report", "work", "object", "zone", "material", "procurement_request", "approval", "chat_message"],
    canReadFinance: false,
    canReadAllBusinessDomains: false,
    ownRecordsOnly: false,
    forbiddenSourceTypes: ["payment", "supplier_offer", "warehouse_stock"],
  },
  {
    role: "director",
    readableSourceTypes: ["general_construction_knowledge", "company_standard", "country_profile", "normative_pdf", "project_pdf", "architecture_pdf", "engineering_pdf", "estimate_pdf", "boq", "specification", "act", "report", "photo", "work", "object", "zone", "material", "warehouse_stock", "procurement_request", "supplier_offer", "payment", "approval", "chat_message"],
    canReadFinance: true,
    canReadAllBusinessDomains: true,
    ownRecordsOnly: false,
    forbiddenSourceTypes: [],
  },
] as const;

export function getConstructionRoleAccessPolicy(
  role: ConstructionAccessScope["role"],
): ConstructionRoleAccessPolicy {
  const policy = CONSTRUCTION_ROLE_ACCESS_POLICIES.find((entry) => entry.role === role);
  if (!policy) {
    throw new Error(`Missing construction role access policy: ${role}`);
  }
  return {
    ...policy,
    readableSourceTypes: [...policy.readableSourceTypes],
    forbiddenSourceTypes: [...policy.forbiddenSourceTypes],
  };
}

function sourceWithinOwnScope(source: ConstructionKnowledgeSource, scope: ConstructionAccessScope): boolean {
  const allowListsMissing =
    !scope.allowedObjectIds?.length &&
    !scope.allowedWorkIds?.length &&
    !scope.allowedDocumentIds?.length &&
    !scope.allowedMaterialIds?.length &&
    !scope.allowedContractorIds?.length;
  if (allowListsMissing) return false;
  if (source.linkedObjectId && scope.allowedObjectIds?.includes(source.linkedObjectId)) return true;
  if (source.linkedWorkId && scope.allowedWorkIds?.includes(source.linkedWorkId)) return true;
  if (source.documentId && scope.allowedDocumentIds?.includes(source.documentId)) return true;
  if (source.linkedMaterialId && scope.allowedMaterialIds?.includes(source.linkedMaterialId)) return true;
  if (source.linkedContractorId && scope.allowedContractorIds?.includes(source.linkedContractorId)) return true;
  return source.type === "general_construction_knowledge" || source.type === "company_standard";
}

export function sanitizeConstructionSourcesForRole(params: {
  scope: ConstructionAccessScope;
  sources: ConstructionKnowledgeSource[];
}): ConstructionKnowledgeSource[] {
  const policy = getConstructionRoleAccessPolicy(params.scope.role);
  return params.sources.filter((source) => {
    if (policy.forbiddenSourceTypes.includes(source.type)) return false;
    if (!policy.readableSourceTypes.includes(source.type)) return false;
    if (policy.ownRecordsOnly) return sourceWithinOwnScope(source, params.scope);
    return true;
  });
}

export const constructionSourceSanitizer = sanitizeConstructionSourcesForRole;
export const aiRoleAccessPolicyProvider = getConstructionRoleAccessPolicy;
