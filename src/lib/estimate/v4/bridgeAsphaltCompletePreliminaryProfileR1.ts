import bridgeSourcePack from "../../../../data/estimate-benchmarks/source-packs/bridge-asphalt-complete-preliminary-profile-r1.json";

import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import {
  ASPHALT_INSTALL_KRER27_FORMULAS,
  ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP,
  ASPHALT_INSTALL_KRER27_PARAMETERS,
  ASPHALT_INSTALL_KRER27_RESOURCES,
  ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION,
  ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
  ASPHALT_INSTALL_KRER27_SOURCE_ID,
} from "./asphaltInstallLargeAreaKrer27ProfileR1";
import {
  STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP,
  STRIP_POUR_PROFILE_FORMULAS,
  STRIP_POUR_PROFILE_PARAMETERS,
  STRIP_POUR_PROFILE_RESOURCES,
  STRIP_POUR_PROFILE_RUNTIME_CLASSIFICATION,
  STRIP_POUR_PROFILE_RUNTIME_INPUT,
} from "./stripFoundationConcretePlacementPreliminaryProfileR1";

type Json = Record<string, any>;
type CostTreatment = "OWN_COST" | "INCLUDED_IN_RESOURCE_ROWS" | "INFORMATIONAL_SCOPE" | "CONTROL_OR_DOCUMENT";
type CourseKey = "binder" | "wearing";
type CanonicalFormulaPresentation = CanonicalEstimateFormulaDefinition & Readonly<{
  output_unit_id: string;
  expression_source: string;
}>;

const PROFILE = bridgeSourcePack.selectedPreliminaryProfile;
const TRUE = Object.freeze({ kind: "literal", value: true });
const greaterThan = (parameterId: string, value: number): Json => ({
  kind: "greater_than",
  parameterId,
  value,
});

export const BRIDGE_ASPHALT_COMPLETE_CATALOG_ID = "canonical-work:expanded:bridge_asphalt";
export const BRIDGE_ASPHALT_COMPLETE_SOURCE_ID = "s27_bridge_asphalt_complete_preliminary_profile_r1";
export const BRIDGE_ASPHALT_COMPLETE_NORM_ID = "S27-BRIDGE-ASPHALT-COMPLETE-PRELIMINARY-R1";
export const BRIDGE_ASPHALT_COMPLETE_SOURCE_PACK_SHA256 =
  "72564c2650c0ef3df7523e302f23165d6737718b9ed908fb8bffab886c78495d";

export const BRIDGE_ASPHALT_COMPLETE_SOURCE_METADATA = Object.freeze({
  source_title: "Полная предварительная технологическая карта мостового покрытия S27",
  source_authority: "КРЕР-2015 № 27; ТЕХНОНИКОЛЬ; ACI/ASTM; проверяемый предварительный профиль S27",
  source_document_version: "S27_BRIDGE_ASPHALT_COMPLETE_PRELIMINARY_R1",
  source_kind: "COMPOSED_NORMATIVE_OPERATION_MAP",
  official_url: "https://minstroy.gov.kg/ru/state_program/download-pdf/no27avtomobilnyedorogi_compressed-43769083f584ff787.06841542.pdf",
  artifact_sha256: BRIDGE_ASPHALT_COMPLETE_SOURCE_PACK_SHA256,
  effective_from: "2026-09-23",
  exact_locator: "Два горячих слоя по КРЕР 27-06-020 с поправками 27-06-021; ТЕХНОЭЛАСТМОСТ Б 1×8 м; праймер №03; отдельная карта бетонной укладки и явные заменяемые проектные допущения.",
  use_restriction: "Предварительная смета полной системы покрытия прямоугольного мостового полотна. Проект мостового полотна, узлы швов, ППР, выбранные продукты и план контроля заменяют допущения профиля.",
});

export const BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT = Object.freeze({
  area_m2: PROFILE.areaM2,
  bridge_length_m: PROFILE.bridgeLengthM,
  bridge_width_m: PROFILE.bridgeWidthM,
});

const SCREED_PREFIX = "bridge_screed_";
const screedParameterId = (parameterId: string): string => `${SCREED_PREFIX}${parameterId}`;
const EXCLUDED_SCREEED_PARAMETER_IDS = new Set([
  "plan_dimension_concrete_volume_m3",
  "exposed_curing_surface_ratio_m2_m3",
]);

const renamedScreedRuntime = Object.fromEntries(Object.entries(STRIP_POUR_PROFILE_RUNTIME_INPUT)
  .filter(([parameterId]) => !EXCLUDED_SCREEED_PARAMETER_IDS.has(parameterId))
  .map(([parameterId, value]) => [screedParameterId(parameterId), value]));

export const BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT = Object.freeze({
  ...Object.fromEntries(Object.entries(ASPHALT_INSTALL_KRER27_RUNTIME_INPUT)
    .filter(([parameterId]) => parameterId !== "layer_thickness_mm")),
  binder_layer_thickness_mm: PROFILE.binderCourseThicknessMm,
  wearing_layer_thickness_mm: PROFILE.wearingCourseThicknessMm,
  binder_asphalt_mix_designation: "Горячая плотная мелкозернистая асфальтобетонная смесь типа А по варианту КРЕР 27-06-020-01; марка и состав по проекту и паспорту завода",
  wearing_asphalt_mix_designation: "Горячая плотная мелкозернистая асфальтобетонная смесь типа А по варианту КРЕР 27-06-020-01; марка и состав по проекту и паспорту завода",
  protective_screed_thickness_mm: PROFILE.protectiveScreedThicknessMm,
  ...renamedScreedRuntime,
  bridge_primer_l_per_m2: PROFILE.primerRateLM2,
  bridge_membrane_m2_per_m2: PROFILE.membraneRateM2M2,
  bridge_detail_membrane_m2_per_m2: PROFILE.detailStripRateM2M2,
  bridge_membrane_roll_area_m2: PROFILE.membraneRollAreaM2,
  bridge_lpg_kg_per_m2: PROFILE.lpgRateKgM2,
  bridge_waterproofing_productivity_m2_per_man_hour: PROFILE.waterproofingLaborProductivityM2ManH,
  bridge_torch_productivity_m2_per_machine_hour: PROFILE.torchProductivityM2MachineH,
  bridge_hand_roller_productivity_m2_per_machine_hour: PROFILE.handRollerProductivityM2MachineH,
  bridge_reinforcement_mesh_kg_per_m2: PROFILE.reinforcementMeshKgM2,
  bridge_mesh_card_weight_kg: PROFILE.meshCardWeightKg,
  bridge_mesh_card_length_m: PROFILE.meshCardLengthM,
  bridge_mesh_card_width_m: PROFILE.meshCardWidthM,
  bridge_mesh_lap_m: PROFILE.meshLapM,
  bridge_mesh_bar_diameter_mm: PROFILE.meshBarDiameterMm,
  bridge_binding_wire_ratio: PROFILE.bindingWireRatio,
  bridge_spacer_count_per_m2: PROFILE.spacerCountPerM2,
  bridge_spacer_package_pcs: PROFILE.spacerPackagePcs,
  bridge_spacer_height_mm: PROFILE.spacerHeightMm,
  bridge_minimum_top_cover_mm: PROFILE.minimumTopCoverMm,
  bridge_form_oil_l_per_m2: PROFILE.formOilLM2,
  bridge_reinforcement_installation_kg_per_man_hour: PROFILE.reinforcementInstallationKgManH,
  bridge_reinforcement_truck_capacity_t: PROFILE.reinforcementTruckCapacityT,
  bridge_expansion_joint_count: PROFILE.expansionJointCount,
  bridge_joint_sealant_kg_per_m: PROFILE.jointSealantKgM,
  bridge_joint_sealant_package_kg: PROFILE.jointSealantPackageKg,
  bridge_joint_primer_l_per_m: PROFILE.jointPrimerLM,
  bridge_joint_backer_cord_m_per_m: PROFILE.jointBackerCordMM,
  bridge_joint_backer_cord_coil_m: PROFILE.jointBackerCordCoilM,
  bridge_joint_width_mm: PROFILE.jointWidthMm,
  bridge_joint_backer_cord_diameter_mm: PROFILE.jointBackerCordDiameterMm,
  bridge_formwork_screws_per_m: PROFILE.formworkScrewsPerM,
  bridge_formwork_screw_package_pcs: PROFILE.formworkScrewPackagePcs,
  bridge_formwork_stake_spacing_m: PROFILE.formworkStakeSpacingM,
  bridge_formwork_brace_spacing_m: PROFILE.formworkBraceSpacingM,
  bridge_continuous_tack_coat_rate_l_per_m2: PROFILE.continuousTackCoatRateLM2,
  bridge_tack_distributor_productivity_m2_per_machine_hour: PROFILE.tackDistributorProductivityM2MachineH,
  bridge_leveling_area_m2: PROFILE.levelingAreaM2,
  bridge_leveling_thickness_mm: PROFILE.levelingThicknessMm,
  bridge_leveling_concrete_allowance_percent: PROFILE.levelingConcreteAllowancePercent,
  bridge_drainage_area_per_outlet_m2: PROFILE.drainageAreaPerOutletM2,
  bridge_drainage_detail_membrane_m2_per_outlet: PROFILE.drainageDetailMembraneM2PerOutlet,
  bridge_drainage_sealant_kg_per_outlet: PROFILE.drainageSealantKgPerOutlet,
  bridge_drainage_sealant_package_kg: PROFILE.drainageSealantPackageKg,
  bridge_qa_lot_m2: PROFILE.bridgeQaLotM2,
});

export const BRIDGE_ASPHALT_COMPLETE_ACCEPTANCE_INPUT = Object.freeze({
  ...BRIDGE_ASPHALT_COMPLETE_SHORT_INPUT,
  ...BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT,
});

const BRIDGE_NORMATIVE_RUNTIME_IDS = new Set([
  "protective_screed_thickness_mm",
  "bridge_primer_l_per_m2",
  "bridge_membrane_m2_per_m2",
]);

export const BRIDGE_ASPHALT_COMPLETE_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT).map((parameterId) => {
    if (parameterId.startsWith(SCREED_PREFIX)) {
      const sourceParameterId = parameterId.slice(SCREED_PREFIX.length);
      return [parameterId, STRIP_POUR_PROFILE_RUNTIME_CLASSIFICATION[sourceParameterId] ?? "ASSUMPTION"];
    }
    return [
      parameterId,
      ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION[parameterId]
        ?? (BRIDGE_NORMATIVE_RUNTIME_IDS.has(parameterId) ? "NORMATIVE" : "ASSUMPTION"),
    ];
  })),
) as Readonly<Record<string, "NORMATIVE" | "ASSUMPTION" | "DERIVED">>;

export const BRIDGE_ASPHALT_COMPLETE_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT).map((parameterId) => [
    parameterId,
    BRIDGE_ASPHALT_COMPLETE_RUNTIME_CLASSIFICATION[parameterId] === "NORMATIVE"
      ? [BRIDGE_ASPHALT_COMPLETE_SOURCE_ID]
      : [],
  ])),
);

function replaceWords(value: string, replacements: Readonly<Record<string, string>>): string {
  return Object.entries(replacements)
    .sort(([left], [right]) => right.length - left.length)
    .reduce((current, [from, to]) => current.replace(new RegExp(`\\b${from}\\b`, "gu"), to), value);
}

function renameAst(value: unknown, replacements: Readonly<Record<string, string>>): unknown {
  if (Array.isArray(value)) return value.map((child) => renameAst(child, replacements));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Json).map(([key, child]) => [
    key,
    key === "parameterId" && typeof child === "string"
      ? replacements[child] ?? child
      : renameAst(child, replacements),
  ]));
}

function formula(
  formulaId: string,
  outputUnitId: string,
  expression: string,
): CanonicalFormulaPresentation {
  const compiled = compileFormulaGraph(expression);
  return {
    formula_id: formulaId,
    output_unit_id: outputUnitId,
    expression_source: compiled.source,
    ast: compiled.ast,
    input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: "runtime-publisher-replaces-with-deterministic-sha256",
  };
}

function visibleParameter(input: Readonly<{
  parameterId: string;
  titleRu: string;
  unitId: string | null;
  valueType?: "decimal" | "integer" | "text";
  minimum?: number;
  guideKind: "MEASUREMENT_RULE" | "PRACTICE_REFERENCE";
  guideRu: string;
}>) {
  return {
    parameter_id: input.parameterId,
    value_type: input.valueType ?? "decimal",
    unit_id: input.unitId,
    title_ru: input.titleRu,
    required: true,
    default_value: null,
    constraints_json: input.minimum == null ? {} : { min: input.minimum },
    truth_metadata: {
      contract: "rik-expo-app.s27.bridge-asphalt-complete-preliminary-profile.v1",
      semantic_parameter_key: `bridge-asphalt-complete:${input.parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: input.guideKind === "MEASUREMENT_RULE"
        ? "USER_MEASURED"
        : "USER_REPLACEABLE_PRELIMINARY_PROFILE",
      input_origin_class: input.guideKind === "MEASUREMENT_RULE"
        ? "KNOWN_WORK_SCOPE"
        : "SELECTED_VISIBLE_PRELIMINARY_PROFILE",
      preliminary_compilation_allowed: input.guideKind !== "MEASUREMENT_RULE",
      source_confirmation_required: false,
      guide: {
        guide_kind: input.guideKind,
        guide_short_ru: input.guideRu,
        source_role: input.guideKind === "MEASUREMENT_RULE" ? "OBJECT_GEOMETRY" : "VISIBLE_PRELIMINARY_PROFILE",
        source_document: BRIDGE_ASPHALT_COMPLETE_SOURCE_ID,
        source_locator: BRIDGE_ASPHALT_COMPLETE_SOURCE_METADATA.exact_locator,
        guide_version: "bridge-asphalt-complete-preliminary-profile-r1",
        source_snapshot_hash: BRIDGE_ASPHALT_COMPLETE_SOURCE_PACK_SHA256,
        applicability: BRIDGE_ASPHALT_COMPLETE_SOURCE_METADATA.use_restriction,
        verified_at: "2026-09-23T00:00:00+06:00",
        guide_validation_policy: "FIRST_ESTIMATE_NOW_REPLACE_PROFILE_VALUES_WITH_PROJECT_DATA",
      },
      hidden_default_forbidden: input.guideKind === "MEASUREMENT_RULE",
      runtime_profile_value: input.guideKind !== "MEASUREMENT_RULE",
      runtime_profile_classification: input.guideKind === "MEASUREMENT_RULE" ? null : "ASSUMPTION",
      synthetic: false,
    },
  };
}

const asphaltSharedParameters = ASPHALT_INSTALL_KRER27_PARAMETERS
  .filter((parameter) => !["area_m2", "layer_thickness_mm"].includes(parameter.parameter_id))
  .map((parameter) => ({ ...parameter, ordinal: 0 }));

const screedReplacements = Object.fromEntries(STRIP_POUR_PROFILE_PARAMETERS
  .filter((parameter) => !EXCLUDED_SCREEED_PARAMETER_IDS.has(parameter.parameter_id))
  .map((parameter) => [parameter.parameter_id, screedParameterId(parameter.parameter_id)]));

const screedParameters = STRIP_POUR_PROFILE_PARAMETERS
  .filter((parameter) => !EXCLUDED_SCREEED_PARAMETER_IDS.has(parameter.parameter_id))
  .map((parameter) => ({
    ...parameter,
    parameter_id: screedParameterId(parameter.parameter_id),
    ordinal: 0,
    title_ru: `Защитная стяжка: ${parameter.title_ru}`,
    constraints_json: renameAst(parameter.constraints_json, screedReplacements) as Json,
    truth_metadata: {
      ...(parameter.truth_metadata as Json),
      semantic_parameter_key: `bridge-screed:${parameter.parameter_id}`,
      visibility_role: "INTERNAL_ONLY",
      input_origin_class: "SELECTED_VISIBLE_PRELIMINARY_PROFILE",
      preliminary_compilation_allowed: true,
      guide: {
        ...((parameter.truth_metadata as Json).guide ?? {}),
        guide_short_ru: `${parameter.title_ru}: применено предварительное значение; при необходимости изменяется в расширенных параметрах сметы.`,
        applicability: "Защитная армированная бетонная стяжка мостовой гидроизоляции.",
      },
    },
  }));

const localParameterSpecs = [
  ["bridge_primer_l_per_m2", "Расход праймера на 1 м²", "l_m2", 0],
  ["bridge_membrane_m2_per_m2", "Расход рулонной гидроизоляции с нахлёстами на 1 м²", "m2_m2", 0],
  ["bridge_detail_membrane_m2_per_m2", "Дополнительная гидроизоляция узлов на 1 м²", "m2_m2", 0],
  ["bridge_membrane_roll_area_m2", "Площадь материала в одном рулоне ТЕХНОЭЛАСТМОСТ Б 1×8 м", "m2", 0.001],
  ["bridge_lpg_kg_per_m2", "Сжиженный газ для наплавления на 1 м²", "kg_m2", 0],
  ["bridge_waterproofing_productivity_m2_per_man_hour", "Производительность звена гидроизоляции", "m2_man_hour", 0.001],
  ["bridge_torch_productivity_m2_per_machine_hour", "Производительность газопламенного оборудования", "m2_machine_hour", 0.001],
  ["bridge_hand_roller_productivity_m2_per_machine_hour", "Производительность ручного прикаточного ролика", "m2_machine_hour", 0.001],
  ["bridge_reinforcement_mesh_kg_per_m2", "Масса сетки защитной стяжки на 1 м²", "kg_m2", 0.001],
  ["bridge_mesh_card_weight_kg", "Масса карты сетки Ø6 А500С 100×100 мм, 2×3 м", "kg", 0.001],
  ["bridge_mesh_card_length_m", "Длина карты сетки", "m", 0.001],
  ["bridge_mesh_card_width_m", "Ширина карты сетки", "m", 0.001],
  ["bridge_mesh_lap_m", "Нахлёст карт сетки в обоих направлениях", "m", 0],
  ["bridge_mesh_bar_diameter_mm", "Диаметр стержня сетки", "mm", 0.001],
  ["bridge_binding_wire_ratio", "Доля вязальной проволоки от массы сетки", "ratio", 0],
  ["bridge_spacer_count_per_m2", "Фиксаторы защитного слоя на 1 м²", "pcs_m2", 0],
  ["bridge_spacer_package_pcs", "Количество фиксаторов «стойка» в упаковке", "pcs", 1],
  ["bridge_spacer_height_mm", "Высота фиксатора сетки", "mm", 0],
  ["bridge_minimum_top_cover_mm", "Минимальный верхний защитный слой над пересечением стержней", "mm", 0],
  ["bridge_form_oil_l_per_m2", "Расход смазки бортовой опалубки", "l_m2", 0],
  ["bridge_reinforcement_installation_kg_per_man_hour", "Производительность монтажа сетки", "kg_man_hour", 0.001],
  ["bridge_reinforcement_truck_capacity_t", "Грузоподъёмность доставки сетки", "t", 0.001],
  ["bridge_expansion_joint_count", "Количество поперечных сопряжений деформационных швов", "pcs", 0],
  ["bridge_joint_sealant_kg_per_m", "Расход герметика шва", "kg_m", 0],
  ["bridge_joint_sealant_package_kg", "Масса заводской упаковки герметика СОТА", "kg", 0.001],
  ["bridge_joint_primer_l_per_m", "Расход праймера шва", "l_m", 0],
  ["bridge_joint_backer_cord_m_per_m", "Расход уплотнительного шнура", "m_m", 0],
  ["bridge_joint_backer_cord_coil_m", "Длина уплотнительного шнура в бухте", "m", 0.001],
  ["bridge_joint_width_mm", "Ширина камеры шва", "mm", 0.001],
  ["bridge_joint_backer_cord_diameter_mm", "Диаметр закрытоячеистого ППЭ-шнура", "mm", 0.001],
  ["bridge_formwork_screws_per_m", "Саморезы 6×80 мм на 1 м бортовой опалубки", "pcs_m", 0],
  ["bridge_formwork_screw_package_pcs", "Саморезы 6×80 мм в коробке", "pcs", 1],
  ["bridge_formwork_stake_spacing_m", "Шаг кольев 50×50×600 мм", "m", 0.001],
  ["bridge_formwork_brace_spacing_m", "Шаг подкосов 40×100×1000 мм", "m", 0.001],
  ["bridge_continuous_tack_coat_rate_l_per_m2", "Расход битумной эмульсии для сплошного сцепления одного интерфейса", "l_m2", 0],
  ["bridge_tack_distributor_productivity_m2_per_machine_hour", "Производительность распределителя эмульсии", "m2_machine_hour", 0.001],
  ["bridge_leveling_area_m2", "Площадь требуемого выравнивающего слоя; 0 только после приёмки основания", "m2", 0],
  ["bridge_leveling_thickness_mm", "Толщина применимого выравнивающего слоя", "mm", 0.001],
  ["bridge_leveling_concrete_allowance_percent", "Резерв заказа бетона выравнивающего слоя", "percent", 0],
  ["bridge_drainage_area_per_outlet_m2", "Предварительная площадь на одну водоотводную трубку", "m2", 0.001],
  ["bridge_drainage_detail_membrane_m2_per_outlet", "Гидроизоляция узла одной водоотводной трубки", "m2", 0],
  ["bridge_drainage_sealant_kg_per_outlet", "Герметик узла одной водоотводной трубки", "kg", 0],
  ["bridge_drainage_sealant_package_kg", "Масса заводской упаковки герметика водоотвода", "kg", 0.001],
  ["bridge_qa_lot_m2", "Площадь предварительной партии контроля", "m2", 1],
] as const;

const localParameters = localParameterSpecs.map(([parameterId, titleRu, unitId, minimum]) => ({
  ...visibleParameter({
    parameterId,
    titleRu,
    unitId,
    minimum,
    guideKind: "PRACTICE_REFERENCE",
    guideRu: `${titleRu}: предварительно принято ${String((BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT as Json)[parameterId]).replace(".", ",")} ${unitId}.`,
  }),
  truth_metadata: {
    ...visibleParameter({ parameterId, titleRu, unitId, minimum, guideKind: "PRACTICE_REFERENCE", guideRu: titleRu }).truth_metadata,
    visibility_role: [
      "bridge_primer_l_per_m2",
      "bridge_membrane_m2_per_m2",
      "bridge_reinforcement_mesh_kg_per_m2",
      "bridge_mesh_lap_m",
      "bridge_mesh_bar_diameter_mm",
      "bridge_spacer_height_mm",
      "bridge_minimum_top_cover_mm",
      "bridge_expansion_joint_count",
      "bridge_continuous_tack_coat_rate_l_per_m2",
      "bridge_leveling_area_m2",
      "bridge_leveling_thickness_mm",
      "bridge_drainage_area_per_outlet_m2",
    ].includes(parameterId) ? "USER_INPUT" : "INTERNAL_ONLY",
  },
}));

const primaryParameters: CanonicalEstimateParameterDefinition[] = [
  visibleParameter({ parameterId: "area_m2", titleRu: "Площадь мостового полотна", unitId: "m2", minimum: 0.001, guideKind: "MEASUREMENT_RULE", guideRu: "Площадь из длины и ширины покрываемой поверхности." }),
  visibleParameter({ parameterId: "bridge_length_m", titleRu: "Длина покрываемого мостового полотна", unitId: "m", minimum: 0.001, guideKind: "MEASUREMENT_RULE", guideRu: "Из запроса: 150 м." }),
  visibleParameter({ parameterId: "bridge_width_m", titleRu: "Ширина покрываемого мостового полотна", unitId: "m", minimum: 0.001, guideKind: "MEASUREMENT_RULE", guideRu: "Из запроса: 32 м." }),
  visibleParameter({ parameterId: "binder_layer_thickness_mm", titleRu: "Толщина нижнего слоя асфальтобетона", unitId: "mm", minimum: 30, guideKind: "PRACTICE_REFERENCE", guideRu: "Принято: 50 мм; заменить проектной конструкцией." }),
  visibleParameter({ parameterId: "wearing_layer_thickness_mm", titleRu: "Толщина верхнего слоя асфальтобетона", unitId: "mm", minimum: 30, guideKind: "PRACTICE_REFERENCE", guideRu: "Принято: 50 мм; заменить проектной конструкцией." }),
  visibleParameter({ parameterId: "binder_asphalt_mix_designation", titleRu: "Выбранная смесь нижнего слоя", valueType: "text", unitId: null, guideKind: "PRACTICE_REFERENCE", guideRu: "Предварительно выбран один вариант типа А по применённой строке КРЕР; заменить точной проектной маркой и паспортом завода." }),
  visibleParameter({ parameterId: "wearing_asphalt_mix_designation", titleRu: "Выбранная смесь верхнего слоя", valueType: "text", unitId: null, guideKind: "PRACTICE_REFERENCE", guideRu: "Предварительно выбран один вариант типа А по применённой строке КРЕР; заменить точной проектной маркой и паспортом завода." }),
  visibleParameter({ parameterId: "protective_screed_thickness_mm", titleRu: "Толщина защитной армированной стяжки", unitId: "mm", minimum: 1, guideKind: "PRACTICE_REFERENCE", guideRu: "Норма выбранной системы: 40 мм." }),
];

export const BRIDGE_ASPHALT_COMPLETE_PARAMETERS: readonly CanonicalEstimateParameterDefinition[] = Object.freeze([
  ...primaryParameters,
  ...asphaltSharedParameters,
  ...screedParameters,
  ...localParameters,
].map((parameter, ordinal) => ({ ...parameter, ordinal })));

function formulaPresentation(
  source: CanonicalEstimateFormulaDefinition,
): CanonicalFormulaPresentation {
  const candidate = source as CanonicalFormulaPresentation;
  if (!candidate.output_unit_id || !candidate.expression_source) {
    throw new Error(`CANONICAL_FORMULA_PRESENTATION_MISSING:${source.formula_id}`);
  }
  return candidate;
}

function asphaltFormula(course: CourseKey, source: CanonicalEstimateFormulaDefinition): CanonicalFormulaPresentation {
  const presentation = formulaPresentation(source);
  const thickness = course === "binder" ? "binder_layer_thickness_mm" : "wearing_layer_thickness_mm";
  return formula(
    `bridge_${course}_${source.formula_id}`,
    presentation.output_unit_id,
    replaceWords(presentation.expression_source, { layer_thickness_mm: thickness }),
  );
}

const concreteVolumeExpression = "(area_m2*protective_screed_thickness_mm/1000)";
const screedFormulaReplacements = {
  ...screedReplacements,
  plan_dimension_concrete_volume_m3: concreteVolumeExpression,
};

function screedFormula(source: CanonicalEstimateFormulaDefinition): CanonicalFormulaPresentation {
  const presentation = formulaPresentation(source);
  if (source.formula_id === "strip_pour_curing_area_v1") {
    return formula(`bridge_screed_${source.formula_id}`, "m2", "area_m2");
  }
  if (source.formula_id === "strip_pour_curing_sheet_v1") {
    return formula(
      `bridge_screed_${source.formula_id}`,
      "m2",
      "area_m2*bridge_screed_curing_sheet_overlap_factor",
    );
  }
  return formula(
    `bridge_screed_${source.formula_id}`,
    presentation.output_unit_id,
    replaceWords(presentation.expression_source, screedFormulaReplacements),
  );
}

const localFormulas: readonly CanonicalEstimateFormulaDefinition[] = [
  formula("bridge_area_v1", "m2", "area_m2"),
  formula("bridge_primer_l_v1", "l", "area_m2*bridge_primer_l_per_m2"),
  formula("bridge_membrane_m2_v1", "m2", "area_m2*bridge_membrane_m2_per_m2"),
  formula("bridge_detail_membrane_m2_v1", "m2", "area_m2*bridge_detail_membrane_m2_per_m2"),
  formula("bridge_drainage_outlets_v1", "pcs", "ceil(area_m2/bridge_drainage_area_per_outlet_m2)"),
  formula("bridge_drainage_detail_membrane_m2_v1", "m2", "ceil(area_m2/bridge_drainage_area_per_outlet_m2)*bridge_drainage_detail_membrane_m2_per_outlet"),
  formula("bridge_membrane_rolls_v1", "roll", "ceil((area_m2*(bridge_membrane_m2_per_m2+bridge_detail_membrane_m2_per_m2)+ceil(area_m2/bridge_drainage_area_per_outlet_m2)*bridge_drainage_detail_membrane_m2_per_outlet)/bridge_membrane_roll_area_m2)"),
  formula("bridge_membrane_purchased_m2_v1", "m2", "ceil((area_m2*(bridge_membrane_m2_per_m2+bridge_detail_membrane_m2_per_m2)+ceil(area_m2/bridge_drainage_area_per_outlet_m2)*bridge_drainage_detail_membrane_m2_per_outlet)/bridge_membrane_roll_area_m2)*bridge_membrane_roll_area_m2"),
  formula("bridge_lpg_kg_v1", "kg", "area_m2*bridge_lpg_kg_per_m2"),
  formula("bridge_waterproofing_labor_h_v1", "man_hour", "area_m2/bridge_waterproofing_productivity_m2_per_man_hour"),
  formula("bridge_torch_machine_h_v1", "machine_hour", "area_m2/bridge_torch_productivity_m2_per_machine_hour"),
  formula("bridge_hand_roller_machine_h_v1", "machine_hour", "area_m2/bridge_hand_roller_productivity_m2_per_machine_hour"),
  formula("bridge_mesh_kg_v1", "kg", "area_m2*bridge_reinforcement_mesh_kg_per_m2"),
  formula("bridge_mesh_cards_v1", "pcs", "min(ceil((bridge_length_m-bridge_mesh_lap_m)/(bridge_mesh_card_length_m-bridge_mesh_lap_m))*ceil((bridge_width_m-bridge_mesh_lap_m)/(bridge_mesh_card_width_m-bridge_mesh_lap_m)),ceil((bridge_length_m-bridge_mesh_lap_m)/(bridge_mesh_card_width_m-bridge_mesh_lap_m))*ceil((bridge_width_m-bridge_mesh_lap_m)/(bridge_mesh_card_length_m-bridge_mesh_lap_m)))"),
  formula("bridge_mesh_purchased_area_m2_v1", "m2", "min(ceil((bridge_length_m-bridge_mesh_lap_m)/(bridge_mesh_card_length_m-bridge_mesh_lap_m))*ceil((bridge_width_m-bridge_mesh_lap_m)/(bridge_mesh_card_width_m-bridge_mesh_lap_m)),ceil((bridge_length_m-bridge_mesh_lap_m)/(bridge_mesh_card_width_m-bridge_mesh_lap_m))*ceil((bridge_width_m-bridge_mesh_lap_m)/(bridge_mesh_card_length_m-bridge_mesh_lap_m)))*bridge_mesh_card_length_m*bridge_mesh_card_width_m"),
  formula("bridge_mesh_cover_clearance_mm_v1", "mm", "protective_screed_thickness_mm-bridge_spacer_height_mm-2*bridge_mesh_bar_diameter_mm-bridge_minimum_top_cover_mm"),
  formula("bridge_binding_wire_kg_v1", "kg", "min(ceil((bridge_length_m-bridge_mesh_lap_m)/(bridge_mesh_card_length_m-bridge_mesh_lap_m))*ceil((bridge_width_m-bridge_mesh_lap_m)/(bridge_mesh_card_width_m-bridge_mesh_lap_m)),ceil((bridge_length_m-bridge_mesh_lap_m)/(bridge_mesh_card_width_m-bridge_mesh_lap_m))*ceil((bridge_width_m-bridge_mesh_lap_m)/(bridge_mesh_card_length_m-bridge_mesh_lap_m)))*bridge_mesh_card_weight_kg*bridge_binding_wire_ratio"),
  formula("bridge_spacers_pcs_v1", "pcs", "ceil(area_m2*bridge_spacer_count_per_m2)"),
  formula("bridge_spacer_packages_v1", "package", "ceil(area_m2*bridge_spacer_count_per_m2/bridge_spacer_package_pcs)"),
  formula("bridge_edge_form_m2_v1", "m2", "2*(bridge_length_m+bridge_width_m)*protective_screed_thickness_mm/1000"),
  formula("bridge_form_oil_l_v1", "l", "2*(bridge_length_m+bridge_width_m)*protective_screed_thickness_mm/1000*bridge_form_oil_l_per_m2"),
  formula("bridge_formwork_screw_packages_v1", "package", "ceil(2*(bridge_length_m+bridge_width_m)*bridge_formwork_screws_per_m/bridge_formwork_screw_package_pcs)"),
  formula("bridge_formwork_stakes_v1", "pcs", "ceil(2*(bridge_length_m+bridge_width_m)/bridge_formwork_stake_spacing_m)"),
  formula("bridge_formwork_braces_v1", "pcs", "ceil(2*(bridge_length_m+bridge_width_m)/bridge_formwork_brace_spacing_m)"),
  formula("bridge_rebar_labor_h_v1", "man_hour", "min(ceil((bridge_length_m-bridge_mesh_lap_m)/(bridge_mesh_card_length_m-bridge_mesh_lap_m))*ceil((bridge_width_m-bridge_mesh_lap_m)/(bridge_mesh_card_width_m-bridge_mesh_lap_m)),ceil((bridge_length_m-bridge_mesh_lap_m)/(bridge_mesh_card_width_m-bridge_mesh_lap_m))*ceil((bridge_width_m-bridge_mesh_lap_m)/(bridge_mesh_card_length_m-bridge_mesh_lap_m)))*bridge_mesh_card_weight_kg/bridge_reinforcement_installation_kg_per_man_hour"),
  formula("bridge_rebar_trips_v1", "trip", "ceil(((min(ceil((bridge_length_m-bridge_mesh_lap_m)/(bridge_mesh_card_length_m-bridge_mesh_lap_m))*ceil((bridge_width_m-bridge_mesh_lap_m)/(bridge_mesh_card_width_m-bridge_mesh_lap_m)),ceil((bridge_length_m-bridge_mesh_lap_m)/(bridge_mesh_card_width_m-bridge_mesh_lap_m))*ceil((bridge_width_m-bridge_mesh_lap_m)/(bridge_mesh_card_length_m-bridge_mesh_lap_m)))*bridge_mesh_card_weight_kg)+area_m2*bridge_reinforcement_mesh_kg_per_m2*bridge_binding_wire_ratio)/1000/bridge_reinforcement_truck_capacity_t)"),
  formula("bridge_two_interfaces_area_v1", "m2", "area_m2*2"),
  formula("bridge_continuous_tack_l_v1", "l", "area_m2*2*bridge_continuous_tack_coat_rate_l_per_m2"),
  formula("bridge_continuous_tack_distributor_h_v1", "machine_hour", "area_m2*2/bridge_tack_distributor_productivity_m2_per_machine_hour"),
  formula("bridge_leveling_area_v1", "m2", "bridge_leveling_area_m2"),
  formula("bridge_leveling_concrete_m3_v1", "m3", "bridge_leveling_area_m2*bridge_leveling_thickness_mm/1000*(1+bridge_leveling_concrete_allowance_percent/100)"),
  formula("bridge_drainage_sealant_packages_v1", "package", "ceil(ceil(area_m2/bridge_drainage_area_per_outlet_m2)*bridge_drainage_sealant_kg_per_outlet/bridge_drainage_sealant_package_kg)"),
  formula("bridge_joint_length_m_v1", "m", "bridge_expansion_joint_count*bridge_width_m"),
  formula("bridge_joint_sealant_kg_v1", "kg", "bridge_expansion_joint_count*bridge_width_m*bridge_joint_sealant_kg_per_m"),
  formula("bridge_joint_sealant_packages_v1", "package", "ceil(bridge_expansion_joint_count*bridge_width_m*bridge_joint_sealant_kg_per_m/bridge_joint_sealant_package_kg)"),
  formula("bridge_joint_primer_l_v1", "l", "bridge_expansion_joint_count*bridge_width_m*bridge_joint_primer_l_per_m"),
  formula("bridge_joint_backer_m_v1", "m", "bridge_expansion_joint_count*bridge_width_m*bridge_joint_backer_cord_m_per_m"),
  formula("bridge_joint_backer_coils_v1", "roll", "ceil(bridge_expansion_joint_count*bridge_width_m*bridge_joint_backer_cord_m_per_m/bridge_joint_backer_cord_coil_m)"),
  formula("bridge_qa_lots_v1", "pcs", "ceil(area_m2/bridge_qa_lot_m2)"),
  formula("bridge_one_document_v1", "document", "1"),
];

export const BRIDGE_ASPHALT_COMPLETE_FORMULAS: readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  ...ASPHALT_INSTALL_KRER27_FORMULAS.map((source) => asphaltFormula("binder", source)),
  ...ASPHALT_INSTALL_KRER27_FORMULAS.map((source) => asphaltFormula("wearing", source)),
  ...STRIP_POUR_PROFILE_FORMULAS.map(screedFormula),
  ...localFormulas,
]);

function prefixedAsphaltResource(
  course: CourseKey,
  source: CanonicalEstimateResourceDefinition,
  ordinal: number,
): CanonicalEstimateResourceDefinition {
  const courseRu = course === "binder" ? "Нижний слой" : "Верхний слой";
  const rowId = `bridge:${course}:${source.row_id}`;
  const parent = String((source.resource_graph as Json)?.parentCostOwnerId ?? "");
  const sharedMobilization = source.row_id.startsWith("asphalt:mobilization:");
  const repeatedMobilization = course === "wearing" && sharedMobilization;
  const sharedMobilizationOwner = `bridge:binder:${source.row_id}`;
  const mixDesignationParameterId = course === "binder"
    ? "binder_asphalt_mix_designation"
    : "wearing_asphalt_mix_designation";
  const isHotMix = source.row_id === "asphalt:material:hot-dense-fine-mix";
  const isIncidentalKrerBitumen = source.row_id === "asphalt:material:road-bitumen";
  const resourceGraph = {
    ...(source.resource_graph as Json),
    formulaId: `bridge_${course}_${source.formula_id}`,
    semanticOwnerId: rowId,
    primaryMeasureParameterId: "area_m2",
    ...(parent ? { parentCostOwnerId: `bridge:${course}:${parent}` } : {}),
    ...(repeatedMobilization ? {
      costOwner: "scope",
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
      payable: false,
      noDoubleCount: true,
      parentCostOwnerId: sharedMobilizationOwner,
      sharedMobilizationAcrossCourses: true,
    } : {}),
    ...(isHotMix ? {
      titleSpecificationParameterIds: [mixDesignationParameterId],
      productSpecificationParameterIds: [mixDesignationParameterId, `${course}_layer_thickness_mm`],
      selectedVariantIsEditable: true,
      selectedVariantRule: "one explicit preliminary mix is shown; the approved pavement design and plant passport replace it",
    } : {}),
    ...(isIncidentalKrerBitumen ? {
      incidentalNormResourceOnly: true,
      notAcceptedAsCompleteFullAreaTackCoat: true,
      fullAreaTackCoatOwnerId: "bridge:asphalt:continuous-tack-emulsion",
    } : {}),
    completeBridgePavementSystem: true,
  };
  const next = {
    ...source,
    id: `resource-${rowId.replace(/:/gu, "-")}`,
    row_id: rowId,
    ordinal,
    section: `${courseRu}: ${source.section}`,
    title_ru: repeatedMobilization
      ? `${courseRu.toLocaleLowerCase("ru-RU")}: повторная мобилизация не начисляется — используется единый приезд для обоих последовательных слоёв (${source.title_ru.toLocaleLowerCase("ru-RU")})`
      : isHotMix
        ? `${courseRu.toLocaleLowerCase("ru-RU")}: горячая плотная мелкозернистая асфальтобетонная смесь типа А по КРЕР 27-06-020-01 + 27-06-021-01 при принятой толщине; марка и состав уточняются проектом и паспортом завода`
        : isIncidentalKrerBitumen
          ? `${courseRu.toLocaleLowerCase("ru-RU")}: малый нормативный ресурс дорожного битума по КРЕР — не заменяет сплошной слой сцепления`
          : `${courseRu.toLocaleLowerCase("ru-RU")}: ${source.title_ru}`,
    formula_id: `bridge_${course}_${source.formula_id}`,
    resource_graph: resourceGraph,
    cost_owner_id: repeatedMobilization ? sharedMobilizationOwner : rowId,
    source_metadata: {
      ...(source.source_metadata as Json),
      bridgeCourse: course,
      composedSourceId: ASPHALT_INSTALL_KRER27_SOURCE_ID,
      completeBridgePavementSystem: true,
    },
  };
  return { ...next, row_sha256: estimateDeterministicHash(next) };
}

function prefixedScreedResource(
  source: CanonicalEstimateResourceDefinition,
  ordinal: number,
): CanonicalEstimateResourceDefinition {
  const rowId = `bridge:screed:${source.row_id.replace(/^strip-pour:/u, "")}`;
  const parent = String((source.resource_graph as Json)?.parentCostOwnerId ?? "");
  const resourceGraph = renameAst({
    ...(source.resource_graph as Json),
    formulaId: `bridge_screed_${source.formula_id}`,
    semanticOwnerId: rowId,
    primaryMeasureParameterId: "area_m2",
    ...(parent ? { parentCostOwnerId: `bridge:screed:${parent.replace(/^strip-pour:/u, "")}` } : {}),
    completeBridgePavementSystem: true,
  }, screedReplacements) as Json;
  for (const key of ["titleSpecificationParameterIds", "inputParameterIds"] as const) {
    const ids = (source.resource_graph as Json)?.[key];
    if (Array.isArray(ids)) {
      resourceGraph[key] = ids.map((parameterId) =>
        screedReplacements[String(parameterId)] ?? String(parameterId));
    }
  }
  const next = {
    ...source,
    id: `resource-${rowId.replace(/:/gu, "-")}`,
    row_id: rowId,
    ordinal,
    section: `Защитная стяжка: ${source.section}`,
    title_ru: source.title_ru.replace(/ленточн(?:ого|ый) фундамент(?:а)?/giu, "защитной стяжки мостового полотна"),
    formula_id: `bridge_screed_${source.formula_id}`,
    inclusion_ast: renameAst(source.inclusion_ast, screedReplacements) as Json,
    resource_graph: resourceGraph,
    cost_owner_id: rowId,
    source_metadata: {
      ...(source.source_metadata as Json),
      adaptedPhysicalBasis: "area_m2*protective_screed_thickness_mm/1000",
      completeBridgePavementSystem: true,
    },
  };
  return { ...next, row_sha256: estimateDeterministicHash(next) };
}

function localResource(component: Json, ordinal: number): CanonicalEstimateResourceDefinition {
  const rowId = String(component.resolution.rowId);
  const category = component.category === "material" || component.category === "component"
    || component.category === "consumable" || component.category === "fastener"
    ? "material"
    : component.category === "equipment" ? "equipment"
      : component.category === "labor" ? "construction_work" : "service";
  const costTreatment = component.priceRelation as CostTreatment;
  const titles: Record<string, string> = {
    "bridge:deck:acceptance": "Приёмка мостовой плиты до устройства системы покрытия",
    "bridge:deck:mechanical-cleaning": "Механическая очистка и обеспыливание мостовой плиты",
    "bridge:deck:drying": "Сушка и проверка готовности основания под праймер",
    "bridge:waterproofing:primer": "Праймер битумно-полимерный ТЕХНОНИКОЛЬ № 03",
    "bridge:waterproofing:membrane": "ТЕХНОЭЛАСТМОСТ Б, ТУ 5774-004-17925162-2003, нетто на основное поле с нахлёстами",
    "bridge:waterproofing:detail-membrane": "ТЕХНОЭЛАСТМОСТ Б, дополнительные полосы сопряжений и деталей — нетто",
    "bridge:waterproofing:membrane-rolls": "ТЕХНОЭЛАСТМОСТ Б, рулон 1×8 м (8 м²): общий заказ поля и дополнительных полос",
    "bridge:waterproofing:membrane-purchased-area": "ТЕХНОЭЛАСТМОСТ Б: фактически закупаемая площадь целых рулонов",
    "bridge:waterproofing:lpg": "Сжиженный газ для наплавления рулонной гидроизоляции",
    "bridge:waterproofing:primer-work": "Нанесение праймера на подготовленную мостовую плиту",
    "bridge:waterproofing:labor": "Труд звена укладки, наплавления и прикатки гидроизоляции",
    "bridge:waterproofing:torch-equipment": "Газопламенное оборудование для наплавления гидроизоляции",
    "bridge:waterproofing:hand-roller": "Ручной прикаточный ролик для швов и нахлёстов",
    "bridge:screed:reinforcement-mesh": "Сетка сварная А500С Ø6 мм, ячейка 100×100 мм, карта 2×3 м — расчётная масса нетто",
    "bridge:screed:reinforcement-mesh-cards": "Сетка сварная А500С Ø6 мм, 100×100 мм, карта 2×3 м (≈26,64 кг): раскладка с нахлёстом 200 мм и заказ целыми картами",
    "bridge:screed:reinforcement-mesh-purchased-area": "Сетка А500С Ø6 мм 100×100 мм: площадь закупленных карт с учётом нахлёстов, раскроя и округления",
    "bridge:screed:binding-wire": "Проволока вязальная для соединения арматурных сеток",
    "bridge:screed:spacers": "Фиксаторы арматуры «стойка» h=15 мм для горизонтальной сетки — расчётная потребность",
    "bridge:screed:spacer-packages": "Фиксаторы арматуры «стойка» h=15 мм, упаковка 500 шт.: заказ целыми упаковками",
    "bridge:screed:mesh-cover-compatibility": "Автопроверка размещения сетки в стяжке: свободный запас после фиксатора, двух пересекающихся стержней Ø6 и верхнего защитного слоя; отрицательное значение означает несовместимость",
    "bridge:screed:edge-form": "Многооборотная бортовая опалубка: ламинированная фанера 18 мм и брус 50×100 мм (аренда/оборотный комплект)",
    "bridge:screed:formwork-screw-boxes": "Саморезы конструкционные оцинкованные 6×80 мм для бортовой опалубки, коробка 200 шт.",
    "bridge:screed:formwork-stakes": "Колья бортовой опалубки из твёрдой древесины 50×50×600 мм",
    "bridge:screed:formwork-braces": "Подкосы бортовой опалубки из бруса 40×100 мм, длина 1,0 м",
    "bridge:screed:form-oil": "Смазка бортовой опалубки",
    "bridge:screed:reinforcement-labor": "Монтаж и фиксация сетки, проволоки и фиксаторов",
    "bridge:screed:reinforcement-delivery": "Доставка арматурной сетки и комплектующих",
    "bridge:screed:reinforcement-inspection": "Приёмка армирования и защитного слоя перед бетонированием",
    "bridge:asphalt:continuous-tack-emulsion": "Эмульсия битумная катионная для двух сплошных слоёв сцепления: стяжка/нижний асфальт и нижний/верхний асфальт; марка уточняется проектом",
    "bridge:asphalt:continuous-tack-work": "Очистка и равномерное нанесение слоя сцепления по всей площади двух интерфейсов",
    "bridge:asphalt:continuous-tack-distributor": "Распределитель битумной эмульсии для сплошной обработки двух интерфейсов",
    "bridge:leveling:applicability": "Применимость выравнивающего слоя: 0 м² допускается только после приёмки прочности, ровности и уклонов плиты; при необходимости укажите фактическую площадь",
    "bridge:leveling:ready-mix": "Товарный бетон выравнивающего слоя мостовой плиты — готовая смесь, класс и показатели стойкости по проекту",
    "bridge:leveling:work": "Устройство выравнивающего слоя с формированием проектных уклонов к водоотводу",
    "bridge:drainage:tubes": "Водоотводные трубки мостовой плиты по проектному узлу",
    "bridge:drainage:briquettes": "Дренажные брикеты у водоотводных трубок мостовой гидроизоляции",
    "bridge:drainage:detail-membrane": "ТЕХНОЭЛАСТМОСТ Б: дополнительные детали 1×1 м у водоотводных трубок — нетто, включено в общий заказ рулонов",
    "bridge:drainage:sealant-packages": "Герметик битумно-полимерный ТЕХНОНИКОЛЬ №42 для узлов водоотвода, ведро 12 кг — предварительная упаковка до сверки поставщика",
    "bridge:drainage:installation": "Монтаж водоотводных трубок и дренажных брикетов с интеграцией в гидроизоляцию",
    "bridge:joint:sealant": "Герметик битумно-полимерный горячего применения ТЕХНОНИКОЛЬ СОТА 75 по ГОСТ 30740 — масса нетто",
    "bridge:joint:sealant-packages": "Герметик ТЕХНОНИКОЛЬ СОТА 75, коробка 14 кг: заказ целыми упаковками",
    "bridge:joint:primer": "Совместимый битумный праймер контактных граней перед горячим герметиком СОТА",
    "bridge:joint:backer-cord": "Термостойкий закрытоячеистый ППЭ-шнур Ø25 мм для камеры шва 20 мм — длина нетто",
    "bridge:joint:backer-cord-coils": "Термостойкий закрытоячеистый ППЭ-шнур Ø25 мм, бухта 50 м: заказ целыми бухтами",
    "bridge:joint:installation": "Очистка, грунтование и герметизация сопряжений швов",
    "bridge:quality:waterproofing": "Контроль праймера, нахлёстов и сплошности гидроизоляции",
    "bridge:quality:survey": "Геодезический контроль отметок и поперечного уклона покрытия",
    "bridge:document:system-register": "Комплект журналов, паспортов, актов и протоколов мостового покрытия",
  };
  const source = bridgeSourcePack.sources.find((candidate) => candidate.sourceId === component.sourceId);
  const resourceGraph = {
    formulaId: component.formulaId,
    normalizedUom: component.unitId,
    semanticOwnerId: rowId,
    costOwner: costTreatment === "OWN_COST" ? "resource" : "scope",
    costTreatment,
    payable: costTreatment === "OWN_COST",
    noDoubleCount: true,
    primaryMeasureParameterId: "area_m2",
    preliminaryProfileId: BRIDGE_ASPHALT_COMPLETE_NORM_ID,
    completeBridgePavementSystem: true,
    ...(rowId === "bridge:joint:installation" ? {
      geometryBasisParameterIds: [
        "bridge_expansion_joint_count",
        "bridge_width_m",
      ],
      derivedDefaultRule: "bridge_expansion_joint_count * bridge_width_m; count is editable from the project joint schedule",
    } : {}),
    ...(rowId === "bridge:joint:backer-cord" || rowId === "bridge:joint:backer-cord-coils" ? {
      productSpecificationParameterIds: [
        "bridge_joint_width_mm",
        "bridge_joint_backer_cord_diameter_mm",
      ],
      productSelectionRule: "backer-cord diameter remains visible and must be checked against confirmed joint chamber width",
    } : {}),
    ...(rowId === "bridge:screed:reinforcement-mesh-cards" ? {
      layoutBasisParameterIds: [
        "bridge_length_m",
        "bridge_width_m",
        "bridge_mesh_card_length_m",
        "bridge_mesh_card_width_m",
        "bridge_mesh_lap_m",
      ],
      layoutRule: "minimum whole-card count across both 2x3 m orientations with the selected lap applied in both directions",
    } : {}),
    ...(rowId === "bridge:screed:mesh-cover-compatibility" ? {
      compatibilityParameterIds: [
        "protective_screed_thickness_mm",
        "bridge_spacer_height_mm",
        "bridge_mesh_bar_diameter_mm",
        "bridge_minimum_top_cover_mm",
      ],
      compatibilityRule: "clearance = screed thickness - spacer height - two crossing bar diameters - minimum top cover; negative is incompatible",
    } : {}),
    ...(rowId.startsWith("bridge:asphalt:continuous-tack") ? {
      distinctFromKrerIncidentalBitumen: true,
      interfaceCount: 2,
      fullAreaCoverageRequired: true,
    } : {}),
    ...(rowId.startsWith("bridge:leveling:") ? {
      applicabilityRule: "leveling area may remain zero only after acceptance of deck strength, flatness and drainage falls",
    } : {}),
    ...(rowId.startsWith("bridge:drainage:") ? {
      projectDrainageScheduleOverrides: true,
      preliminaryOutletSpacingIsNotUniversalNorm: true,
    } : {}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: component.sourceId.startsWith("manufacturer_tds:")
      ? "MANUFACTURER_SYSTEM_REQUIREMENT"
      : component.sourceId === "project_bridge_joint_detail"
        ? "VISIBLE_REPLACEABLE_PROJECT_DETAIL"
        : "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE",
    normativeTrace: [{
      sourceId: component.sourceId,
      source_id: component.sourceId,
      normId: BRIDGE_ASPHALT_COMPLETE_NORM_ID,
      norm_id: BRIDGE_ASPHALT_COMPLETE_NORM_ID,
      normVersion: "2026-09-23",
      source_title: source?.authority ?? BRIDGE_ASPHALT_COMPLETE_SOURCE_METADATA.source_title,
      exact_locator: source?.exactLocator ?? BRIDGE_ASPHALT_COMPLETE_SOURCE_METADATA.exact_locator,
    }],
  };
  const next = {
    id: `resource-${rowId.replace(/:/gu, "-")}`,
    row_id: rowId,
    ordinal,
    section: rowId.startsWith("bridge:waterproofing") ? "Гидроизоляция мостовой плиты"
      : rowId.startsWith("bridge:screed") ? "Защитная армированная стяжка"
        : rowId.startsWith("bridge:asphalt") ? "Межслойное сцепление асфальтобетона"
          : rowId.startsWith("bridge:leveling") ? "Выравнивание основания и уклоны"
            : rowId.startsWith("bridge:drainage") ? "Водоотвод мостовой плиты"
        : rowId.startsWith("bridge:joint") ? "Сопряжения деформационных швов"
          : rowId.startsWith("bridge:quality") ? "Контроль качества" : "Подготовка и документация",
    category,
    title_ru: titles[rowId] ?? component.specification,
    unit_id: component.unitId,
    formula_id: component.formulaId,
    inclusion_ast: component.condition === "leveling_area_positive"
      ? greaterThan("bridge_leveling_area_m2", 0)
      : TRUE,
    resource_graph: resourceGraph,
    procurement_eligible: category === "material" && costTreatment === "OWN_COST",
    cost_owner_id: costTreatment === "OWN_COST" ? rowId : null,
    source_metadata: sourceMetadata,
  };
  return { ...next, row_sha256: estimateDeterministicHash(next) } as CanonicalEstimateResourceDefinition;
}

const binderResources = ASPHALT_INSTALL_KRER27_RESOURCES.map((resource, ordinal) =>
  prefixedAsphaltResource("binder", resource, ordinal));
const wearingResources = ASPHALT_INSTALL_KRER27_RESOURCES.map((resource, ordinal) =>
  prefixedAsphaltResource("wearing", resource, binderResources.length + ordinal));
const screedResources = STRIP_POUR_PROFILE_RESOURCES.map((resource, ordinal) =>
  prefixedScreedResource(resource, binderResources.length + wearingResources.length + ordinal));
const bridgeResources = bridgeSourcePack.independentRequiredComponents.map((component, ordinal) =>
  localResource(component, binderResources.length + wearingResources.length + screedResources.length + ordinal));

export const BRIDGE_ASPHALT_COMPLETE_RESOURCES: readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  ...binderResources,
  ...wearingResources,
  ...screedResources,
  ...bridgeResources,
]);

function prefixCompletenessEntry(entry: Json, prefix: string, formulaPrefix: string): Json {
  const rowId = String(entry.resolution?.rowId ?? "");
  const parentRowId = String(entry.resolution?.parentRowId ?? "");
  return {
    ...entry,
    operationId: `${prefix}:${entry.operationId}`,
    expectedResourceId: `required-component:${prefix}:${entry.expectedResourceId}`,
    formulaId: entry.formulaId ? `${formulaPrefix}${entry.formulaId}` : null,
    resolution: {
      ...entry.resolution,
      ...(rowId ? { rowId: `${prefix}:${rowId}` } : {}),
      ...(parentRowId ? { parentRowId: `${prefix}:${parentRowId}` } : {}),
    },
  };
}

const asphaltCompleteness = (ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP.entries as readonly Json[])
  .flatMap((entry) => ([
    prefixCompletenessEntry(entry, "bridge:binder", "bridge_binder_"),
    prefixCompletenessEntry(entry, "bridge:wearing", "bridge_wearing_"),
  ]));
const screedCompleteness = (STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP.entries as readonly Json[])
  .filter((entry) => ![
    "required-component:excluded.reinforcement",
    "required-component:excluded.formwork",
  ].includes(String(entry.expectedResourceId)))
  .map((entry) => {
    const prefixed = prefixCompletenessEntry(entry, "bridge:screed", "bridge_screed_");
    if (prefixed.resolution?.kind === "NOT_APPLICABLE") return prefixed;
    return {
      ...prefixed,
      formulaId: prefixed.formulaId,
      resolution: {
        ...prefixed.resolution,
        rowId: String(prefixed.resolution.rowId).replace("bridge:screed:strip-pour:", "bridge:screed:"),
        ...(prefixed.resolution.parentRowId ? {
          parentRowId: String(prefixed.resolution.parentRowId).replace("bridge:screed:strip-pour:", "bridge:screed:"),
        } : {}),
      },
    };
  });
const bridgeCompleteness = bridgeSourcePack.independentRequiredComponents.map((component) => ({
  ...component,
  expectedResourceId: `required-component:${component.semanticKey}`,
}));

export const BRIDGE_ASPHALT_COMPLETE_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "TECHNOLOGY_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: BRIDGE_ASPHALT_COMPLETE_SOURCE_PACK_SHA256,
  sourcePackPath: "data/estimate-benchmarks/source-packs/bridge-asphalt-complete-preliminary-profile-r1.json",
  componentMaps: [
    ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP.sourcePackPath,
    STRIP_POUR_INDEPENDENT_COMPLETENESS_MAP.sourcePackPath,
  ],
  entries: [...asphaltCompleteness, ...screedCompleteness, ...bridgeCompleteness],
});

export async function compileBridgeAsphaltCompletePreliminaryProfileR1(
  submittedParameters: Record<string, unknown>,
): Promise<CanonicalEstimateCompileCoreResult> {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.bridge-asphalt-complete-preliminary-profile-r1",
    catalogId: BRIDGE_ASPHALT_COMPLETE_CATALOG_ID,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...BRIDGE_ASPHALT_COMPLETE_PARAMETERS],
    formulaDefinitions: [...BRIDGE_ASPHALT_COMPLETE_FORMULAS],
    resourceDefinitions: [...BRIDGE_ASPHALT_COMPLETE_RESOURCES],
    submittedParameters,
    confirmedParameters: BRIDGE_ASPHALT_COMPLETE_RUNTIME_INPUT,
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: BRIDGE_ASPHALT_COMPLETE_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}

export const BRIDGE_ASPHALT_COMPLETE_PROFILE_SUMMARY = Object.freeze({
  sourceId: BRIDGE_ASPHALT_COMPLETE_SOURCE_ID,
  normId: BRIDGE_ASPHALT_COMPLETE_NORM_ID,
  composedRows: {
    binderCourse: binderResources.length,
    wearingCourse: wearingResources.length,
    protectiveScreedPlacement: screedResources.length,
    bridgeSpecific: bridgeResources.length,
    total: BRIDGE_ASPHALT_COMPLETE_RESOURCES.length,
  },
  assumptionPolicy: PROFILE.assumptionPolicy,
});
