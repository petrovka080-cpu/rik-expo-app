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
  assertElectricalCompletenessSlots,
  electricalResourceCandidatesFor,
  type ElectricalResourceCandidate,
} from "./resourceScope";

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
    source_ownership: ["USER_EXPLICIT", "PROJECT_DOCUMENT", "MATERIAL_PASSPORT", "APPLICABLE_NORM", "VERIFIED_RATEBOOK"],
  };
}

function quantityParameterId(candidate: ElectricalResourceCandidate): string {
  return `quantity_${candidate.candidate_id}`;
}

function priceParameterId(candidate: ElectricalResourceCandidate): string {
  return `unit_price_${candidate.candidate_id}`;
}

function schemaFor(row: ElectricalDomainInventoryRow): ProfessionalDomainParameterSchemaV1 {
  const technologyId = row.canonical_technology_id;
  const candidates = electricalResourceCandidatesFor(row);
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
  for (const candidate of candidates) {
    const priority = candidate.minimal ? "P0" as const : "P1" as const;
    parameters.push(
      parameter(quantityParameterId(candidate), `Проектное количество: ${candidate.title_ru}`, "number", priority, candidate.unit_id, [candidate.candidate_id], { minimum: 0, maximum: 1_000_000_000 }),
      parameter(priceParameterId(candidate), `Проверенная цена единицы: ${candidate.title_ru}`, "number", priority, `currency_per_${candidate.unit_id}`, [candidate.candidate_id], { minimum: Number.EPSILON, maximum: 1_000_000_000_000 }),
    );
  }
  return {
    schema_id: `${technologyId}:norm-bound-parameter-schema:v1`,
    schema_version: "1.0.0",
    technology_id: technologyId,
    parameters,
    quantity_alternatives: [[...candidates.filter((candidate) => candidate.minimal).map(quantityParameterId)]],
  };
}

function formula(row: ElectricalDomainInventoryRow, candidate: ElectricalResourceCandidate): ProfessionalAssemblyFormulaV4 {
  const parameterId = quantityParameterId(candidate);
  return {
    formula_id: `${row.canonical_technology_id}:formula:${candidate.candidate_id}:v1`,
    expression: parameterId,
    input_parameter_ids: [parameterId],
    output_unit_id: candidate.unit_id,
    calculate: (values) => values[parameterId],
  };
}

function exactLocator(candidate: ElectricalResourceCandidate): string {
  if (candidate.normative_source_id === "KG_KRERM_08_2015_ELECTRICAL") return "КРЕРм 08-2015; точный шифр из PROJECT_INPUT exact_krerm_rate_code";
  if (candidate.normative_source_id === "KG_KRERP_01_2015_ELECTRICAL") return "КРЕРп 01-2015; точный шифр из PROJECT_INPUT exact_krerp_rate_code";
  if (candidate.normative_source_id === "EAEU_TR_TS_004_2011") return "ТР ТС 004/2011, статья 4 и приложение; применимость подтверждается паспортом и документом соответствия изделия";
  if (candidate.normative_source_id === "KG_ELECTRICAL_SAFETY_2023") return "Правила техники безопасности при эксплуатации электроустановок, приказ № 01-13/157 от 03.08.2023; применимый организационный/технический раздел ППР";
  if (candidate.normative_source_id === "KG_FIRE_SAFETY_RULES_2025") return "Правила пожарной безопасности в Кыргызской Республике, постановление № 251 от 13.05.2025; применимый раздел проекта огнезаделки";
  return "Правила приёмки законченных строительством распределительных электрических сетей 0,38–10 кВ, приказ № 01-13/69 от 22.03.2023; программа и протокол испытания";
}

function typedChildBoundary(candidate: ElectricalResourceCandidate) {
  if (candidate.owner === "CIVIL_TYPED_CHILD") return "CIVIL" as const;
  if (candidate.owner === "STRUCTURAL_TYPED_CHILD") return "STRUCTURAL" as const;
  if (candidate.owner === "FIRE_TYPED_CHILD") return "FIRE_LIFE_SAFETY" as const;
  if (candidate.owner === "CONTROLS_TYPED_CHILD") return "ICT_CONTROLS" as const;
  return "ELECTRICAL" as const;
}

function boqRow(row: ElectricalDomainInventoryRow, candidate: ElectricalResourceCandidate): ProfessionalAssemblyRowDefinitionV4 {
  const domainOwner = candidate.owner === "ELECTRICAL" ? ELECTRICAL_COMPLETE_DOMAIN_ID : candidate.owner;
  return {
    row_id: `${row.canonical_technology_id}:row:${candidate.candidate_id}`,
    section: candidate.section_ru,
    category: candidate.category,
    title_ru: candidate.title_ru,
    formula: formula(row, candidate),
    cost_ownership: "priced_resource",
    cost_owner_id: `${domainOwner}:cost-owner:${row.work_key}:${candidate.candidate_id}`,
    semantic_owner: `${domainOwner}:semantic-owner:${row.work_key}:${candidate.candidate_id}`,
    normative_source_ids: [candidate.normative_source_id],
    inclusion_condition: candidate.minimal
      ? "work_included=true"
      : "work_included=true AND scope_mode=FULL_APPLICABLE_SCOPE",
    procurement_eligible: ["material", "equipment", "machinery", "transport", "waste", "temporary_work"].includes(candidate.category),
    normative_trace_v3: [{
      source_id: candidate.normative_source_id,
      document_code: candidate.normative_source_id,
      edition: "official-current-verified-2026-08-13",
      exact_locator: exactLocator(candidate),
      source_role: candidate.normative_source_id.includes("KRERM") || candidate.normative_source_id.includes("KRERP")
        ? "QUANTITY_NORM"
        : candidate.category === "testing"
          ? "QUALITY_ACCEPTANCE"
          : "WORK_EXECUTION",
      applicability: candidate.applicability,
      foreign_mandatory_for_kg: false,
    }],
    price_route_v3: {
      kind: "RUNTIME_VALIDATED_INPUT",
      unit_price_parameter_id: priceParameterId(candidate),
      price_basis_reference_parameter_id: "price_basis_reference",
      price_basis_date_parameter_id: "price_basis_date",
      currency_from_request: true,
      minimum_exclusive: 0,
    },
    resource_graph_node_v3: {
      graph_version: "ProfessionalResourceGraphV3",
      typed_child_boundary: typedChildBoundary(candidate),
      resource_class: candidate.completeness_slot,
      dependency_ids: [],
      non_cost_dependencies_only: candidate.owner !== "ELECTRICAL",
      context_parameter_ids: ["rated_voltage_v", "phase_count", "earthing_system", "installation_environment", "product_specification_id"],
      forbidden_cost_scopes: candidate.owner === "ELECTRICAL" ? ["FIRE_SYSTEM", "ICT_SYSTEM", "CIVIL_STANDALONE", "STRUCTURAL_STANDALONE"] : ["ELECTRICAL_DUPLICATE_COST"],
    },
    normative_proof_bundle_id_v3: `${row.canonical_technology_id}:normative-proof:v1`,
    professional_proof_bundle_id_v3: `${row.canonical_technology_id}:individual-electrical-estimate-resource-passport:v1`,
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
  const candidates = electricalResourceCandidatesFor(row).filter((candidate) => scope === "FULL_APPLICABLE_SCOPE" || candidate.minimal);
  const rows = candidates.map((candidate) => boqRow(row, candidate));
  const usedIds = new Set(["work_included", "price_basis_reference", "price_basis_date", ...candidates.flatMap((candidate) => [quantityParameterId(candidate), priceParameterId(candidate)])]);
  const parameters: ProfessionalAssemblyParameterDefinitionV4[] = schema.parameters.filter((definition) => usedIds.has(definition.parameter_id)).map((definition) => ({
    parameter_id: definition.parameter_id,
    title_ru: definition.label_ru,
    role: parameterRole(definition.parameter_id),
    unit_id: definition.unit_id,
    required_for: [scope],
  }));
  return {
    child_passport_id: `${row.canonical_technology_id}:individual-electrical-estimate-resource-passport:${scope.toLocaleLowerCase("en-US")}:v1`,
    child_passport_version: "1.0.0",
    domain_owner: ELECTRICAL_COMPLETE_DOMAIN_ID,
    assembly_id: `${row.canonical_technology_id}:resource-assembly:${scope.toLocaleLowerCase("en-US")}:v1`,
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
  output: { dimension: row.output_dimension, unit_id: electricalResourceCandidatesFor(row)[0].unit_id },
  required_stages: ["EXACT_PROJECT_SCOPE", "SAFE_ISOLATION", "RESOURCE_EXECUTION", "TEST_AND_DOCUMENT"],
  optional_stages: ["TYPED_CHILD_INTERFACE"],
  forbidden_stages: ["GENERIC_ELECTRICAL_BUNDLE", "PERCENT_OTHER_MATERIALS", "INCOMPATIBLE_ALTERNATIVES"],
  parameter_schema_id: `${row.canonical_technology_id}:norm-bound-parameter-schema:v1`,
  formula_pack_id: `${row.canonical_technology_id}:formula-graph:v1`,
  assembly_profile_id: `${row.canonical_technology_id}:assembly-profile:v1`,
  normative_profile_ids: [`${row.canonical_technology_id}:normative-profile:v1`],
  resource_completeness_policy_id: `${row.canonical_technology_id}:resource-completeness:v1`,
})));

const normativeProfiles: readonly ProfessionalNormativeProfileV1[] = Object.freeze(ELECTRICAL_DOMAIN_INVENTORY.map((row): ProfessionalNormativeProfileV1 => ({
  profile_id: `${row.canonical_technology_id}:normative-profile:v1`,
  profile_version: "1.0.0",
  technology_id: row.canonical_technology_id,
  jurisdiction: "KG",
  requested_source_ids: [...new Set(electricalResourceCandidatesFor(row).map((candidate) => candidate.normative_source_id))],
  requested_source_types: ["LAW_OR_TECHNICAL_REGULATION", "WORK_EXECUTION_STANDARD", "RESOURCE_ESTIMATE_NORM"],
  rejected_foreign_source_ids: ["NFPA_WITHOUT_PROJECT_ADOPTION", "IEC_WITHOUT_KG_ADOPTION_OR_CONTRACT_BASIS"],
})));

const formulaPacks: readonly ProfessionalFormulaPackV1[] = Object.freeze(ELECTRICAL_DOMAIN_INVENTORY.map((row) => ({
  formula_pack_id: `${row.canonical_technology_id}:formula-graph:v1`,
  formula_pack_version: "1.0.0",
  technology_id: row.canonical_technology_id,
  formula_ids: electricalResourceCandidatesFor(row).map((candidate) => `${row.canonical_technology_id}:formula:${candidate.candidate_id}:v1`),
  unit_trace_contract: electricalResourceCandidatesFor(row).map((candidate) => `${quantityParameterId(candidate)} -> ${candidate.unit_id}`),
})));

const assemblyProfiles: readonly ProfessionalAssemblyProfileV1[] = Object.freeze(ELECTRICAL_DOMAIN_INVENTORY.map((row) => {
  const schema = schemaByTechnology.get(row.canonical_technology_id);
  if (!schema) throw new Error(`ELECTRICAL_SCHEMA_NOT_FOUND:${row.catalog_id}`);
  return {
    assembly_profile_id: `${row.canonical_technology_id}:assembly-profile:v1`,
    assembly_profile_version: "1.0.0",
    technology_id: row.canonical_technology_id,
    child_assemblies: [
      childAssembly(row, schema, "MINIMAL_EXPLICIT_SCOPE"),
      childAssembly(row, schema, "FULL_APPLICABLE_SCOPE"),
    ],
  };
}));

const completenessPolicies: readonly ProfessionalResourceCompletenessPolicyV1[] = Object.freeze(ELECTRICAL_DOMAIN_INVENTORY.map((row): ProfessionalResourceCompletenessPolicyV1 => ({
  policy_id: `${row.canonical_technology_id}:resource-completeness:v1`,
  technology_id: row.canonical_technology_id,
  required_categories: ["material", "labor", "equipment", "machinery", "transport", "temporary_work", "testing", "documentation", "waste", "subcontract_service"],
  optional_categories: ["permit"],
  forbidden_generic_rows: ["комплект", "прочие материалы", "кабель и комплектующие", "щит в комплекте", "электроизмерения", "непредвиденные расходы %"],
  one_bundle_resource_replacement_forbidden: true as const,
})));

for (const row of ELECTRICAL_DOMAIN_INVENTORY) assertElectricalCompletenessSlots(row);

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
    passports: ["IndividualElectricalEstimateResourcePassportV1"],
    schemas: ["NormBoundElectricalParameterSchemaV1"],
    formula_packs: ["ElectricalFormulaGraphV1"],
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
