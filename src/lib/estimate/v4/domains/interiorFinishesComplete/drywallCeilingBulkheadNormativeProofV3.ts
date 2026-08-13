import { estimateDeterministicHash } from "../../../estimateDeterministicHash";
import type {
  DrywallCeilingBulkheadProfessionalWorkContractV3,
  DrywallCeilingBulkheadProfessionalPackagePartsV3,
} from "./drywallCeilingBulkheadProfessionalV3";

export const DRYWALL_CEILING_BULKHEAD_REGIONAL_LANES_V3 = Object.freeze([
  { lane: "KG", authority: "Минстрой КР", official_url: "https://minstroy.gov.kg/ru/document/150/show", decision: "KG_MANDATORY_BY_EXPLICIT_STATUS_AND_APPLICABILITY_PROOF" },
  { lane: "EASC_INTERSTATE", authority: "Межгосударственный совет по стандартизации / EASC", official_url: "https://easc.by/", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY" },
  { lane: "EAEU", authority: "Евразийская экономическая комиссия", official_url: "https://eec.eaeunion.org/", decision: "NO_RELEVANT_ACTIVE_OFFICIAL_SOURCE_FOUND_WITH_SEARCH_PROOF" },
  { lane: "CIS", authority: "Исполнительный комитет СНГ", official_url: "https://e-cis.info/cooperation/2831/", decision: "NO_RELEVANT_OFFICIAL_SOURCE_FOUND_WITH_SEARCH_PROOF" },
  { lane: "RU", authority: "Минстрой России / Росстандарт", official_url: "https://minstroyrf.gov.ru/docs/", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY" },
  { lane: "KZ", authority: "КазСтандарт", official_url: "https://new-shop.ksm.kz/catalog/document/58895/", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY" },
  { lane: "UZ", authority: "Министерство строительства Узбекистана", official_url: "https://mc.uz/uploads/mcuz_713665728515.pdf", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY" },
  { lane: "TJ", authority: "ADLIA Tajikistan", official_url: "https://mmih.adlia.tj/", decision: "NO_RELEVANT_OFFICIAL_SOURCE_FOUND_WITH_SEARCH_PROOF" },
  { lane: "TM", authority: "Министерство строительства и архитектуры Туркменистана", official_url: "https://construction.gov.tm/ru/category/normativnye-dokumenty/", decision: "NO_RELEVANT_OFFICIAL_SOURCE_FOUND_WITH_SEARCH_PROOF" },
  { lane: "AM", authority: "ARLIS Armenia", official_url: "https://www.arlis.am/", decision: "COMPARATIVE_CONTEXT_ONLY_NO_KG_PROMOTION" },
  { lane: "AZ", authority: "AZSTAND", official_url: "https://azstand.gov.az/az/standartlarin-kataloqu", decision: "NO_RELEVANT_OFFICIAL_SOURCE_FOUND_WITH_SEARCH_PROOF" },
] as const);

export const DRYWALL_CEILING_BULKHEAD_GLOBAL_SYSTEMS_V3 = Object.freeze([
  { system: "ISO", source_id: "ISO_6308_1980", official_url: "https://www.iso.org/standard/12595.html", decision: "SUPERSEDED_OR_WITHDRAWN_REFERENCE_ONLY", relevance: "historical gypsum plasterboard reference" },
  { system: "IEC", source_id: "IEC_SCOPE_CHECK", official_url: "https://www.iec.ch/homepage", decision: "NOT_APPLICABLE_WITH_REASON", relevance: "non-electrical drywall scope" },
  { system: "CEN_EN", source_id: "EN_520_AND_RELATED_GYPSUM_FAMILY", official_url: "https://standards.cencenelec.eu/", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY", relevance: "gypsum boards and metal framing components" },
  { system: "ASTM", source_id: "ASTM_C1396_C754_C840", official_url: "https://store.astm.org/c1396_c1396m-24.html", decision: "COMPARATIVE_TECHNICAL_BENCHMARK_ONLY", relevance: "gypsum board product/application comparison" },
  { system: "AWWA", source_id: "AWWA_SCOPE_CHECK", official_url: "https://www.awwa.org/resources-tools/standards", decision: "NOT_APPLICABLE_WITH_REASON", relevance: "water-sector standards outside drywall scope" },
  { system: "ASHRAE", source_id: "ASHRAE_SCOPE_CHECK", official_url: "https://www.ashrae.org/technical-resources/standards-and-guidelines", decision: "NOT_APPLICABLE_WITH_REASON", relevance: "HVAC standards outside drywall scope absent a project interface" },
  { system: "NFPA", source_id: "NFPA_FIRE_RATED_ASSEMBLY_ROUTE", official_url: "https://www.nfpa.org/codes-and-standards", decision: "CONDITIONAL_COMPARATIVE_PROJECT_INPUT", relevance: "fire-rated assembly only when required by project" },
  { system: "TECHNOLOGY_SPECIFIC", source_id: "MANUFACTURER_TDS_AND_SYSTEM_ALBUM", official_url: "PROJECT_SELECTED_MANUFACTURER_OFFICIAL_TECHNICAL_DOCUMENT", decision: "MANDATORY_AFTER_PROJECT_SELECTION_NOT_KG_STATUS_OWNER", relevance: "spacing, fasteners, layers and rated assembly for selected system" },
] as const);

export type WorkNormativeProofBundleV3 = {
  schema_version: "WorkNormativeProofBundleV3";
  bundle_id: string;
  catalog_id: string;
  group: string;
  variant: string;
  kg_status: "APPLICABLE";
  kg_sources: readonly {
    source_id: string;
    exact_locators: readonly string[];
    role: string;
  }[];
  regional_decisions: readonly {
    decision_id: string;
    lane: string;
    authority: string;
    official_url: string;
    decision: string;
    applies_to_catalog_id: string;
    foreign_mandatory_for_kg: false;
  }[];
  global_decisions: readonly {
    decision_id: string;
    system: string;
    source_id: string;
    official_url: string;
    decision: string;
    relevance: string;
    applies_to_catalog_id: string;
    foreign_mandatory_for_kg: false;
  }[];
  project_specific_checks: readonly string[];
  deterministic_hash: string;
};

export function buildWorkNormativeProofBundleV3(
  contract: DrywallCeilingBulkheadProfessionalWorkContractV3,
): WorkNormativeProofBundleV3 {
  const projectChecks = [
    "moisture_class",
    "fire_rating_class",
    "acoustic_class",
    "design_load_class",
    "project_system_compatibility_reference",
    ...(contract.variant === "wet_zone" ? ["wet-zone material passport and continuity control"] : []),
    ...(contract.variant === "technical_room" ? ["service-opening geometry and system compatibility"] : []),
    ...(contract.variant === "high_load" ? ["design-load calculation and high-load system passport"] : []),
  ];
  const withoutHash = {
    schema_version: "WorkNormativeProofBundleV3" as const,
    bundle_id: contract.normative_proof_bundle_id,
    catalog_id: contract.catalog_id,
    group: contract.group,
    variant: contract.variant,
    kg_status: "APPLICABLE" as const,
    kg_sources: [
      {
        source_id: "KG_SP_KR_65_101_2025",
        exact_locators: ["пп. 4.4–4.9", "пп. 7.7.1–7.7.5", "таблица 7.8"],
        role: "work execution and quality acceptance",
      },
      {
        source_id: "KG_KRER_10_05_011",
        exact_locators: ["раздел 5", "таблица КРЕР 10-05-011", "состав работ 01/02", "ресурсные строки Е10-05-011-01/02"],
        role: "resource composition and exact rate route",
      },
    ],
    regional_decisions: DRYWALL_CEILING_BULKHEAD_REGIONAL_LANES_V3.map((item) => ({
      decision_id: `regional:${contract.catalog_id}:${item.lane}`,
      ...item,
      applies_to_catalog_id: contract.catalog_id,
      foreign_mandatory_for_kg: false as const,
    })),
    global_decisions: DRYWALL_CEILING_BULKHEAD_GLOBAL_SYSTEMS_V3.map((item) => ({
      decision_id: `global:${contract.catalog_id}:${item.system}`,
      ...item,
      applies_to_catalog_id: contract.catalog_id,
      foreign_mandatory_for_kg: false as const,
    })),
    project_specific_checks: projectChecks,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}

export type WorkProfessionalProofBundleV3 = {
  schema_version: "WorkProfessionalProofBundleV3";
  bundle_id: string;
  catalog_id: string;
  group: string;
  variant: string;
  parameter_ids: readonly string[];
  formula_graph_ids: readonly string[];
  resource_row_ids: readonly string[];
  cost_owner_ids: readonly string[];
  price_route_count: number;
  row_trace_count: number;
  owned_cost_scope: readonly string[];
  forbidden_cost_scope: readonly string[];
  non_cost_dependencies: readonly string[];
  hidden_numeric_defaults: 0;
  clone_or_padding_rows: 0;
  deterministic_hash: string;
};

export function buildWorkProfessionalProofBundleV3(
  parts: DrywallCeilingBulkheadProfessionalPackagePartsV3,
): WorkProfessionalProofBundleV3 {
  const rows = parts.child_assemblies.flatMap((assembly) => assembly.rows);
  const withoutHash = {
    schema_version: "WorkProfessionalProofBundleV3" as const,
    bundle_id: parts.contract.professional_proof_bundle_id,
    catalog_id: parts.contract.catalog_id,
    group: parts.contract.group,
    variant: parts.contract.variant,
    parameter_ids: parts.schema.parameters.map((item) => item.parameter_id),
    formula_graph_ids: rows.map((item) => item.formula.formula_id),
    resource_row_ids: rows.map((item) => item.row_id),
    cost_owner_ids: rows.map((item) => item.cost_owner_id),
    price_route_count: rows.filter((item) => item.price_route_v3 != null).length,
    row_trace_count: rows.filter((item) => (item.normative_trace_v3?.length ?? 0) > 0).length,
    owned_cost_scope: parts.contract.owned_cost_scope,
    forbidden_cost_scope: parts.contract.forbidden_cost_scope,
    non_cost_dependencies: parts.contract.non_cost_dependencies,
    hidden_numeric_defaults: 0 as const,
    clone_or_padding_rows: 0 as const,
  };
  return { ...withoutHash, deterministic_hash: estimateDeterministicHash(withoutHash) };
}
