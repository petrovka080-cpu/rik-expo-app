import type {
  ConstructionProviderDescriptor,
  ConstructionProviderKey,
} from "./constructionKnowledgeTypes";

export const REQUIRED_CONSTRUCTION_PROVIDER_KEYS: readonly ConstructionProviderKey[] = [
  "aiConstructionKnowledgeProvider",
  "aiConstructionDisciplineProvider",
  "aiConstructionProjectTypeProvider",
  "aiCountryProfileProvider",
  "aiCompanyStandardsProvider",
  "aiConstructionNormsProvider",
  "aiPdfAggregatorProvider",
  "aiDocumentClassifierProvider",
  "aiEstimateProvider",
  "aiBoqProvider",
  "aiArchitectureProjectProvider",
  "aiEngineeringProjectProvider",
  "aiSpecificationProvider",
  "aiWorksProvider",
  "aiObjectsProvider",
  "aiZonesProvider",
  "aiActsProvider",
  "aiReportsProvider",
  "aiPhotosEvidenceProvider",
  "aiMaterialsProvider",
  "aiWarehouseProvider",
  "aiProcurementProvider",
  "aiSupplierProvider",
  "aiFinanceAccountingProvider",
  "aiApprovalProvider",
  "aiChatProvider",
  "aiRoleAccessPolicyProvider",
] as const;

function descriptor(key: ConstructionProviderKey): ConstructionProviderDescriptor {
  return {
    key,
    pure: true,
    usesHooks: false,
    usesUseEffectHack: false,
    dbWrites: false,
    directMutation: false,
    createsFakeData: false,
    ready: true,
  };
}

export const CONSTRUCTION_PROVIDER_REGISTRY: readonly ConstructionProviderDescriptor[] =
  REQUIRED_CONSTRUCTION_PROVIDER_KEYS.map(descriptor);

export function listConstructionProviderRegistry(): ConstructionProviderDescriptor[] {
  return CONSTRUCTION_PROVIDER_REGISTRY.map((item) => ({ ...item }));
}

export function getConstructionProviderDescriptor(
  key: ConstructionProviderKey,
): ConstructionProviderDescriptor | null {
  const found = CONSTRUCTION_PROVIDER_REGISTRY.find((item) => item.key === key);
  return found ? { ...found } : null;
}

export const aiConstructionKnowledgeProvider = descriptor("aiConstructionKnowledgeProvider");
export const aiCompanyStandardsProvider = descriptor("aiCompanyStandardsProvider");
export const aiPdfAggregatorProvider = descriptor("aiPdfAggregatorProvider");
export const aiSpecificationProvider = descriptor("aiSpecificationProvider");
export const aiWorksProvider = descriptor("aiWorksProvider");
export const aiObjectsProvider = descriptor("aiObjectsProvider");
export const aiZonesProvider = descriptor("aiZonesProvider");
export const aiActsProvider = descriptor("aiActsProvider");
export const aiReportsProvider = descriptor("aiReportsProvider");
export const aiPhotosEvidenceProvider = descriptor("aiPhotosEvidenceProvider");
export const aiMaterialsProvider = descriptor("aiMaterialsProvider");
export const aiWarehouseProvider = descriptor("aiWarehouseProvider");
export const aiProcurementProvider = descriptor("aiProcurementProvider");
export const aiSupplierProvider = descriptor("aiSupplierProvider");
export const aiFinanceAccountingProvider = descriptor("aiFinanceAccountingProvider");
export const aiApprovalProvider = descriptor("aiApprovalProvider");
export const aiChatProvider = descriptor("aiChatProvider");
