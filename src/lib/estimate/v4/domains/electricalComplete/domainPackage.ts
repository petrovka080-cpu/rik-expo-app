import type {
  ProfessionalAssemblyFormulaV4,
  ProfessionalAssemblyParameterDefinitionV4,
  ProfessionalAssemblyRowDefinitionV4,
  ProfessionalChildAssemblyV4,
} from "../../professionalProjectAssemblyV4";
import {
  createProfessionalEstimateDomainFactoryV1,
  type ProfessionalAssemblyProfileV1,
  type ProfessionalCanonicalTechnologyV1,
  type ProfessionalDomainParameterDefinitionV1,
  type ProfessionalDomainParameterSchemaV1,
  type ProfessionalEstimateDomainPackageV1,
  type ProfessionalFormulaPackV1,
  type ProfessionalNormativeProfileV1,
  type ProfessionalResourceCompletenessPolicyV1,
} from "../../domainFactory";
import {
  ELECTRICAL_COMPLETE_ALIAS_COUNT,
  ELECTRICAL_COMPLETE_DOMAIN_ID,
  ELECTRICAL_COMPLETE_DOMAIN_VERSION,
  ELECTRICAL_COMPLETE_RECORD_COUNT,
  ELECTRICAL_COMPLETE_TECHNOLOGY_COUNT,
  ELECTRICAL_DOMAIN_CATALOG_BINDINGS,
  ELECTRICAL_DOMAIN_INVENTORY,
  ELECTRICAL_REVIEWED_EXCLUSION_COUNT,
  type ElectricalDomainInventoryRow,
} from "./inventory";
import {
  assertElectricalMaximumScopeV2,
  electricalMaximumResourceCandidatesForV2,
  type ElectricalMaximumResourceCandidateV2,
} from "./maximumResourceScopeV2";
import { electricalApplicableParameterProfileV2 } from "./parameterProfileV2";

const ALWAYS = { kind: "ALWAYS" } as const;
const FULL_ONLY = { kind: "EQUALS", parameter_id: "estimate_scope_mode", value: "FULL_APPLICABLE_SCOPE" } as const;

function parameter(
  parameter_id: string,
  label_ru: string,
  input_type: ProfessionalDomainParameterDefinitionV1["input_type"],
  priority: ProfessionalDomainParameterDefinitionV1["priority"],
  unit_id: string | null,
  formula_consumers: readonly string[],
  options: { minimum?: number; maximum?: number; choices?: readonly { value: string; label_ru: string }[] } = {},
): ProfessionalDomainParameterDefinitionV1 {
  const condition = priority === "P1" ? FULL_ONLY : ALWAYS;
  return {
    parameter_id, label_ru, input_type, priority, unit_id,
    ...(options.minimum == null ? {} : { minimum: options.minimum }),
    ...(options.maximum == null ? {} : { maximum: options.maximum }),
    ...(options.choices ? { choices: options.choices } : {}),
    visible_when: condition,
    required_when: condition,
    formula_consumers,
    source_ownership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "MATERIAL_PASSPORT", "APPLICABLE_NORM", "VERIFIED_RATEBOOK", "VISIBLE_BASELINE_ASSUMPTION"],
  };
}

function quantityParameterId(candidate: ElectricalMaximumResourceCandidateV2): string {
  return `quantity_${candidate.candidate_id}`;
}

function priceParameterId(candidate: ElectricalMaximumResourceCandidateV2): string {
  return `unit_price_${candidate.candidate_id}`;
}

type CandidateFormulaSpecV2 = Pick<ProfessionalAssemblyFormulaV4, "expression" | "input_parameter_ids" | "output_unit_id" | "calculate">;

function candidateFormulaSpecV2(candidate: ElectricalMaximumResourceCandidateV2): CandidateFormulaSpecV2 | null {
  if (["containment_straight", "containment_cover", "containment_divider"].includes(candidate.candidate_id)) return {
    expression: "route_length_m",
    input_parameter_ids: ["route_length_m"],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values.route_length_m,
  };
  if (["cable_power", "cable_vvg", "cable_control"].includes(candidate.candidate_id)) return {
    expression: "cable_route_length_m + vertical_rise_m + termination_allowance_m",
    input_parameter_ids: ["cable_route_length_m", "vertical_rise_m", "termination_allowance_m"],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values.cable_route_length_m + values.vertical_rise_m + values.termination_allowance_m,
  };
  if (candidate.candidate_id === "cable_vertical_allowance") return {
    expression: "vertical_rise_m",
    input_parameter_ids: ["vertical_rise_m"],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values.vertical_rise_m,
  };
  if (candidate.candidate_id === "cable_termination_allowance") return {
    expression: "termination_allowance_m",
    input_parameter_ids: ["termination_allowance_m"],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values.termination_allowance_m,
  };
  if (candidate.candidate_id === "lighting_luminaire") return {
    expression: "luminaire_count",
    input_parameter_ids: ["luminaire_count"],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values.luminaire_count,
  };
  if (["earth_strip", "earth_round_conductor", "earth_insulated_conductor", "earth_down_conductor"].includes(candidate.candidate_id)) return {
    expression: "earth_conductor_length_m",
    input_parameter_ids: ["earth_conductor_length_m"],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values.earth_conductor_length_m,
  };
  if (["earth_rod_electrode", "earth_deep_electrode"].includes(candidate.candidate_id)) return {
    expression: "electrode_count",
    input_parameter_ids: ["electrode_count"],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values.electrode_count,
  };
  if (["external_duct", "external_reserve_duct"].includes(candidate.candidate_id)) return {
    expression: "external_route_length_m * duct_count",
    input_parameter_ids: ["external_route_length_m", "duct_count"],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values.external_route_length_m * values.duct_count,
  };
  if (["external_manhole", "external_manhole_cover"].includes(candidate.candidate_id)) return {
    expression: "manhole_count",
    input_parameter_ids: ["manhole_count"],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values.manhole_count,
  };
  if (candidate.candidate_id === "battery_cell") return {
    expression: "battery_cell_count",
    input_parameter_ids: ["battery_cell_count"],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values.battery_cell_count,
  };
  return null;
}

function quantityInputIds(candidate: ElectricalMaximumResourceCandidateV2): readonly string[] {
  return candidateFormulaSpecV2(candidate)?.input_parameter_ids ?? [quantityParameterId(candidate)];
}

function schemaFor(row: ElectricalDomainInventoryRow): ProfessionalDomainParameterSchemaV1 {
  const technologyId = row.canonical_technology_id;
  const candidates = electricalMaximumResourceCandidatesForV2(row);
  const parameters: ProfessionalDomainParameterDefinitionV1[] = [
    parameter("work_included", "Точная выбранная работа включена в расчёт", "boolean", "P0", null, [], { choices: [{ value: "true", label_ru: "Да" }, { value: "false", label_ru: "Нет" }] }),
    parameter("estimate_scope_mode", "Состав ресурсного расчёта", "choice", "P0", null, [], { choices: [
      { value: "MINIMAL_EXPLICIT_SCOPE", label_ru: "Минимальный явно подтверждённый состав" },
      { value: "FULL_APPLICABLE_SCOPE", label_ru: "Полный применимый профессиональный состав" },
    ] }),
    parameter("scope_capability", "Точный вариант каталожной работы", "choice", "P0", null, [], { choices: [{ value: row.scope_capability, label_ru: row.scope_capability }] }),
    parameter("project_type", "Тип и назначение объекта по утверждённому проекту", "text", "P0", null, []),
    parameter("funding_source", "Источник финансирования", "choice", "P0", null, [], { choices: [
      { value: "PRIVATE_RECOMMENDED", label_ru: "Частное финансирование" },
      { value: "STATE_BUDGET", label_ru: "Государственный бюджет" },
      { value: "EXTRA_BUDGETARY_FUND", label_ru: "Внебюджетный фонд" },
    ] }),
    parameter("rated_voltage_v", "Номинальное напряжение точной электрической системы", "number", "P0", "V", [], { minimum: 1, maximum: 500_000 }),
    parameter("phase_count", "Количество фаз", "number", "P0", "item", [], { minimum: 1, maximum: 3 }),
    parameter("earthing_system", "Система заземления по проекту", "choice", "P0", null, [], { choices: ["TN-S", "TN-C-S", "TT", "IT", "PROJECT_SPECIFIED"].map((value) => ({ value, label_ru: value })) }),
    parameter("installation_environment", "Среда и условия монтажа", "choice", "P0", null, [], { choices: [
      { value: "DRY_INTERNAL", label_ru: "Сухое помещение" },
      { value: "WET_INTERNAL", label_ru: "Влажное помещение" },
      { value: "TECHNICAL_ROOM", label_ru: "Техническое помещение" },
      { value: "OUTDOOR", label_ru: "Наружная установка" },
      { value: "BURIED", label_ru: "Подземная установка" },
      { value: "PROJECT_SPECIFIED", label_ru: "По проекту" },
    ] }),
    parameter("product_specification_id", "Идентификатор точной проектной спецификации и паспортов изделий", "text", "P0", null, []),
    parameter("exact_krerm_rate_code", "Точный шифр применимой расценки КРЕРм 08-2015", "text", "P0", null, []),
    parameter("exact_krerp_rate_code", "Точный шифр применимой расценки КРЕРп 01-2015 или N_A_WITH_REASON", "text", "P0", null, []),
    parameter("price_basis_reference", "Проверяемый источник цен каждой строки", "text", "P0", null, []),
    parameter("price_basis_date", "Дата ценового основания ISO-8601", "text", "P0", null, []),
  ];
  for (const profile of electricalApplicableParameterProfileV2(row, candidates.map((candidate) => candidate.candidate_id))) {
    const consumers = candidates
      .filter((candidate) => profile.candidate_prefixes.some((prefix) => candidate.candidate_id.startsWith(prefix)))
      .map((candidate) => candidate.candidate_id);
    parameters.push(parameter(
      profile.parameter_id,
      profile.label_ru,
      profile.input_type,
      "P0",
      profile.unit_id,
      consumers,
      {
        ...(profile.minimum == null ? {} : { minimum: profile.minimum }),
        ...(profile.maximum == null ? {} : { maximum: profile.maximum }),
        ...(profile.choices ? { choices: profile.choices } : {}),
      },
    ));
  }
  for (const candidate of candidates) {
    const priority = candidate.minimal ? "P0" as const : "P1" as const;
    if (!candidateFormulaSpecV2(candidate)) parameters.push(parameter(quantityParameterId(candidate), `Проектное количество: ${candidate.title_ru}`, "number", priority, candidate.unit_id, [candidate.candidate_id], { minimum: Number.EPSILON, maximum: 1_000_000_000 }));
    if (candidate.owner === "ELECTRICAL") parameters.push(
      parameter(priceParameterId(candidate), `Проверенная цена единицы: ${candidate.title_ru}`, "number", priority, `currency_per_${candidate.unit_id}`, [candidate.candidate_id], { minimum: Number.EPSILON, maximum: 1_000_000_000_000 }),
    );
  }
  return {
    schema_id: `${technologyId}:norm-bound-parameter-schema:v2`,
    schema_version: "2.0.0",
    technology_id: technologyId,
    parameters,
    quantity_alternatives: [[...new Set(candidates.filter((candidate) => candidate.minimal).flatMap(quantityInputIds))]],
  };
}

function formula(row: ElectricalDomainInventoryRow, candidate: ElectricalMaximumResourceCandidateV2): ProfessionalAssemblyFormulaV4 {
  const derived = candidateFormulaSpecV2(candidate);
  if (derived) return {
    formula_id: `${row.canonical_technology_id}:formula:${candidate.candidate_id}:v2`,
    ...derived,
  };
  const parameterId = quantityParameterId(candidate);
  return {
    formula_id: `${row.canonical_technology_id}:formula:${candidate.candidate_id}:v2`,
    expression: parameterId,
    input_parameter_ids: [parameterId],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values[parameterId],
  };
}

function exactLocator(candidate: ElectricalMaximumResourceCandidateV2): string {
  if (candidate.normative_source_id === "KG_KRERM_08_2015_ELECTRICAL") {
    return "Указания по применению КРЕРм-2015, пп. 1.6–1.7 и 2.5–2.6; exact_krerm_rate_code содержит точный шифр КРЕРм 08 либо утверждённую заказчиком индивидуальную норму N_A_WITH_REASON";
  }
  if (candidate.normative_source_id === "KG_KRERP_01_2015_ELECTRICAL") {
    return "Указания по применению КРЕРп-2015, пп. 1.9–1.10 и 5.5.1–5.5.5; exact_krerp_rate_code содержит точный шифр КРЕРп 01 либо утверждённую индивидуальную расценку N_A_WITH_REASON";
  }
  if (candidate.normative_source_id === "EAEU_TR_TS_004_2011") {
    return "ТР ТС 004/2011, статья 4 и приложение; применимость подтверждается диапазоном напряжения, паспортом и документом соответствия конкретного изделия";
  }
  if (candidate.normative_source_id === "KG_ELECTRICAL_SAFETY_2023") {
    if (/(?:voltage_detector|lockout_tagout|isolation_and_diagnosis)/u.test(candidate.candidate_id)) {
      return "Правила техники безопасности при эксплуатации электроустановок, приказ № 01-13/157 от 03.08.2023, п. 55 и § 20 п. 158: отключение, заземление и проверка отсутствия напряжения поверенным указателем";
    }
    if (candidate.category === "equipment" || candidate.category === "machinery") {
      return "Правила техники безопасности при эксплуатации электроустановок, приказ № 01-13/157 от 03.08.2023, пп. 3–4: испытанные средства защиты, инструмент и машины";
    }
    return "Правила техники безопасности при эксплуатации электроустановок, приказ № 01-13/157 от 03.08.2023, пп. 34 и 55: технологическая карта/ППР и ответственность за безопасную подготовку рабочего места";
  }
  if (candidate.normative_source_id === "KG_FIRE_SAFETY_RULES_2025") {
    return "Правила пожарной безопасности в Кыргызской Республике, постановление № 251 от 13.05.2025; точный раздел проекта огнезаделки и паспорт сертифицированной системы, Fire typed-child без Electrical cost duplication";
  }
  if (candidate.category === "documentation") {
    return "Правила приёмки законченных строительством распределительных электрических сетей 0,38–10 кВ, приказ № 01-13/69 от 22.03.2023, пп. 15 и 20–22: исполнительные документы, акты, протоколы и передача комиссии";
  }
  if (candidate.category === "testing") {
    return "Правила приёмки законченных строительством распределительных электрических сетей 0,38–10 кВ, приказ № 01-13/69 от 22.03.2023, пп. 4, 14, 20 и 22: испытания, рабочая и приёмочная комиссии";
  }
  return "Правила приёмки законченных строительством распределительных электрических сетей 0,38–10 кВ, приказ № 01-13/69 от 22.03.2023, пп. 4, 14 и 22: соответствие проекту, проверка рабочей комиссией и итоговая приёмка";
}

function normativeDocumentCode(candidate: ElectricalMaximumResourceCandidateV2): string {
  if (candidate.normative_source_id === "KG_KRERM_08_2015_ELECTRICAL") return "Указания по применению КРЕРм-2015 / КРЕРм 08-2015";
  if (candidate.normative_source_id === "KG_KRERP_01_2015_ELECTRICAL") return "Указания по применению КРЕРп-2015 / КРЕРп 01-2015";
  if (candidate.normative_source_id === "EAEU_TR_TS_004_2011") return "ТР ТС 004/2011";
  if (candidate.normative_source_id === "KG_ELECTRICAL_SAFETY_2023") return "Приказ Минэнерго КР № 01-13/157 от 03.08.2023";
  if (candidate.normative_source_id === "KG_FIRE_SAFETY_RULES_2025") return "Постановление Кабинета Министров КР № 251 от 13.05.2025";
  return "Приказ Минэнерго КР № 01-13/69 от 22.03.2023";
}

function normativeEdition(candidate: ElectricalMaximumResourceCandidateV2): string {
  if (candidate.normative_source_id === "KG_ELECTRICAL_SAFETY_2023") return "официальная редакция ЦБД КР editionId=1273326";
  if (candidate.normative_source_id === "KG_ELECTRICAL_ACCEPTANCE_2023") return "официальная редакция ЦБД КР editionId=1241467";
  if (candidate.normative_source_id === "EAEU_TR_TS_004_2011") return "редакция с изменениями Решения Совета ЕЭК № 90 от 10.06.2022";
  return "официальная публикация Минстроя КР, проверена 2026-08-14";
}

function normativeApplicability(candidate: ElectricalMaximumResourceCandidateV2): string {
  if (candidate.normative_source_id === "EAEU_TR_TS_004_2011") {
    return `${candidate.applicability} ТР ТС 004/2011 применяется только при rated_voltage_v 50–1000 V AC или 75–1500 V DC; вне диапазона обязателен явный N_A_WITH_REASON и проектный стандарт/паспорт высоковольтного изделия.`;
  }
  if (candidate.normative_source_id === "KG_ELECTRICAL_ACCEPTANCE_2023") {
    return `${candidate.applicability} Приказ № 01-13/69 применяется только к распределительным сетям 0,38–10 кВ; свыше 10 кВ обязателен явный N_A_WITH_REASON и проектная программа испытаний/приёмки.`;
  }
  return candidate.applicability;
}

function typedChildBoundary(candidate: ElectricalMaximumResourceCandidateV2) {
  if (candidate.owner === "CIVIL_TYPED_CHILD") return "CIVIL" as const;
  if (candidate.owner === "STRUCTURAL_TYPED_CHILD") return "STRUCTURAL" as const;
  if (candidate.owner === "FIRE_TYPED_CHILD") return "FIRE_LIFE_SAFETY" as const;
  if (candidate.owner === "CONTROLS_TYPED_CHILD") return "ICT_CONTROLS" as const;
  if (candidate.owner === "HVAC_TYPED_CHILD") return "HVAC_HEATING" as const;
  return "ELECTRICAL" as const;
}

function boqRow(row: ElectricalDomainInventoryRow, candidate: ElectricalMaximumResourceCandidateV2): ProfessionalAssemblyRowDefinitionV4 {
  const domainOwner = candidate.owner === "ELECTRICAL" ? ELECTRICAL_COMPLETE_DOMAIN_ID : candidate.owner;
  return {
    row_id: `${row.canonical_technology_id}:row:${candidate.candidate_id}`,
    section: candidate.section_ru,
    category: candidate.category,
    title_ru: candidate.title_ru,
    formula: formula(row, candidate),
    cost_ownership: candidate.owner === "ELECTRICAL" ? "priced_resource" : "informational_output",
    cost_owner_id: `${domainOwner}:cost-owner:${row.work_key}:${candidate.candidate_id}`,
    semantic_owner: `${domainOwner}:semantic-owner:${row.work_key}:${candidate.candidate_id}`,
    normative_source_ids: [candidate.normative_source_id],
    inclusion_condition: candidate.minimal
      ? "work_included=true"
      : "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE",
    procurement_eligible: candidate.owner === "ELECTRICAL" && ["material", "equipment", "machinery", "transport", "waste", "temporary_work"].includes(candidate.category),
    normative_trace_v3: [{
      source_id: candidate.normative_source_id,
      document_code: normativeDocumentCode(candidate),
      edition: normativeEdition(candidate),
      exact_locator: exactLocator(candidate),
      source_role: candidate.normative_source_id.includes("KRERM") || candidate.normative_source_id.includes("KRERP")
        ? "QUANTITY_NORM"
        : candidate.category === "testing"
          ? "QUALITY_ACCEPTANCE"
          : "WORK_EXECUTION",
      applicability: normativeApplicability(candidate),
      foreign_mandatory_for_kg: false,
    }],
    price_route_v3: candidate.owner === "ELECTRICAL" ? {
      kind: "RUNTIME_VALIDATED_INPUT",
      unit_price_parameter_id: priceParameterId(candidate),
      price_basis_reference_parameter_id: "price_basis_reference",
      price_basis_date_parameter_id: "price_basis_date",
      currency_from_request: true,
      minimum_exclusive: 0,
    } : {
      kind: "NOT_APPLICABLE_INFORMATIONAL_OUTPUT",
      reason: `Стоимость принадлежит ${candidate.owner}; Electrical хранит только exact quantity/interface dependency.`,
    },
    resource_graph_node_v3: {
      graph_version: "ProfessionalResourceGraphV3",
      typed_child_boundary: typedChildBoundary(candidate),
      resource_class: candidate.completeness_slot_v2,
      dependency_ids: [],
      non_cost_dependencies_only: candidate.owner !== "ELECTRICAL",
      context_parameter_ids: ["rated_voltage_v", "phase_count", "earthing_system", "installation_environment", "product_specification_id"],
      forbidden_cost_scopes: candidate.owner === "ELECTRICAL" ? ["FIRE_SYSTEM", "ICT_SYSTEM", "CIVIL_STANDALONE", "STRUCTURAL_STANDALONE"] : ["ELECTRICAL_DUPLICATE_COST"],
    },
    normative_proof_bundle_id_v3: `${row.canonical_technology_id}:normative-proof:v2`,
    professional_proof_bundle_id_v3: `${row.canonical_technology_id}:individual-electrical-estimate-resource-passport:v2`,
  };
}

function parameterRole(parameterId: string): ProfessionalAssemblyParameterDefinitionV4["role"] {
  if (parameterId === "work_included" || parameterId === "estimate_scope_mode") return "SCOPE_TRIGGER";
  if (parameterId.startsWith("unit_price_")) return "PRICE_INPUT";
  if (parameterId === "price_basis_reference" || parameterId === "price_basis_date") return "PRICE_SOURCE_REFERENCE";
  if (parameterId.includes("rate_code")) return "NORM_RATE";
  if (parameterId.includes("test") || parameterId.includes("commission")) return "CONTROL_PLAN_VALUE";
  if (parameterId.includes("product")) return "MATERIAL_PASSPORT_VALUE";
  return "PROJECT_QUANTITY";
}

function childAssembly(
  row: ElectricalDomainInventoryRow,
  schema: ProfessionalDomainParameterSchemaV1,
  scope: "MINIMAL_EXPLICIT_SCOPE" | "FULL_APPLICABLE_SCOPE",
): ProfessionalChildAssemblyV4 {
  const candidates = electricalMaximumResourceCandidatesForV2(row).filter((candidate) => scope === "FULL_APPLICABLE_SCOPE" || candidate.minimal);
  const rows = candidates.map((candidate) => boqRow(row, candidate));
  const usedIds = new Set(["work_included", "price_basis_reference", "price_basis_date", ...candidates.flatMap((candidate) => candidate.owner === "ELECTRICAL" ? [...quantityInputIds(candidate), priceParameterId(candidate)] : [...quantityInputIds(candidate)])]);
  const parameters: ProfessionalAssemblyParameterDefinitionV4[] = schema.parameters.filter((definition) => usedIds.has(definition.parameter_id)).map((definition) => ({
    parameter_id: definition.parameter_id,
    title_ru: definition.label_ru,
    role: parameterRole(definition.parameter_id),
    unit_id: definition.unit_id,
    required_for: [scope],
  }));
  return {
    child_passport_id: `${row.canonical_technology_id}:individual-electrical-estimate-resource-passport:${scope.toLocaleLowerCase("en-US")}:v2`,
    child_passport_version: "2.0.0",
    domain_owner: ELECTRICAL_COMPLETE_DOMAIN_ID,
    assembly_id: `${row.canonical_technology_id}:resource-assembly:${scope.toLocaleLowerCase("en-US")}:v2`,
    title_ru: `${row.localized_name_ru}: ${scope}`,
    scope_trigger_parameter: "work_included",
    scope_trigger_values: [true, "true"],
    supported_scope_modes: [scope],
    parameters,
    rows,
  };
}

const parameterSchemas: readonly ProfessionalDomainParameterSchemaV1[] = Object.freeze(ELECTRICAL_DOMAIN_INVENTORY.map(schemaFor));
const schemaByTechnology = new Map(parameterSchemas.map((schema) => [schema.technology_id, schema]));

const canonicalTechnologies: readonly ProfessionalCanonicalTechnologyV1[] = Object.freeze(ELECTRICAL_DOMAIN_INVENTORY.map((row) => ({
  technology_id: row.canonical_technology_id,
  operation_class: row.operation_class,
  method: `INDIVIDUAL_ELECTRICAL_${row.electrical_family}_${row.operation_class}`,
  material_system: row.electrical_family,
  output: { dimension: row.output_dimension, unit_id: electricalMaximumResourceCandidatesForV2(row)[0].unit_id },
  required_stages: ["EXACT_PROJECT_SCOPE", "SAFE_ISOLATION", "RESOURCE_EXECUTION", "TEST_AND_DOCUMENT"],
  optional_stages: ["TYPED_CHILD_INTERFACE"],
  forbidden_stages: ["GENERIC_ELECTRICAL_BUNDLE", "PERCENT_OTHER_MATERIALS", "INCOMPATIBLE_ALTERNATIVES"],
  parameter_schema_id: `${row.canonical_technology_id}:norm-bound-parameter-schema:v2`,
  formula_pack_id: `${row.canonical_technology_id}:formula-graph:v2`,
  assembly_profile_id: `${row.canonical_technology_id}:assembly-profile:v2`,
  normative_profile_ids: [`${row.canonical_technology_id}:normative-profile:v2`],
  resource_completeness_policy_id: `${row.canonical_technology_id}:resource-completeness:v2`,
})));

const normativeProfiles: readonly ProfessionalNormativeProfileV1[] = Object.freeze(ELECTRICAL_DOMAIN_INVENTORY.map((row): ProfessionalNormativeProfileV1 => ({
  profile_id: `${row.canonical_technology_id}:normative-profile:v2`,
  profile_version: "2.0.0",
  technology_id: row.canonical_technology_id,
  jurisdiction: "KG",
  requested_source_ids: [...new Set(electricalMaximumResourceCandidatesForV2(row).map((candidate) => candidate.normative_source_id))],
  requested_source_types: ["MATERIAL_STANDARD", "WORK_EXECUTION_STANDARD", "RESOURCE_ESTIMATE_NORM"],
  rejected_foreign_source_ids: ["NFPA_WITHOUT_PROJECT_ADOPTION", "IEC_WITHOUT_KG_ADOPTION_OR_CONTRACT_BASIS"],
})));

const formulaPacks: readonly ProfessionalFormulaPackV1[] = Object.freeze(ELECTRICAL_DOMAIN_INVENTORY.map((row) => ({
  formula_pack_id: `${row.canonical_technology_id}:formula-graph:v2`,
  formula_pack_version: "2.0.0",
  technology_id: row.canonical_technology_id,
  formula_ids: electricalMaximumResourceCandidatesForV2(row).map((candidate) => `${row.canonical_technology_id}:formula:${candidate.candidate_id}:v2`),
  unit_trace_contract: electricalMaximumResourceCandidatesForV2(row).map((candidate) => `${quantityInputIds(candidate).join("+")} -> ${candidate.unit_id}`),
})));

const assemblyProfiles: readonly ProfessionalAssemblyProfileV1[] = Object.freeze(ELECTRICAL_DOMAIN_INVENTORY.map((row) => {
  const schema = schemaByTechnology.get(row.canonical_technology_id);
  if (!schema) throw new Error(`ELECTRICAL_SCHEMA_NOT_FOUND:${row.catalog_id}`);
  return {
    assembly_profile_id: `${row.canonical_technology_id}:assembly-profile:v2`,
    assembly_profile_version: "2.0.0",
    technology_id: row.canonical_technology_id,
    child_assemblies: [
      childAssembly(row, schema, "MINIMAL_EXPLICIT_SCOPE"),
      childAssembly(row, schema, "FULL_APPLICABLE_SCOPE"),
    ],
  };
}));

const completenessPolicies: readonly ProfessionalResourceCompletenessPolicyV1[] = Object.freeze(ELECTRICAL_DOMAIN_INVENTORY.map((row): ProfessionalResourceCompletenessPolicyV1 => ({
  policy_id: `${row.canonical_technology_id}:resource-completeness:v2`,
  technology_id: row.canonical_technology_id,
  required_categories: ["material", "labor", "equipment", "machinery", "transport", "temporary_work", "testing", "documentation", "waste", "subcontract_service"],
  optional_categories: ["permit"],
  forbidden_generic_rows: ["комплект", "прочие материалы", "кабель и комплектующие", "щит в комплекте", "электроизмерения", "непредвиденные расходы %"],
  one_bundle_resource_replacement_forbidden: true as const,
})));

for (const row of ELECTRICAL_DOMAIN_INVENTORY) assertElectricalMaximumScopeV2(row);

export const electricalCompleteDomainPackage: ProfessionalEstimateDomainPackageV1 = {
  manifest: {
    domain_id: ELECTRICAL_COMPLETE_DOMAIN_ID,
    domain_version: ELECTRICAL_COMPLETE_DOMAIN_VERSION,
    catalog_record_count: ELECTRICAL_COMPLETE_RECORD_COUNT,
    canonical_technology_count: ELECTRICAL_COMPLETE_TECHNOLOGY_COUNT,
    alias_count: ELECTRICAL_COMPLETE_ALIAS_COUNT,
    excluded_count: ELECTRICAL_REVIEWED_EXCLUSION_COUNT,
    supported_scopes: ["MINIMAL_EXPLICIT_SCOPE", "FULL_APPLICABLE_SCOPE"],
    supported_jurisdictions: ["KG"],
    passports: ["IndividualElectricalEstimateResourcePassportV2"],
    schemas: ["NormBoundElectricalParameterSchemaV2"],
    formula_packs: ["ElectricalFormulaGraphV2"],
    normative_profiles: ["ElectricalKGNormativeProfileV1"],
    child_assembly_dependencies: ["CIVIL_TYPED_CHILD", "STRUCTURAL_TYPED_CHILD", "FIRE_TYPED_CHILD", "CONTROLS_TYPED_CHILD"],
    readiness: "DOMAIN_GREEN",
  },
  catalog_bindings: ELECTRICAL_DOMAIN_CATALOG_BINDINGS,
  canonical_technologies: canonicalTechnologies,
  parameter_schemas: parameterSchemas,
  normative_profiles: normativeProfiles,
  formula_packs: formulaPacks,
  assembly_profiles: assemblyProfiles,
  resource_completeness_policies: completenessPolicies,
};

export const electricalCompleteDomainFactory = createProfessionalEstimateDomainFactoryV1(electricalCompleteDomainPackage);
