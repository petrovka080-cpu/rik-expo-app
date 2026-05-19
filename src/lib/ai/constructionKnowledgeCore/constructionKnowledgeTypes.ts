export const CONSTRUCTION_KNOWLEDGE_CORE_WAVE =
  "S_AI_CONSTRUCTION_ENGINEERING_KNOWLEDGE_CORE_POINT_OF_NO_RETURN" as const;

export const CONSTRUCTION_PROJECT_TYPES = [
  "residential",
  "commercial",
  "industrial",
  "road",
  "infrastructure",
  "energy",
  "hydro",
  "thermal_power",
  "utility_network",
  "landscaping",
  "other",
] as const;

export type ConstructionProjectType = typeof CONSTRUCTION_PROJECT_TYPES[number];

export const CONSTRUCTION_DISCIPLINES = [
  "architecture",
  "structural",
  "civil",
  "road",
  "earthworks",
  "concrete",
  "steel",
  "masonry",
  "roofing",
  "facade",
  "finishing",
  "mep",
  "hvac",
  "plumbing",
  "electrical",
  "low_voltage",
  "fire_safety",
  "automation",
  "geodesy",
  "landscaping",
  "hydraulic",
  "energy",
  "industrial",
  "commissioning",
  "as_built",
  "quality_control",
  "safety",
] as const;

export type ConstructionDiscipline = typeof CONSTRUCTION_DISCIPLINES[number];

export const CONSTRUCTION_DOCUMENT_TYPES = [
  "architecture_project",
  "structural_project",
  "engineering_project",
  "estimate",
  "boq",
  "material_specification",
  "work_schedule",
  "completion_act",
  "hidden_work_act",
  "as_built_scheme",
  "defect_act",
  "contract",
  "invoice",
  "delivery_note",
  "payment_document",
  "normative_document",
  "company_standard",
  "technical_assignment",
  "work_log",
  "daily_report",
  "photo_report",
  "unknown",
] as const;

export type ConstructionDocumentType = typeof CONSTRUCTION_DOCUMENT_TYPES[number];

export type ConstructionRole =
  | "foreman"
  | "contractor"
  | "buyer"
  | "warehouse"
  | "accountant"
  | "documents"
  | "office"
  | "director";

export type ConstructionKnowledgeSource = {
  id: string;
  type:
    | "general_construction_knowledge"
    | "company_standard"
    | "country_profile"
    | "normative_pdf"
    | "project_pdf"
    | "architecture_pdf"
    | "engineering_pdf"
    | "estimate_pdf"
    | "boq"
    | "specification"
    | "act"
    | "report"
    | "photo"
    | "work"
    | "object"
    | "zone"
    | "material"
    | "warehouse_stock"
    | "procurement_request"
    | "supplier_offer"
    | "payment"
    | "approval"
    | "chat_message";
  labelRu: string;
  documentId?: string;
  fileName?: string;
  page?: number;
  sectionTitle?: string;
  linkedObjectId?: string;
  linkedWorkId?: string;
  linkedEstimateLineId?: string;
  linkedMaterialId?: string;
  linkedContractorId?: string;
  countryCode?: string;
  confidence: "high" | "medium" | "low";
};

export type ConstructionEvent = {
  id: string;
  date?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  projectType?: ConstructionProjectType;
  discipline: Exclude<ConstructionDiscipline, "as_built" | "safety">;
  objectId?: string;
  objectNameRu?: string;
  zoneId?: string;
  zoneNameRu?: string;
  workId?: string;
  workNameRu?: string;
  plannedQty?: number;
  actualQty?: number;
  unit?: string;
  estimateLineId?: string;
  materialIds?: string[];
  status:
    | "planned"
    | "in_progress"
    | "done"
    | "partially_done"
    | "blocked"
    | "ready_for_act"
    | "not_confirmed"
    | "requires_approval";
  blockers: {
    kind:
      | "photo_missing"
      | "document_missing"
      | "signature_missing"
      | "material_missing"
      | "approval_missing"
      | "act_missing"
      | "estimate_mismatch"
      | "project_mismatch"
      | "norm_source_missing"
      | "remark_open"
      | "payment_blocked";
    textRu: string;
  }[];
  sourceRefs: string[];
};

export type ConstructionDocumentInput = {
  id: string;
  fileName: string;
  text?: string;
  pages?: {
    page: number;
    text: string;
  }[];
  linkedObjectId?: string;
  linkedWorkId?: string;
};

export type ConstructionClassificationResult = {
  documentId: string;
  documentType: ConstructionDocumentType;
  discipline: ConstructionDiscipline | "unknown";
  confidence: "high" | "medium" | "low";
  source: ConstructionKnowledgeSource;
  reasons: string[];
};

export type ConstructionEntityExtraction = {
  source: ConstructionKnowledgeSource;
  dates: { value: string; sourceRef: string }[];
  quantities: { value: number; unit: string; sourceRef: string }[];
  materials: { labelRu: string; sourceRef: string }[];
  estimateLineIds: { id: string; sourceRef: string }[];
  requirements: { textRu: string; sourceRef: string }[];
  risks: { textRu: string; sourceRef: string }[];
};

export type ConstructionEstimateLine = {
  id: string;
  labelRu: string;
  qty: number;
  unit: string;
  amount?: number;
  currency?: string;
  sourceRef: string;
  linkedWorkId?: string;
  linkedMaterialId?: string;
};

export type ConstructionProjectRequirement = {
  id: string;
  textRu: string;
  discipline: ConstructionDiscipline | "unknown";
  sourceRef: string;
  page?: number;
  linkedObjectId?: string;
  linkedWorkId?: string;
};

export type ConstructionCountryProfile = {
  countryCode: string;
  countryNameRu: string;
  currency: string;
  unitSystem: "metric" | "mixed";
  sourceRef: string;
};

export type ConstructionRoleAccessPolicy = {
  role: ConstructionRole;
  readableSourceTypes: ConstructionKnowledgeSource["type"][];
  canReadFinance: boolean;
  canReadAllBusinessDomains: boolean;
  ownRecordsOnly: boolean;
  forbiddenSourceTypes: ConstructionKnowledgeSource["type"][];
};

export type ConstructionAccessScope = {
  role: ConstructionRole;
  screenId?: string;
  allowedObjectIds?: string[];
  allowedWorkIds?: string[];
  allowedDocumentIds?: string[];
  allowedMaterialIds?: string[];
  allowedContractorIds?: string[];
};

export type ConstructionClaimKind =
  | "general"
  | "project"
  | "estimate"
  | "country_norm"
  | "company_standard"
  | "supplier"
  | "price"
  | "stock"
  | "payment"
  | "document"
  | "role_scope";

export type ConstructionAnswerFact = {
  id: string;
  textRu: string;
  claimKind: ConstructionClaimKind;
  sourceRefs: string[];
  confidence: "high" | "medium" | "low";
};

export type ConstructionAnswer = {
  answerRu: string;
  shortRu: string;
  facts: ConstructionAnswerFact[];
  sources: ConstructionKnowledgeSource[];
  missingData: string[];
  risks: string[];
  nextStepRu: string;
  status:
    | "data_not_changed"
    | "draft_prepared"
    | "requires_approval"
    | "blocked_missing_source";
  changedData: false;
  providerTrace: string[];
  blockedReasons: string[];
};

export type ConstructionQuestionRequest = {
  role: ConstructionRole;
  screenId: string;
  questionRu: string;
  sources: ConstructionKnowledgeSource[];
  events?: ConstructionEvent[];
  countryProfile?: ConstructionCountryProfile | null;
};

export type ConstructionProviderKey =
  | "aiConstructionKnowledgeProvider"
  | "aiConstructionDisciplineProvider"
  | "aiConstructionProjectTypeProvider"
  | "aiCountryProfileProvider"
  | "aiCompanyStandardsProvider"
  | "aiConstructionNormsProvider"
  | "aiPdfAggregatorProvider"
  | "aiDocumentClassifierProvider"
  | "aiEstimateProvider"
  | "aiBoqProvider"
  | "aiArchitectureProjectProvider"
  | "aiEngineeringProjectProvider"
  | "aiSpecificationProvider"
  | "aiWorksProvider"
  | "aiObjectsProvider"
  | "aiZonesProvider"
  | "aiActsProvider"
  | "aiReportsProvider"
  | "aiPhotosEvidenceProvider"
  | "aiMaterialsProvider"
  | "aiWarehouseProvider"
  | "aiProcurementProvider"
  | "aiSupplierProvider"
  | "aiFinanceAccountingProvider"
  | "aiApprovalProvider"
  | "aiChatProvider"
  | "aiRoleAccessPolicyProvider";

export type ConstructionProviderDescriptor = {
  key: ConstructionProviderKey;
  pure: true;
  usesHooks: false;
  usesUseEffectHack: false;
  dbWrites: false;
  directMutation: false;
  createsFakeData: false;
  ready: boolean;
  blocker?: ConstructionCoreBlocker;
};

export type ConstructionCoreBlocker =
  | "BLOCKED_CONSTRUCTION_CORE_NOT_CONNECTED"
  | "BLOCKED_CONSTRUCTION_TAXONOMY_MISSING"
  | "BLOCKED_PDF_AGGREGATOR_NOT_CONNECTED"
  | "BLOCKED_ESTIMATE_PROVIDER_NOT_CONNECTED"
  | "BLOCKED_ARCHITECTURE_PROVIDER_NOT_CONNECTED"
  | "BLOCKED_ENGINEERING_PROJECT_PROVIDER_NOT_CONNECTED"
  | "BLOCKED_COUNTRY_PROFILE_NOT_CONFIGURED"
  | "BLOCKED_COMPANY_STANDARDS_NOT_CONNECTED"
  | "BLOCKED_ROLE_ACCESS_POLICY_MISSING"
  | "BLOCKED_ANDROID_TARGETABILITY"
  | "BLOCKED_IOS_TESTFLIGHT_SIGNOFF_REQUIRED";

export type ConstructionCoreMatrix = {
  wave: typeof CONSTRUCTION_KNOWLEDGE_CORE_WAVE;
  final_status:
    | "GREEN_AI_CONSTRUCTION_ENGINEERING_KNOWLEDGE_CORE_READY"
    | ConstructionCoreBlocker;
  shared_construction_core_exists: boolean;
  all_roles_use_shared_construction_core: boolean;
  new_hooks_added: false;
  useEffect_hacks_added: false;
  second_ai_framework_created: false;
  db_writes_from_ai_answer_used: false;
  migrations_used: false;
  business_logic_changed: false;
  construction_taxonomy_ready: boolean;
  project_type_taxonomy_ready: boolean;
  discipline_taxonomy_ready: boolean;
  pdf_documents_classified: boolean;
  estimate_provider_ready: boolean;
  architecture_project_provider_ready: boolean;
  engineering_project_provider_ready: boolean;
  specification_provider_ready: boolean;
  construction_norms_provider_ready: boolean;
  country_profile_provider_ready: boolean;
  company_standards_provider_ready: boolean;
  country_specific_claims_require_source: boolean;
  norm_claims_require_source: boolean;
  project_claims_require_pdf_source: boolean;
  estimate_claims_require_estimate_source: boolean;
  foreman_uses_construction_core: boolean;
  buyer_uses_construction_core: boolean;
  warehouse_uses_construction_core: boolean;
  accountant_uses_construction_core: boolean;
  documents_uses_construction_core: boolean;
  director_uses_construction_core: boolean;
  free_text_questions_use_shared_core: boolean;
  answers_include_sources_or_general_basis: boolean;
  generic_answers_found: number;
  fake_norms_created: false;
  fake_estimates_created: false;
  fake_project_requirements_created: false;
  fake_suppliers_created: false;
  fake_prices_created: false;
  fake_acts_created: false;
  role_scoped_access_enforced: boolean;
  director_can_query_all_business_domains: boolean;
  non_director_cross_role_leaks_found: number;
  runtime_debug_visible_to_normal_user: false;
  raw_secrets_visible: false;
  dangerous_mutations_found: number;
  direct_payment_paths_found: number;
  direct_stock_mutations_found: number;
  direct_signing_paths_found: number;
  direct_final_submit_paths_found: number;
  approval_bypass_found: number;
  web_proof_passed: boolean;
  android_proof_passed: boolean;
  release_verify_passed: boolean;
  fake_green_claimed: false;
};
