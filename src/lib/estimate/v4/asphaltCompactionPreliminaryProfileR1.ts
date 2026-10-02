import sourcePack from "../../../../data/estimate-benchmarks/source-packs/asphalt-compaction-preliminary-profile-r1.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type Json = Record<string, unknown>;
type CostTreatment = "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE" | "CONTROL_OR_DOCUMENT";

export const ASPHALT_COMPACTION_PROFILE_CATALOG_ID =
  "canonical-work:base:paving_roads_landscape_interior_asphalt_compact_large_area";
export const ASPHALT_COMPACTION_PROFILE_SOURCE_ID =
  "asphalt_compaction_preliminary_profile_r2";
export const ASPHALT_COMPACTION_PROFILE_NORM_ID =
  "profile:asphalt-compaction:large-area:three-roller:r2";
export const ASPHALT_COMPACTION_SOURCE_PACK_SHA256 =
  "6afe7ab524d6f77db97a0ee6a01fc6779c9db6b7373621f97403afa89c976711";

export const ASPHALT_COMPACTION_PROFILE_SOURCE_METADATA = Object.freeze({
  source_title: "Полный предварительный профиль уплотнения асфальта большой площади: три фазы и три катка",
  source_authority: "Dynapac; Asphalt Institute; NAPA/FAA; FHWA; КРЕР № 27 только для границ применимости",
  source_document_version: "ASPHALT_COMPACTION_PRELIMINARY_PROFILE_R2_2026-09-23",
  definition_hash: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
  source_kind: "COMPOSITE_TECHNOLOGY_PROFILE",
  official_url: "https://rosap.ntl.bts.gov/view/dot/92679",
  artifact_sha256: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
  effective_from: "2026-09-23",
  exact_locator: [
    "NAPA/FAA Asphalt Paving Handbook 2025, chapter 8",
    "FHWA Asphalt Pavements statewide generic review, rolling pattern section",
    "Dynapac CC2200 VI official technical data: 1500 mm and water sprinkler system",
    "Dynapac CP1200 instruction manual 4812317313EN: 1760 mm pneumatic roller",
    "data/estimate-benchmarks/source-packs/asphalt-compaction-preliminary-profile-r1.json",
  ].join("; "),
  use_restriction: "Самостоятельное уплотнение уже уложенной смеси. Скорость, число покрытий, использование рабочего времени, состав звена, партия контроля и организационные количества — видимые значения выбранного предварительного профиля; заменить утверждённой схемой укатки, пробной захваткой, ППР, паспортом техники и планом контроля при их наличии.",
});

const PROFILE = sourcePack.selectedPreliminaryProfile;

export const ASPHALT_COMPACTION_PROFILE_SHORT_INPUT = Object.freeze({ area_m2: 5_000 });

export const ASPHALT_COMPACTION_PROFILE_RUNTIME_INPUT = Object.freeze({
  breakdown_roller_width_m: PROFILE.breakdownWidthM,
  intermediate_roller_width_m: PROFILE.intermediateWidthM,
  finish_roller_width_m: PROFILE.finishWidthM,
  roller_speed_km_h: PROFILE.speedKmH,
  breakdown_coverages: PROFILE.breakdownCoverages,
  intermediate_coverages: PROFILE.intermediateCoverages,
  finish_coverages: PROFILE.finishCoverages,
  utilization_factor: PROFILE.utilizationFactor,
  crew_person_count: PROFILE.crewPersonCount,
  acceptance_lot_m2: PROFILE.acceptanceLotM2,
  work_journal_count: PROFILE.workJournalCount,
  execution_documentation_count: PROFILE.executionDocumentationCount,
  traffic_control_setup_count: PROFILE.trafficControlSetupCount,
  mobilization_count_per_unique_machine: PROFILE.mobilizationCountPerUniqueMachine,
});

export const ASPHALT_COMPACTION_PROFILE_ACCEPTANCE_INPUT = Object.freeze({
  ...ASPHALT_COMPACTION_PROFILE_SHORT_INPUT,
  ...ASPHALT_COMPACTION_PROFILE_RUNTIME_INPUT,
});

const NORMATIVE_IDS = new Set([
  "breakdown_roller_width_m",
  "intermediate_roller_width_m",
  "finish_roller_width_m",
]);
const DERIVED_IDS = new Set([
  "work_journal_count",
  "execution_documentation_count",
]);

export const ASPHALT_COMPACTION_PROFILE_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(ASPHALT_COMPACTION_PROFILE_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    NORMATIVE_IDS.has(parameterId) ? "NORMATIVE" : DERIVED_IDS.has(parameterId) ? "DERIVED" : "ASSUMPTION",
  ])),
) as Readonly<Record<string, "NORMATIVE" | "ASSUMPTION" | "DERIVED">>;

const SOURCE_ID_BY_PARAMETER: Readonly<Record<string, string>> = Object.freeze({
  breakdown_roller_width_m: "dynapac_cc2200_vi_technical_data",
  intermediate_roller_width_m: "dynapac_cp1200_instruction_manual_4812317313en_2",
  finish_roller_width_m: "dynapac_cc2200_vi_technical_data",
  roller_speed_km_h: "asphalt_institute_engineering_faq_compaction",
  breakdown_coverages: "napa_faa_asphalt_paving_handbook_2025_compaction",
  intermediate_coverages: "napa_faa_asphalt_paving_handbook_2025_compaction",
  finish_coverages: "napa_faa_asphalt_paving_handbook_2025_compaction",
  utilization_factor: "asphalt_institute_engineering_faq_compaction",
  crew_person_count: "asphalt_institute_engineering_faq_compaction",
  acceptance_lot_m2: "napa_faa_asphalt_paving_handbook_2025_compaction",
  work_journal_count: "napa_faa_asphalt_paving_handbook_2025_compaction",
  execution_documentation_count: "napa_faa_asphalt_paving_handbook_2025_compaction",
  traffic_control_setup_count: "napa_faa_asphalt_paving_handbook_2025_compaction",
  mobilization_count_per_unique_machine: "napa_faa_asphalt_paving_handbook_2025_compaction",
});

export const ASPHALT_COMPACTION_PROFILE_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(ASPHALT_COMPACTION_PROFILE_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    // The approved baseline points to the registered composite profile. Exact
    // manufacturer/handbook ownership stays in each parameter guide and row
    // normative trace, so publication has a closed DB source graph without
    // losing the document-level provenance shown through the info action.
    [ASPHALT_COMPACTION_PROFILE_SOURCE_ID],
  ])),
);

type ParameterSpec = readonly [
  parameterId: string,
  titleRu: string,
  valueType: "decimal" | "integer",
  unitId: string,
  minimum: number,
  maximum?: number,
];

const PARAMETER_SPECS: readonly ParameterSpec[] = Object.freeze([
  ["area_m2", "Площадь уплотняемого покрытия", "decimal", "m2", 0.001],
  ["breakdown_roller_width_m", "Рабочая ширина катка предварительного уплотнения", "decimal", "m", 0.5, 4],
  ["intermediate_roller_width_m", "Рабочая ширина катка основного уплотнения", "decimal", "m", 0.5, 4],
  ["finish_roller_width_m", "Рабочая ширина катка финишного уплотнения", "decimal", "m", 0.5, 4],
  ["roller_speed_km_h", "Рабочая скорость катков", "decimal", "km_h", 0.5, 4.828_032],
  ["breakdown_coverages", "Полные покрытия при предварительном уплотнении", "integer", "pcs", 1, 20],
  ["intermediate_coverages", "Полные покрытия при основном уплотнении", "integer", "pcs", 1, 20],
  ["finish_coverages", "Полные покрытия при финишном уплотнении", "integer", "pcs", 1, 20],
  ["utilization_factor", "Доля полезного использования ширины и времени", "decimal", "ratio", 0.1, 1],
  ["crew_person_count", "Состав звена катков и дорожного рабочего", "integer", "person", 1, 20],
  ["acceptance_lot_m2", "Размер партии контроля качества", "decimal", "m2", 100, 100_000],
  ["work_journal_count", "Журнал производства и операционного контроля", "integer", "document", 1, 20],
  ["execution_documentation_count", "Комплект исполнительной документации", "integer", "document", 1, 20],
  ["traffic_control_setup_count", "Комплект безопасной рабочей зоны", "integer", "set", 1, 20],
  ["mobilization_count_per_unique_machine", "Мобилизация и возврат каждой уникальной машины", "integer", "service", 1, 20],
]);

function parameterGuide(parameterId: string, titleRu: string): Readonly<{
  visibilityRole: "USER_INPUT" | "USER_DERIVED_READONLY";
  valueSourceRole: string;
  guideKind: string;
  guideShortRu: string;
}> {
  if (parameterId === "area_m2") return {
    visibilityRole: "USER_INPUT",
    valueSourceRole: "USER_MEASURED",
    guideKind: "MEASUREMENT_RULE",
    guideShortRu: "Введите чистую площадь уже уложенной смеси по обмеру или ведомости объёмов.",
  };
  if (DERIVED_IDS.has(parameterId)) return {
    visibilityRole: "USER_DERIVED_READONLY",
    valueSourceRole: "BACKEND_DERIVED",
    guideKind: "DERIVED_VALUE_RULE",
    guideShortRu: `${titleRu}: количество определено полным составом выбранной работы.`,
  };
  return {
    visibilityRole: "USER_INPUT",
    valueSourceRole: "USER_REPLACEABLE_PRELIMINARY_PROFILE",
    guideKind: NORMATIVE_IDS.has(parameterId) ? "MANUFACTURER_RANGE" : "PRACTICE_REFERENCE",
    guideShortRu: `${titleRu}: в поле уже стоит норма выбранного профиля; замените её только подтверждённым значением ППР, пробной захватки, паспорта техники или плана контроля.`,
  };
}

export type AsphaltCompactionProfileParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string;
  title_ru: string;
  truth_metadata: Json;
};

export const ASPHALT_COMPACTION_PROFILE_PARAMETERS:
readonly AsphaltCompactionProfileParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, minimum, maximum], ordinal) => {
    const guide = parameterGuide(parameterId, titleRu);
    const sourceId = SOURCE_ID_BY_PARAMETER[parameterId] ?? ASPHALT_COMPACTION_PROFILE_SOURCE_ID;
    const source = sourcePack.sources.find((candidate) => candidate.sourceId === sourceId);
    return {
      parameter_id: parameterId,
      ordinal,
      value_type: valueType,
      unit_id: unitId,
      title_ru: titleRu,
      required: true,
      default_value: null,
      constraints_json: {
        min: minimum,
        ...(maximum == null ? {} : { max: maximum }),
      },
      truth_metadata: {
        contract: "rik-expo-app.asphalt-compaction-preliminary-profile-r2",
        semantic_parameter_key: `asphalt-compaction-preliminary-profile:${parameterId}`,
        visibility_role: guide.visibilityRole,
        value_source_role: guide.valueSourceRole,
        input_origin_class: parameterId === "area_m2" ? "KNOWN_WORK_SCOPE" : "SELECTED_PRELIMINARY_COMPACTION_PROFILE",
        preliminary_compilation_allowed: parameterId !== "area_m2",
        source_confirmation_required: false,
        guide: {
          guide_kind: guide.guideKind,
          guide_short_ru: guide.guideShortRu,
          source_role: NORMATIVE_IDS.has(parameterId) ? "SELECTED_EQUIPMENT_PASSPORT" : "VISIBLE_PRELIMINARY_PROFILE",
          source_document: sourceId,
          source_locator: source?.exactLocator ?? ASPHALT_COMPACTION_PROFILE_SOURCE_METADATA.exact_locator,
          guide_version: "asphalt-compaction-preliminary-profile-r2",
          source_snapshot_hash: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
          applicability: "Самостоятельное уплотнение уже уложенной асфальтобетонной смеси на большой площади.",
          verified_at: "2026-09-23T00:00:00+06:00",
          guide_validation_policy: "FIRST_ESTIMATE_NOW_REPLACE_PROFILE_VALUES_WITH_CONFIRMED_PROJECT_DATA",
        },
        hidden_default_forbidden: parameterId === "area_m2",
        runtime_profile_value: parameterId !== "area_m2",
        runtime_profile_classification: ASPHALT_COMPACTION_PROFILE_RUNTIME_CLASSIFICATION[parameterId] ?? null,
        synthetic: false,
      },
    };
  },
));

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: expression,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

const BREAKDOWN_MACHINE_H =
  "area_m2*breakdown_coverages/(roller_speed_km_h*1000*breakdown_roller_width_m*utilization_factor)";
const INTERMEDIATE_MACHINE_H =
  "area_m2*intermediate_coverages/(roller_speed_km_h*1000*intermediate_roller_width_m*utilization_factor)";
const FINISH_MACHINE_H =
  "area_m2*finish_coverages/(roller_speed_km_h*1000*finish_roller_width_m*utilization_factor)";
const SHIFT_H = `max(${BREAKDOWN_MACHINE_H},${INTERMEDIATE_MACHINE_H},${FINISH_MACHINE_H})`;

export const ASPHALT_COMPACTION_PROFILE_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("asphalt_compaction_area_v2", "m2", "area_m2"),
  formula("asphalt_compaction_breakdown_roller_machine_h_v2", "machine_hour", BREAKDOWN_MACHINE_H),
  formula("asphalt_compaction_intermediate_roller_machine_h_v2", "machine_hour", INTERMEDIATE_MACHINE_H),
  formula("asphalt_compaction_finish_roller_machine_h_v2", "machine_hour", FINISH_MACHINE_H),
  formula("asphalt_compaction_shift_h_v2", "man_hour", SHIFT_H),
  formula("asphalt_compaction_crew_man_h_v2", "man_hour", `${SHIFT_H}*crew_person_count`),
  formula("asphalt_compaction_acceptance_lots_v2", "pcs", "ceil(area_m2/acceptance_lot_m2)"),
  formula("asphalt_compaction_work_journal_v2", "document", "work_journal_count"),
  formula("asphalt_compaction_execution_documentation_v2", "document", "execution_documentation_count"),
  formula("asphalt_compaction_traffic_control_v2", "set", "traffic_control_setup_count"),
  formula("asphalt_compaction_mobilization_v2", "service", "mobilization_count_per_unique_machine"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
type IndependentComponent = Readonly<{
  semanticKey: string;
  sourceId: string;
  formulaId: string;
  resolution: Readonly<{ kind: string; rowId: string; parentRowId?: string }>;
}>;
const INDEPENDENT_REQUIRED_COMPONENTS = sourcePack.independentRequiredComponents as
  readonly IndependentComponent[];
const SOURCE_RECORDS = new Map(sourcePack.sources.map((source) => [source.sourceId, source]));
const SOURCE_ID_BY_ROW_ID = new Map(INDEPENDENT_REQUIRED_COMPONENTS.map((component) => [
  component.resolution.rowId,
  component.sourceId,
]));

function resource(input: Readonly<{
  rowId: string;
  ordinal: number;
  section: string;
  category: "material" | "equipment" | "service" | "construction_work";
  titleRu: string;
  unitId: string;
  formulaId: string;
  costTreatment: CostTreatment;
  procurementEligible?: boolean;
  parentRowId?: string;
}>): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `asphalt-compaction-preliminary-profile:${input.rowId}`,
    costOwner: input.costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment: input.costTreatment,
    payable: input.costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "area_m2",
    preliminaryProfileId: ASPHALT_COMPACTION_PROFILE_NORM_ID,
    ...(input.parentRowId ? { parentCostOwnerId: input.parentRowId } : {}),
    visibleAssumptionPolicy: PROFILE.assumptionPolicy,
  };
  const sourceId = SOURCE_ID_BY_ROW_ID.get(input.rowId) ?? ASPHALT_COMPACTION_PROFILE_SOURCE_ID;
  const source = SOURCE_RECORDS.get(sourceId);
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "TECHNOLOGY_AND_QA_CROSSCHECK",
    sourcePackSha256: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
    normativeTrace: [{
      sourceId,
      source_id: sourceId,
      normId: ASPHALT_COMPACTION_PROFILE_NORM_ID,
      norm_id: ASPHALT_COMPACTION_PROFILE_NORM_ID,
      normVersion: ASPHALT_COMPACTION_PROFILE_SOURCE_METADATA.source_document_version,
      source_document_version: ASPHALT_COMPACTION_PROFILE_SOURCE_METADATA.source_document_version,
      source_title: source?.authority ?? ASPHALT_COMPACTION_PROFILE_SOURCE_METADATA.source_title,
      exact_locator: source?.exactLocator ?? ASPHALT_COMPACTION_PROFILE_SOURCE_METADATA.exact_locator,
      source_definition_hash: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
    }],
    excludedAdjacentScope: [
      "asphalt mixture supply and placement",
      "tack coat and joint construction materials",
      "base, subbase, drainage and other pavement layers",
      "invented material consumption or prices",
    ],
  };
  return {
    id: `resource-${input.rowId.replace(/:/gu, "-")}`,
    row_id: input.rowId,
    ordinal: input.ordinal,
    section: input.section,
    category: input.category,
    title_ru: input.titleRu,
    unit_id: input.unitId,
    formula_id: input.formulaId,
    inclusion_ast: literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible ?? false,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

const rows: Omit<Parameters<typeof resource>[0], "ordinal">[] = [
  { rowId: "asphalt-compaction:operation:mat-readiness-temperature", section: "Технологические операции", category: "service", titleRu: "Приёмка уложенной смеси и проверка температурного окна уплотнения", unitId: "m2", formulaId: "asphalt_compaction_area_v2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt-compaction:operation:rolling-pattern-setup", section: "Технологические операции", category: "service", titleRu: "Установление схемы укатки по пробной захватке или ППР", unitId: "m2", formulaId: "asphalt_compaction_area_v2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:asphalt_compaction_breakdown_work", section: "Технологические операции", category: "service", titleRu: "Предварительное уплотнение тандемным вибрационным катком", unitId: "m2", formulaId: "asphalt_compaction_area_v2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:asphalt_compaction_intermediate_work", section: "Технологические операции", category: "service", titleRu: "Основное уплотнение пневмоколёсным катком", unitId: "m2", formulaId: "asphalt_compaction_area_v2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "rc09:asphalt_compaction_finish_work", section: "Технологические операции", category: "service", titleRu: "Финишное уплотнение и устранение следов катка", unitId: "m2", formulaId: "asphalt_compaction_area_v2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt-compaction:operation:edges-joints", section: "Технологические операции", category: "service", titleRu: "Уплотнение и контроль продольных, поперечных швов и свободных кромок", unitId: "m2", formulaId: "asphalt_compaction_area_v2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt-compaction:operation:inaccessible-local", section: "Технологические операции", category: "service", titleRu: "Локальное уплотнение у границ и в местах с ограниченным проходом катка", unitId: "m2", formulaId: "asphalt_compaction_area_v2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt-compaction:operation:marks-correction", section: "Технологические операции", category: "service", titleRu: "Исправление следов катка, сдвигов смеси и выявленных дефектов поверхности", unitId: "m2", formulaId: "asphalt_compaction_area_v2", costTreatment: "INFORMATIONAL_SCOPE" },
  { rowId: "asphalt-compaction:operation:final-handover", section: "Технологические операции", category: "service", titleRu: "Финальный осмотр и передача уплотнённого покрытия на приёмку", unitId: "m2", formulaId: "asphalt_compaction_area_v2", costTreatment: "INFORMATIONAL_SCOPE" },

  { rowId: "rc09:asphalt_compaction_breakdown_roller", section: "Машины и механизмы", category: "equipment", titleRu: "Каток тандемный вибрационный Dynapac CC2200 VI — предварительная фаза", unitId: "machine_hour", formulaId: "asphalt_compaction_breakdown_roller_machine_h_v2", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "rc09:asphalt_compaction_intermediate_roller", section: "Машины и механизмы", category: "equipment", titleRu: "Каток пневмоколёсный Dynapac CP1200 — основная фаза", unitId: "machine_hour", formulaId: "asphalt_compaction_intermediate_roller_machine_h_v2", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "rc09:asphalt_compaction_finish_roller", section: "Машины и механизмы", category: "equipment", titleRu: "Каток тандемный Dynapac CC2200 VI в статическом финишном режиме", unitId: "machine_hour", formulaId: "asphalt_compaction_finish_roller_machine_h_v2", costTreatment: "OWN_COST", procurementEligible: true },

  { rowId: "rc09:asphalt_compaction_crew", section: "Труд", category: "construction_work", titleRu: "Звено уплотнения: три машиниста катков и дорожный рабочий", unitId: "man_hour", formulaId: "asphalt_compaction_crew_man_h_v2", costTreatment: "OWN_COST" },
  { rowId: "asphalt-compaction:included:operator:breakdown", section: "Состав труда", category: "construction_work", titleRu: "Машинист катка предварительного уплотнения", unitId: "machine_hour", formulaId: "asphalt_compaction_breakdown_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_crew" },
  { rowId: "asphalt-compaction:included:operator:intermediate", section: "Состав труда", category: "construction_work", titleRu: "Машинист пневмоколёсного катка основного уплотнения", unitId: "machine_hour", formulaId: "asphalt_compaction_intermediate_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_crew" },
  { rowId: "asphalt-compaction:included:operator:finish", section: "Состав труда", category: "construction_work", titleRu: "Машинист катка финишного уплотнения", unitId: "machine_hour", formulaId: "asphalt_compaction_finish_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_crew" },
  { rowId: "asphalt-compaction:included:labor:road-worker", section: "Состав труда", category: "construction_work", titleRu: "Дорожный рабочий для кромок, контроля и координации звена", unitId: "man_hour", formulaId: "asphalt_compaction_shift_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_crew" },

  { rowId: "asphalt-compaction:included:fuel-fluids:breakdown", section: "Материалы и расходники в машино-часе", category: "material", titleRu: "Топливо и эксплуатационные жидкости катка предварительного уплотнения", unitId: "machine_hour", formulaId: "asphalt_compaction_breakdown_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_breakdown_roller" },
  { rowId: "asphalt-compaction:included:wetting-water:breakdown", section: "Материалы и расходники в машино-часе", category: "material", titleRu: "Вода системы смачивания вальцов катка предварительного уплотнения", unitId: "machine_hour", formulaId: "asphalt_compaction_breakdown_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_breakdown_roller" },
  { rowId: "asphalt-compaction:included:scrapers:breakdown", section: "Комплектующие в машино-часе", category: "service", titleRu: "Скребки вальцов катка предварительного уплотнения", unitId: "machine_hour", formulaId: "asphalt_compaction_breakdown_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_breakdown_roller" },
  { rowId: "asphalt-compaction:included:fuel-fluids:intermediate", section: "Материалы и расходники в машино-часе", category: "material", titleRu: "Топливо и эксплуатационные жидкости пневмоколёсного катка", unitId: "machine_hour", formulaId: "asphalt_compaction_intermediate_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_intermediate_roller" },
  { rowId: "asphalt-compaction:included:tire-wetting:intermediate", section: "Материалы и расходники в машино-часе", category: "material", titleRu: "Вода или одобренный состав против налипания для пневматических шин; без дизельного топлива", unitId: "machine_hour", formulaId: "asphalt_compaction_intermediate_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_intermediate_roller" },
  { rowId: "asphalt-compaction:included:fuel-fluids:finish", section: "Материалы и расходники в машино-часе", category: "material", titleRu: "Топливо и эксплуатационные жидкости финишного катка", unitId: "machine_hour", formulaId: "asphalt_compaction_finish_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_finish_roller" },
  { rowId: "asphalt-compaction:included:wetting-water:finish", section: "Материалы и расходники в машино-часе", category: "material", titleRu: "Вода системы смачивания вальцов финишного катка", unitId: "machine_hour", formulaId: "asphalt_compaction_finish_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_finish_roller" },
  { rowId: "asphalt-compaction:included:scrapers:finish", section: "Комплектующие в машино-часе", category: "service", titleRu: "Скребки вальцов финишного катка", unitId: "machine_hour", formulaId: "asphalt_compaction_finish_roller_machine_h_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "rc09:asphalt_compaction_finish_roller" },

  { rowId: "asphalt-compaction:quality:temperature-window", section: "Контроль качества", category: "service", titleRu: "Контроль температуры покрытия до и во время уплотнения", unitId: "pcs", formulaId: "asphalt_compaction_acceptance_lots_v2", costTreatment: "OWN_COST" },
  { rowId: "asphalt-compaction:quality:rolling-pattern", section: "Контроль качества", category: "service", titleRu: "Контроль последовательности, режимов, скорости и числа проходов катков", unitId: "pcs", formulaId: "asphalt_compaction_acceptance_lots_v2", costTreatment: "OWN_COST" },
  { rowId: "asphalt-compaction:quality:main-mat-density", section: "Контроль качества", category: "service", titleRu: "Контроль плотности основного массива покрытия", unitId: "pcs", formulaId: "asphalt_compaction_acceptance_lots_v2", costTreatment: "OWN_COST" },
  { rowId: "asphalt-compaction:quality:joint-edge-density", section: "Контроль качества", category: "service", titleRu: "Отдельный контроль плотности швов и свободных кромок", unitId: "pcs", formulaId: "asphalt_compaction_acceptance_lots_v2", costTreatment: "OWN_COST" },
  { rowId: "asphalt-compaction:quality:smoothness-marks", section: "Контроль качества", category: "service", titleRu: "Контроль ровности поверхности и отсутствия следов катка", unitId: "pcs", formulaId: "asphalt_compaction_acceptance_lots_v2", costTreatment: "OWN_COST" },
  { rowId: "asphalt-compaction:quality:visual-defects", section: "Контроль качества", category: "service", titleRu: "Осмотр на разрывы, трещины, сдвиги и сегрегацию смеси", unitId: "pcs", formulaId: "asphalt_compaction_acceptance_lots_v2", costTreatment: "OWN_COST" },
  { rowId: "asphalt-compaction:quality:full-coverage", section: "Контроль качества", category: "service", titleRu: "Проверка полной укатки площади без пропущенных полос", unitId: "pcs", formulaId: "asphalt_compaction_acceptance_lots_v2", costTreatment: "OWN_COST" },
  { rowId: "asphalt-compaction:quality:instrument-readiness", section: "Контроль качества", category: "service", titleRu: "Проверка готовности и записей поверки приборов температуры и плотности", unitId: "pcs", formulaId: "asphalt_compaction_acceptance_lots_v2", costTreatment: "OWN_COST" },

  { rowId: "rc09:asphalt_compaction_work_journal", section: "Исполнительная документация", category: "service", titleRu: "Журнал производства работ и операционного контроля", unitId: "document", formulaId: "asphalt_compaction_work_journal_v2", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "asphalt-compaction:document:rolling-pattern-log", section: "Исполнительная документация", category: "service", titleRu: "Утверждённая схема укатки и журнал проходов катков", unitId: "document", formulaId: "asphalt_compaction_work_journal_v2", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "asphalt-compaction:document:temperature-log", section: "Исполнительная документация", category: "service", titleRu: "Журнал измерений температуры в окне уплотнения", unitId: "document", formulaId: "asphalt_compaction_work_journal_v2", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "asphalt-compaction:document:quality-protocols", section: "Исполнительная документация", category: "service", titleRu: "Протоколы плотности, контроля швов и ровности", unitId: "document", formulaId: "asphalt_compaction_acceptance_lots_v2", costTreatment: "CONTROL_OR_DOCUMENT" },
  { rowId: "rc09:asphalt_compaction_execution_documentation", section: "Исполнительная документация", category: "service", titleRu: "Комплект исполнительной документации по уплотнению", unitId: "document", formulaId: "asphalt_compaction_execution_documentation_v2", costTreatment: "CONTROL_OR_DOCUMENT" },

  { rowId: "asphalt-compaction:organization:work-zone-control", section: "Организация и безопасность", category: "service", titleRu: "Организация безопасной рабочей зоны и регулирование движения", unitId: "set", formulaId: "asphalt_compaction_traffic_control_v2", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "asphalt-compaction:included:traffic-cones", section: "Состав безопасной рабочей зоны", category: "material", titleRu: "Дорожные конусы для ограждения зоны работы катков", unitId: "set", formulaId: "asphalt_compaction_traffic_control_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "asphalt-compaction:organization:work-zone-control" },
  { rowId: "asphalt-compaction:included:traffic-barriers", section: "Состав безопасной рабочей зоны", category: "material", titleRu: "Временные барьеры и ограждения рабочей зоны", unitId: "set", formulaId: "asphalt_compaction_traffic_control_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "asphalt-compaction:organization:work-zone-control" },
  { rowId: "asphalt-compaction:included:temporary-signs", section: "Состав безопасной рабочей зоны", category: "material", titleRu: "Временные предупреждающие и направляющие знаки", unitId: "set", formulaId: "asphalt_compaction_traffic_control_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "asphalt-compaction:organization:work-zone-control" },
  { rowId: "asphalt-compaction:included:flagger", section: "Состав безопасной рабочей зоны", category: "construction_work", titleRu: "Сигнальщик для движения катков и разделения транспорта", unitId: "set", formulaId: "asphalt_compaction_traffic_control_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "asphalt-compaction:organization:work-zone-control" },
  { rowId: "asphalt-compaction:included:ppe", section: "Состав безопасной рабочей зоны", category: "material", titleRu: "Сигнальная спецодежда и комплект средств индивидуальной защиты", unitId: "set", formulaId: "asphalt_compaction_traffic_control_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "asphalt-compaction:organization:work-zone-control" },
  { rowId: "asphalt-compaction:included:safety-briefing", section: "Состав безопасной рабочей зоны", category: "service", titleRu: "Предсменный инструктаж и согласование движения звена катков", unitId: "set", formulaId: "asphalt_compaction_traffic_control_v2", costTreatment: "INCLUDED_IN_RESOURCE_ROWS", parentRowId: "asphalt-compaction:organization:work-zone-control" },
  { rowId: "rc09:asphalt_compaction_large_area_organization", section: "Организация работ", category: "service", titleRu: "Координация непрерывной работы трёхфазного звена катков", unitId: "m2", formulaId: "asphalt_compaction_area_v2", costTreatment: "INFORMATIONAL_SCOPE" },

  { rowId: "asphalt-compaction:mobilization:breakdown-roller", section: "Доставка и мобилизация техники", category: "service", titleRu: "Доставка на объект и возврат катка предварительного уплотнения", unitId: "service", formulaId: "asphalt_compaction_mobilization_v2", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "asphalt-compaction:mobilization:intermediate-roller", section: "Доставка и мобилизация техники", category: "service", titleRu: "Доставка на объект и возврат пневмоколёсного катка", unitId: "service", formulaId: "asphalt_compaction_mobilization_v2", costTreatment: "OWN_COST", procurementEligible: true },
  { rowId: "asphalt-compaction:mobilization:finish-roller", section: "Доставка и мобилизация техники", category: "service", titleRu: "Доставка на объект и возврат финишного катка", unitId: "service", formulaId: "asphalt_compaction_mobilization_v2", costTreatment: "OWN_COST", procurementEligible: true },
];

export const ASPHALT_COMPACTION_PROFILE_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze(
  rows.map((row, ordinal) => resource({ ...row, ordinal })),
);

const completenessEntries = sourcePack.independentRequiredComponents.map((component) => ({
  operationId: component.operationId,
  expectedResourceId: `required-component:${component.semanticKey}`,
  category: component.category,
  specification: component.specification,
  condition: component.condition,
  sourceId: component.sourceId,
  unitId: component.unitId,
  quantityRule: component.quantityRule,
  detailPrinciple: component.detailPrinciple,
  priceRelation: component.priceRelation,
  formulaId: component.formulaId,
  resolution: component.resolution,
}));

export const ASPHALT_COMPACTION_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
  sourcePackPath: "data/estimate-benchmarks/source-packs/asphalt-compaction-preliminary-profile-r1.json",
  entries: completenessEntries,
});

export async function compileAsphaltCompactionPreliminaryProfileR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ASPHALT_COMPACTION_PROFILE_CATALOG_ID;
  if (catalogId !== ASPHALT_COMPACTION_PROFILE_CATALOG_ID) {
    throw new Error(`ASPHALT_COMPACTION_PROFILE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.asphalt-compaction-preliminary-profile-r2",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...ASPHALT_COMPACTION_PROFILE_PARAMETERS],
    formulaDefinitions: [...ASPHALT_COMPACTION_PROFILE_FORMULAS],
    resourceDefinitions: [...ASPHALT_COMPACTION_PROFILE_RESOURCES],
    submittedParameters,
    confirmedParameters: ASPHALT_COMPACTION_PROFILE_RUNTIME_INPUT,
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: ASPHALT_COMPACTION_PROFILE_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}

export const ASPHALT_COMPACTION_PROFILE_SOURCE_SUMMARY = Object.freeze({
  sourceId: ASPHALT_COMPACTION_PROFILE_SOURCE_ID,
  normId: ASPHALT_COMPACTION_PROFILE_NORM_ID,
  sourcePackSha256: ASPHALT_COMPACTION_SOURCE_PACK_SHA256,
  formula: sourcePack.quantityModel.machineHours,
  assumptionPolicy: PROFILE.assumptionPolicy,
});
