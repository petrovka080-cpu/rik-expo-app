import { estimateDeterministicHash } from "../../estimateDeterministicHash";

export type ConstructionNormativeSourceTypeV1 =
  | "LAW_OR_TECHNICAL_REGULATION"
  | "DESIGN_STANDARD"
  | "MATERIAL_STANDARD"
  | "WORK_EXECUTION_STANDARD"
  | "RESOURCE_ESTIMATE_NORM"
  | "UNIT_RATE"
  | "PRICE_INDEX"
  | "PROJECT_SPECIFICATION"
  | "SURVEY_OR_LAB_RESULT"
  | "MANUFACTURER_PASSPORT"
  | "INTERNATIONAL_CONTRACT_STANDARD";

export type ConstructionNormativeJurisdictionV1 =
  | "KG"
  | "EAEU"
  | "RU"
  | "KZ"
  | "UZ"
  | "CIS_INTERSTATE"
  | "INTERNATIONAL_PROJECT";

export type ConstructionNormativeSourceStatusV1 =
  | "active"
  | "draft"
  | "superseded"
  | "project-specific";

export type ConstructionNormativeSourceCardV1 = {
  source_id: string;
  source_type: ConstructionNormativeSourceTypeV1;
  jurisdiction: ConstructionNormativeJurisdictionV1;
  authority: string;
  document_code: string;
  title: string;
  edition: string;
  revision: string;
  status: ConstructionNormativeSourceStatusV1;
  effective_from: string | null;
  effective_to: string | null;
  funding_applicability: readonly string[];
  project_type_applicability: readonly string[];
  new_repair_demolition_applicability: readonly string[];
  operation_class_applicability: readonly string[];
  material_system_applicability: readonly string[];
  clause_table_rate_code: string | null;
  unit_basis: string | null;
  official_reference: string;
  content_digest: string;
  version: string;
  license_access_note: string;
  supersedes: readonly string[];
  superseded_by: readonly string[];
  exact_rate_code_required: boolean;
};

export type NormativeApplicabilityRequestV1 = {
  country: "KG" | "RU" | "KZ" | "UZ" | "INTERNATIONAL_PROJECT";
  region: string;
  funding_source: string;
  project_type: string;
  construction_state: "NEW" | "RECONSTRUCTION" | "REPAIR" | "DEMOLITION" | "COMMISSIONING";
  contract_basis: readonly string[];
  effective_date: string;
  material_system: string;
  operation_class: string;
  requested_source_ids: readonly string[];
  requested_source_types: readonly ConstructionNormativeSourceTypeV1[];
  rate_code_by_source_id?: Readonly<Record<string, string>>;
};

export type RejectedNormativeSourceV1 = {
  source_id: string;
  reasons: readonly string[];
};

export type NormativeApplicabilityResolutionV1 = {
  status: "APPLICABLE" | "BLOCKED_SOURCE_REQUIRED";
  applicable_sources: readonly ConstructionNormativeSourceCardV1[];
  rejected_sources_with_reason: readonly RejectedNormativeSourceV1[];
  conflicts: readonly string[];
  required_project_inputs: readonly string[];
  normative_profile_version: "construction-normative-applicability:v1";
  deterministic_hash: string;
};

const ALL = "ALL";

function source(input: Omit<ConstructionNormativeSourceCardV1, "content_digest">): ConstructionNormativeSourceCardV1 {
  return {
    ...input,
    content_digest: estimateDeterministicHash({
      source_id: input.source_id,
      document_code: input.document_code,
      edition: input.edition,
      revision: input.revision,
      official_reference: input.official_reference,
    }),
  };
}

export const CONSTRUCTION_NORMATIVE_SOURCES_V1: readonly ConstructionNormativeSourceCardV1[] = Object.freeze([
  source({
    source_id: "kg_krer_2015_application_guidance",
    source_type: "RESOURCE_ESTIMATE_NORM",
    jurisdiction: "KG",
    authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    document_code: "КРЕР-2015",
    title: "Указания по применению Кыргызских единичных расценок на строительные и специальные строительные работы",
    edition: "2015",
    revision: "official-page-verified-2026-08-11",
    status: "active",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL, "STATE_BUDGET", "EXTRA_BUDGETARY_FUND", "PRIVATE_RECOMMENDED"],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION"],
    operation_class_applicability: [ALL],
    material_system_applicability: [ALL],
    clause_table_rate_code: null,
    unit_basis: "RATE_BOOK_APPLICATION_GUIDANCE",
    official_reference: "https://minstroy.gov.kg/ru/kyzmat/359/show",
    version: "kg-krer-2015:application-guidance:v1",
    license_access_note: "Public official metadata and application scope only; an exact licensed rate code is required before a resource rate is used.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: true,
  }),
  source({
    source_id: "kg_krerr_2015_application_guidance",
    source_type: "RESOURCE_ESTIMATE_NORM",
    jurisdiction: "KG",
    authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    document_code: "КРЕРр-2015",
    title: "Указания по применению Кыргызских единичных расценок на ремонтно-строительные работы",
    edition: "2015",
    revision: "official-page-verified-2026-08-11",
    status: "active",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL, "STATE_BUDGET", "EXTRA_BUDGETARY_FUND", "PRIVATE_RECOMMENDED"],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["REPAIR", "DEMOLITION"],
    operation_class_applicability: [ALL],
    material_system_applicability: [ALL],
    clause_table_rate_code: null,
    unit_basis: "RATE_BOOK_APPLICATION_GUIDANCE",
    official_reference: "https://minstroy.gov.kg/ru/kyzmat/358/show",
    version: "kg-krerr-2015:application-guidance:v1",
    license_access_note: "Public official metadata and application scope only; an exact licensed repair rate code is required before a resource rate is used.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: true,
  }),
  source({
    source_id: "kg_krerm_2015_application_guidance",
    source_type: "RESOURCE_ESTIMATE_NORM",
    jurisdiction: "KG",
    authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    document_code: "КРЕРм-2015",
    title: "Указания по применению Кыргызских единичных расценок на монтаж оборудования",
    edition: "2015",
    revision: "official-page-verified-2026-08-11",
    status: "active",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL, "STATE_BUDGET", "EXTRA_BUDGETARY_FUND", "PRIVATE_RECOMMENDED"],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["EQUIPMENT_INSTALLATION"],
    material_system_applicability: [ALL],
    clause_table_rate_code: null,
    unit_basis: "RATE_BOOK_APPLICATION_GUIDANCE",
    official_reference: "https://minstroy.gov.kg/ru/kyzmat/353/show",
    version: "kg-krerm-2015:application-guidance:v1",
    license_access_note: "Public official metadata and application scope only; an exact licensed installation rate code is required before a resource rate is used.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: true,
  }),
  source({
    source_id: "kg_krerp_2015_application_guidance",
    source_type: "RESOURCE_ESTIMATE_NORM",
    jurisdiction: "KG",
    authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    document_code: "КРЕРп-2015",
    title: "Указания по применению Кыргызских единичных расценок на пусконаладочные работы",
    edition: "2015",
    revision: "official-page-verified-2026-08-11",
    status: "active",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL, "STATE_BUDGET", "EXTRA_BUDGETARY_FUND", "PRIVATE_RECOMMENDED"],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["COMMISSIONING"],
    operation_class_applicability: ["COMMISSIONING"],
    material_system_applicability: [ALL],
    clause_table_rate_code: null,
    unit_basis: "RATE_BOOK_APPLICATION_GUIDANCE",
    official_reference: "https://minstroy.gov.kg/ru/kyzmat/357/show",
    version: "kg-krerp-2015:application-guidance:v1",
    license_access_note: "Public official metadata and application scope only; an exact licensed commissioning rate code is required before a resource rate is used.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: true,
  }),
  source({
    source_id: "eaeu_tr_053_2026_paint_safety",
    source_type: "LAW_OR_TECHNICAL_REGULATION",
    jurisdiction: "EAEU",
    authority: "Совет Евразийской экономической комиссии",
    document_code: "ТР ЕАЭС 053/2026; Решение Совета ЕЭК № 65",
    title: "О безопасности лакокрасочных материалов",
    edition: "2026",
    revision: "adopted-2026-05-20-published-2026-07-01",
    status: "active",
    effective_from: "2026-07-31",
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["APPLY", "PAINT", "PRIME", "REPAIR"],
    material_system_applicability: ["PAINT", "PRIMER", "COATING"],
    clause_table_rate_code: null,
    unit_basis: null,
    official_reference: "https://docs.eaeunion.org/documents/461/10768/",
    version: "eaeu-tr-053-2026:v1",
    license_access_note: "Public legal metadata; this technical regulation is not a material-consumption or labor-rate source.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: "KG_SP_KR_65_101_2025",
    source_type: "WORK_EXECUTION_STANDARD",
    jurisdiction: "KG",
    authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    document_code: "СП КР 65-101:2025",
    title: "Изоляционные и отделочные покрытия",
    edition: "2025",
    revision: "official-edition-order-51-2025-02-10",
    status: "active",
    effective_from: "2025-02-11",
    effective_to: null,
    funding_applicability: [ALL, "STATE_BUDGET", "EXTRA_BUDGETARY_FUND", "PRIVATE_RECOMMENDED"],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["FRAME", "ALIGN", "CLAD", "FINISH_JOINT", "INSULATE", "PREPARE", "REPAIR"],
    material_system_applicability: ["BULKHEAD", "CURVE", "FLAT_CEILING"],
    clause_table_rate_code: "7.7.1-7.7.5; table 7.8; 4.4-4.9",
    unit_basis: "WORK_EXECUTION_AND_ACCEPTANCE",
    official_reference: "https://minstroy.gov.kg/ru/document/150/show",
    version: "kg-sp-65-101-2025:official:v1",
    license_access_note: "Открытая официальная публикация и официальный PDF; источник правил производства и приемки, но не рыночных цен.",
    supersedes: ["СНиП 3.04.01-87"],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: "KG_KRER_10_05_011",
    source_type: "RESOURCE_ESTIMATE_NORM",
    jurisdiction: "KG",
    authority: "Государственное агентство архитектуры, строительства и жилищно-коммунального хозяйства при Кабинете Министров Кыргызской Республики",
    document_code: "КРЕР 10-05-011",
    title: "Устройство подвесных потолков из гипсокартонных листов по системе «КНАУФ»",
    edition: "приказ №52-нпа от 28.04.2022",
    revision: "official-pdf-pages-97-99-verified-2026-08-13",
    status: "active",
    effective_from: "2022-04-28",
    effective_to: null,
    funding_applicability: [ALL, "STATE_BUDGET", "EXTRA_BUDGETARY_FUND", "PRIVATE_RECOMMENDED"],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION"],
    operation_class_applicability: ["FRAME", "ALIGN", "CLAD", "FINISH_JOINT", "INSULATE", "PREPARE"],
    material_system_applicability: ["BULKHEAD", "CURVE", "FLAT_CEILING"],
    clause_table_rate_code: "Е10-05-011-01; Е10-05-011-02",
    unit_basis: "100 m2 ceilings",
    official_reference: "https://minstroy.gov.kg/index.php/kg/state_program/download-pdf/prikazot28aprela2022godano52npa_compressed-25868e3850a3ecfb9.81892156.pdf",
    version: "kg-krer-10-05-011:order-52-npa:v1",
    license_access_note: "Открытый официальный PDF: раздел 5, таблица КРЕР 10-05-011, состав работ и построчная ведомость ресурсов; цены проекта вводятся отдельно.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: "KG_SN_KR_12_01_2018",
    source_type: "WORK_EXECUTION_STANDARD",
    jurisdiction: "KG",
    authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    document_code: "СН КР 12-01:2018",
    title: "Безопасность труда в строительстве",
    edition: "2018",
    revision: "official-pdf-verified-2026-08-13",
    status: "active",
    effective_from: "2018-07-23",
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR", "DEMOLITION"],
    operation_class_applicability: [ALL],
    material_system_applicability: [ALL],
    clause_table_rate_code: "ППР и технологические карты; организация рабочих мест; работы на высоте; СИЗ",
    unit_basis: "WORK_SAFETY_CONTROL",
    official_reference: "https://minstroy.gov.kg/kg/state_program/download-pdf/snkr12012018bezopasnosttrudavstroitelstve-6366853ed862b98c2.90721660.pdf",
    version: "kg-sn-12-01-2018:official:v1",
    license_access_note: "Открытый официальный PDF; источник требований безопасности, а не норм расхода или цен.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: "KG_DRYWALL_MATERIAL_CONFORMITY_ROUTE",
    source_type: "MATERIAL_STANDARD",
    jurisdiction: "KG",
    authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    document_code: "Реестр сертификатов соответствия на строительные материалы",
    title: "Проектный маршрут подтверждения соответствия гипсокартонных листов и совместимости комплектной системы",
    edition: "live registry",
    revision: "official-registry-verified-2026-08-13",
    status: "project-specific",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["FRAME", "ALIGN", "CLAD", "FINISH_JOINT", "INSULATE", "PREPARE", "REPAIR"],
    material_system_applicability: ["BULKHEAD", "CURVE", "FLAT_CEILING"],
    clause_table_rate_code: "действующий сертификат конкретной партии + паспорт выбранной совместимой системы + проектная спецификация",
    unit_basis: "PROJECT_SELECTED_CERTIFIED_SYSTEM",
    official_reference: "https://minstroy.gov.kg/ru/building/materials/sertificate",
    version: "kg-drywall-material-conformity-route:v1",
    license_access_note: "Реестр подтверждает конкретные партии продукции. Он не создает универсальный расход: номер действующего сертификата, паспорт системы и проектная спецификация остаются явными входами проекта.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
]);

function includesOrAll(values: readonly string[], value: string): boolean {
  return values.includes(ALL) || values.includes(value);
}

function dateWithin(sourceCard: ConstructionNormativeSourceCardV1, date: string): boolean {
  if (sourceCard.effective_from && date < sourceCard.effective_from) return false;
  if (sourceCard.effective_to && date > sourceCard.effective_to) return false;
  return true;
}

function jurisdictionAllowed(
  sourceCard: ConstructionNormativeSourceCardV1,
  request: NormativeApplicabilityRequestV1,
): boolean {
  if (sourceCard.jurisdiction === request.country) return true;
  if (request.country === "KG" && sourceCard.jurisdiction === "EAEU") return true;
  return request.contract_basis.includes(`ACCEPTS:${sourceCard.jurisdiction}`);
}

function rejectionReasons(
  sourceCard: ConstructionNormativeSourceCardV1,
  request: NormativeApplicabilityRequestV1,
): string[] {
  const reasons: string[] = [];
  if (sourceCard.status !== "active" && sourceCard.status !== "project-specific") reasons.push(`STATUS_${sourceCard.status.toUpperCase()}`);
  if (!jurisdictionAllowed(sourceCard, request)) reasons.push("JURISDICTION_NOT_ACCEPTED");
  if (!dateWithin(sourceCard, request.effective_date)) reasons.push("OUTSIDE_EFFECTIVE_DATE");
  if (!includesOrAll(sourceCard.funding_applicability, request.funding_source)) reasons.push("FUNDING_NOT_APPLICABLE");
  if (!includesOrAll(sourceCard.project_type_applicability, request.project_type)) reasons.push("PROJECT_TYPE_NOT_APPLICABLE");
  if (!includesOrAll(sourceCard.new_repair_demolition_applicability, request.construction_state)) reasons.push("CONSTRUCTION_STATE_NOT_APPLICABLE");
  if (!includesOrAll(sourceCard.operation_class_applicability, request.operation_class)) reasons.push("OPERATION_CLASS_NOT_APPLICABLE");
  if (!includesOrAll(sourceCard.material_system_applicability, request.material_system)) reasons.push("MATERIAL_SYSTEM_NOT_APPLICABLE");
  return reasons;
}

export class ConstructionNormativeRegistryV1 {
  private readonly byId: ReadonlyMap<string, ConstructionNormativeSourceCardV1>;

  constructor(sources: readonly ConstructionNormativeSourceCardV1[] = CONSTRUCTION_NORMATIVE_SOURCES_V1) {
    const entries = new Map<string, ConstructionNormativeSourceCardV1>();
    for (const sourceCard of sources) {
      if (entries.has(sourceCard.source_id)) throw new Error(`NORMATIVE_SOURCE_DUPLICATE:${sourceCard.source_id}`);
      if (!sourceCard.official_reference.trim() || !sourceCard.version.trim() || !sourceCard.content_digest.trim()) {
        throw new Error(`NORMATIVE_SOURCE_METADATA_INCOMPLETE:${sourceCard.source_id}`);
      }
      entries.set(sourceCard.source_id, sourceCard);
    }
    this.byId = entries;
  }

  list(): readonly ConstructionNormativeSourceCardV1[] {
    return [...this.byId.values()].sort((left, right) => left.source_id.localeCompare(right.source_id));
  }

  get(sourceId: string): ConstructionNormativeSourceCardV1 | null {
    return this.byId.get(sourceId) ?? null;
  }

  resolve(request: NormativeApplicabilityRequestV1): NormativeApplicabilityResolutionV1 {
    const requestedCards = request.requested_source_ids.map((sourceId) => this.byId.get(sourceId) ?? null);
    const missingIds = request.requested_source_ids.filter((_, index) => requestedCards[index] == null);
    const considered = requestedCards.filter((item): item is ConstructionNormativeSourceCardV1 => item !== null);
    const rejected = considered
      .map((sourceCard) => ({ source_id: sourceCard.source_id, reasons: rejectionReasons(sourceCard, request) }))
      .filter((item) => item.reasons.length > 0);
    const rejectedIds = new Set(rejected.map((item) => item.source_id));
    const applicable = considered.filter((sourceCard) => !rejectedIds.has(sourceCard.source_id));
    const requiredProjectInputs = [
      ...missingIds.map((sourceId) => `normative_source:${sourceId}`),
      ...applicable
        .filter((sourceCard) => sourceCard.exact_rate_code_required && !(request.rate_code_by_source_id?.[sourceCard.source_id] ?? "").trim())
        .map((sourceCard) => `exact_rate_code:${sourceCard.source_id}`),
      ...request.requested_source_types
        .filter((sourceType) => !applicable.some((sourceCard) => sourceCard.source_type === sourceType))
        .map((sourceType) => `applicable_source_type:${sourceType}`),
    ];
    const conflicts = applicable
      .filter((sourceCard) => !jurisdictionAllowed(sourceCard, request))
      .map((sourceCard) => `FOREIGN_SOURCE_WITHOUT_CONTRACT_BASIS:${sourceCard.source_id}`);
    const withoutHash = {
      status: requiredProjectInputs.length === 0 && conflicts.length === 0
        ? "APPLICABLE" as const
        : "BLOCKED_SOURCE_REQUIRED" as const,
      applicable_sources: applicable,
      rejected_sources_with_reason: rejected,
      conflicts,
      required_project_inputs: [...new Set(requiredProjectInputs)].sort(),
      normative_profile_version: "construction-normative-applicability:v1" as const,
    };
    return {
      ...withoutHash,
      deterministic_hash: estimateDeterministicHash(withoutHash),
    };
  }
}

export const constructionNormativeRegistryV1 = new ConstructionNormativeRegistryV1();
