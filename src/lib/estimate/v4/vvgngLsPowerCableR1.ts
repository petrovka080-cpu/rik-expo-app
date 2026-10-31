import wholeCableSourceR919 from '../../../../data/estimate-benchmarks/source-packs/vvgng-ls-power-cable-whole-current-r919-r1.json';
import {buildAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionDefinitionR1';
import {buildMasterParameterCalculationConsumers} from '../backendPlatform/canonicalDefinitionParameterConsumersR1';
import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";
import sourcePack from '../../../../data/estimate-benchmarks/source-packs/vvgng-ls-power-cable-balanced-s27-23.json';
import {unresolvedApplicationNormTruthR1} from './automaticConstructionOwnerR1';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import type {CanonicalEstimateOperationReference} from '../backendPlatform/canonicalEstimateOperationComposition';

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;
export const VVGNG_LS_POWER_CABLE_OPERATION_SOURCE=sourcePack.operationComposition;
const operationSource=VVGNG_LS_POWER_CABLE_OPERATION_SOURCE;

export const VVGNG_LS_POWER_CABLE_CATALOG_ID =
  "canonical-work:base:electrical_interior_vvg_cable_lay_standard";
export const VVGNG_LS_POWER_CABLE_SOURCE_ID =
  "s2723_krerm_guidance_and_project_vvgng_ls_power_cable_package_v2";
export const VVGNG_LS_POWER_CABLE_NORM_ID =
  "norm:kg:krerm-2015-guidance-2.9.2:project-vvgng-ls-package:v2";

export const VVGNG_LS_POWER_CABLE_SOURCE_METADATA = Object.freeze({
  source_title: "КРЕРм-2015: Указания по применению; утверждённый кабельный журнал, план трассы, ППР, ведомость оконцеваний, проходки и программа электроизмерений",
  source_authority: "Министерство строительства Кыргызской Республики; проектная электротехническая организация и утверждающий инженер проекта",
  source_document_version:
    "KG_KRERM_2015_GUIDANCE_CAPTURE_2026_10_01_AND_PROJECT_CABLE_PACKAGE_REVISION_EXPLICIT",
  definition_hash: "a0c3a8684c66a3d7ce5b30b5340562972e11f6a0df92a2240770af46fdae2c54",
  exact_locator: "КРЕРм-2015, Указания по применению, п. 2.9.2: кабель и проектно-зависимые материалы определяются по проектным данным с учётом трудноустранимых потерь и отходов; проектный кабельный журнал и план трассы; ППР и ведомость трудовых/машинных ресурсов; ведомость вводов и оконцеваний; проходки; программа измерения изоляции и непрерывности PE",
  use_restriction: "Известная длина маршрута определяет чистую установленную длину. Потери, сохраняемый резерв и кратность заказа показаны как видимые заменяемые предварительные значения 0%, 0 м и 1 м; труд, машины, логистика, маркеры, крепёж, вводы, наконечники, огнезащитный состав и испытания принимаются только из ППР, проекта и QA-документов. Щит и полная система электроснабжения не включаются.",
  source_kind: "OFFICIAL_NORMATIVE_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE",
  official_url:
    "https://minstroy.gov.kg/ru/state_program/download-pdf/montazoborudovania-62169004e91aaf866.70682138.pdf",
  artifact_sha256: "a0c3a8684c66a3d7ce5b30b5340562972e11f6a0df92a2240770af46fdae2c54",
  projectAuthenticated:false,sourceAuthorityPromoted:false,actualProjectDocumentSha256:null,
});

const CONDITIONAL_DETAILS = new Set([
  "clamp_quantity_piece",
  "cable_tray_designation", "cable_tray_length_m",
  "protective_pipe_designation", "protective_pipe_length_m",
  "pulling_lubricant_designation", "pulling_lubricant_quantity_kg",
]);
const OPTIONAL_PRODUCT_DESIGNATIONS = new Set([
  "marker_designation", "clamp_designation", "gland_designation",
  "lug_designation", "firestop_designation", "test_designation",
]);
const PARAMETER_SPECS = Object.freeze([
  ["length_m", "Длина маршрута кабеля", "decimal", "m", null],
  ["cable_mark", "Марка силового кабеля", "text", null, null],
  ["core_count", "Количество жил кабеля", "integer", "pcs", null],
  ["conductor_area_mm2", "Сечение одной жилы", "decimal", "mm2", null],
  ["cable_expected_loss_ratio", "Ожидаемые технологические потери кабеля", "decimal", "ratio", null],
  ["cable_retained_reserve_m", "Сохраняемый резерв кабеля", "decimal", "m", null],
  ["cable_supplier_cut_increment_m", "Кратность заказа кабеля у поставщика", "decimal", "m", null],
  ["marker_designation", "Кабельная бирка по кабельному журналу", "text", null, null],
  ["marker_quantity_piece", "Количество кабельных бирок", "decimal", "pcs", null],
  ["clamp_designation", "Безгалогенный крепёж по раскладке", "text", null, null],
  ["clamp_quantity_piece", "Количество креплений кабеля", "decimal", "pcs", null],
  ["gland_designation", "Кабельный ввод по ведомости подключений", "text", null, null],
  ["gland_quantity_piece", "Количество кабельных вводов", "decimal", "pcs", null],
  ["lug_designation", "Медный наконечник 6 мм² по схеме оконцевания", "text", null, null],
  ["lug_quantity_piece", "Количество кабельных наконечников", "decimal", "pcs", null],
  ["firestop_designation", "Огнезащитный состав по паспорту проходки", "text", null, null],
  ["firestop_quantity_kg", "Масса огнезащитного состава", "decimal", "kg", null],
  ["test_designation", "Измерение изоляции и непрерывности PE по программе", "text", null, null],
  ["test_count", "Количество комплектов электроизмерений", "decimal", "test", null],
  ["cable_tray_mode", "Кабельный лоток требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["cable_tray_designation", "Кабельный лоток по проекту", "text", null, null],
  ["cable_tray_length_m", "Длина кабельного лотка", "decimal", "m", null],
  ["protective_pipe_mode", "Защитная труба требуется по проекту", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["protective_pipe_designation", "Защитная труба по проекту", "text", null, null],
  ["protective_pipe_length_m", "Длина защитной трубы", "decimal", "m", null],
  ["pulling_lubricant_mode", "Смазка для протяжки требуется по ППР", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["pulling_lubricant_designation", "Смазка для протяжки по ППР", "text", null, null],
  ["pulling_lubricant_quantity_kg", "Масса смазки для протяжки", "decimal", "kg", null],
  ["cable_installation_labor_h", "Труд электромонтажников по ППР", "decimal", "man_hour", null],
  ["cable_testing_labor_h", "Труд электролаборатории по программе испытаний", "decimal", "man_hour", null],
  ["cable_reel_stand_machine_h", "Работа стойки или устройства размотки кабеля", "decimal", "machine_hour", null],
  ["cable_pulling_device_machine_h", "Работа устройства контролируемой протяжки кабеля", "decimal", "machine_hour", null],
  ["cable_crimp_tool_machine_h", "Работа инструмента опрессовки наконечников", "decimal", "machine_hour", null],
  ["installation_tester_machine_h", "Работа измерительного комплекта электроустановки", "decimal", "machine_hour", null],
  ["cable_delivery_trip_count", "Рейсы доставки кабеля и комплектующих", "integer", "trip", null],
  ["cable_waste_removal_trip_count", "Рейсы вывоза упаковки и отходов", "integer", "trip", null],
  ["cable_fixing_mode", "Применимость новых креплений кабеля по принятой раскладке", "enum", null,
    ["PROJECT_CABLE_FIXINGS_REQUIRED", "NO_NEW_CABLE_FIXINGS_IN_ACCEPTED_EXISTING_SYSTEM"]],
  ["cable_fixing_layout_reference", "Документ раскладки креплений или принятого существующего несущего узла", "text", null, null],
] as const);
const KNOWN_SCOPE = ["length_m", "cable_mark", "core_count", "conductor_area_mm2"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "cable_expected_loss_ratio", "cable_retained_reserve_m", "cable_supplier_cut_increment_m",
]);

function conditionalConstraints(parameterId: string): Json {
  if(['clamp_designation','clamp_quantity_piece'].includes(parameterId))return{
    requiredWhen:{kind:'equals',parameterId:'cable_fixing_mode',value:operationSource.fixingApplicability.requiredValue},
    forbiddenWhen:{kind:'equals',parameterId:'cable_fixing_mode',value:operationSource.fixingApplicability.existingSystemValue},
  };
  const branch = parameterId.startsWith("cable_tray_")
    ? "cable_tray_mode"
    : parameterId.startsWith("protective_pipe_")
      ? "protective_pipe_mode"
      : parameterId.startsWith("pulling_lubricant_")
        ? "pulling_lubricant_mode"
        : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type VvgngLsPowerCableParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number; unit_id: string | null; title_ru: string; truth_metadata: Json;
};
const declaredParameters:
readonly VvgngLsPowerCableParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: parameterId==='cable_mark'?'enum':['marker_quantity_piece','clamp_quantity_piece','gland_quantity_piece','lug_quantity_piece','test_count'].includes(parameterId)?'integer':valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId)
      && !OPTIONAL_PRODUCT_DESIGNATIONS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(parameterId==='cable_mark'?{values:['ВВГнг(А)-LS']}:enumValues
        ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            && parameterId !== "cable_supplier_cut_increment_m"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
      ...(parameterId==='core_count'?{min:5,max:5}:parameterId==='conductor_area_mm2'?{min:6,max:6}:{}),
      ...(['cable_delivery_trip_count','cable_waste_removal_trip_count'].includes(parameterId)?{min:0}:{}),
    },
    truth_metadata: {
      contract: "rik-expo-app.vvgng-ls-power-cable-r1",
      semantic_parameter_key: `vvgng-ls-power-cable:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: KNOWN_SCOPE.includes(parameterId)
        ? "USER_INPUT"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
          : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: KNOWN_SCOPE.includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
          ? "VISIBLE_PRELIMINARY_PROCUREMENT_BALANCE"
          : "APPROVED_CABLE_ROUTE_TERMINATION_FIRESTOP_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      projectAuthenticated:false,sourceAuthorityPromoted:false,
      ...(!VISIBLE_PRELIMINARY_PROFILE.has(parameterId)?{provenance:{consumer_input_role_v1:'OBJECT_FACT'}}:{}),
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "length_m"
          ? "Укажите чистую длину маршрута по плану трассы; запас добавляется только отдельным подтверждённым значением."
          : KNOWN_SCOPE.includes(parameterId)
            ? `${titleRu}: укажите по кабельному журналу и маркировке кабеля.`
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? `${titleRu}: предварительно принято видимое нейтральное значение; замените по проекту, плану раскроя и условиям поставщика.`
            : `${titleRu}: укажите по кабельному журналу, узлу, ведомости оконцеваний или программе измерений.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_CABLE_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "ACTUAL_PROJECT_DOCUMENT_REQUIRES_SERVER_BINDING",
        source_document: VVGNG_LS_POWER_CABLE_SOURCE_ID,
        source_locator: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.exact_locator,
        guide_version: "vvgng-ls-power-cable-s27-23-r2",
        guidance_reference_sha256: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для прокладки ВВГнг(А)-LS 5×6 мм² по указанному маршруту; щит и полная система электроснабжения здания не включаются.",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);
export const VVGNG_LS_POWER_CABLE_PARAMETERS:readonly VvgngLsPowerCableParameter[]=Object.freeze([
  ...declaredParameters,
  ...operationSource.needs.map((need,i)=>({parameter_id:need.parameterId,ordinal:declaredParameters.length+i,
    value_type:'decimal',unit_id:null,title_ru:need.publicNameRu,required:false,default_value:null,constraints_json:null,
    truth_metadata:{...unresolvedApplicationNormTruthR1({},need.missingFacts),projectAuthenticated:false,sourceAuthorityPromoted:false}})),
]);

export const VVGNG_LS_POWER_CABLE_RUNTIME_INPUT = Object.freeze({
  cable_expected_loss_ratio: 0,
  cable_retained_reserve_m: 0,
  cable_supplier_cut_increment_m: 1,
});
export const VVGNG_LS_POWER_CABLE_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(VVGNG_LS_POWER_CABLE_RUNTIME_INPUT).map((parameterId) => [
    parameterId, "ASSUMPTION",
  ])) as Readonly<Record<string, "ASSUMPTION">>,
);
export const VVGNG_LS_POWER_CABLE_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(VVGNG_LS_POWER_CABLE_RUNTIME_INPUT).map((parameterId) => [
    parameterId, [VVGNG_LS_POWER_CABLE_SOURCE_ID],
  ])) as Readonly<Record<string, readonly string[]>>,
);

function formula(formulaId: string, outputUnitId: string, expression: string) {
  const compiled = compileFormulaGraph(expression);
  return { formula_id: formulaId, output_unit_id: outputUnitId, expression_source: expression,
    ast: compiled.ast, input_parameter_ids: compiled.inputParameterIds,
    ast_sha256: estimateDeterministicHash(compiled.ast) };
}
export const VVGNG_LS_POWER_CABLE_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("vvgng_ls_cable_lay_length_v1", "m", "length_m"),
  formula("vvgng_a_ls_5x6_cable_net_length_v1", "m", "length_m"),
  formula("vvgng_a_ls_5x6_cable_expected_loss_v2", "m",
    "length_m*cable_expected_loss_ratio"),
  formula("vvgng_a_ls_5x6_cable_retained_reserve_v2", "m", "cable_retained_reserve_m"),
  formula("vvgng_a_ls_5x6_cable_total_need_v2", "m",
    "length_m+length_m*cable_expected_loss_ratio+cable_retained_reserve_m"),
  formula("vvgng_a_ls_5x6_cable_order_length_v2", "m",
    "ceil((length_m+length_m*cable_expected_loss_ratio+cable_retained_reserve_m)/cable_supplier_cut_increment_m)*cable_supplier_cut_increment_m"),
  formula("vvgng_a_ls_5x6_cable_remainder_v2", "m",
    "ceil((length_m+length_m*cable_expected_loss_ratio+cable_retained_reserve_m)/cable_supplier_cut_increment_m)*cable_supplier_cut_increment_m-length_m-length_m*cable_expected_loss_ratio"),
  formula("vvgng_a_ls_5x6_cable_surplus_v2", "m",
    "max(0,ceil((length_m+length_m*cable_expected_loss_ratio+cable_retained_reserve_m)/cable_supplier_cut_increment_m)*cable_supplier_cut_increment_m-length_m-length_m*cable_expected_loss_ratio-cable_retained_reserve_m)"),
  formula("fire_resistant_cable_marker_quantity_v1", "pcs", "marker_quantity_piece"),
  formula("halogen_free_cable_clamp_quantity_v1", "pcs", "clamp_quantity_piece"),
  formula("cable_gland_for_5x6_quantity_v1", "pcs", "gland_quantity_piece"),
  formula("copper_lug_6mm2_quantity_v1", "pcs", "lug_quantity_piece"),
  formula("firestop_cable_compound_quantity_v1", "kg", "firestop_quantity_kg"),
  formula("power_cable_test_count_v1", "test", "test_count"),
  formula("cable_tray_length_v1", "m", "cable_tray_length_m"),
  formula("cable_protective_pipe_length_v1", "m", "protective_pipe_length_m"),
  formula("cable_pulling_lubricant_quantity_v1", "kg", "pulling_lubricant_quantity_kg"),
  formula("vvgng_ls_cable_installation_labor_v2", "man_hour", "cable_installation_labor_h"),
  formula("vvgng_ls_cable_testing_labor_v2", "man_hour", "cable_testing_labor_h"),
  formula("vvgng_ls_cable_reel_stand_v2", "machine_hour", "cable_reel_stand_machine_h"),
  formula("vvgng_ls_cable_pulling_device_v2", "machine_hour", "cable_pulling_device_machine_h"),
  formula("vvgng_ls_cable_crimp_tool_v2", "machine_hour", "cable_crimp_tool_machine_h"),
  formula("vvgng_ls_installation_tester_v2", "machine_hour", "installation_tester_machine_h"),
  formula("vvgng_ls_cable_delivery_v2", "trip", "cable_delivery_trip_count"),
  formula("vvgng_ls_cable_waste_removal_v2", "trip", "cable_waste_removal_trip_count"),
  ...operationSource.needs.map(need=>formula(need.formulaId,'',need.parameterId)),
]);
const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

function resource(input: {
  rowId: string; ordinal: number; section: string; category: string; titleRu: string;
  unitId: string; formulaId: string; inclusionAst?: Json; procurementEligible: boolean;
  titleParameterIds?: string[]; sourceRole: string;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
  parentRowId?: string;
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId, normalizedUom: input.unitId,
    semanticOwnerId: `vvgng-ls-power-cable:${input.rowId}`, costOwner: "resource",
    ...(input.titleParameterIds ? { titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND", titleSpecificationSeparator: " — " } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
    costTreatment: input.costTreatment ?? "OWN_COST",
    ...(input.parentRowId ? { parentRowId: input.parentRowId } : {}),
    ...(input.rowId==='rc09:halogen_free_cable_clamp'?{inputParameterIds:['cable_fixing_mode','cable_fixing_layout_reference']}:{}),
    ...(['vvgng:logistics:delivery','vvgng:logistics:waste-removal'].includes(input.rowId)?{excludeKnownZeroQuantityV1:true}:{}),
  };
  const sourceMetadata = {
    truth_contract_version: "R3", synthetic: false, sourceRole: input.sourceRole,
    normativeTrace: [{ sourceId: VVGNG_LS_POWER_CABLE_SOURCE_ID,
      source_id: VVGNG_LS_POWER_CABLE_SOURCE_ID, normId: VVGNG_LS_POWER_CABLE_NORM_ID,
      norm_id: VVGNG_LS_POWER_CABLE_NORM_ID,
      normVersion: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.source_document_version,
      source_title: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.source_title,
      exact_locator: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.exact_locator,
      source_definition_hash: VVGNG_LS_POWER_CABLE_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole }],
    excludedUnownedAssumptions: [
      "automatic cable reserve", "automatic marker or clamp spacing",
      "automatic glands, lugs, penetration compound or test count",
      "automatic tray, protective pipe or pulling lubricant",
      "switchboard or full building power system", "invented price",
    ],
  };
  return { id: `resource-${input.rowId.replace(/:/gu, "-")}`, row_id: input.rowId,
    ordinal: input.ordinal, section: input.section, category: input.category,
    title_ru: input.titleRu, unit_id: input.unitId, formula_id: input.formulaId,
    inclusion_ast: input.inclusionAst ?? literalTrue, resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible, cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }) };
}

const declaredResources:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:vvgng_ls_cable_lay", ordinal: 0, section: "Технологическая операция", category: "construction_work", titleRu: "Комплекс прокладки ВВГнг(А)-LS 5×6 мм²: размотка, протяжка, крепление, маркировка, оконцевание и проходки", unitId: "m", formulaId: "vvgng_ls_cable_lay_length_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_CABLE_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:vvgng_a_ls_5x6_cable", ordinal: 1, section: "Закупка кабеля", category: "material", titleRu: "Кабель силовой ВВГнг(А)-LS 5×6 мм² — заказная длина", unitId: "m", formulaId: "vvgng_a_ls_5x6_cable_order_length_v2", procurementEligible: true, sourceRole: "VISIBLE_PROCUREMENT_BALANCE" }),
  resource({ rowId: "rc09:fire_resistant_cable_marker", ordinal: 2, section: "Материалы", category: "material", titleRu: "Бирка кабельная негорючая с маркировкой линии", unitId: "pcs", formulaId: "fire_resistant_cable_marker_quantity_v1", procurementEligible: true, titleParameterIds: ["marker_designation"], sourceRole: "APPROVED_CABLE_SCHEDULE" }),
  resource({ rowId: "rc09:halogen_free_cable_clamp", ordinal: 3, section: "Материалы", category: "material", titleRu: "Крепление кабеля безгалогенное по раскладке", unitId: "pcs", formulaId: "halogen_free_cable_clamp_quantity_v1", inclusionAst:equals('cable_fixing_mode',operationSource.fixingApplicability.requiredValue), procurementEligible: true, titleParameterIds: ["clamp_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
  resource({ rowId: "rc09:cable_gland_for_5x6", ordinal: 4, section: "Материалы", category: "material", titleRu: "Ввод кабельный герметичный под кабель 5×6 мм²", unitId: "pcs", formulaId: "cable_gland_for_5x6_quantity_v1", procurementEligible: true, titleParameterIds: ["gland_designation"], sourceRole: "APPROVED_TERMINATION_SCHEDULE" }),
  resource({ rowId: "rc09:copper_lug_6mm2", ordinal: 5, section: "Материалы", category: "material", titleRu: "Наконечник кабельный медный лужёный 6 мм²", unitId: "pcs", formulaId: "copper_lug_6mm2_quantity_v1", procurementEligible: true, titleParameterIds: ["lug_designation"], sourceRole: "APPROVED_TERMINATION_SCHEDULE" }),
  resource({ rowId: "rc09:firestop_cable_penetration_compound", ordinal: 6, section: "Материалы", category: "material", titleRu: "Состав огнезащитный для кабельных проходок", unitId: "kg", formulaId: "firestop_cable_compound_quantity_v1", procurementEligible: true, titleParameterIds: ["firestop_designation"], sourceRole: "APPROVED_FIRESTOP_DETAIL" }),
  resource({ rowId: "rc09:power_cable_insulation_continuity_test", ordinal: 7, section: "Контроль", category: "service", titleRu: "Измерение сопротивления изоляции и непрерывности PE-проводника", unitId: "test", formulaId: "power_cable_test_count_v1", procurementEligible: false, titleParameterIds: ["test_designation"], sourceRole: "APPROVED_QA_PLAN", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:cable_tray", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Кабельный лоток по проекту", unitId: "m", formulaId: "cable_tray_length_v1", inclusionAst: equals("cable_tray_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["cable_tray_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
  resource({ rowId: "rc09:cable_protective_pipe", ordinal: 9, section: "Условные материалы", category: "material", titleRu: "Защитная труба кабеля по проекту", unitId: "m", formulaId: "cable_protective_pipe_length_v1", inclusionAst: equals("protective_pipe_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["protective_pipe_designation"], sourceRole: "APPROVED_ROUTE_LAYOUT" }),
  resource({ rowId: "rc09:cable_pulling_lubricant", ordinal: 10, section: "Условные материалы", category: "material", titleRu: "Смазка для протяжки кабеля по ППР", unitId: "kg", formulaId: "cable_pulling_lubricant_quantity_v1", inclusionAst: equals("pulling_lubricant_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["pulling_lubricant_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "vvgng:balance:installed-net-length", ordinal: 11, section: "Баланс кабеля", category: "material", titleRu: "Чистая установленная длина кабеля", unitId: "m", formulaId: "vvgng_a_ls_5x6_cable_net_length_v1", procurementEligible: false, sourceRole: "USER_SUPPLIED_OR_APPROVED_CABLE_SCOPE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "vvgng:balance:expected-loss", ordinal: 12, section: "Баланс кабеля", category: "material", titleRu: "Ожидаемые технологические потери кабеля", unitId: "m", formulaId: "vvgng_a_ls_5x6_cable_expected_loss_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "vvgng:balance:retained-reserve", ordinal: 13, section: "Баланс кабеля", category: "material", titleRu: "Сохраняемый резерв кабеля", unitId: "m", formulaId: "vvgng_a_ls_5x6_cable_retained_reserve_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "vvgng:balance:total-need", ordinal: 14, section: "Баланс кабеля", category: "material", titleRu: "Общая потребность: монтаж + потери + сохраняемый резерв", unitId: "m", formulaId: "vvgng_a_ls_5x6_cable_total_need_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "vvgng:balance:remainder-after-installation-loss", ordinal: 15, section: "Баланс кабеля", category: "material", titleRu: "Остаток после монтажа и ожидаемых потерь", unitId: "m", formulaId: "vvgng_a_ls_5x6_cable_remainder_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "vvgng:balance:surplus-beyond-reserve", ordinal: 16, section: "Баланс кабеля", category: "material", titleRu: "Свободный остаток сверх сохраняемого резерва", unitId: "m", formulaId: "vvgng_a_ls_5x6_cable_surplus_v2", procurementEligible: false, sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "vvgng:labor:installation", ordinal: 17, section: "Труд", category: "construction_work", titleRu: "Труд электромонтажников: подготовка, прокладка, крепление, маркировка, оконцевание и проходки", unitId: "man_hour", formulaId: "vvgng_ls_cable_installation_labor_v2", procurementEligible: false, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "vvgng:labor:testing", ordinal: 18, section: "Труд", category: "construction_work", titleRu: "Труд электролаборатории по измерению изоляции и непрерывности PE", unitId: "man_hour", formulaId: "vvgng_ls_cable_testing_labor_v2", procurementEligible: false, sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "vvgng:equipment:reel-stand", ordinal: 19, section: "Машины и механизмы", category: "equipment", titleRu: "Стойка или устройство контролируемой размотки кабеля", unitId: "machine_hour", formulaId: "vvgng_ls_cable_reel_stand_v2", procurementEligible: true, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "vvgng:equipment:pulling-device", ordinal: 20, section: "Машины и механизмы", category: "equipment", titleRu: "Устройство контролируемой протяжки кабеля", unitId: "machine_hour", formulaId: "vvgng_ls_cable_pulling_device_v2", procurementEligible: true, sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "vvgng:equipment:crimp-tool", ordinal: 21, section: "Инструмент", category: "equipment", titleRu: "Инструмент опрессовки кабельных наконечников", unitId: "machine_hour", formulaId: "vvgng_ls_cable_crimp_tool_v2", procurementEligible: true, sourceRole: "APPROVED_TERMINATION_SCHEDULE" }),
  resource({ rowId: "vvgng:equipment:installation-tester", ordinal: 22, section: "Контроль", category: "equipment", titleRu: "Измерительный комплект для сопротивления изоляции и непрерывности PE", unitId: "machine_hour", formulaId: "vvgng_ls_installation_tester_v2", procurementEligible: true, sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "vvgng:logistics:delivery", ordinal: 23, section: "Логистика", category: "service", titleRu: "Доставка кабеля, комплектующих и инструмента на объект", unitId: "trip", formulaId: "vvgng_ls_cable_delivery_v2", procurementEligible: true, sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "vvgng:logistics:waste-removal", ordinal: 24, section: "Логистика", category: "service", titleRu: "Сбор и вывоз упаковки, обрезков и отходов кабельных работ", unitId: "trip", formulaId: "vvgng_ls_cable_waste_removal_v2", procurementEligible: true, sourceRole: "APPROVED_WASTE_PLAN" }),
]);
function operationReference(key:string):CanonicalEstimateOperationReference{
  const op=operationSource.operations.find(o=>o.key===key);if(!op)throw Error('VVGNG_EXACT_OPERATION_SOURCE_KEY_REQUIRED:'+key);
  const{key:_key,...reference}=op;return reference as CanonicalEstimateOperationReference;
}
export const VVGNG_LS_POWER_CABLE_RESOURCES:readonly CanonicalEstimateResourceDefinition[]=Object.freeze([
  ...declaredResources,
  ...operationSource.needs.map((need,i)=>({...resource({rowId:need.rowId,ordinal:declaredResources.length+i,section:'Нерассчитанное обеспечение кабельной линии',
    category:need.resourceKind==='PPE'?'equipment':need.resourceKind==='ACCESSORY'?'material':'equipment',titleRu:need.publicNameRu,unitId:'',formulaId:need.formulaId,
    procurementEligible:false,sourceRole:'UNRESOLVED_APPLICATION_NORM',costTreatment:'INFORMATIONAL_SCOPE'}),cost_owner_id:null})),
].map(row=>{
  const binding=operationSource.bindings.find(b=>b.rowId===row.row_id),need=operationSource.needs.find(n=>n.rowId===row.row_id);
  const counter=operationSource.sourceDeclaredCounterRowIds.includes(row.row_id);
  if(!binding&&!counter)throw Error('VVGNG_INDEPENDENT_ROW_CLASSIFICATION_REQUIRED:'+row.row_id);
  const operations=binding?.roles.map(operationReference)??[operationReference('supply')];
  const{row_sha256:_hash,...body}=row;
  const result={...body,resource_graph:{...row.resource_graph,
    ...(['vvgng:labor:installation','vvgng:labor:testing','vvgng:equipment:reel-stand','vvgng:equipment:pulling-device',
      'vvgng:equipment:crimp-tool','vvgng:equipment:installation-tester','vvgng:logistics:delivery','vvgng:logistics:waste-removal'].includes(row.row_id)
      ?{retainedProjectPriceScopeV1:{accepted:false,quoteNonoverlapAuthenticated:false,separateOperatorCountAuthored:false,
        meaning:'Actual PPR, whole equipment/service BOM and quote coverage are required; no allocation or second operator price is inferred.'}}:{}),
    operationCompositionV1:{...operations[0],additionalOperations:operations.slice(1)},
    publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:row.title_ru,
      nameRu:binding?.publicNameRu??row.title_ru,...(counter?{rowKind:'CALCULATION_DETAIL'}:{resourceKind:binding!.resourceKind}),brandAndModelRu:null,specificationRu:null,
      detailsRu:need?[need.missingFacts]:['Количество берётся из существующей формулы и принятого документа; повторный показ не создаёт новую оплату или закупку.']},
    ...(counter?{calculationDetailV1:true}:{}),
  },source_metadata:{...row.source_metadata,sourceAuthorityPromoted:false,projectAuthenticated:false,full_technical_acceptance:false,
    ...(binding?.heldTechnicalEvidenceIds.length?{heldTechnicalEvidenceV1:{status:'SOURCE_HELD_NOT_ACTUAL_METHOD_SELECTION',
      artifactIds:binding.heldTechnicalEvidenceIds,sourcePackId:VVGNG_LS_POWER_CABLE_SOURCE_ID,
      actualContactMethodSelected:false,actualQaProgramSelected:false,existingQuoteCoverageAuthenticated:false,
      quantityOrUnitNormCreated:false}}:{}),
    ...(need?{sourceRole:'UNRESOLVED_APPLICATION_NORM',normativeTrace:[],sourceNormQuantityAccepted:false,quantityUnitUnconfirmed:true,
      unresolvedActualMethodFactsV1:need.missingFacts,separatePaymentOwnerCreated:false}:{}),
  }};return{...result,row_sha256:estimateDeterministicHash(result)};
}));
export function vvgngLsPowerCableIndependentCompositionR1(){
  return{contract:'rik-expo-app.s26-3.independent-completeness-map.v1',sourceKind:'PROJECT_SYSTEM',generatedFromCurrentRows:false,
    evidenceSha256:canonicalEstimateSha256HexText(canonicalEstimateStableJson(operationSource)),operationResourceBindingRequired:true,
    operationRoster:operationSource.operations.map(({key:_key,...op})=>op),operationRequirements:operationSource.operationRequirements,
    entries:[...operationSource.bindings.map(binding=>({expectedResourceId:binding.rowId,sourceId:VVGNG_LS_POWER_CABLE_SOURCE_ID,
      operationId:operationReference(binding.roles[0]).operationId,requiredOperationIds:binding.roles.map(key=>operationReference(key).operationId),
      category:binding.resourceKind==='LABOR'?'construction_work':['TOOL','EQUIPMENT','MECHANISM','PPE'].includes(binding.resourceKind)?'equipment':['SERVICE','TRANSPORT'].includes(binding.resourceKind)?'service':'material',resourceKind:binding.resourceKind,publicNameRu:binding.publicNameRu,
      unitId:binding.unitId,...('quantityUnitUnconfirmed'in binding?{quantityUnitUnconfirmed:binding.quantityUnitUnconfirmed}:{}),
      formulaId:binding.formulaId,quantityRule:binding.quantityRule,condition:sourcePack.scope,resolution:{kind:'ROW',rowId:binding.rowId}})),
    ...operationSource.sourceDeclaredCounterRowIds.map(rowId=>({expectedResourceId:'counter:'+rowId,sourceId:VVGNG_LS_POWER_CABLE_SOURCE_ID,
      operationId:operationReference('supply').operationId,condition:sourcePack.scope,calculationDetailRowId:rowId,resolution:{kind:'NOT_APPLICABLE',reasonRu:'Явное арифметическое представление, не второй физический кабель и не новая закупочная позиция.'}}))],
    fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false,sourceAuthorityPromoted:false,projectAuthenticated:false};
}

export const VVGNG_LS_POWER_CABLE_SHORT_INPUT = Object.freeze({
  length_m: 150, cable_mark: "ВВГнг(А)-LS", core_count: 5, conductor_area_mm2: 6,
});
export const VVGNG_LS_POWER_CABLE_ACCEPTANCE_INPUT = Object.freeze({
  ...VVGNG_LS_POWER_CABLE_SHORT_INPUT,
  ...VVGNG_LS_POWER_CABLE_RUNTIME_INPUT,
  marker_designation: "Негорючая кабельная бирка по кабельному журналу", marker_quantity_piece: 12,
  clamp_designation: "Безгалогенный крепёж по раскладке трассы", clamp_quantity_piece: 300,
  gland_designation: "Герметичный ввод под ВВГнг(А)-LS 5×6 мм²", gland_quantity_piece: 3,
  lug_designation: "Медный лужёный наконечник 6 мм² по схеме", lug_quantity_piece: 11,
  firestop_designation: "Огнезащитный состав по паспорту проходки", firestop_quantity_kg: 3.75,
  test_designation: "Измерение изоляции и непрерывности PE по программе", test_count: 3,
  cable_tray_mode: "NOT_REQUIRED", protective_pipe_mode: "NOT_REQUIRED",
  pulling_lubricant_mode: "NOT_REQUIRED",
  cable_installation_labor_h: 24,
  cable_testing_labor_h: 3,
  cable_reel_stand_machine_h: 4,
  cable_pulling_device_machine_h: 5,
  cable_crimp_tool_machine_h: 2,
  installation_tester_machine_h: 3,
  cable_delivery_trip_count: 1,
  cable_waste_removal_trip_count: 1,
  cable_fixing_mode:'PROJECT_CABLE_FIXINGS_REQUIRED',
  cable_fixing_layout_reference:'TEST_ONLY accepted fixing layout, not actual source admission or a spacing norm',
});

export async function compileVvgngLsPowerCableR1(
  submittedParameters: Record<string, unknown>, options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? VVGNG_LS_POWER_CABLE_CATALOG_ID;
  if (catalogId !== VVGNG_LS_POWER_CABLE_CATALOG_ID) {
    throw new Error(`VVGNG_LS_POWER_CABLE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({ operation: "compile",
    compilerVersion: "canonical-estimate-compiler.vvgng-ls-power-cable-r1", catalogId,
    primaryMeasureParameterId: "length_m",
    parameterDefinitions: [...VVGNG_LS_POWER_CABLE_PARAMETERS],
    formulaDefinitions: [...VVGNG_LS_POWER_CABLE_FORMULAS],
    resourceDefinitions: [...VVGNG_LS_POWER_CABLE_RESOURCES], submittedParameters,
    confirmedParameters: { ...VVGNG_LS_POWER_CABLE_RUNTIME_INPUT },
    currencyCode: "KGS", priceItems: [], maximumResourceRows: VVGNG_LS_POWER_CABLE_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value) });
}


/** Exact R919 continuation. Original factories above remain available; this
 * entrypoint consumes the actual whole parent rather than synthesising IDs. */
const wholeCable=wholeCableSourceR919;
export const VVGNG_WHOLE_R919_SOURCE_SHA=canonicalEstimateSha256HexText(canonicalEstimateStableJson(wholeCable));
type VvgngWholeParentR919={header:Record<string,unknown>;body:Pick<AutomaticOwnerDefinition,'parameters'|'formulas'|'resources'>};
function wholeCableOperationR919(key:string):CanonicalEstimateOperationReference{
 const op=wholeCable.operations.find(o=>o.key===key);if(!op)throw Error('VVGNG_WHOLE_EXACT_OPERATION_REQUIRED:'+key);
 const {key:_key,...rest}=op;return rest as CanonicalEstimateOperationReference;
}
function wholeCableUsesR919(keys:readonly string[]){const refs=keys.map(wholeCableOperationR919);return {...refs[0],additionalOperations:refs.slice(1)};}
export function vvgngLsPowerCableWholeCurrentForwardR919(parent:VvgngWholeParentR919):AutomaticOwnerDefinition{
 if(parent.header.definition_version_id!==wholeCable.currentParent.definition_version_id||parent.header.definition_sha256!==wholeCable.currentParent.definition_sha256
  ||parent.header.approved_template_baseline_id!==wholeCable.currentParent.approved_template_baseline_id
  ||[parent.body.parameters.length,parent.body.formulas.length,parent.body.resources.length].join(':')!=='36:25:25')throw Error('VVGNG_EXACT_CURRENT_R919_REQUIRED');
 for(const key of ['parameters','formulas','resources'] as const){
  const id=key==='parameters'?'parameter_id':key==='formulas'?'formula_id':'row_id';
  const actual=parent.body[key] as unknown as readonly Record<string,unknown>[],expected=wholeCable.nativeSnapshot[key] as unknown as readonly Record<string,unknown>[];
  for(const captured of expected){const found=actual.find(v=>v[id]===captured[id]);if(!found||canonicalEstimateStableJson(found)!==canonicalEstimateStableJson(captured))throw Error('VVGNG_WHOLE_NATIVE_'+key.toUpperCase()+'_DRIFT:'+String(captured[id]));}
 }
 const eq=(parameterId:string,value:string)=>({kind:'equals' as const,parameterId,value});
 const selected={kind:'or' as const,operands:wholeCable.profiles.map(p=>eq(wholeCable.profileId,p.value))};
 const admitted=eq(wholeCable.sourceGateId,wholeCable.sourceGateValue),fit=eq(wholeCable.fitId,wholeCable.fit);
 const active={kind:'and' as const,operands:[selected,fit,admitted]};
 const measured=eq(wholeCable.balanceScopeId,wholeCable.balanceMeasured);
 const common=[wholeCable.profileId,wholeCable.receivedRecordId,wholeCable.fitId];
 const prep=[...common,wholeCable.prepInventoryId,wholeCable.terminationMethodId,wholeCable.terminationRecordId,wholeCable.stripLengthId];
 const qa=[...common,wholeCable.qaInventoryId,wholeCable.qaProgramId,wholeCable.qaMethodId,wholeCable.qaCordId];
 const p=(id:string,title:string,valueType:'text'|'enum'|'integer'|'decimal',unitId:string|null,values?:readonly string[],min?:number,max?:number)=>({id,title,valueType,unitId,kind:'conditional' as const,requiredWhen:selected,...(values?{values}:{}),...(min===undefined?{}:{min}),...(max===undefined?{}:{max})});
 const built=buildAutomaticConstructionOwnerR1({contract:wholeCable.contract,semanticOwner:wholeCable.catalogId,sourceId:wholeCable.sourceId,
  normId:'EXACT_CABLE_MANUFACTURER_AND_WHOLE_OWNED_INVENTORY_NOT_INSTALLATION_LABOUR_NORM',
  sourceMetadata:{source_title:'Силовая кабельная линия: фактический кабель, совместимая подготовка и полное измерительное оснащение',source_document_version:wholeCable.contract,definition_hash:VVGNG_WHOLE_R919_SOURCE_SHA,
   artifact_sha256:'7b68a009f01b0ee385913fe1efc65b8ae125c51f6f4d976ddf1d807df0bf8ba0',exact_locator:'CONCORD exact5x6 solid profiles and operating manual p1–2; KNIPEX95 17 500 p1/16 20 165 SB p1/12 62 180 p1–2; Klauke SR66/K94 exact solid application; complete1662EU/VI15000/PD690SRD source pack.'},
  applicabilityRu:'Только точный принятый ВВГнг(А)-LS5×6 и согласованный безопасный метод. Тяга, основание, крепления, контакты, огневая проходка, СИЗ, программа и цена требуют фактических документов. Выбор справочного исполнения не подтверждает объект или источник.',
  ordinary:[{id:'length_m',title:'Прежняя чистая установленная длина',valueType:'decimal',unitId:'m',kind:'ordinary',min:0.000001}],profile:[],
  conditional:[
   p(wholeCable.profileId,'Точное принятое исполнение полученного кабеля','enum',null,wholeCable.profiles.map(p=>p.value)),
   p(wholeCable.receivedRecordId,'Паспорт полученной партии, трасса, метод, среда и условия прокладки','text',null),
   p(wholeCable.fitId,'Применимость всего принятого кабеля и безопасного метода','enum',null,[wholeCable.fit]),
   p(wholeCable.prepCountId,'Фактическое число целых собственных комплектов подготовки жил','integer','set',undefined,1),
   p(wholeCable.prepInventoryId,'Ведомость полного пригодного оснащения разделки и опрессовки','text',null),
   p(wholeCable.terminationMethodId,'Точный принятый контактный вариант для монолитной меди6','enum',null,[wholeCable.terminationMethod]),
   p(wholeCable.terminationRecordId,'Ведомость аппарата и узла: разделка, опрессовки, крепёж, момент и защита','text',null),
   p(wholeCable.stripLengthId,'Фактическая длина зачистки по документации контактного узла','decimal','mm',undefined,6,18),
   p(wholeCable.qaCountId,'Фактическое число целых пригодных собственных измерительных комплектов','integer','set',undefined,1),
   p(wholeCable.qaInventoryId,'Ведомость прибора, всех принадлежностей, состояния и документов проверки','text',null),
   p(wholeCable.qaProgramId,'Программа RLO/RISO: точки, режимы, ограничения, критерии и единица учёта','text',null),
   p(wholeCable.qaMethodId,'Применимая программа точного1662 для этой линии','enum',null,[wholeCable.qaMethod]),
   p(wholeCable.qaCordId,'Точный совместимый сетевой измерительный шнур полного комплекта','enum',null,wholeCable.qaCordValues.map(p=>p.value)),
   p(wholeCable.resultsId,'Фактические результаты, протокол и порядок передачи','text',null),
   p(wholeCable.diameterId,'Фактический наружный диаметр принятого кабеля','decimal','mm',undefined,8,28),
   p(wholeCable.radiusId,'Фактический минимальный радиус трассы кабеля','decimal','mm',undefined,0),
   p(wholeCable.balanceScopeId,'Фактическая граница метрического учёта одной партии','enum',null,[wholeCable.balanceMeasured,wholeCable.balanceNotRecorded]),
   {...p(wholeCable.balanceRecordId,'Сопоставимый метрический учёт выдачи и возврата одной партии','text',null),requiredWhen:measured},
   {...p(wholeCable.issuedId,'Принятая измеренная выдача этой партии','decimal','m',undefined,0),requiredWhen:measured},
   {...p(wholeCable.returnedId,'Принятый повторно используемый возврат той же партии','decimal','m',undefined,0),requiredWhen:measured},
   ...wholeCable.renewals.map(r=>p(r.eventId,'Фактические полные замены питания: '+r.titleRu,'integer','pcs',undefined,0)),
   p(wholeCable.renewalRecordId,'Запись полных замен питания или документированных нулевых событий','text',null),
   {id:wholeCable.sourceGateId,title:'Источник whole комплектов и его применимость ещё не приняты',valueType:'enum',unitId:null,kind:'internal',values:[wholeCable.sourceGateValue]}
  ],
  rows:[
   ...[...wholeCable.preparationParts,...wholeCable.qaParts].map(part=>({rowId:wholeCable.prefix+':'+part.key,formulaId:wholeCable.prefix+':formula:'+part.key,section:'Полное собственное оснащение кабельной линии',category:'equipment',title:part.titleRu,unitId:part.unitId,expression:part.expression,
    inclusion:active,inputParameterIds:wholeCable.preparationParts.some(p=>p.key===part.key)?prep:qa,procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const})),
   ...wholeCable.renewals.map(part=>({rowId:wholeCable.prefix+':'+part.key,formulaId:wholeCable.prefix+':formula:'+part.key,section:'Фактические полные замены питания',category:'material',title:part.titleRu,unitId:part.unitId,expression:part.expression,inclusion:active,inputParameterIds:[...common,wholeCable.qaInventoryId,wholeCable.renewalRecordId],procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const})),
   ...wholeCable.details.map(d=>({rowId:wholeCable.prefix+':'+d.key,formulaId:wholeCable.prefix+':formula:'+d.key,section:'Измеряемые и паспортные расчётные основания',category:'material',title:d.titleRu,unitId:d.unitId,expression:d.expression,
    inclusion:{kind:'and' as const,operands:[selected,fit,...('profile'in d?[eq(wholeCable.profileId,String(d.profile))]:[]),...('measured'in d?[measured]:[])]},inputParameterIds:[...common,...('measured'in d?[wholeCable.balanceRecordId]:[])],procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const,
    ...('minimum'in d?{formulaOutputBounds:{schemaVersion:'canonical_formula_output_bounds_v1' as const,unitId:d.unitId,minimum:0,reasonRu:'Измеренный баланс или предел изготовителя не может быть отрицательным. Проверьте фактические сопоставимые величины и применимость метода.'}}:{})}))
  ],deferMissingProjectFactsToRows:true,excludedUnownedAssumptions:wholeCable.returnWhen.map(n=>n.id+': '+n.returnWhen)});
 const parameters=[...VVGNG_LS_POWER_CABLE_PARAMETERS,...built.parameters.filter(p=>p.parameter_id!=='length_m').map((p,i)=>({...p,ordinal:VVGNG_LS_POWER_CABLE_PARAMETERS.length+i,
  truth_metadata:p.parameter_id===wholeCable.sourceGateId?unresolvedApplicationNormTruthR1(p.truth_metadata,'Exact captured source revision, received compatibility and whole source admission are not consumer facts; inventory K is not approved application norm or price.')
   :{...p.truth_metadata,actualProjectAuthenticated:false,sourceAuthorityPromoted:false,provenance:{...p.truth_metadata.provenance as Record<string,unknown>,consumer_input_role_v1:'OBJECT_FACT'},guide:{guide_kind:'PROJECT_DEFINED',guide_short_ru:p.title_ru+': требуется фактический принятый документ или измерение; справочник и DEMO не являются фактом объекта.',source_role:'ACTUAL_PROJECT_DOCUMENT_REQUIRES_SERVER_BINDING',source_document:wholeCable.sourceId,source_locator:'ACTUAL_RECEIVED_ROUTE_CONTACT_INVENTORY_PROGRAMME_RECORD_REQUIRED',guide_version:wholeCable.contract,guide_validation_policy:'DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE'}}}))];
 const rehash=(r:CanonicalEstimateResourceDefinition)=>{const{row_sha256:_old,...b}=r;return{...b,row_sha256:estimateDeterministicHash(b)};};
 const nativeIds=new Set(parent.body.resources.map(r=>r.row_id));
 const resources=[...parent.body.resources.map(original=>{
  const authored=VVGNG_LS_POWER_CABLE_RESOURCES.find(r=>r.row_id===original.row_id)!;
  const counter=operationSource.sourceDeclaredCounterRowIds.includes(original.row_id);
  const oldBinding=operationSource.bindings.find(b=>b.rowId===original.row_id);
  const extra=original.row_id==='rc09:vvgng_a_ls_5x6_cable'?['receive','cut']:original.row_id==='rc09:copper_lug_6mm2'?['receive','crimp','connect']:original.row_id==='rc09:cable_gland_for_5x6'?['receive','connect']:original.row_id==='vvgng:labor:installation'?['cut','sheath','strip','crimp','connect']:original.row_id==='vvgng:equipment:crimp-tool'?['crimp']:original.row_id==='vvgng:equipment:installation-tester'?['kit-inspect','zero']:[];
  return rehash({...original,resource_graph:{...original.resource_graph,...authored.resource_graph,operationCompositionV1:wholeCableUsesR919([...new Set([...(oldBinding?.roles??['supply']),...extra])]),
   ...(counter?{}:{inputParameterIds:[...((authored.resource_graph.inputParameterIds as string[]|undefined)??[]),...common,...(original.row_id==='rc09:power_cable_insulation_continuity_test'?[...qa,wholeCable.resultsId]:[])]}),actualNativeUuidRetainedR919:true,wholeSourceSha256:VVGNG_WHOLE_R919_SOURCE_SHA},
   inclusion_ast:counter?authored.inclusion_ast:{kind:'and',operands:[authored.inclusion_ast,admitted]},source_metadata:{...original.source_metadata,...authored.source_metadata,originalCurrentSourceRetainedInPack:true,wholeSourceSha256:VVGNG_WHOLE_R919_SOURCE_SHA,actualProjectAuthenticated:false,sourceAuthorityPromoted:false,full_technical_acceptance:false}});
 }),...VVGNG_LS_POWER_CABLE_RESOURCES.filter(r=>!nativeIds.has(r.row_id)),...built.resources.map((r,i)=>{
  const part=[...wholeCable.preparationParts,...wholeCable.qaParts].find(p=>r.row_id===wholeCable.prefix+':'+p.key),renewal=wholeCable.renewals.find(p=>r.row_id===wholeCable.prefix+':'+p.key),detail=wholeCable.details.find(d=>r.row_id===wholeCable.prefix+':'+d.key);
  const isPrep=wholeCable.preparationParts.some(p=>part?.key===p.key),uses=part?.uses??renewal?.uses??detail!.uses;
  return rehash({...r,ordinal:VVGNG_LS_POWER_CABLE_RESOURCES.length+i,cost_owner_id:null,resource_graph:{...r.resource_graph,operationCompositionV1:wholeCableUsesR919(uses),
   ...(detail?{calculationDetailV1:true}:{physicalProvisionV1:{basis:renewal?'DOCUMENTED_FULL_REPLACEMENT_EVENTS':'ACTUAL_COMPLETE_OWNED_INVENTORY',sharedOwnerId:isPrep?(part?.key==='solid-crimper'?'vvgng:equipment:crimp-tool':'vvgng:r919:preparation-owned-inventory'):'vvgng:equipment:installation-tester',costOwnerCreated:false,newPurchaseClaimed:false,rentalDurationClaimed:false,servicePriceCoverageAuthenticated:false,initialInventoryNotConsumption:!renewal}}),
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:r.title_ru,brandAndModelRu:null,specificationRu:null,...(detail?{rowKind:'CALCULATION_DETAIL'}:{resourceKind:part?.kind??'CONSUMABLE'}),detailsRu:[detail?'Расчётная мера не является физическим ресурсом, заказом, остатком на складе, ценой или нормой потерь.':renewal?'Шесть новых элементов на реальное полное событие замены. Первоначальное оснащение, зарядка и номинальное число измерений не являются расходом замены.':'Целое пригодное собственное оснащение по принятой ведомости. Повторный показ у операций не создаёт оплаты или заказа.']}},
   source_metadata:{...r.source_metadata,normativeTrace:[],normative_source_ids:[],wholeSourceSha256:VVGNG_WHOLE_R919_SOURCE_SHA,actualProjectAuthenticated:false,sourceAuthorityPromoted:false,full_technical_acceptance:false,independentPurchaseAllowed:false,priceCoverageAuthenticated:false,quantityUnitOrMethodCompletenessClaimed:false}});
 })];
 const formulas=[...parent.body.formulas,...VVGNG_LS_POWER_CABLE_FORMULAS.filter(f=>!parent.body.formulas.some(p=>p.formula_id===f.formula_id)),...built.formulas];
 const consumers=buildMasterParameterCalculationConsumers({parameters,formulas,resources});
 return{parameters:parameters.map(p=>({...p,truth_metadata:{...p.truth_metadata,formula_consumers:consumers.formulaConsumers[p.parameter_id],resource_branch_consumers:consumers.resourceConsumers[p.parameter_id]}})),formulas,resources,
  runtimeInput:VVGNG_LS_POWER_CABLE_RUNTIME_INPUT,runtimeClassification:VVGNG_LS_POWER_CABLE_RUNTIME_CLASSIFICATION,runtimeSourceIds:VVGNG_LS_POWER_CABLE_RUNTIME_SOURCE_IDS,ordinaryParameterIds:['length_m']};
}
export function vvgngLsPowerCableWholeIndependentCompositionR919(){
 const previous=vvgngLsPowerCableIndependentCompositionR1();
 const entry=(key:string,unitId:string,uses:readonly string[])=>({expectedResourceId:wholeCable.prefix+':'+key,formulaId:wholeCable.prefix+':formula:'+key,unitId,operationId:wholeCableOperationR919(uses[0]).operationId,requiredOperationIds:uses.map(k=>wholeCableOperationR919(k).operationId),sourceId:wholeCable.sourceId,condition:'Exact source-owned adoption, compatible received item, accepted safe method/inventory/programme. Quantity is not application or price approval.',resolution:{kind:'ROW' as const,rowId:wholeCable.prefix+':'+key}});
 return{...previous,evidenceSha256:VVGNG_WHOLE_R919_SOURCE_SHA,operationRoster:wholeCable.operations.map(({key:_key,...op})=>op),operationRequirements:[...previous.operationRequirements,...wholeCable.newOperationRequirements],
  entries:[...previous.entries,...[...wholeCable.preparationParts,...wholeCable.qaParts,...wholeCable.renewals].map(p=>({...entry(p.key,p.unitId,p.uses),resourceKind:p.kind,publicNameRu:p.titleRu})),...wholeCable.details.map(d=>({expectedResourceId:wholeCable.prefix+':'+d.key,sourceId:wholeCable.sourceId,operationId:wholeCableOperationR919(d.uses[0]).operationId,condition:'Nonphysical measured or passport balance; never a resource, procurement or paid service.',resolution:{kind:'NOT_APPLICABLE' as const,reasonRu:'Расчётная мера сохранена отдельно от физического состава, цены, запаса, заказа и фактического выполнения.'}}))],fullTechnicalAcceptance:false,physicalResourceCoverageComplete:false};
}
export function vvgngLsPowerCableWholeOrdinaryMaterializerInputR919(parent:VvgngWholeParentR919){
 return{catalogId:wholeCable.catalogId,sourceKey:wholeCable.sourceId,currentHeader:parent.header,definition:vvgngLsPowerCableWholeCurrentForwardR919(parent),independentCompletenessMap:vvgngLsPowerCableWholeIndependentCompositionR919(),expectedParentShape:[36,25,25] as const,currentRegistryRows:wholeCable.currentRegistryRows,sourceRegistryAdmission:null,
  exactCurrentRegistrySnapshot:wholeCable.actualRegistrySnapshot,sourcePaths:['src/lib/estimate/v4/vvgngLsPowerCableR1.ts','tests/estimateNorms/vvgngLsPowerCableR1.contract.test.ts','scripts/estimate/r4a13/prepareS2723VvgngLsPowerCableBalancedSuccessor.ts','data/estimate-benchmarks/source-packs/vvgng-ls-power-cable-balanced-s27-23.json','data/estimate-benchmarks/source-packs/vvgng-ls-power-cable-whole-current-r919-r1.json',wholeCable.authoredWebReview.path,...wholeCable.sourceCaptures.map(s=>s.path),...wholeCable.wholeQaReuse.sources.map(s=>s.reusedLogicalPath)],
  existingProducer:'prepareS2723VvgngLsPowerCableBalancedSuccessor.ts',existingMasterConfigOwner:'prepareMasterSingleDefinitionSuccessorR1',sourceQuantityOrUnitApprovalCreated:false,privateSourceAdmission:false,newReady:false,fullTechnicalAcceptance:false};
}
export async function compileVvgngLsPowerCableWholeCurrentR919(parent:VvgngWholeParentR919,submittedParameters:Record<string,unknown>,rowOverrides?:Record<string,Record<string,unknown>>){
 const definition=vvgngLsPowerCableWholeCurrentForwardR919(parent);
 return compileCanonicalEstimateCore({operation:rowOverrides?'recalculate':'compile',compilerVersion:wholeCable.contract,catalogId:wholeCable.catalogId,primaryMeasureParameterId:'length_m',parameterDefinitions:[...definition.parameters],formulaDefinitions:[...definition.formulas],resourceDefinitions:[...definition.resources],submittedParameters,
  confirmedParameters:{...definition.runtimeInput},...(rowOverrides?{rowOverrides}:{}),currencyCode:'KGS',priceItems:[],maximumResourceRows:definition.resources.length,hashJson:async value=>estimateDeterministicHash(value)});
}
