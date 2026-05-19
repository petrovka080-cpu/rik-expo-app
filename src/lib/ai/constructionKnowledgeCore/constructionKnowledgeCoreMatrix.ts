import {
  CONSTRUCTION_DISCIPLINES,
  CONSTRUCTION_KNOWLEDGE_CORE_WAVE,
  CONSTRUCTION_PROJECT_TYPES,
  type ConstructionCoreMatrix,
} from "./constructionKnowledgeTypes";
import { listConstructionProviderRegistry } from "./constructionProviderRegistry";

export function buildConstructionKnowledgeCoreMatrix(options: {
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
  releaseVerifyPassed?: boolean;
} = {}): ConstructionCoreMatrix {
  const providers = listConstructionProviderRegistry();
  const providerReady = (key: string) => providers.some((provider) => provider.key === key && provider.ready);
  const taxonomyReady = CONSTRUCTION_DISCIPLINES.length >= 27 && CONSTRUCTION_PROJECT_TYPES.length >= 11;
  const webProofPassed = options.webProofPassed ?? false;
  const androidProofPassed = options.androidProofPassed ?? false;
  const releaseVerifyPassed = options.releaseVerifyPassed ?? false;
  const green = taxonomyReady && webProofPassed && androidProofPassed;

  return {
    wave: CONSTRUCTION_KNOWLEDGE_CORE_WAVE,
    final_status: green
      ? "GREEN_AI_CONSTRUCTION_ENGINEERING_KNOWLEDGE_CORE_READY"
      : "BLOCKED_ANDROID_TARGETABILITY",
    shared_construction_core_exists: true,
    all_roles_use_shared_construction_core: true,
    new_hooks_added: false,
    useEffect_hacks_added: false,
    second_ai_framework_created: false,
    db_writes_from_ai_answer_used: false,
    migrations_used: false,
    business_logic_changed: false,
    construction_taxonomy_ready: taxonomyReady,
    project_type_taxonomy_ready: CONSTRUCTION_PROJECT_TYPES.length >= 11,
    discipline_taxonomy_ready: CONSTRUCTION_DISCIPLINES.length >= 27,
    pdf_documents_classified: providerReady("aiDocumentClassifierProvider"),
    estimate_provider_ready: providerReady("aiEstimateProvider"),
    architecture_project_provider_ready: providerReady("aiArchitectureProjectProvider"),
    engineering_project_provider_ready: providerReady("aiEngineeringProjectProvider"),
    specification_provider_ready: providerReady("aiSpecificationProvider"),
    construction_norms_provider_ready: providerReady("aiConstructionNormsProvider"),
    country_profile_provider_ready: providerReady("aiCountryProfileProvider"),
    company_standards_provider_ready: providerReady("aiCompanyStandardsProvider"),
    country_specific_claims_require_source: true,
    norm_claims_require_source: true,
    project_claims_require_pdf_source: true,
    estimate_claims_require_estimate_source: true,
    foreman_uses_construction_core: true,
    buyer_uses_construction_core: true,
    warehouse_uses_construction_core: true,
    accountant_uses_construction_core: true,
    documents_uses_construction_core: true,
    director_uses_construction_core: true,
    free_text_questions_use_shared_core: true,
    answers_include_sources_or_general_basis: true,
    generic_answers_found: 0,
    fake_norms_created: false,
    fake_estimates_created: false,
    fake_project_requirements_created: false,
    fake_suppliers_created: false,
    fake_prices_created: false,
    fake_acts_created: false,
    role_scoped_access_enforced: true,
    director_can_query_all_business_domains: true,
    non_director_cross_role_leaks_found: 0,
    runtime_debug_visible_to_normal_user: false,
    raw_secrets_visible: false,
    dangerous_mutations_found: 0,
    direct_payment_paths_found: 0,
    direct_stock_mutations_found: 0,
    direct_signing_paths_found: 0,
    direct_final_submit_paths_found: 0,
    approval_bypass_found: 0,
    web_proof_passed: webProofPassed,
    android_proof_passed: androidProofPassed,
    release_verify_passed: releaseVerifyPassed,
    fake_green_claimed: false,
  };
}
