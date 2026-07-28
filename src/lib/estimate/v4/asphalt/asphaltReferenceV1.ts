import type { EstimateWorkProfileRegistration } from "../../workProfiles/estimateWorkProfileRegistry";
import {
  ASPHALT_PARAMETER_SCHEMA_ID_V4,
  ASPHALT_V4_RUNTIME_TEMPLATE_VERSION,
  ASPHALT_WORK_ID_V4,
} from "./asphaltV4Constants";
import {
  ASPHALT_ASSEMBLY_PROFILE_BY_ROAD_SCOPE_V4,
  ROAD_SCOPE_SELECTION_QUESTION_RU,
  type RoadScopeIdV4,
} from "./roadScopeTruthV4";

export const ASPHALT_REFERENCE_V1_ID = "ASPHALT_REFERENCE_V1" as const;
export const ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION =
  "asphalt-formula-graph:2026-07-22.phase1.v1" as const;

const REQUIRED_GEOMETRY_ALTERNATIVES = [
  { alternativeId: "area", parameterKeys: ["area_m2"] },
  { alternativeId: "length_width", parameterKeys: ["length_m", "width_m"] },
] as const;

export const ASPHALT_REFERENCE_V1_PROFILE: EstimateWorkProfileRegistration = {
  registrationVersion: "1.0.0",
  workPassportId: ASPHALT_REFERENCE_V1_ID,
  canonicalWorkKey: ASPHALT_WORK_ID_V4,
  catalogWorkIds: [
    ASPHALT_WORK_ID_V4,
    "asphalt_paving",
    "asphalt_concrete_surface",
  ],
  scopePresets: ROAD_SCOPE_SELECTION_QUESTION_RU.options.map((option) => ({
    scopePresetId: option.scopeId,
    labelRu: option.label,
    calculationStrategyId: `asphalt-road:${option.scopeId}:v4`,
    parameterSchemaVersion: ASPHALT_PARAMETER_SCHEMA_ID_V4,
    engineVersion: ASPHALT_V4_RUNTIME_TEMPLATE_VERSION,
    requiredParameterAlternatives: REQUIRED_GEOMETRY_ALTERNATIVES,
  })),
  formulaGraphVersion: ASPHALT_REFERENCE_V1_FORMULA_GRAPH_VERSION,
  readiness: {
    catalogMapped: "PROVEN",
    runtimeCompilable: "PROVEN",
    formulaInvariant: "PROVEN",
    normativeVerified: "PARTIAL_REVIEW_REQUIRED",
    priceCovered: "NOT_COVERED",
    referenceAccepted: "QUANTITY_REFERENCE_ACCEPTED",
  },
};

export type AsphaltReferenceV1Golden = {
  scopePresetId: RoadScopeIdV4;
  assemblyProfileId: string;
  fixtureInput: Readonly<{ area_m2: number }>;
  expectedRowCount: number;
  expectedCorpusHash: string;
  requiredRowIds: readonly string[];
  forbiddenRowIds: readonly string[];
  requiredCategories: readonly string[];
  priceReadiness: "PRICE_DATA_REQUIRED";
};

export const ASPHALT_REFERENCE_V1_GOLDENS: readonly AsphaltReferenceV1Golden[] = [
  {
    scopePresetId: "ROAD_SURFACING_ONLY",
    assemblyProfileId: ASPHALT_ASSEMBLY_PROFILE_BY_ROAD_SCOPE_V4.ROAD_SURFACING_ONLY,
    fixtureInput: { area_m2: 1000 },
    expectedRowCount: 54,
    expectedCorpusHash: "eh_2e7ae36a2dc63d09",
    requiredRowIds: ["base_emulsion_material", "asphalt_layer_1_material", "asphalt_layer_1_paving", "laboratory_protocol"],
    forbiddenRowIds: ["topsoil_stripping", "subgrade_excavation", "lighting_pole", "storm_pipe", "sign_warning_panel"],
    requiredCategories: ["material", "work", "labor", "machinery", "transport", "testing", "documentation"],
    priceReadiness: "PRICE_DATA_REQUIRED",
  },
  {
    scopePresetId: "FULL_PAVEMENT_STRUCTURE",
    assemblyProfileId: ASPHALT_ASSEMBLY_PROFILE_BY_ROAD_SCOPE_V4.FULL_PAVEMENT_STRUCTURE,
    fixtureInput: { area_m2: 1000 },
    expectedRowCount: 111,
    expectedCorpusHash: "eh_f83f53bf71c14ab5",
    requiredRowIds: ["topsoil_stripping", "subgrade_compaction", "crushed_layer_1_material", "asphalt_layer_2_material"],
    forbiddenRowIds: ["lighting_pole", "storm_pipe", "sign_warning_panel"],
    requiredCategories: ["material", "work", "labor", "machinery", "transport", "testing", "documentation"],
    priceReadiness: "PRICE_DATA_REQUIRED",
  },
  {
    scopePresetId: "FULL_ROAD_INFRASTRUCTURE",
    assemblyProfileId: ASPHALT_ASSEMBLY_PROFILE_BY_ROAD_SCOPE_V4.FULL_ROAD_INFRASTRUCTURE,
    fixtureInput: { area_m2: 1000 },
    expectedRowCount: 702,
    expectedCorpusHash: "eh_142d5d8ca5a613b4",
    requiredRowIds: ["subgrade_compaction", "asphalt_layer_3_material", "storm_pipe", "lighting_pole", "sign_warning_panel"],
    forbiddenRowIds: [],
    requiredCategories: ["material", "work", "labor", "machinery", "transport", "testing", "documentation", "equipment"],
    priceReadiness: "PRICE_DATA_REQUIRED",
  },
  {
    scopePresetId: "ROAD_REPAIR_REHABILITATION",
    assemblyProfileId: ASPHALT_ASSEMBLY_PROFILE_BY_ROAD_SCOPE_V4.ROAD_REPAIR_REHABILITATION,
    fixtureInput: { area_m2: 1000 },
    expectedRowCount: 59,
    expectedCorpusHash: "eh_51aa9f6236b5b379",
    requiredRowIds: ["milling", "milling_machine", "milled_material_transport", "asphalt_layer_1_material"],
    forbiddenRowIds: ["topsoil_stripping", "subgrade_excavation", "lighting_pole", "storm_pipe", "sign_warning_panel"],
    requiredCategories: ["material", "work", "labor", "machinery", "transport", "testing", "documentation"],
    priceReadiness: "PRICE_DATA_REQUIRED",
  },
] as const;
