import opticalWholeSourceR1 from "../../../../data/estimate-benchmarks/source-packs/optical-fiber-whole-splice-method-r1.json";
import {buildAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1,type AutomaticOwnerDefinition,type AutomaticParameterSpec} from "./automaticConstructionOwnerR1";
import {
  compileCanonicalEstimateCore,
  type CanonicalEstimateCompileCoreResult,
  type CanonicalEstimateFormulaDefinition,
  type CanonicalEstimateParameterDefinition,
  type CanonicalEstimateResourceDefinition,
} from "../backendPlatform/canonicalEstimateCompileCore";
import { compileFormulaGraph } from "../backendPlatform/formulaGraph";
import { estimateDeterministicHash } from "../estimateDeterministicHash";

type InputValue = string | number | boolean;
type Json = Record<string, unknown>;

export const OPTICAL_FIBER_SPLICING_CATALOG_ID =
  "canonical-work:expanded:fiber_optic_connection";
export const OPTICAL_FIBER_SPLICING_SOURCE_ID =
  "s2724_krerm_guidance_and_project_optical_fiber_splicing_package_v2";
export const OPTICAL_FIBER_SPLICING_NORM_ID =
  "norm:kg:krerm-2015-guidance-2.9.2:project-optical-fiber-splicing:v2";

export const OPTICAL_FIBER_SPLICING_SOURCE_METADATA = Object.freeze({
  source_title: "КРЕРм-2015: Указания по применению; утверждённая схема сварки ВОЛС, паспорт кабеля, ППР и программа измерений",
  source_authority: "Министерство строительства Кыргызской Республики; проектная организация ВОЛС и утверждающий инженер проекта",
  source_document_version:
    "KG_KRERM_2015_GUIDANCE_CAPTURE_2026_10_01_AND_PROJECT_OPTICAL_SPLICE_PACKAGE_REVISION_EXPLICIT",
  definition_hash: "a0c3a8684c66a3d7ce5b30b5340562972e11f6a0df92a2240770af46fdae2c54",
  exact_locator: "КРЕРм-2015, Указания по применению, п. 2.9.2: проектно-зависимые материалы определяются по рабочим чертежам с учётом трудноустранимых потерь и отходов; количество сварных соединений и тип волокна; спецификация гильз, очистки и маркировки; ППР; программа OTDR с индивидуальными протоколами",
  use_restriction: "Каждое подтверждённое сварное соединение требует одну установленную защитную гильзу и одну запись измерения; потери, резерв и упаковка гильз показаны отдельными заменяемыми значениями. Остальные расходники, труд, оборудование и логистика берутся из проекта, ППР и QA-документов. Трасса ВОК, кросс и серверный шкаф не включаются.",
  source_kind: "OFFICIAL_NORMATIVE_GUIDANCE_AND_PROJECT_DOCUMENT_PACKAGE",
  official_url:
    "https://minstroy.gov.kg/ru/state_program/download-pdf/montazoborudovania-62169004e91aaf866.70682138.pdf",
  artifact_sha256: "a0c3a8684c66a3d7ce5b30b5340562972e11f6a0df92a2240770af46fdae2c54",
});

const CONDITIONAL_DETAILS = new Set([
  "pigtail_designation",
  "pigtail_quantity_piece",
  "splice_tray_designation",
  "splice_tray_quantity_piece",
]);
const OPTIONAL_PRODUCT_DESIGNATIONS = new Set([
  "sleeve_designation", "wipe_designation", "cleaner_designation",
  "marker_designation", "fusion_splicer_designation", "otdr_designation",
]);

const PARAMETER_SPECS = Object.freeze([
  ["splice_count", "Количество сварных соединений оптических волокон", "integer", "pcs", null],
  ["fiber_standard", "Стандарт одномодового волокна", "enum", null, ["SM_G652D"]],
  ["sleeve_designation", "Защитная термоусаживаемая гильза по спецификации", "text", null, null],
  ["sleeve_expected_waste_piece", "Ожидаемые повреждённые или отбракованные гильзы", "decimal", "pcs", null],
  ["sleeve_retained_spare_piece", "Сохраняемый резерв защитных гильз", "decimal", "pcs", null],
  ["sleeve_supplier_pack_size_piece", "Количество гильз в упаковке поставщика", "integer", "pcs", null],
  ["wipe_designation", "Безворсовая салфетка по технологической карте", "text", null, null],
  ["wipe_quantity_piece", "Количество безворсовых салфеток", "decimal", "pcs", null],
  ["cleaner_designation", "Изопропиловый очиститель по технологической карте", "text", null, null],
  ["cleaner_volume_l", "Объём изопропилового очистителя", "decimal", "l", null],
  ["marker_designation", "Маркер сварного соединения по схеме идентификации", "text", null, null],
  ["marker_quantity_piece", "Количество маркеров сварных соединений", "decimal", "pcs", null],
  ["fusion_splicer_designation", "Сварочный аппарат по ППР", "text", null, null],
  ["fusion_splicer_shift", "Количество смен сварочного аппарата", "decimal", "shift", null],
  ["otdr_designation", "Оптический рефлектометр по программе измерений", "text", null, null],
  ["otdr_shift", "Количество смен оптического рефлектометра", "decimal", "shift", null],
  ["pigtail_mode", "Пигтейлы входят в этот объём", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["pigtail_designation", "Оптический пигтейл по спецификации", "text", null, null],
  ["pigtail_quantity_piece", "Количество оптических пигтейлов", "decimal", "pcs", null],
  ["splice_tray_mode", "Кассеты для сварных соединений входят в этот объём", "enum", null,
    ["NOT_REQUIRED", "REQUIRED"]],
  ["splice_tray_designation", "Кассета для сварных соединений по спецификации", "text", null, null],
  ["splice_tray_quantity_piece", "Количество кассет для сварных соединений", "decimal", "pcs", null],
  ["fiber_splicing_labor_h", "Труд по подготовке и сварке оптических волокон", "decimal", "man_hour", null],
  ["fiber_testing_labor_h", "Труд по измерению затухания и оформлению протоколов", "decimal", "man_hour", null],
  ["fiber_delivery_trip_count", "Рейсы доставки расходников и оборудования", "integer", "trip", null],
  ["fiber_waste_removal_trip_count", "Рейсы вывоза упаковки и отходов", "integer", "trip", null],
] as const);

const KNOWN_SCOPE = ["splice_count", "fiber_standard"];
const VISIBLE_PRELIMINARY_PROFILE = new Set([
  "sleeve_expected_waste_piece", "sleeve_retained_spare_piece",
  "sleeve_supplier_pack_size_piece",
]);

function conditionalConstraints(parameterId: string): Json {
  const prefix = ["pigtail", "splice_tray"]
    .find((candidate) => parameterId.startsWith(`${candidate}_`));
  const branch = prefix ? `${prefix}_mode` : null;
  if (!branch || parameterId === branch) return {};
  return {
    requiredWhen: { kind: "equals", parameterId: branch, value: "REQUIRED" },
    forbiddenWhen: { kind: "equals", parameterId: branch, value: "NOT_REQUIRED" },
  };
}

export type OpticalFiberSplicingParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const OPTICAL_FIBER_SPLICING_PARAMETERS:
readonly OpticalFiberSplicingParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId)
      && !OPTIONAL_PRODUCT_DESIGNATIONS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues ? { values: enumValues }
        : valueType === "decimal" || valueType === "integer"
          ? { min: VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            && parameterId !== "sleeve_supplier_pack_size_piece"
            ? 0
            : valueType === "integer" ? 1 : 0.000_001 }
          : valueType === "text" ? { minLength: 1, maxLength: 1_000 } : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.optical-fiber-splicing-r1",
      semantic_parameter_key: `optical-fiber-splicing:${parameterId}`,
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
          : "APPROVED_FIBER_SPLICE_MATERIAL_METHOD_OR_QA_DOCUMENTATION",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !KNOWN_SCOPE.includes(parameterId)
        && !VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      guide: {
        guide_kind: KNOWN_SCOPE.includes(parameterId) ? "MEASUREMENT_RULE" : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "splice_count"
          ? "Укажите подтверждённое количество отдельных сварных соединений волокон."
          : parameterId === "fiber_standard"
            ? "Укажите стандарт волокна по паспорту оптического кабеля."
            : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
              ? `${titleRu}: предварительно принято видимое нейтральное значение; замените по спецификации и упаковке поставщика.`
              : `${titleRu}: укажите по спецификации, ППР или программе измерений.`,
        source_role: KNOWN_SCOPE.includes(parameterId)
          ? "USER_SUPPLIED_OR_APPROVED_FIBER_SPLICE_SCOPE"
          : VISIBLE_PRELIMINARY_PROFILE.has(parameterId)
            ? "VISIBLE_REPLACEABLE_PRELIMINARY_PROFILE"
            : "APPROVED_PROJECT_FIBER_SPLICE_MATERIAL_METHOD_OR_QA_DOCUMENTATION",
        source_document: OPTICAL_FIBER_SPLICING_SOURCE_ID,
        source_locator: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.exact_locator,
        guide_version: "optical-fiber-splicing-s27-24-r2",
        source_snapshot_hash: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.artifact_sha256,
        applicability: "Только для сварки одномодовых волокон SM G.652D с индивидуальным измерением затухания; трасса ВОК, оптический кросс и серверный шкаф исключены.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy:
          "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      runtime_profile_value: VISIBLE_PRELIMINARY_PROFILE.has(parameterId),
      synthetic: false,
    },
  })),
);

export const OPTICAL_FIBER_SPLICING_RUNTIME_INPUT = Object.freeze({
  sleeve_expected_waste_piece: 0,
  sleeve_retained_spare_piece: 0,
  sleeve_supplier_pack_size_piece: 1,
});
export const OPTICAL_FIBER_SPLICING_RUNTIME_CLASSIFICATION = Object.freeze(
  Object.fromEntries(Object.keys(OPTICAL_FIBER_SPLICING_RUNTIME_INPUT).map((parameterId) => [
    parameterId, "ASSUMPTION",
  ])) as Readonly<Record<string, "ASSUMPTION">>,
);
export const OPTICAL_FIBER_SPLICING_RUNTIME_SOURCE_IDS = Object.freeze(
  Object.fromEntries(Object.keys(OPTICAL_FIBER_SPLICING_RUNTIME_INPUT).map((parameterId) => [
    parameterId, [OPTICAL_FIBER_SPLICING_SOURCE_ID],
  ])) as Readonly<Record<string, readonly string[]>>,
);

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

export const OPTICAL_FIBER_SPLICING_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("optical_fiber_fusion_splice_count_v1", "pcs", "splice_count"),
  formula("fiber_splice_sleeve_quantity_v1", "pcs", "splice_count"),
  formula("fiber_splice_sleeve_expected_waste_v2", "pcs", "sleeve_expected_waste_piece"),
  formula("fiber_splice_sleeve_retained_reserve_v2", "pcs", "sleeve_retained_spare_piece"),
  formula("fiber_splice_sleeve_total_need_v2", "pcs",
    "splice_count+sleeve_expected_waste_piece+sleeve_retained_spare_piece"),
  formula("fiber_splice_sleeve_package_count_v2", "pack",
    "ceil((splice_count+sleeve_expected_waste_piece+sleeve_retained_spare_piece)/sleeve_supplier_pack_size_piece)"),
  formula("fiber_splice_sleeve_order_quantity_v2", "pcs",
    "ceil((splice_count+sleeve_expected_waste_piece+sleeve_retained_spare_piece)/sleeve_supplier_pack_size_piece)*sleeve_supplier_pack_size_piece"),
  formula("fiber_splice_sleeve_remainder_v2", "pcs",
    "ceil((splice_count+sleeve_expected_waste_piece+sleeve_retained_spare_piece)/sleeve_supplier_pack_size_piece)*sleeve_supplier_pack_size_piece-splice_count-sleeve_expected_waste_piece"),
  formula("fiber_splice_sleeve_surplus_v2", "pcs",
    "max(0,ceil((splice_count+sleeve_expected_waste_piece+sleeve_retained_spare_piece)/sleeve_supplier_pack_size_piece)*sleeve_supplier_pack_size_piece-splice_count-sleeve_expected_waste_piece-sleeve_retained_spare_piece)"),
  formula("fiber_lint_free_wipe_quantity_v1", "pcs", "wipe_quantity_piece"),
  formula("fiber_isopropyl_cleaner_volume_v1", "l", "cleaner_volume_l"),
  formula("fiber_splice_marker_quantity_v1", "pcs", "marker_quantity_piece"),
  formula("fiber_fusion_splicer_shift_v1", "shift", "fusion_splicer_shift"),
  formula("fiber_otdr_shift_v1", "shift", "otdr_shift"),
  formula("fiber_otdr_measurement_record_count_v1", "test", "splice_count"),
  formula("fiber_pigtail_quantity_v1", "pcs", "pigtail_quantity_piece"),
  formula("fiber_splice_tray_quantity_v1", "pcs", "splice_tray_quantity_piece"),
  formula("fiber_splicing_labor_v2", "man_hour", "fiber_splicing_labor_h"),
  formula("fiber_testing_labor_v2", "man_hour", "fiber_testing_labor_h"),
  formula("fiber_delivery_v2", "trip", "fiber_delivery_trip_count"),
  formula("fiber_waste_removal_v2", "trip", "fiber_waste_removal_trip_count"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({
  kind: "equals",
  parameterId,
  value,
});

function resource(input: {
  rowId: string;
  ordinal: number;
  section: string;
  category: string;
  titleRu: string;
  unitId: string;
  formulaId: string;
  inclusionAst?: Json;
  procurementEligible: boolean;
  titleParameterIds?: string[];
  sourceRole: string;
  costTreatment?: "OWN_COST" | "INFORMATIONAL_SCOPE" | "INCLUDED_IN_RESOURCE_ROWS";
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `optical-fiber-splicing:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " — ",
    } : {}),
    scopeContextParameterIds: KNOWN_SCOPE,
    costTreatment: input.costTreatment ?? "OWN_COST",
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: OPTICAL_FIBER_SPLICING_SOURCE_ID,
      source_id: OPTICAL_FIBER_SPLICING_SOURCE_ID,
      normId: OPTICAL_FIBER_SPLICING_NORM_ID,
      norm_id: OPTICAL_FIBER_SPLICING_NORM_ID,
      normVersion: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.source_document_version,
      source_title: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.source_title,
      exact_locator: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.exact_locator,
      source_definition_hash: OPTICAL_FIBER_SPLICING_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "historical per-splice consumable rates",
      "automatic equipment productivity",
      "automatic pigtail or splice-tray quantities",
      "fiber optic cable route, optical distribution frame or server cabinet",
      "invented price",
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
    inclusion_ast: input.inclusionAst ?? literalTrue,
    resource_graph: resourceGraph,
    procurement_eligible: input.procurementEligible,
    cost_owner_id: input.rowId,
    source_metadata: sourceMetadata,
    row_sha256: estimateDeterministicHash({ input, resourceGraph, sourceMetadata }),
  };
}

export const OPTICAL_FIBER_SPLICING_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:optical_fiber_fusion_splice", ordinal: 0,
    section: "Работы", category: "construction_work",
    titleRu: "Сварка оптического волокна SM G.652D", unitId: "pcs",
    formulaId: "optical_fiber_fusion_splice_count_v1", procurementEligible: false,
    titleParameterIds: ["fiber_standard"],
    sourceRole: "USER_SUPPLIED_OR_APPROVED_FIBER_SPLICE_SCOPE",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:fiber_splice_heat_shrink_sleeve", ordinal: 1,
    section: "Материалы", category: "material",
    titleRu: "Термоусаживаемая защитная гильза сварного соединения — заказ", unitId: "pcs",
    formulaId: "fiber_splice_sleeve_order_quantity_v2", procurementEligible: true,
    titleParameterIds: ["sleeve_designation"], sourceRole: "APPROVED_SPLICE_SCHEDULE" }),
  resource({ rowId: "rc09:fiber_lint_free_wipe", ordinal: 2,
    section: "Материалы", category: "material", titleRu: "Безворсовая салфетка для оптического волокна",
    unitId: "pcs", formulaId: "fiber_lint_free_wipe_quantity_v1", procurementEligible: true,
    titleParameterIds: ["wipe_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:fiber_isopropyl_cleaner", ordinal: 3,
    section: "Материалы", category: "material", titleRu: "Изопропиловый очиститель оптического волокна",
    unitId: "l", formulaId: "fiber_isopropyl_cleaner_volume_v1", procurementEligible: true,
    titleParameterIds: ["cleaner_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:fiber_splice_identification_marker", ordinal: 4,
    section: "Материалы", category: "material", titleRu: "Маркер сварного соединения оптического волокна",
    unitId: "pcs", formulaId: "fiber_splice_marker_quantity_v1", procurementEligible: true,
    titleParameterIds: ["marker_designation"], sourceRole: "APPROVED_SPLICE_IDENTIFICATION_SCHEME" }),
  resource({ rowId: "rc09:fiber_fusion_splicer", ordinal: 5,
    section: "Оборудование", category: "equipment", titleRu: "Сварочный аппарат для оптических волокон",
    unitId: "shift", formulaId: "fiber_fusion_splicer_shift_v1", procurementEligible: true,
    titleParameterIds: ["fusion_splicer_designation"], sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:optical_time_domain_reflectometer", ordinal: 6,
    section: "Оборудование", category: "equipment", titleRu: "Оптический рефлектометр OTDR",
    unitId: "shift", formulaId: "fiber_otdr_shift_v1", procurementEligible: true,
    titleParameterIds: ["otdr_designation"], sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "rc09:fiber_otdr_measurement_protocol", ordinal: 7,
    section: "Контроль", category: "service",
    titleRu: "Измерение затухания OTDR с индивидуальной записью протокола", unitId: "test",
    formulaId: "fiber_otdr_measurement_record_count_v1", procurementEligible: false,
    sourceRole: "USER_SUPPLIED_OR_APPROVED_FIBER_SPLICE_SCOPE",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "rc09:fiber_pigtail", ordinal: 8,
    section: "Условные материалы", category: "material", titleRu: "Оптический пигтейл",
    unitId: "pcs", formulaId: "fiber_pigtail_quantity_v1",
    inclusionAst: equals("pigtail_mode", "REQUIRED"), procurementEligible: true,
    titleParameterIds: ["pigtail_designation"], sourceRole: "APPROVED_OPTICAL_TERMINATION_SCHEDULE" }),
  resource({ rowId: "rc09:fiber_splice_tray", ordinal: 9,
    section: "Условные материалы", category: "material", titleRu: "Кассета для сварных соединений волокон",
    unitId: "pcs", formulaId: "fiber_splice_tray_quantity_v1",
    inclusionAst: equals("splice_tray_mode", "REQUIRED"), procurementEligible: true,
    titleParameterIds: ["splice_tray_designation"], sourceRole: "APPROVED_CLOSURE_OR_ODF_SCHEDULE" }),
  resource({ rowId: "fiber:balance:installed-sleeves", ordinal: 10,
    section: "Баланс защитных гильз", category: "material",
    titleRu: "Гильзы, установленные на сварные соединения", unitId: "pcs",
    formulaId: "fiber_splice_sleeve_quantity_v1", procurementEligible: false,
    sourceRole: "USER_SUPPLIED_OR_APPROVED_FIBER_SPLICE_SCOPE",
    costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "fiber:balance:expected-waste", ordinal: 11,
    section: "Баланс защитных гильз", category: "material",
    titleRu: "Ожидаемые повреждённые или отбракованные гильзы", unitId: "pcs",
    formulaId: "fiber_splice_sleeve_expected_waste_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "fiber:balance:retained-reserve", ordinal: 12,
    section: "Баланс защитных гильз", category: "material",
    titleRu: "Сохраняемый резерв защитных гильз", unitId: "pcs",
    formulaId: "fiber_splice_sleeve_retained_reserve_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "fiber:balance:total-need", ordinal: 13,
    section: "Баланс защитных гильз", category: "material",
    titleRu: "Общая потребность: монтаж + ожидаемый брак + резерв", unitId: "pcs",
    formulaId: "fiber_splice_sleeve_total_need_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "fiber:balance:package-count", ordinal: 14,
    section: "Баланс защитных гильз", category: "material",
    titleRu: "Количество упаковок защитных гильз к заказу", unitId: "pack",
    formulaId: "fiber_splice_sleeve_package_count_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "fiber:balance:remainder-after-installation-waste", ordinal: 15,
    section: "Баланс защитных гильз", category: "material",
    titleRu: "Остаток после монтажа и ожидаемого брака", unitId: "pcs",
    formulaId: "fiber_splice_sleeve_remainder_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "fiber:balance:surplus-beyond-reserve", ordinal: 16,
    section: "Баланс защитных гильз", category: "material",
    titleRu: "Свободный остаток сверх сохраняемого резерва", unitId: "pcs",
    formulaId: "fiber_splice_sleeve_surplus_v2", procurementEligible: false,
    sourceRole: "VISIBLE_PROCUREMENT_BALANCE", costTreatment: "INFORMATIONAL_SCOPE" }),
  resource({ rowId: "fiber:labor:splicing", ordinal: 17,
    section: "Труд", category: "construction_work",
    titleRu: "Труд по подготовке и сварке оптических волокон", unitId: "man_hour",
    formulaId: "fiber_splicing_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_METHOD_STATEMENT" }),
  resource({ rowId: "fiber:labor:testing", ordinal: 18,
    section: "Труд", category: "construction_work",
    titleRu: "Труд по измерению затухания и оформлению протоколов", unitId: "man_hour",
    formulaId: "fiber_testing_labor_v2", procurementEligible: false,
    sourceRole: "APPROVED_QA_PLAN" }),
  resource({ rowId: "fiber:logistics:delivery", ordinal: 19,
    section: "Логистика", category: "service",
    titleRu: "Доставка расходников и измерительного оборудования", unitId: "trip",
    formulaId: "fiber_delivery_v2", procurementEligible: true,
    sourceRole: "APPROVED_LOGISTICS_PLAN" }),
  resource({ rowId: "fiber:logistics:waste-removal", ordinal: 20,
    section: "Логистика", category: "service",
    titleRu: "Сбор и вывоз упаковки и отходов подготовки волокна", unitId: "trip",
    formulaId: "fiber_waste_removal_v2", procurementEligible: true,
    sourceRole: "APPROVED_WASTE_PLAN" }),
]);

export const OPTICAL_FIBER_SPLICING_SHORT_INPUT = Object.freeze({
  splice_count: 48,
  fiber_standard: "SM_G652D",
});

export const OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT = Object.freeze({
  ...OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  ...OPTICAL_FIBER_SPLICING_RUNTIME_INPUT,
  sleeve_designation: "Гильза КДЗС 60 мм по спецификации",
  wipe_designation: "Безворсовая салфетка по технологической карте", wipe_quantity_piece: 96,
  cleaner_designation: "Изопропиловый очиститель по технологической карте", cleaner_volume_l: 0.2,
  marker_designation: "Маркер волокна по схеме идентификации", marker_quantity_piece: 48,
  fusion_splicer_designation: "Сварочный аппарат с юстировкой по сердцевине по ППР",
  fusion_splicer_shift: 1.5,
  otdr_designation: "OTDR для SM G.652D по программе измерений", otdr_shift: 1,
  pigtail_mode: "NOT_REQUIRED",
  splice_tray_mode: "NOT_REQUIRED",
  fiber_splicing_labor_h: 18,
  fiber_testing_labor_h: 8,
  fiber_delivery_trip_count: 1,
  fiber_waste_removal_trip_count: 1,
});

export async function compileOpticalFiberSplicingR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? OPTICAL_FIBER_SPLICING_CATALOG_ID;
  if (catalogId !== OPTICAL_FIBER_SPLICING_CATALOG_ID) {
    throw new Error(`OPTICAL_FIBER_SPLICING_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.optical-fiber-splicing-r1",
    catalogId,
    primaryMeasureParameterId: "splice_count",
    parameterDefinitions: [...OPTICAL_FIBER_SPLICING_PARAMETERS],
    formulaDefinitions: [...OPTICAL_FIBER_SPLICING_FORMULAS],
    resourceDefinitions: [...OPTICAL_FIBER_SPLICING_RESOURCES],
    submittedParameters,
    confirmedParameters: { ...OPTICAL_FIBER_SPLICING_RUNTIME_INPUT },
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const OPTICAL_FIBER_WHOLE_SPLICE_SOURCE_R1=opticalWholeSourceR1;

/** Source COW over ROOT's actual current body. Uses the existing builder/Core;
 * neither the legacy fixture nor a wide card title expands this atomic scope. */
export function opticalFiberWholeSpliceMethodModelR1(actualParent?:Readonly<{parameters:readonly CanonicalEstimateParameterDefinition[];formulas:readonly CanonicalEstimateFormulaDefinition[];resources:readonly CanonicalEstimateResourceDefinition[]}>):AutomaticOwnerDefinition{
 const s=opticalWholeSourceR1,p=actualParent??s.currentParentModel,active={kind:'greater_than' as const,parameterId:'splice_count',value:0};
 const specs:AutomaticParameterSpec[]=[{id:'splice_count',title:'Подтверждённые сварные соединения',kind:'internal',valueType:'integer',unitId:'pcs',min:1},
  {id:s.stock.quantityParameterId,title:s.stock.nameRu,kind:'ordinary',valueType:'integer',unitId:'pcs',min:0},
  ...s.additionalResources.map(r=>({id:r.quantityParameterId,title:r.nameRu,kind:'ordinary' as const,valueType:['pcs','pair'].includes(r.unitId)?'integer' as const:'decimal' as const,unitId:r.unitId,min:0})),
  ...s.actualRecords.map(f=>({id:f.id,title:f.titleRu,kind:'conditional' as const,valueType:'text' as const,unitId:null,resourceBranchConsumers:['rc09:optical_fiber_fusion_splice']})),
  {id:s.decisionId,title:'Проверка фактического метода сварки волокна',kind:'conditional',valueType:'enum',unitId:null,values:s.decisions,resourceBranchConsumers:['rc09:optical_fiber_fusion_splice']},
  {id:s.externalQaScopeParameterId,title:'Область внешней проверки вносимых потерь',kind:'conditional',valueType:'enum',unitId:null,values:s.externalQaScopeChoices,resourceBranchConsumers:['rc09:optical_fiber_fusion_splice']}];
 const a=buildAutomaticConstructionOwnerR1({contract:s.contract,semanticOwner:s.catalogId,sourceId:s.sourceId,normId:'EXACT_CURRENT_ATOMIC_SPLICE_METHOD_WITH_VISIBLE_UNKNOWN_NOT_UNIVERSAL_NORM',
  sourceMetadata:{source_title:s.titleRu,source_document_version:s.contract,definition_hash:s.projectDocumentSha256,artifact_sha256:s.projectDocumentSha256,exact_locator:'PROJECT_OPTICAL_SPLICE_METHOD; exact manufacturer standard-kit PDF8/9/10 and captured actual test-source locators'},
  applicabilityRu:'Только подтверждённые отдельные сварки SM G.652D и их применимый контроль. Трасса ВОК, новый кросс, шкаф, новая муфта и внешняя приёмка линии не становятся оплаченной работой этого владельца.',
  ordinary:specs.filter(x=>x.kind!=='conditional'),profile:[],conditional:specs.filter(x=>x.kind==='conditional'),deferMissingProjectFactsToRows:true,
  rows:[{rowId:s.stock.rowId,formulaId:s.stock.formulaId,title:s.stock.nameRu,section:'Оснащение',category:'equipment',unitId:s.stock.unitId,expression:s.stock.quantityParameterId,
   inclusion:active,procurement:false,costTreatment:'INFORMATIONAL_SCOPE',effectiveQuantityOutput:{parameterId:s.stock.effectiveParameterId,unitId:'pcs'}},
   ...s.factoryInventory.map(r=>({rowId:r.rowId,formulaId:r.formulaId,title:r.nameRu,section:'Оснащение заводского комплекта',category:'equipment',unitId:r.unitId,expression:r.expression,
    inclusion:active,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,purchaseBalanceOwnerRowId:r.costOwnerRowId})),
   ...s.additionalResources.map(r=>({rowId:r.rowId,formulaId:r.formulaId,title:r.nameRu,section:'Ресурсы выбранного метода',category:r.resourceKind==='LABOR'?'construction_work':r.resourceKind==='CONSUMABLE'?'material':'equipment',unitId:r.unitId,expression:r.quantityParameterId,
    inclusion:r.scopeBoundary==='EXTERNAL_QA_COMPANION_NO_PAID_OWNER_IN_THIS_ATOMIC_CARD'?{kind:'and' as const,operands:[active,{kind:'equals' as const,parameterId:s.externalQaScopeParameterId,value:'REQUIRED_SEPARATE_OWNER'}]}:active,procurement:false,costTreatment:'INFORMATIONAL_SCOPE' as const}))],
  excludedUnownedAssumptions:['No one kit per splice or per paidshift','No universalwipes/cleanervolume/labour/shifts','No typicalsplice loss as acceptancebudget','No splicer estimatedloss as OTDR/OLTS PASS','No OTDR replacement forrequiredinsertionloss','No extra paidroute/ODF/newclosure/cabinet','No ceil(N/traycapacity) as actualtopology','No inventory part as repeatedcharge']});
 const nativeIds=new Set(p.parameters.map(x=>x.parameter_id)),additionalQty=new Set([s.stock.quantityParameterId,...s.additionalResources.map(x=>x.quantityParameterId)]);
 const unknown=(x:typeof a.parameters[number])=>({...x,required:false,default_value:null,truth_metadata:{...unresolvedApplicationNormTruthR1(x.truth_metadata,'Фактическое развёртывание, расход или полная применимая норма не установлены. Количество сварок и техническое время не задают этот расход.'),visible_when:{kind:'literal',value:false},runtime_profile_value:false,hidden_default_forbidden:true}});
 const parameters=[...p.parameters.map(x=>{
  if(['splice_count','fiber_standard'].includes(x.parameter_id))return x;
  if(['integer','decimal'].includes(x.value_type))return unknown(x);
  return{...x,required:false,default_value:null,truth_metadata:{...x.truth_metadata,visibility_role:'INTERNAL_ONLY',runtime_profile_value:false,hidden_default_forbidden:true,
   provenance:{consumer_input_role_v1:'OBJECT_FACT',input_channel_v1:'SERVER_REVIEWED_PROJECT_RECORDS'}}};
 }),...a.parameters.filter(x=>!nativeIds.has(x.parameter_id)).map((x,i)=>{
  const ordinal=p.parameters.length+i;
  if(additionalQty.has(x.parameter_id))return{...unknown(x),ordinal};
  if(x.parameter_id===s.stock.effectiveParameterId)return{...x,ordinal,required:false,default_value:null,constraints_json:{...x.constraints_json,
   conditionalWholeIntegerV1:{contractVersion:'canonical-conditional-whole-integer/v1',when:{kind:'equals',parameterId:s.decisionId,value:'DOCUMENTED_COMPATIBLE'}}},truth_metadata:{...x.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}};
  return{...x,ordinal,required:false,default_value:null,constraints_json:{...x.constraints_json,requiredWhen:active},truth_metadata:{...x.truth_metadata,
   provenance:{consumer_input_role_v1:'OBJECT_FACT',input_channel_v1:'SERVER_REVIEWED_PROJECT_RECORDS'},...(x.parameter_id===s.decisionId?{unknown_enum_values:['UNKNOWN']}:{})}};
 })];
 const declarations=new Map([...s.nativeBindings,s.stock,...s.factoryInventory,...s.additionalResources].map(x=>[x.rowId,x])),opMap=new Map(s.operationRoster.map(o=>[o.operationId,o]));
 const rehash=(r:CanonicalEstimateResourceDefinition)=>{const{row_sha256:_old,...v}=r;return{...v,row_sha256:estimateDeterministicHash(v)};};
 // ROOT's bounded reader already parsed and hashed these exact saved records.
 // Keep their saved AST/owners, rather than recompiling a historical producer.
 const currentResources=p.resources as unknown as readonly CanonicalEstimateResourceDefinition[];
 const currentFormulas=p.formulas as unknown as readonly CanonicalEstimateFormulaDefinition[];
 const resources:CanonicalEstimateResourceDefinition[]=[...currentResources,...a.resources].map((row,ordinal)=>{
  const declared=declarations.get(row.row_id);if(!declared)throw Error('OPTICAL_WHOLE_CURRENT_ROW_SOURCE_REQUIRED:'+row.row_id);
  const references=declared.operationKeys.map(k=>{const o=opMap.get('fiber:'+k);if(!o)throw Error('OPTICAL_WHOLE_OPERATION_REQUIRED:'+k);return o;}),[primary,...additionalOperations]=references;
  let next=rehash({...row,ordinal,source_metadata:{...row.source_metadata,sourceAdmission:false,fullLineCompletionAccepted:false},resource_graph:{...row.resource_graph,
   operationCompositionV1:{...primary!,...(additionalOperations.length?{additionalOperations}:{})},atomicSpliceBoundaryR1:{routeIncluded:false,newClosureIncluded:false,odfIncluded:false,cabinetIncluded:false,
    bareFiberAndConnectorCleanerAreDistinct:true,nativeRecordCountIsExecutedShots:false,toolStockIsPaidShift:false,sourceAdmission:false,executionPass:false,FULL:false}}});
  const factory=s.factoryInventory.find(x=>x.rowId===row.row_id);
  if(factory)next=rehash({...next,cost_owner_id:factory.costOwnerRowId,procurement_eligible:false,resource_graph:{...next.resource_graph,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',
   parentCostOwnerId:factory.costOwnerRowId,includedInResourceOwnerRowId:factory.costOwnerRowId,purchaseBalanceOwnerRowId:factory.costOwnerRowId,
   sourceFactoryInventoryR1:{stockOwnerRowId:s.stock.rowId,sourceCountPerActualKit:factory.sourceCountPerKit,actualSupplierScopeConfirmed:false,stockIsConsumptionOrRentalShifts:false},
   derivedQuantityEditPolicyV1:{contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:row.unit_id,parameterIds:[s.stock.effectiveParameterId],reasonRu:'Автоматическая принадлежность следует реальному комплекту, а не сваркам или оплаченным сменам; явная ручная правка сохраняет происхождение и не создаёт вторую оплату.'}}});
  const extra=s.additionalResources.find(x=>x.rowId===row.row_id);
  if(extra)next=rehash({...next,resource_graph:{...next.resource_graph,sourceScopeBoundaryR1:extra.scopeBoundary,physicalCostOwnerAccepted:false}});
  if(row.row_id==='rc09:optical_fiber_fusion_splice')next=rehash({...next,resource_graph:{...next.resource_graph,inputParameterIds:[s.decisionId,s.externalQaScopeParameterId,...s.actualRecords.map(f=>f.id)],scopeRequirementV1:{
   contractVersion:'canonical-scope-requirement/v1',kind:'OBJECT_SCOPE',objectFactMode:'PROJECT_APPLICABILITY_ONLY',groupId:'fiber-actual-splice-method-r1:actual',groupTitleRu:'Фактический метод сварки волокна',titleRu:'Применимость полного сварочного метода',
   reasonRu:'Подтверждённое число сварок не задаёт совместимость инструмента, кабеля, защиты и программы контроля. Неизвестная технология остаётся видимой потребностью.',
   exactScopeWhen:{kind:'and',operands:[active,{kind:'equals',parameterId:s.decisionId,value:'DOCUMENTED_COMPATIBLE'}]},objectFactParameterId:s.decisionId,unknownObjectValues:['UNKNOWN'],requiredFactParameterIds:[s.decisionId,s.externalQaScopeParameterId,...s.actualRecords.map(f=>f.id)],
   coveringRowIds:[],originalRowIds:[...declarations.keys()].filter(id=>id!==row.row_id),sourceEvidence:[{sha256:s.projectDocumentSha256,locator:'PROJECT_OPTICAL_SPLICE_METHOD and exact captured manufacturer/test-source bytes; source-only, no project/registry admission'}]}}});
  return next;
 });
 const formulas=[...currentFormulas,...a.formulas];
 if(new Set(parameters.map(x=>x.parameter_id)).size!==parameters.length||new Set(formulas.map(x=>x.formula_id)).size!==formulas.length||new Set(resources.map(x=>x.row_id)).size!==resources.length)throw Error('OPTICAL_CURRENT_SOURCE_ID_COLLISION');
 return{parameters,formulas,resources,runtimeInput:{},runtimeClassification:{},runtimeSourceIds:{},ordinaryParameterIds:['splice_count','fiber_standard']};
}

/** Structural source-candidate check, never an authenticated object, a wage
 * norm, a field measurement, an executed PASS or a second estimate compiler. */
export function assessOpticalFiberWholeSpliceMethodR1(value:unknown){
 const rec=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v),s=opticalWholeSourceR1,a=rec(value)?value:{},docs=rec(a.records)?a.records:{},issues:string[]=[];
 const missing=s.actualRecords.filter(f=>typeof docs[f.id]!=='string'||!String(docs[f.id]).trim()).map(f=>f.id);
 if(a.bindingChannel!=='SERVER_REVIEWED_PROJECT_RECORDS'||a.methodId!==s.candidateMethodId)issues.push('ACTUAL_SUPPORTED_ATOMIC_METHOD_REQUIRED');
 if(a.fiberStandard!=='SM_G652D'||a.splicerModel!=='90S+'||a.cleaverModel!=='CT50'||a.fiberGuide!=='AD-10-M24'||a.coatingStripper!=='SS03')issues.push('EXACT_SINGLE_FIBER_TOOL_METHOD_REQUIRED');
 for(const key of ['actualCablePreparationApproved','actualWorkEnvironmentApproved','actualPowerPlanApproved','actualFullInstructionBound','actualCleaningMethodsApproved','actualSleeveTrayApproved','actualTestEquipmentApproved','actualQaProgramApproved','actualExternalConsumerScopeApproved','actualStockOwnershipApproved'])if(a[key]!==true)issues.push('ACTUAL_CONDITION_REQUIRED:'+key);
 const bindings=rec(a.sourceBindings)?a.sourceBindings:{};
 for(const name of ['fujikura90splus-kit-fr-2403-0077-11.pdf','fluke-launch-tail-compensation.html','fluke-olts-otdr-complete-strategy.html']){
  const p=s.primarySources.find(p=>p.path==='primary-sources/'+name);if(!p?.sha256||bindings[name]!==p.sha256)issues.push('EXACT_PRIMARY_BINDING_REQUIRED:'+name);
 }
 const m=rec(a.measurements)?a.measurements:{},number=(key:string)=>typeof m[key]==='number'&&Number.isFinite(m[key])?m[key] as number:null;
 // Nominal passport/profile dimensions, not invented micrometer tolerances.
 const clad=number('nominalCladdingUm'),coat=number('nominalCoatingUm'),cleave=number('cleaveLengthMm');
 if(clad!==125)issues.push('CT50_WHOLE_METHOD_REQUIRES_125UM_CLADDING');
 if(coat!==250&&coat!==900)issues.push('ACTUAL_SUPPORTED_COATING_REQUIRED');
 if(cleave===null||cleave<(coat===250?5:10)||cleave>16)issues.push('OUTSIDE_SHARED_SPLICER_CLEAVER_LENGTH');
 if(cleave!==null&&cleave<10&&(coat!==250||a.cleaverShortLengthHeightAdjustmentApproved!==true))issues.push('SHORT_CLEAVE_REQUIRES_APPLICABLE_COATING_AND_HEIGHT_ADJUSTMENT');
 const sleeve=number('sleeveLengthMm'),diameter=number('sleevePreShrinkDiameterMm');
 if(!((a.sleeveModel==='FP-03'&&sleeve===60)||(a.sleeveModel==='FP-03(L=40)'&&sleeve===40))||diameter===null||diameter<=0||diameter>6||a.actualHeaterProgrammeApproved!==true)issues.push('EXACT_COMPATIBLE_PROTECTION_AND_HEATER_REQUIRED');
 for(const[key,min,max]of [['ambientMinC',-10,50],['ambientMaxC',-10,50],['relativeHumidityMaxPct',0,95]]as const){const v=number(key);if(v===null||v<min||v>max)issues.push('OUTSIDE_EXACT_TOOL_ENVIRONMENT:'+key);}
 const ambientMin=number('ambientMinC'),ambientMax=number('ambientMaxC');if(ambientMin!==null&&ambientMax!==null&&ambientMin>ambientMax)issues.push('REVERSED_TOOL_TEMPERATURE_INTERVAL');
 if(a.nonCondensing!==true)issues.push('NONCONDENSING_TOOL_ENVIRONMENT_REQUIRED');
 if(a.otdrRequiredByProgramme!==true||a.otdrModel!=='OFP2-100-S'||a.otdrPortPolish!=='UPC'||a.actualPortConnectorMatchApproved!==true||a.launchTailSameFiberApproved!==true||a.actualDeadZoneAndCompensationApproved!==true)issues.push('ACTUAL_OTDR_CONFIGURATION_AND_ACCESSORIES_REQUIRED');
 const directions=Array.isArray(a.plannedDirections)?a.plannedDirections:[];
 if(a.bidirectionalRequired===true&&!['END1','END2'].every(d=>directions.includes(d)))issues.push('BIDIRECTIONAL_PROGRAMME_REQUIRES_BOTH_ENDS');
 if(a.insertionLossScope==='REQUIRED_SEPARATE_OWNER'){
  if(typeof a.externalInsertionLossOwnerId!=='string'||!a.externalInsertionLossOwnerId.trim()||a.externalInsertionLossOwnerId===s.catalogId||a.actualOltsMethodApproved!==true)issues.push('REQUIRED_INSERTION_LOSS_EXTERNAL_OWNER_AND_METHOD');
 }else if(a.insertionLossScope!=='NOT_REQUIRED_BY_APPROVED_ATOMIC_PROGRAMME')issues.push('ACTUAL_INSERTION_LOSS_SCOPE_REQUIRED');
 const blocked=missing.length>0||issues.length>0;
 return{status:blocked?'BLOCKED':'COMPATIBILITY_INPUTS_PRESENT',visibleBlocked:blocked,missingActualRecordIds:missing,issues,sourceAdmission:false,projectApproval:false,
  documentAuthenticityAttested:false,estimateCompilationAllowed:false,physicalProvisionAccepted:false,executionPass:false,lineRouteOrOdfScopeAccepted:false,fullLinePass:false,FULL:false}as const;
}

export const OPTICAL_WHOLE_QUANTITY_SOURCE_R2=opticalWholeSourceR1.quantityForwardR2;
/** Source-owned projection of the existing atomic owner over ROOT's actual
 * body. Inventory, paid shifts and executed test results remain distinct. */
export function opticalFiberWholeOrdinaryQuantityModelR2():AutomaticOwnerDefinition{
 const s=opticalWholeSourceR1,q=s.quantityForwardR2,base=opticalFiberWholeSpliceMethodModelR1({parameters:q.actualParentModel.parameters as unknown as readonly CanonicalEstimateParameterDefinition[],formulas:q.actualParentModel.formulas as unknown as readonly CanonicalEstimateFormulaDefinition[],resources:q.actualParentModel.resources as unknown as readonly CanonicalEstimateResourceDefinition[]}),active={kind:'greater_than' as const,parameterId:'splice_count',value:0};
 const extra=buildAutomaticConstructionOwnerR1({contract:q.contract,semanticOwner:s.catalogId,sourceId:s.sourceId,normId:'PROJECT_OPTICAL_ACTUAL_POWERED_STOCK_NOT_CONSUMPTION_OR_SHIFTS',sourceMetadata:{source_title:q.titleRu,artifact_sha256:q.projectMethod.sha256,exact_locator:'Captured90S+PDF8/CT50pairing2AAA;capturedFlukeplainOFP2-100-Smodelblock'},applicabilityRu:'Точный полный сварочный комплект с включённым в пару скалывателем и отдельный базовый измерительный комплект по фактическому запасу. Не трасса, кросс и не подтверждение выполненных измерений.',
  ordinary:[{id:'splice_count',title:'Подтверждённые сварные соединения',kind:'internal',valueType:'integer',unitId:'pcs',min:1},{id:'fiber_otdr_getting_started_guides_qty_r2',title:'Количество кратких руководств измерительного комплекта',kind:'ordinary',valueType:'integer',unitId:'document',min:0}],profile:[],conditional:[{id:q.otdrStock.quantityParameterId,title:'Фактический запас полных измерительных комплектов',kind:'conditional',valueType:'integer',unitId:'pcs',min:1,resourceBranchConsumers:['rc09:optical_fiber_fusion_splice']},{id:q.recordId,title:'Проверенные комплекты, включение скалывателя, измерительное оснащение и единственный владелец',kind:'conditional',valueType:'text',unitId:null,resourceBranchConsumers:['rc09:optical_fiber_fusion_splice']}],deferMissingProjectFactsToRows:true,
  rows:[{rowId:q.otdrStock.rowId,formulaId:q.otdrStock.formulaId,title:q.otdrStock.nameRu,section:'Измерительное оснащение',category:'equipment',unitId:'pcs',expression:q.otdrStock.expression,inclusion:active,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS',purchaseBalanceOwnerRowId:q.otdrStock.costOwnerRowId,effectiveQuantityOutput:{parameterId:q.otdrStock.effectiveParameterId,unitId:'pcs'}},...q.otdrFactory.map(r=>({rowId:r.rowId,formulaId:r.formulaId,title:r.nameRu,section:'Состав измерительного комплекта',category:'equipment',unitId:r.unitId,expression:r.expression,inclusion:active,procurement:false,costTreatment:'INCLUDED_IN_RESOURCE_ROWS' as const,purchaseBalanceOwnerRowId:r.costOwnerRowId}))],excludedUnownedAssumptions:['No stock per splice or paidshift','No CT60/100S or SIinspection kit substitution','No batteries delivered/replaced per splice','No supplied calibration statement as valid calibration','No guidecount invented as one','No source assessment as wholeline OTDR/OLTS PASS']});
 const newParams=extra.parameters.filter(p=>!base.parameters.some(b=>b.parameter_id===p.parameter_id)),all=[...base.parameters,...newParams];
 const parameters=all.map((p,i)=>{
  if(p.parameter_id===q.kitInput||p.parameter_id===q.otdrStock.quantityParameterId||p.parameter_id===q.recordId){const{unresolved_norm_reason:_old,visible_when:_hidden,...truth}=p.truth_metadata;return{...p,ordinal:i,required:false,default_value:null,constraints_json:{...p.constraints_json,min:p.parameter_id===q.recordId?undefined:1,requiredWhen:active},truth_metadata:{...truth,contract:q.contract,semantic_parameter_key:s.catalogId+':'+p.parameter_id,value_source_role:'PROJECT_SPECIFIC_INPUT',visibility_role:'INTERNAL_ONLY',source_confirmation_required:p.parameter_id!==q.recordId,runtime_profile_value:false,hidden_default_forbidden:true,provenance:{consumer_input_role_v1:'OBJECT_FACT',input_channel_v1:'SERVER_REVIEWED_PROJECT_RECORDS'}}};}
  if(p.parameter_id===q.otdrStock.effectiveParameterId)return{...p,ordinal:i,required:false,default_value:null,constraints_json:{...p.constraints_json,conditionalWholeIntegerV1:{contractVersion:'canonical-conditional-whole-integer/v1',when:{kind:'equals',parameterId:s.decisionId,value:'DOCUMENTED_COMPATIBLE'}}},truth_metadata:{...p.truth_metadata,source_confirmation_required:false,provenance:{consumer_input_role_v1:'APPLICATION_TECHNICAL'}}};
  if(p.parameter_id==='fiber_otdr_getting_started_guides_qty_r2')return{...p,ordinal:i,required:false,default_value:null,truth_metadata:{...unresolvedApplicationNormTruthR1(p.truth_metadata,'Изготовитель перечисляет краткие руководства, но не задаёт число документов на комплект. Нужен точный состав поставки.'),visible_when:{kind:'literal',value:false},runtime_profile_value:false,hidden_default_forbidden:true}};
  return{...p,ordinal:i};
 });
 const formulas=[...base.formulas.map(f=>{const rule=q.quantityRules.find(r=>r.formulaId===f.formula_id);if(!rule||rule.expression===f.expression_source)return f;const a=compileFormulaGraph(rule.expression);return{...f,expression_source:rule.expression,ast:a.ast,input_parameter_ids:a.inputParameterIds,ast_sha256:estimateDeterministicHash(a.ast)};}),...extra.formulas],decl=new Map(q.resourceDeclarations.map(d=>[d.rowId,d])),ops=new Map(s.operationRoster.map(o=>[o.operationId,o]));
 const physicalIds=q.resourceDeclarations.filter(d=>d.rowKind==='RESOURCE').map(d=>d.rowId),requiredNew=[q.kitInput,q.otdrStock.quantityParameterId,q.recordId];
 const resources=[...base.resources,...extra.resources].map((r,i)=>{
  const d=decl.get(r.row_id);if(!d||d.formulaId!==r.formula_id||d.unitId!==r.unit_id)throw Error('OPTICAL_R2_CURRENT_SOURCE_IDENTITY_REQUIRED:'+r.row_id);
  const linked=d.operationIds.map(id=>{const op=ops.get(id);if(!op)throw Error('OPTICAL_R2_OPERATION_REQUIRED:'+id);return op;}),rule=q.quantityRules.find(x=>x.rowId===r.row_id),physical=q.physicalResourceOwners.find(x=>x.rowId===r.row_id),graph:Record<string,unknown>={...r.resource_graph,
   publicResourcePresentationV1:{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:r.title_ru,nameRu:d.publicNameRu,brandAndModelRu:null,specificationRu:null,detailsRu:[],resourceKind:d.resourceKind,...(d.rowKind==='RESOURCE'?{}:{rowKind:d.rowKind})},operationCompositionV1:{...linked[0]!,...(linked.length>1?{additionalOperations:linked.slice(1)}:{})},sourceWholeQuantityR2:{actualInventoryAccepted:false,poweredMethodAccepted:false,actualTestPass:false,sourceAdmission:false,physicalClosures:0}};
  if(physical){graph.priorCostTreatmentR1=r.resource_graph.costTreatment;if(physical.ownerRowId){graph.costTreatment=physical.costTreatment;if(physical.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'){graph.parentCostOwnerId=physical.ownerRowId;graph.includedInResourceOwnerRowId=physical.ownerRowId;graph.purchaseBalanceOwnerRowId=physical.ownerRowId;}}graph.physicalResourceCoverageHoldR2={actualOwnerCoverageAccepted:false,externalOwnerRequired:physical.costTreatment==='EXTERNAL_OWNER_REQUIRED',reasonRu:physical.reasonRu};}
  if(rule){const ids=compileFormulaGraph(rule.expression).inputParameterIds;graph.inputParameterIds=[...new Set([...(r.resource_graph.inputParameterIds as string[]??[]).filter(id=>id!==rule.originalNeedParameterId),...ids,q.recordId])];graph.actualStockQuantityRuleR2={expression:rule.expression,originalNeedId:rule.originalNeedParameterId,authority:rule.authority,stockNotConsumptionOrPaidShifts:true,actualInventoryAccepted:false};graph.derivedQuantityEditPolicyV1={contractVersion:'canonical-derived-quantity-edit-policy/v1',mode:'PARAMETERS_ONLY',unitId:'pcs',parameterIds:ids,reasonRu:'Фактический полный комплект и установленный запас элементов питания. Ручное значение сохраняется с происхождением, не подтверждает метод/поставку и не создаёт вторую оплату.'};}
  if(r.row_id==='rc09:optical_fiber_fusion_splice'){const prior=r.resource_graph.scopeRequirementV1 as Record<string,unknown>,facts=[...(prior.requiredFactParameterIds as string[]),...requiredNew];graph.inputParameterIds=[...(r.resource_graph.inputParameterIds as string[]),...requiredNew];graph.scopeRequirementV1={...prior,requiredFactParameterIds:facts,originalRowIds:[...(prior.originalRowIds as string[]),...q.newResources.map(x=>x.rowId)],projectOperationContextsV1:[{when:active,resourceRowIds:physicalIds,applicabilityWhen:active,requiredFactParameterIds:facts}],sourceEvidence:[...(prior.sourceEvidence as unknown[]),{sha256:q.projectMethod.sha256,locator:'R2 exact poweredkit and plainOTDR stock; required actual allocation, full instruction and QA records; no full-line acceptance'}]};}
  const{row_sha256:_old,...body}=r,next={...body,ordinal:i,...(physical?.ownerRowId?{cost_owner_id:physical.ownerRowId,procurement_eligible:false}:{}),resource_graph:graph};return{...next,row_sha256:estimateDeterministicHash(next)};
 });
 if(new Set(parameters.map(p=>p.parameter_id)).size!==parameters.length||new Set(formulas.map(f=>f.formula_id)).size!==formulas.length||new Set(resources.map(r=>r.row_id)).size!==resources.length)throw Error('OPTICAL_R2_ID_COLLISION');
 return{...base,parameters,formulas,resources};
}

/** Compatibility input check only. No source strings authenticate an object,
 * establish safe instructions, approve a norm or certify a physical test. */
export function assessOpticalWholeQuantityInputsR2(value:unknown){
 const rec=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x),a=rec(value)?value:{},q=OPTICAL_WHOLE_QUANTITY_SOURCE_R2,base=assessOpticalFiberWholeSpliceMethodR1(value),docs=rec(a.records)?a.records:{},issues=[...base.issues],missing=[...base.missingActualRecordIds];
 if(typeof docs[q.recordId]!=='string'||!String(docs[q.recordId]).trim())missing.push(q.recordId);
 for(const id of[q.kitInput,q.otdrStock.quantityParameterId])if(typeof a[id]!=='number'||!Number.isSafeInteger(a[id])||(a[id]as number)<1)issues.push('ACTUAL_COMPLETE_TOOLKIT_STOCK_REQUIRED:'+id);
 for(const k of['actualPoweredCt50PairingAndCellsReviewed','actualPlainOtdrKitAndSeparateInspectionAccessoriesReviewed','actualOtdrProgrammeDirectionsLimitsRawResultsReviewed','actualPhysicalOwnerCoverageAndAllocationReviewed'])if(a[k]!==true)issues.push('ACTUAL_OPTICAL_R2_CONDITION_REQUIRED:'+k);
 if(a.manualUnpoweredCt50Substituted===true||a.ct60Or100sSubstituted===true||a.siInspectionKitImportedAsPlain===true)issues.push('EXACT_POWERED_CT50_AND_PLAIN_OTDR_PROFILE_REQUIRED');
 const m=rec(a.measurements)?a.measurements:{},lo=m.ambientMinC,hi=m.ambientMaxC,alt=m.siteAltitudeM,power=a.otdrPowerMode,continuous=a.otdrContinuousRealTimeTrace;
 if(!['BATTERY','AC'].includes(String(power))||typeof continuous!=='boolean'||typeof lo!=='number'||typeof hi!=='number'||typeof alt!=='number'||!Number.isFinite(alt)||alt<0||alt>(power==='AC'?3200:4000)||lo<(power==='AC'?0:-10)||hi>(continuous===true?35:45)||a.actualOtdrPowerAndRealTimeDutyReviewed!==true)issues.push('ACTUAL_WHOLE_OTDR_POWER_TEMPERATURE_ALTITUDE_DUTY_REQUIRED');
 if(a.spliceMetresAsSpliceCount===true||a.technicalTimingAsLabour===true||a.splicerLossOrOtdrAsRequiredOltsPass===true||a.supplierCalibrationStatementAsCurrentValidity===true)issues.push('FALSE_QUANTITY_OR_FULL_LINE_PASS_FORBIDDEN');
 return{...base,status:issues.length||missing.length?'BLOCKED':'COMPATIBILITY_INPUTS_PRESENT',issues,missingActualRecordIds:missing,actualInventoryAccepted:false,actualOtdrOrOltsPass:false,sourceAdmission:false,estimateCompilationAllowed:false,FULL:false}as const;
}
