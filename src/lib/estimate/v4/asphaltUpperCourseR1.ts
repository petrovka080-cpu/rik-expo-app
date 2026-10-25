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
  ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
  ASPHALT_INSTALL_KRER27_SOURCE_METADATA,
  ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
} from "./asphaltInstallKrer27ProfileR1";

type Json = Record<string, unknown>;

export const ASPHALT_UPPER_COURSE_CATALOG_ID =
  "canonical-work:base:paving_roads_landscape_interior_asphalt_lay_standard";
export const ASPHALT_UPPER_COURSE_SOURCE_ID = "kg_krer_27_06_020_01_021_01_2015";
export const ASPHALT_UPPER_COURSE_NORM_ID = "KRER-27-06-020-01-PLUS-021-01-50MM-S27-19";

export const ASPHALT_UPPER_COURSE_SOURCE_METADATA = Object.freeze({
  ...ASPHALT_INSTALL_KRER27_SOURCE_METADATA,
  source_document_version: "KRER_2015_27_06_020_01_021_01_S27_19_FIRST_ESTIMATE_PROFILE",
  definition_hash: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
  use_restriction:
    "Один верхний слой горячего плотного мелкозернистого асфальтобетона толщиной 30–200 мм на принятом подготовленном основании. Площадь и толщина пользователя имеют приоритет; нормы КРЕР, логистика и контроль применяются как видимый заменяемый предварительный профиль.",
});

function projectParameter(
  parameter: CanonicalEstimateParameterDefinition,
): CanonicalEstimateParameterDefinition {
  const userGeometry = parameter.parameter_id === "area_m2"
    || parameter.parameter_id === "layer_thickness_mm";
  const truth = (parameter.truth_metadata ?? {}) as Json;
  const guide = truth.guide && typeof truth.guide === "object" && !Array.isArray(truth.guide)
    ? truth.guide as Json
    : {};
  return {
    ...parameter,
    truth_metadata: {
      ...truth,
      contract: "rik-expo-app.s27-18.asphalt-upper-course-first-estimate.v1",
      semantic_parameter_key: `asphalt-upper-course-s27-18:${parameter.parameter_id}`,
      visibility_role: userGeometry ? "USER_INPUT" : truth.visibility_role,
      value_source_role: userGeometry
        ? "USER_MEASURED"
        : truth.value_source_role,
      input_origin_class: userGeometry
        ? "KNOWN_WORK_SCOPE"
        : truth.input_origin_class,
      preliminary_compilation_allowed: !userGeometry,
      guide: {
        ...guide,
        guide_short_ru: parameter.parameter_id === "area_m2"
          ? "Площадь верхнего слоя берётся из обычного запроса или обмера."
          : parameter.parameter_id === "layer_thickness_mm"
            ? "Толщина верхнего слоя берётся из обычного запроса; предварительно принято 50 мм, если она не указана."
            : guide.guide_short_ru,
        guide_version: "asphalt-upper-course-s27-18",
        source_snapshot_hash: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
        applicability: ASPHALT_UPPER_COURSE_SOURCE_METADATA.use_restriction,
      },
    },
  };
}

function projectResource(
  resource: CanonicalEstimateResourceDefinition,
): CanonicalEstimateResourceDefinition {
  const graph = {
    ...(resource.resource_graph ?? {}),
    semanticOwnerId: `asphalt-upper-course-s27-18:${resource.row_id}`,
    primaryMeasureParameterId: "area_m2",
    visibleAssumptionPolicy:
      "Сначала рассчитывается полный состав выбранного верхнего слоя. Площадь и толщина пользователя имеют приоритет; нормативные и логистические параметры можно заменить в расширенном редакторе.",
  };
  const metadata = {
    ...(resource.source_metadata ?? {}),
    sourcePackSha256: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
    selectedScope: "UPPER_ASPHALT_COURSE_FROM_ACCEPTED_BASE_TO_HANDOVER",
  };
  const projected = {
    ...resource,
    resource_graph: graph,
    source_metadata: metadata,
  };
  const { row_sha256: _previous, ...hashInput } = projected;
  return { ...projected, row_sha256: estimateDeterministicHash(hashInput) };
}

export const ASPHALT_UPPER_COURSE_PARAMETERS = Object.freeze(
  ASPHALT_INSTALL_KRER27_PARAMETERS.map(projectParameter),
);
const geometricVolumeExpression = "area_m2*layer_thickness_mm/1000";
const geometricVolumeCompiled = compileFormulaGraph(geometricVolumeExpression);
const geometricVolumeFormula: CanonicalEstimateFormulaDefinition = {
  formula_id: "asphalt_upper_course_geometric_volume_s2718",
  output_unit_id: "m3",
  expression_source: geometricVolumeExpression,
  ast: geometricVolumeCompiled.ast,
  input_parameter_ids: geometricVolumeCompiled.inputParameterIds,
  ast_sha256: estimateDeterministicHash(geometricVolumeCompiled.ast),
};

export const ASPHALT_UPPER_COURSE_FORMULAS = Object.freeze([
  geometricVolumeFormula,
  ...ASPHALT_INSTALL_KRER27_FORMULAS,
]);
const geometricVolumeResource = projectResource({
  id: "resource-asphalt-control-geometric-compacted-volume",
  row_id: "asphalt:control:geometric-compacted-volume",
  ordinal: 0,
  section: "Геометрия покрытия",
  category: "service",
  title_ru: "Геометрический объём верхнего слоя асфальтобетона",
  unit_id: "m3",
  formula_id: geometricVolumeFormula.formula_id,
  inclusion_ast: { kind: "literal", value: true },
  resource_graph: {
    formulaId: geometricVolumeFormula.formula_id,
    normalizedUom: "m3",
    semanticOwnerId: "asphalt-upper-course-s27-18:geometric-volume",
    costOwner: "scope",
    costTreatment: "INFORMATIONAL_SCOPE",
    payable: false,
    noDoubleCount: true,
    primaryMeasureParameterId: "area_m2",
  },
  procurement_eligible: false,
  cost_owner_id: null,
  source_metadata: {
    truth_contract_version: "R3",
    synthetic: false,
    sourceRole: "USER_GEOMETRY_DERIVATION",
    sourcePackSha256: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
    normativeTrace: [],
  },
  row_sha256: "",
});
export const ASPHALT_UPPER_COURSE_RESOURCES = Object.freeze([
  geometricVolumeResource,
  ...ASPHALT_INSTALL_KRER27_RESOURCES.map((resource, index) =>
    projectResource({ ...resource, ordinal: index + 1 })),
]);

export const ASPHALT_UPPER_COURSE_INDEPENDENT_COMPLETENESS_MAP = Object.freeze({
  contract: "rik-expo-app.s26-3.independent-completeness-map.v1",
  sourceKind: "NORMATIVE_OPERATION_MAP",
  generatedFromCurrentRows: false,
  evidenceSha256: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
  sourcePackPath: ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP.sourcePackPath,
  entries: [
    {
      operationId: "operation.geometry",
      expectedResourceId: "required-component:geometry.compacted-volume",
      category: "operation",
      specification: "Geometric compacted volume from ordinary area and thickness input",
      condition: "upper_asphalt_course_selected",
      sourceId: "user_geometry_derivation",
      unitId: "m3",
      quantityRule: "area_m2 * layer_thickness_mm / 1000",
      detailPrinciple: "volume is shown independently from the normative purchase mass",
      priceRelation: "INFORMATIONAL_SCOPE",
      formulaId: geometricVolumeFormula.formula_id,
      resolution: { kind: "ROW", rowId: geometricVolumeResource.row_id },
    },
    ...ASPHALT_INSTALL_KRER27_INDEPENDENT_COMPLETENESS_MAP.entries,
  ],
});

export const ASPHALT_UPPER_COURSE_SHORT_INPUT = Object.freeze({
  area_m2: 900,
  layer_thickness_mm: 50,
});

export const ASPHALT_UPPER_COURSE_ACCEPTANCE_INPUT = Object.freeze({
  ...ASPHALT_UPPER_COURSE_SHORT_INPUT,
  ...ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
});

export async function compileAsphaltUpperCourseR1(
  submittedParameters: Record<string, unknown>,
  options: Readonly<{ catalogId?: string }> = {},
): Promise<CanonicalEstimateCompileCoreResult> {
  const catalogId = options.catalogId ?? ASPHALT_UPPER_COURSE_CATALOG_ID;
  if (catalogId !== ASPHALT_UPPER_COURSE_CATALOG_ID) {
    throw new Error(`ASPHALT_UPPER_COURSE_CATALOG_UNSUPPORTED:${catalogId}`);
  }
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.asphalt-upper-course-s27-18",
    catalogId,
    primaryMeasureParameterId: "area_m2",
    parameterDefinitions: [...ASPHALT_UPPER_COURSE_PARAMETERS],
    formulaDefinitions: [...ASPHALT_UPPER_COURSE_FORMULAS],
    resourceDefinitions: [...ASPHALT_UPPER_COURSE_RESOURCES],
    submittedParameters,
    confirmedParameters: ASPHALT_INSTALL_KRER27_RUNTIME_INPUT,
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: ASPHALT_UPPER_COURSE_RESOURCES.length,
    hashJson: async (value) => estimateDeterministicHash(value),
  });
}

export const ASPHALT_UPPER_COURSE_SOURCE_SUMMARY = Object.freeze({
  sourceId: ASPHALT_UPPER_COURSE_SOURCE_ID,
  normId: ASPHALT_UPPER_COURSE_NORM_ID,
  sourcePackSha256: ASPHALT_INSTALL_KRER27_SOURCE_PACK_SHA256,
  formula:
    "Площадь и толщина определяют геометрический объём; КРЕР 27-06-020-01 и поправка 27-06-021-01 автоматически рассчитывают смесь, материалы, труд и механизмы, а видимый предварительный профиль — доставку и контроль.",
});
