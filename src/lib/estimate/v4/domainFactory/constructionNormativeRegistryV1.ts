import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import {
  DAIKIN_3MXS_K_PRODUCT_PROFILE_ID,
  DAIKIN_3MXS_K_SOURCE_ID,
  DAIKIN_3MXS_K_SOURCE_METADATA,
  KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID,
  KNAUF_D112_WALL_FASTENER_SOURCE_ID,
  KNAUF_D112_WALL_FASTENER_SOURCE_METADATA,
  LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
  LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA,
  LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID,
  LINDAB_VSR_PRODUCT_PROFILE_ID,
  LINDAB_VSR_SOURCE_ID,
  LINDAB_VSR_SOURCE_METADATA,
  UPONOR_UFH_150MM_PRODUCT_PROFILE_ID,
  UPONOR_UFH_150MM_SOURCE_ID,
  UPONOR_UFH_150MM_SOURCE_METADATA,
  WAVIN_HEP2O_CLIP_SOURCE_METADATA,
  WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID,
  WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
  WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA,
} from "./professionalPhysicalNormApplicabilityV1";

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
  product_profile_applicability?: readonly string[];
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
  product_profile_id?: string;
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
    operation_class_applicability: ["FRAME", "ALIGN", "CLAD", "FINISH_JOINT", "INSULATE", "PREPARE", "REPAIR", "INSTALL"],
    material_system_applicability: ["BULKHEAD", "CURVE", "FLAT_CEILING", "DRYWALL_DOMAIN"],
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
    operation_class_applicability: ["FRAME", "ALIGN", "CLAD", "FINISH_JOINT", "INSULATE", "PREPARE", "INSTALL"],
    material_system_applicability: ["BULKHEAD", "CURVE", "FLAT_CEILING", "DRYWALL_DOMAIN"],
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
    operation_class_applicability: ["FRAME", "ALIGN", "CLAD", "FINISH_JOINT", "INSULATE", "PREPARE", "REPAIR", "INSTALL"],
    material_system_applicability: ["BULKHEAD", "CURVE", "FLAT_CEILING", "DRYWALL_DOMAIN"],
    clause_table_rate_code: "действующий сертификат конкретной партии + паспорт выбранной совместимой системы + проектная спецификация",
    unit_basis: "PROJECT_SELECTED_CERTIFIED_SYSTEM",
    official_reference: "https://minstroy.gov.kg/ru/building/materials/sertificate",
    version: "kg-drywall-material-conformity-route:v1",
    license_access_note: "Реестр подтверждает конкретные партии продукции. Он не создает универсальный расход: номер действующего сертификата, паспорт системы и проектная спецификация остаются явными входами проекта.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: "KG_KRERM_08_2015_ELECTRICAL",
    source_type: "RESOURCE_ESTIMATE_NORM",
    jurisdiction: "KG",
    authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    document_code: "КРЕРм 08-2015",
    title: "Монтаж оборудования. Сборник № 8 Электротехнические установки",
    edition: "2015",
    revision: "official-application-guidance-verified-2026-08-13",
    status: "active",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL, "STATE_BUDGET", "EXTRA_BUDGETARY_FUND", "PRIVATE_RECOMMENDED"],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: [ALL],
    operation_class_applicability: [ALL],
    material_system_applicability: [ALL],
    clause_table_rate_code: "Сборник 08; точная таблица и расценка выбираются по проектной операции",
    unit_basis: "EXACT_KRERM_08_RATE",
    official_reference: "https://minstroy.gov.kg/ru/state_program/download-pdf/montazoborudovania-62169004e91aaf866.70682138.pdf",
    version: "kg-krerm-08-2015-electrical:v1",
    license_access_note: "Официальное открытое руководство подтверждает сборник и структуру расценок; точный шифр расценки обязателен как проектный вход, цена не выдумывается.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: true,
  }),
  source({
    source_id: "KG_KRERP_01_2015_ELECTRICAL",
    source_type: "RESOURCE_ESTIMATE_NORM",
    jurisdiction: "KG",
    authority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    document_code: "КРЕРп 01-2015",
    title: "Пусконаладочные работы. Сборник № 1 Электротехнические устройства",
    edition: "2015",
    revision: "official-application-guidance-verified-2026-08-13",
    status: "active",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL, "STATE_BUDGET", "EXTRA_BUDGETARY_FUND", "PRIVATE_RECOMMENDED"],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: [ALL],
    operation_class_applicability: [ALL],
    material_system_applicability: [ALL],
    clause_table_rate_code: "Сборник 01; точная таблица и расценка выбираются по программе ПНР",
    unit_basis: "EXACT_KRERP_01_RATE",
    official_reference: "https://minstroy.gov.kg/ru/state_program/download-pdf/puskonaladocnyeraboty-54969005897c6ec16.38601706.pdf",
    version: "kg-krerp-01-2015-electrical:v1",
    license_access_note: "Официальное руководство подтверждает сборник ПНР; точный шифр или доказанный N_A_WITH_REASON обязателен, цена не выдумывается.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: true,
  }),
  source({
    source_id: "KG_ELECTRICAL_SAFETY_2023",
    source_type: "WORK_EXECUTION_STANDARD",
    jurisdiction: "KG",
    authority: "Министерство энергетики Кыргызской Республики",
    document_code: "Приказ № 01-13/157 от 03.08.2023",
    title: "Правила техники безопасности при эксплуатации электроустановок",
    edition: "2023",
    revision: "official-legal-database-verified-2026-08-13",
    status: "active",
    effective_from: "2023-08-03",
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: [ALL],
    operation_class_applicability: [ALL],
    material_system_applicability: [ALL],
    clause_table_rate_code: "Организационные и технические мероприятия безопасного производства работ; точный применимый пункт фиксируется в ППР и наряде",
    unit_basis: "ELECTRICAL_WORK_SAFETY",
    official_reference: "https://cbd.minjust.gov.kg/200900/edition/1273326/ru",
    version: "kg-electrical-safety-2023:v1",
    license_access_note: "Официальный открытый нормативный текст; источник HSE, а не норм расхода или рыночных цен.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: "KG_ELECTRICAL_ACCEPTANCE_2023",
    source_type: "WORK_EXECUTION_STANDARD",
    jurisdiction: "KG",
    authority: "Министерство энергетики Кыргызской Республики",
    document_code: "Приказ № 01-13/69 от 22.03.2023",
    title: "Правила приёмки в эксплуатацию законченных строительством распределительных электрических сетей напряжением 0,38–10 кВ",
    edition: "2023",
    revision: "official-legal-database-verified-2026-08-13",
    status: "active",
    effective_from: "2023-03-22",
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: [ALL],
    operation_class_applicability: [ALL],
    material_system_applicability: [ALL],
    clause_table_rate_code: "Программа испытаний, исполнительные документы и приёмка сетей 0,38–10 кВ; для иных напряжений — только применимая проектная роль",
    unit_basis: "TEST_AND_ACCEPTANCE",
    official_reference: "https://cbd.minjust.gov.kg/51-476/edition/1241467/ru",
    version: "kg-electrical-acceptance-2023:v1",
    license_access_note: "Официальный открытый нормативный текст; применение за пределами 0,38–10 кВ требует отдельного проектного основания.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: "KG_FIRE_SAFETY_RULES_2025",
    source_type: "LAW_OR_TECHNICAL_REGULATION",
    jurisdiction: "KG",
    authority: "Кабинет Министров Кыргызской Республики",
    document_code: "Постановление № 251 от 13.05.2025",
    title: "Правила пожарной безопасности в Кыргызской Республике",
    edition: "2025",
    revision: "official-legal-database-verified-2026-08-13",
    status: "active",
    effective_from: "2025-05-13",
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: [ALL],
    operation_class_applicability: [ALL],
    material_system_applicability: [ALL],
    clause_table_rate_code: "Применимый раздел проекта пожарной безопасности и сертифицированная система проходки",
    unit_basis: "FIRE_SAFETY_INTERFACE",
    official_reference: "https://cbd.minjust.gov.kg/51-655/edition/31951/ru",
    version: "kg-fire-safety-rules-2025:v1",
    license_access_note: "Официальный открытый нормативный текст; строка огнезаделки остаётся Fire typed child и не дублирует Fire-domain system works.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: "EAEU_TR_TS_004_2011",
    source_type: "MATERIAL_STANDARD",
    jurisdiction: "EAEU",
    authority: "Комиссия Таможенного союза / Евразийская экономическая комиссия",
    document_code: "ТР ТС 004/2011",
    title: "О безопасности низковольтного оборудования",
    edition: "2011 with current amendments",
    revision: "official-eec-pdf-verified-2026-08-13",
    status: "active",
    effective_from: "2013-02-15",
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: [ALL],
    operation_class_applicability: [ALL],
    material_system_applicability: [ALL],
    clause_table_rate_code: "Статья 4 и приложение; диапазон 50–1000 В AC / 75–1500 В DC и документ подтверждения соответствия конкретного изделия",
    unit_basis: "PRODUCT_SAFETY_AND_CONFORMITY",
    official_reference: "https://eec.eaeunion.org/upload/medialibrary/269/TR-TS-Downvolt.pdf",
    version: "eaeu-tr-ts-004-2011:v1",
    license_access_note: "Официальный открытый текст ЕАЭС; не является источником количеств труда, расхода или цен.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: UPONOR_UFH_150MM_SOURCE_ID,
    source_type: "MANUFACTURER_PASSPORT",
    jurisdiction: "INTERNATIONAL_PROJECT",
    authority: "Uponor",
    document_code: UPONOR_UFH_150MM_SOURCE_METADATA.norm_id,
    title: UPONOR_UFH_150MM_SOURCE_METADATA.source_title,
    edition: "Manufacturer public installation guide",
    revision: UPONOR_UFH_150MM_SOURCE_METADATA.source_document_version,
    status: "project-specific",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["INSTALL"],
    material_system_applicability: ["WARM_FLOOR:SPACE_HEATING:HEATING_WATER"],
    product_profile_applicability: [UPONOR_UFH_150MM_PRODUCT_PROFILE_ID],
    clause_table_rate_code: UPONOR_UFH_150MM_SOURCE_METADATA.exact_locator,
    unit_basis: UPONOR_UFH_150MM_SOURCE_METADATA.rate_unit,
    official_reference: UPONOR_UFH_150MM_SOURCE_METADATA.source_url,
    version: UPONOR_UFH_150MM_SOURCE_METADATA.source_document_version,
    license_access_note: "Public manufacturer guide. Quantity is applicable only to the exact Uponor profile, 150 mm spacing, explicit feed/tail lengths and verified hydraulic loop/manifold design.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: LINDAB_VSR_SOURCE_ID,
    source_type: "MANUFACTURER_PASSPORT",
    jurisdiction: "INTERNATIONAL_PROJECT",
    authority: "Lindab",
    document_code: LINDAB_VSR_SOURCE_METADATA.norm_id,
    title: LINDAB_VSR_SOURCE_METADATA.source_title,
    edition: "Manufacturer public product page",
    revision: LINDAB_VSR_SOURCE_METADATA.source_document_version,
    status: "project-specific",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["INSTALL"],
    material_system_applicability: ["DUCT:COMFORT_VENTILATION:SUPPLY_EXHAUST_AIR"],
    product_profile_applicability: [LINDAB_VSR_PRODUCT_PROFILE_ID],
    clause_table_rate_code: LINDAB_VSR_SOURCE_METADATA.exact_locator,
    unit_basis: LINDAB_VSR_SOURCE_METADATA.rate_unit,
    official_reference: LINDAB_VSR_SOURCE_METADATA.source_url,
    version: LINDAB_VSR_SOURCE_METADATA.source_document_version,
    license_access_note: "Public manufacturer product data. Quantity applies only to the exact VSR product, approved cooled-supply-air layout, diameter range and separate fitting/nozzle schedule.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: DAIKIN_3MXS_K_SOURCE_ID,
    source_type: "MANUFACTURER_PASSPORT",
    jurisdiction: "INTERNATIONAL_PROJECT",
    authority: "Daikin",
    document_code: DAIKIN_3MXS_K_SOURCE_METADATA.norm_id,
    title: DAIKIN_3MXS_K_SOURCE_METADATA.source_title,
    edition: "Manufacturer public product specifications",
    revision: DAIKIN_3MXS_K_SOURCE_METADATA.source_document_version,
    status: "project-specific",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["INSTALL"],
    material_system_applicability: ["CONDITIONER:COOLING_AIR_CONDITIONING:REFRIGERANT_PROJECT_DEFINED"],
    product_profile_applicability: [DAIKIN_3MXS_K_PRODUCT_PROFILE_ID],
    clause_table_rate_code: DAIKIN_3MXS_K_SOURCE_METADATA.exact_locator,
    unit_basis: DAIKIN_3MXS_K_SOURCE_METADATA.rate_unit,
    official_reference: DAIKIN_3MXS_K_SOURCE_METADATA.source_url,
    version: DAIKIN_3MXS_K_SOURCE_METADATA.source_document_version,
    license_access_note: "Public manufacturer specifications. Additional charge applies only to the exact Daikin 3MXS-K / R-410A profile, confirmed nameplate/manual, total piping length above 30 m and separately verified maximum piping and height limits.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: KNAUF_D112_WALL_FASTENER_SOURCE_ID,
    source_type: "MANUFACTURER_PASSPORT",
    jurisdiction: "INTERNATIONAL_PROJECT",
    authority: "Knauf",
    document_code: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.norm_id,
    title: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.source_title,
    edition: "Manufacturer public system data sheet",
    revision: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.source_document_version,
    status: "project-specific",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["FRAME"],
    material_system_applicability: ["FLAT_CEILING"],
    product_profile_applicability: [KNAUF_D112_REFERENCE_CEILING_PRODUCT_PROFILE_ID],
    clause_table_rate_code: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.exact_locator,
    unit_basis: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.rate_unit,
    official_reference: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.source_url,
    version: KNAUF_D112_WALL_FASTENER_SOURCE_METADATA.source_document_version,
    license_access_note: "Public manufacturer system data. Quantity applies only to the documented 10 m × 10 m D112 reference ceiling, the exact single-layer variant and a substrate-approved fastener; extrapolation is forbidden.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_ID,
    source_type: "MANUFACTURER_PASSPORT",
    jurisdiction: "INTERNATIONAL_PROJECT",
    authority: "Legrand",
    document_code: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.norm_id,
    title: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.source_title,
    edition: "Manufacturer public technical sheet FT0955-02",
    revision: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.source_document_version,
    status: "project-specific",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["INSTALL"],
    material_system_applicability: ["CABLE_CHANNEL"],
    product_profile_applicability: [LEGRAND_P31_TRAY_PRODUCT_PROFILE_ID],
    clause_table_rate_code: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.exact_locator,
    unit_basis: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.rate_unit,
    official_reference: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.source_url,
    version: LEGRAND_P31_TRAY_JOINT_FASTENER_SOURCE_METADATA.source_document_version,
    license_access_note: "Public manufacturer technical sheet. The 8-piece M6 quantity applies only to an exact Legrand P31 symmetrical tray joint, width 75-300 mm, one listed EP/ER coupler and verified 11 Nm tightening torque; other widths require their own source row.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  source({
    source_id: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_ID,
    source_type: "MANUFACTURER_PASSPORT",
    jurisdiction: "INTERNATIONAL_PROJECT",
    authority: "Wavin",
    document_code: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.norm_id,
    title: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_title,
    edition: "Hep2O Push-fit Plumbing Installer Guide",
    revision: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_document_version,
    status: "project-specific",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["INSTALL"],
    material_system_applicability: ["HEATING_PIPE:SPACE_HEATING:HEATING_WATER"],
    product_profile_applicability: [WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID],
    clause_table_rate_code: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.exact_locator,
    unit_basis: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.rate_unit,
    official_reference: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_url,
    version: WAVIN_HEP2O_SMARTSLEEVE_SOURCE_METADATA.source_document_version,
    license_access_note: "Public manufacturer installation guide. One SmartSleeve is admitted only for each explicitly counted prepared Hep2O pipe end inserted into a compatible Hep2O push-fit fitting; generic connection counts and other pipe systems are not converted automatically.",
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  }),
  ...WAVIN_HEP2O_CLIP_SOURCE_METADATA.map((metadata) => source({
    source_id: metadata.source_id,
    source_type: "MANUFACTURER_PASSPORT",
    jurisdiction: "INTERNATIONAL_PROJECT",
    authority: "Wavin",
    document_code: metadata.norm_id,
    title: metadata.source_title,
    edition: "Hep2O Push-fit Plumbing Installer Guide, Table 3",
    revision: metadata.source_document_version,
    status: "project-specific",
    effective_from: null,
    effective_to: null,
    funding_applicability: [ALL],
    project_type_applicability: [ALL],
    new_repair_demolition_applicability: ["NEW", "RECONSTRUCTION", "REPAIR"],
    operation_class_applicability: ["INSTALL"],
    material_system_applicability: ["HEATING_PIPE:SPACE_HEATING:HEATING_WATER"],
    product_profile_applicability: [WAVIN_HEP2O_PUSH_FIT_PRODUCT_PROFILE_ID],
    clause_table_rate_code: metadata.exact_locator,
    unit_basis: metadata.rate_unit,
    official_reference: metadata.source_url,
    version: metadata.source_document_version,
    license_access_note: `Public manufacturer installation guide. ${metadata.maximum_clip_spacing_m} m is a maximum clip spacing only for Wavin Hep2O ${metadata.pipe_nominal_diameter_mm} mm ${metadata.orientation} pipe. Quantity is admitted from explicit topology spans, endpoints and fitting anchors; direct multiplication of total route length is forbidden.`,
    supersedes: [],
    superseded_by: [],
    exact_rate_code_required: false,
  })),
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
  if (sourceCard.status === "project-specific" && sourceCard.source_type === "MANUFACTURER_PASSPORT") return true;
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
  if (sourceCard.product_profile_applicability &&
      !includesOrAll(sourceCard.product_profile_applicability, request.product_profile_id ?? "")) {
    reasons.push("PRODUCT_PROFILE_NOT_APPLICABLE");
  }
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
