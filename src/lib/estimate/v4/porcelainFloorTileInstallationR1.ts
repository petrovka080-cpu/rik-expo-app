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

export const PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID =
  "canonical-work:base:tile_stone_interior_porcelain_tile_lay_standard";
export const PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID =
  "project_porcelain_floor_tile_installation_system_v1";
export const PORCELAIN_FLOOR_TILE_INSTALLATION_NORM_ID =
  "norm:project:porcelain_floor_tile_installation:system:v1";

export const PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA = Object.freeze({
  source_title: "Утверждённая раскладка керамогранита 600×600 мм, ведомость плиточной системы, швов и ППР укладки",
  source_authority: "Проектная организация, изготовитель плиточной системы и утверждающий инженер проекта",
  source_document_version: "PROJECT_TILE_LAYOUT_PRODUCT_SYSTEM_JOINT_SCHEDULE_AND_METHOD_REVISION_EXPLICIT",
  definition_hash: "eh_project_porcelain_floor_tile_installation_system_r1",
  exact_locator: "Площадь пола, формат 600×600 мм, шов 2 мм; раскладка и подрезка, плитка, клей C2TE S1, затирка, клипсы, деформационные швы, водяная резка и состояние основания",
  use_restriction: "Известная площадь, формат и шов определяют объём работы; закупочные количества, деформационные швы, машино-часы и условные подготовительные слои берутся из утверждённой раскладки, продуктовой системы, обследования основания и ППР",
});

const CONDITIONAL_DETAILS = new Set([
  "floor_leveling_compound_designation",
  "floor_leveling_compound_mass_kg",
  "floor_waterproofing_designation",
  "floor_waterproofing_area_m2",
]);

const PARAMETER_SPECS = Object.freeze([
  ["area_m2", "Площадь укладки керамогранита на пол", "decimal", "m2", null],
  ["tile_length_mm", "Длина плитки керамогранита", "decimal", "mm", null],
  ["tile_width_mm", "Ширина плитки керамогранита", "decimal", "mm", null],
  ["joint_width_mm", "Ширина межплиточного шва", "decimal", "mm", null],
  ["porcelain_tile_designation", "Керамогранит 600×600 мм по ведомости отделки", "text", null, null],
  ["porcelain_tile_quantity_m2", "Закупочная площадь керамогранита по раскладке и подрезке", "decimal", "m2", null],
  ["tile_adhesive_designation", "Эластичный плиточный клей класса C2TE S1", "text", null, null],
  ["tile_adhesive_mass_kg", "Масса плиточного клея", "decimal", "kg", null],
  ["tile_grout_designation", "Цементная затирка для шва 2 мм", "text", null, null],
  ["tile_grout_mass_kg", "Масса цементной затирки", "decimal", "kg", null],
  ["tile_clip_designation", "Расходуемая клипса системы выравнивания для шва 2 мм", "text", null, null],
  ["tile_clip_quantity_piece", "Количество расходуемых клипс", "decimal", "piece", null],
  ["movement_joint_silicone_designation", "Нейтральный силикон для деформационных швов", "text", null, null],
  ["movement_joint_silicone_volume_l", "Объём силикона деформационных швов", "decimal", "l", null],
  ["wet_tile_saw_designation", "Станок водяной резки керамогранита по ППР", "text", null, null],
  ["wet_tile_saw_machine_h", "Машино-часы станка водяной резки", "decimal", "machine_hour", null],
  ["floor_leveling_mode", "Выравнивающий состав пола требуется в границе пакета", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["floor_leveling_compound_designation", "Выравнивающий состав по обследованию основания", "text", null, null],
  ["floor_leveling_compound_mass_kg", "Масса выравнивающего состава", "decimal", "kg", null],
  ["floor_waterproofing_mode", "Гидроизоляция пола требуется в границе пакета", "enum", null, ["NOT_REQUIRED", "REQUIRED"]],
  ["floor_waterproofing_designation", "Гидроизоляционная система по проекту мокрой зоны", "text", null, null],
  ["floor_waterproofing_area_m2", "Площадь гидроизоляции пола", "decimal", "m2", null],
] as const);

function conditionalConstraints(parameterId: string): Json {
  if (parameterId.startsWith("floor_leveling_compound_")) {
    return {
      requiredWhen: { kind: "equals", parameterId: "floor_leveling_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "floor_leveling_mode", value: "NOT_REQUIRED" },
    };
  }
  if (parameterId.startsWith("floor_waterproofing_") && parameterId !== "floor_waterproofing_mode") {
    return {
      requiredWhen: { kind: "equals", parameterId: "floor_waterproofing_mode", value: "REQUIRED" },
      forbiddenWhen: { kind: "equals", parameterId: "floor_waterproofing_mode", value: "NOT_REQUIRED" },
    };
  }
  return {};
}

export type PorcelainFloorTileInstallationParameter = CanonicalEstimateParameterDefinition & {
  ordinal: number;
  unit_id: string | null;
  title_ru: string;
  truth_metadata: Json;
};

export const PORCELAIN_FLOOR_TILE_INSTALLATION_PARAMETERS:
readonly PorcelainFloorTileInstallationParameter[] = Object.freeze(PARAMETER_SPECS.map(
  ([parameterId, titleRu, valueType, unitId, enumValues], ordinal) => ({
    parameter_id: parameterId,
    ordinal,
    value_type: valueType,
    unit_id: unitId,
    title_ru: titleRu,
    required: !CONDITIONAL_DETAILS.has(parameterId),
    default_value: null,
    constraints_json: {
      ...(enumValues
        ? { values: enumValues }
        : valueType === "decimal"
          ? { min: 0.000_001 }
          : valueType === "text"
            ? { minLength: 1, maxLength: 1_000 }
            : {}),
      ...conditionalConstraints(parameterId),
    },
    truth_metadata: {
      contract: "rik-expo-app.porcelain-floor-tile-installation-r1",
      semantic_parameter_key: `porcelain-floor-tile-installation:${parameterId}`,
      visibility_role: "USER_INPUT",
      value_source_role: ["area_m2", "tile_length_mm", "tile_width_mm", "joint_width_mm"].includes(parameterId)
        ? "USER_INPUT"
        : "PROJECT_SPECIFIC_INPUT",
      input_origin_class: ["area_m2", "tile_length_mm", "tile_width_mm", "joint_width_mm"].includes(parameterId)
        ? "KNOWN_WORK_SCOPE"
        : "APPROVED_TILE_LAYOUT_PRODUCT_SYSTEM_SUBSTRATE_SURVEY_METHOD_STATEMENT_OR_JOINT_PLAN",
      preliminary_compilation_allowed: true,
      source_confirmation_required: !["area_m2", "tile_length_mm", "tile_width_mm", "joint_width_mm"].includes(parameterId),
      guide: {
        guide_kind: ["area_m2", "tile_length_mm", "tile_width_mm", "joint_width_mm"].includes(parameterId)
          ? "MEASUREMENT_RULE"
          : "PROJECT_DEFINED",
        guide_short_ru: parameterId === "area_m2"
          ? `${titleRu}: укажите чистую площадь пола по обмеру или проекту.`
          : ["tile_length_mm", "tile_width_mm", "joint_width_mm"].includes(parameterId)
            ? `${titleRu}: укажите из задания, раскладки или ведомости отделки.`
            : `${titleRu}: укажите по раскладке, продуктовой системе, обследованию основания, плану швов или ППР.`,
        source_role: ["area_m2", "tile_length_mm", "tile_width_mm", "joint_width_mm"].includes(parameterId)
          ? "USER_MEASURED_OR_APPROVED_DRAWING"
          : "APPROVED_PROJECT_PRODUCT_OR_METHOD_DOCUMENTATION",
        source_document: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID,
        source_locator: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.exact_locator,
        guide_version: "porcelain-floor-tile-installation-r1",
        source_snapshot_hash: "9132255274636b2af33e7adce904f6580068701f6c8e97f755591228fa41b42c",
        applicability: "Только для укладки напольного керамогранита 600×600 мм со швом 2 мм без автоматического включения выравнивания основания или гидроизоляции.",
        verified_at: "2026-09-19T00:00:00+06:00",
        guide_validation_policy: "DEFER_MISSING_PROJECT_VALUE_ROW_LOCALLY_REJECT_INVALID_SUPPLIED_VALUE",
      },
      hidden_default_forbidden: true,
      synthetic: false,
    },
  })),
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

export const PORCELAIN_FLOOR_TILE_INSTALLATION_FORMULAS:
readonly CanonicalEstimateFormulaDefinition[] = Object.freeze([
  formula("porcelain_floor_tile_lay_area_v1", "m2", "area_m2"),
  formula("porcelain_tile_600x600_quantity_v1", "m2", "porcelain_tile_quantity_m2"),
  formula("c2te_s1_tile_adhesive_mass_v1", "kg", "tile_adhesive_mass_kg"),
  formula("cement_grout_2mm_joint_mass_v1", "kg", "tile_grout_mass_kg"),
  formula("tile_leveling_consumable_clip_2mm_quantity_v1", "piece", "tile_clip_quantity_piece"),
  formula("neutral_silicone_movement_joint_volume_v1", "l", "movement_joint_silicone_volume_l"),
  formula("wet_tile_saw_time_v1", "machine_hour", "wet_tile_saw_machine_h"),
  formula("floor_leveling_compound_mass_v1", "kg", "floor_leveling_compound_mass_kg"),
  formula("floor_waterproofing_area_v1", "m2", "floor_waterproofing_area_m2"),
]);

const literalTrue = Object.freeze({ kind: "literal", value: true });
const equals = (parameterId: string, value: InputValue) => ({ kind: "equals", parameterId, value });

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
}): CanonicalEstimateResourceDefinition {
  const resourceGraph = {
    formulaId: input.formulaId,
    normalizedUom: input.unitId,
    semanticOwnerId: `porcelain-floor-tile-installation:${input.rowId}`,
    costOwner: "resource",
    ...(input.titleParameterIds ? {
      titleSpecificationParameterIds: input.titleParameterIds,
      titleSpecificationMode: "APPEND",
      titleSpecificationSeparator: " ",
    } : {}),
    scopeContextParameterIds: ["area_m2", "tile_length_mm", "tile_width_mm", "joint_width_mm"],
  };
  const sourceMetadata = {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: input.sourceRole,
    normativeTrace: [{
      sourceId: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID,
      source_id: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID,
      normId: PORCELAIN_FLOOR_TILE_INSTALLATION_NORM_ID,
      norm_id: PORCELAIN_FLOOR_TILE_INSTALLATION_NORM_ID,
      normVersion: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.source_document_version,
      source_title: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.source_title,
      exact_locator: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.exact_locator,
      source_definition_hash: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_METADATA.definition_hash,
      sourceRole: input.sourceRole,
    }],
    excludedUnownedAssumptions: [
      "automatic tile reserve, cutting loss or layout factor",
      "automatic adhesive or grout consumption",
      "automatic clip density or movement-joint length",
      "automatic wet-saw productivity",
      "generic tile-leveling-system area row",
      "unconfirmed floor leveling, screed or waterproofing",
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

export const PORCELAIN_FLOOR_TILE_INSTALLATION_RESOURCES:
readonly CanonicalEstimateResourceDefinition[] = Object.freeze([
  resource({ rowId: "rc09:porcelain_floor_tile_lay", ordinal: 0, section: "Работы", category: "construction_work", titleRu: "Укладка керамогранита 600×600 мм на пол со швом 2 мм", unitId: "m2", formulaId: "porcelain_floor_tile_lay_area_v1", procurementEligible: false, sourceRole: "USER_MEASURED_OR_APPROVED_DRAWING" }),
  resource({ rowId: "rc09:porcelain_tile_600x600", ordinal: 1, section: "Материалы", category: "material", titleRu: "Плитка керамогранитная напольная 600×600 мм", unitId: "m2", formulaId: "porcelain_tile_600x600_quantity_v1", procurementEligible: true, titleParameterIds: ["porcelain_tile_designation"], sourceRole: "APPROVED_TILE_LAYOUT_AND_FINISH_SCHEDULE" }),
  resource({ rowId: "rc09:c2te_s1_tile_adhesive", ordinal: 2, section: "Материалы", category: "material", titleRu: "Клей плиточный эластичный класса C2TE S1", unitId: "kg", formulaId: "c2te_s1_tile_adhesive_mass_v1", procurementEligible: true, titleParameterIds: ["tile_adhesive_designation"], sourceRole: "APPROVED_TILE_PRODUCT_SYSTEM_AND_SUBSTRATE" }),
  resource({ rowId: "rc09:cement_grout_2mm_joint", ordinal: 3, section: "Материалы", category: "material", titleRu: "Затирка цементная для шва 2 мм", unitId: "kg", formulaId: "cement_grout_2mm_joint_mass_v1", procurementEligible: true, titleParameterIds: ["tile_grout_designation"], sourceRole: "APPROVED_TILE_AND_GROUT_PRODUCT_SYSTEM" }),
  resource({ rowId: "rc09:tile_leveling_consumable_clip_2mm", ordinal: 4, section: "Материалы", category: "material", titleRu: "Клипса расходуемая системы выравнивания плитки, шов 2 мм", unitId: "piece", formulaId: "tile_leveling_consumable_clip_2mm_quantity_v1", procurementEligible: true, titleParameterIds: ["tile_clip_designation"], sourceRole: "APPROVED_TILE_LAYOUT_AND_INSTALLATION_METHOD" }),
  resource({ rowId: "rc09:neutral_silicone_movement_joint", ordinal: 5, section: "Материалы", category: "material", titleRu: "Герметик силиконовый нейтральный для деформационных швов", unitId: "l", formulaId: "neutral_silicone_movement_joint_volume_v1", procurementEligible: true, titleParameterIds: ["movement_joint_silicone_designation"], sourceRole: "APPROVED_MOVEMENT_JOINT_PLAN" }),
  resource({ rowId: "rc09:wet_tile_saw", ordinal: 6, section: "Оборудование", category: "equipment", titleRu: "Станок водяной резки керамогранита", unitId: "machine_hour", formulaId: "wet_tile_saw_time_v1", procurementEligible: true, titleParameterIds: ["wet_tile_saw_designation"], sourceRole: "APPROVED_TILE_CUTTING_METHOD_STATEMENT" }),
  resource({ rowId: "rc09:floor_leveling_compound", ordinal: 7, section: "Условные материалы", category: "material", titleRu: "Состав для выравнивания основания пола", unitId: "kg", formulaId: "floor_leveling_compound_mass_v1", inclusionAst: equals("floor_leveling_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["floor_leveling_compound_designation"], sourceRole: "APPROVED_SUBSTRATE_SURVEY_AND_LEVELING_SPECIFICATION" }),
  resource({ rowId: "rc09:floor_waterproofing", ordinal: 8, section: "Условные материалы", category: "material", titleRu: "Гидроизоляционная система пола мокрой зоны", unitId: "m2", formulaId: "floor_waterproofing_area_v1", inclusionAst: equals("floor_waterproofing_mode", "REQUIRED"), procurementEligible: true, titleParameterIds: ["floor_waterproofing_designation"], sourceRole: "APPROVED_WET_AREA_WATERPROOFING_PROJECT" }),
]);

export const PORCELAIN_FLOOR_TILE_INSTALLATION_SHORT_INPUT = Object.freeze({
  area_m2: 120,
  tile_length_mm: 600,
  tile_width_mm: 600,
  joint_width_mm: 2,
});

export const PORCELAIN_FLOOR_TILE_INSTALLATION_ACCEPTANCE_INPUT = Object.freeze({
  area_m2: 120,
  tile_length_mm: 600,
  tile_width_mm: 600,
  joint_width_mm: 2,
  porcelain_tile_designation: "Керамогранит напольный 600×600 мм по утверждённой раскладке",
  porcelain_tile_quantity_m2: 129.6,
  tile_adhesive_designation: "Эластичный плиточный клей C2TE S1 совместимой системы",
  tile_adhesive_mass_kg: 624,
  tile_grout_designation: "Цементная затирка совместимой системы для шва 2 мм",
  tile_grout_mass_kg: 33.6,
  tile_clip_designation: "Расходуемая клипса системы выравнивания для шва 2 мм по раскладке",
  tile_clip_quantity_piece: 1380,
  movement_joint_silicone_designation: "Нейтральный силикон по плану деформационных швов",
  movement_joint_silicone_volume_l: 3,
  wet_tile_saw_designation: "Станок водяной резки по ППР укладки керамогранита",
  wet_tile_saw_machine_h: 3,
  floor_leveling_mode: "NOT_REQUIRED",
  floor_waterproofing_mode: "NOT_REQUIRED",
});

export async function compilePorcelainFloorTileInstallationR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID;
  if (catalogId !== PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_ID) {
    throw new Error(`PORCELAIN_FLOOR_TILE_INSTALLATION_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.porcelain-floor-tile-installation-r1",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...PORCELAIN_FLOOR_TILE_INSTALLATION_PARAMETERS],
    formulaDefinitions: [...PORCELAIN_FLOOR_TILE_INSTALLATION_FORMULAS],
    resourceDefinitions: [...PORCELAIN_FLOOR_TILE_INSTALLATION_RESOURCES],
    submittedParameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 12,
    hashJson: async (value) => JSON.stringify(value),
  });
}

export const PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_SUMMARY = Object.freeze({
  sourceId: PORCELAIN_FLOOR_TILE_INSTALLATION_SOURCE_ID,
  normId: PORCELAIN_FLOOR_TILE_INSTALLATION_NORM_ID,
  formula: "known floor area, 600x600 mm format and 2 mm joint give tile-laying work only; exact tile, adhesive, grout, clips, movement-joint sealant, saw and conditional substrate layers come from approved layout, project, product-system, survey and method documents",
});
