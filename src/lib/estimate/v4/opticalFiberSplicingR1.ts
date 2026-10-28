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
