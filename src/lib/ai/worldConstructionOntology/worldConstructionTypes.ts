import type {
  GlobalEstimateConfidence,
  GlobalEstimateInput,
  GlobalEstimateResult,
  GlobalEstimateSectionType,
  GlobalUnitInput,
  GlobalWorkCategory,
} from "../globalEstimate";

export type WorldConstructionOutcome =
  | "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE"
  | "AMBIGUOUS_NEEDS_DISAMBIGUATION"
  | "TEMPLATE_GAP_SAFE_TRIAGE"
  | "DANGEROUS_REGULATED_SAFE_ESTIMATE";

export type WorldConstructionComplexity = "simple" | "medium" | "complex" | "infrastructure";

export type WorldConstructionDomain =
  | "residential_construction"
  | "commercial_construction"
  | "industrial_construction"
  | "civil_infrastructure"
  | "roadworks"
  | "earthworks"
  | "foundations"
  | "concrete"
  | "masonry"
  | "steel_structures"
  | "wood_structures"
  | "roofing"
  | "waterproofing"
  | "facade"
  | "insulation"
  | "windows"
  | "doors"
  | "flooring"
  | "walls"
  | "ceilings"
  | "drywall"
  | "painting"
  | "tiling"
  | "plumbing"
  | "heating"
  | "ventilation"
  | "air_conditioning"
  | "electrical"
  | "low_voltage"
  | "fire_alarm"
  | "security_systems"
  | "solar"
  | "hydropower"
  | "water_supply"
  | "sewerage"
  | "drainage"
  | "landscaping"
  | "fencing"
  | "demolition"
  | "site_preparation"
  | "well_drilling"
  | "commercial_fit_out"
  | "industrial_fit_out"
  | "renovation"
  | "restoration"
  | "structural_repair"
  | "unknown";

export type WorldConstructionObjectScope =
  | "roof"
  | "bathroom"
  | "foundation"
  | "basement"
  | "balcony_terrace"
  | "wall"
  | "floor"
  | "ceiling"
  | "window_opening"
  | "door_opening"
  | "road_area"
  | "hydropower_unit"
  | "well"
  | "solar_array"
  | "ventilation_network"
  | "electrical_network"
  | "masonry_wall"
  | "strip_foundation"
  | "site"
  | "unknown";

export type WorldConstructionOperation =
  | "installation"
  | "replacement"
  | "repair"
  | "waterproofing"
  | "masonry"
  | "paving"
  | "drilling"
  | "demolition"
  | "painting"
  | "tiling"
  | "concrete_pour"
  | "preparation"
  | "commissioning"
  | "design_survey"
  | "unknown";

export type WorldConstructionMethod =
  | "roll_membrane"
  | "pvc_tpo_epdm_membrane"
  | "bitumen_mastic"
  | "laminate_floating"
  | "brick_mortar_masonry"
  | "gable_roof_frame"
  | "drywall_metal_frame"
  | "asphalt_hot_mix"
  | "hydro_turbine_equipment_install"
  | "rotary_well_drilling"
  | "duct_ventilation"
  | "solar_mounting"
  | "electrical_cable_install"
  | "generic_professional_method";

export type WorldConstructionMaterialSystem = {
  key: string;
  labelRu: string;
  materialKeys: string[];
  catalogPolicy: "bind_required" | "candidate_or_gap_warning" | "not_material";
};

export type WorldConstructionDomainDefinition = {
  domain: WorldConstructionDomain;
  globalCategory: GlobalWorkCategory;
  labelRu: string;
  objects: WorldConstructionObjectScope[];
  operations: WorldConstructionOperation[];
  methods: WorldConstructionMethod[];
  materialSystems: string[];
  units: GlobalUnitInput["normalizedUnit"][];
  requiredBoqGroups: GlobalEstimateSectionType[];
  equipment: string[];
  laborTypes: string[];
  exclusions: string[];
  clarifyingQuestions: string[];
  dangerousOrRegulated: boolean;
  catalogPolicy: "bind_materials" | "gap_warning_allowed";
  rateSourcePolicy: "source_required" | "manual_review_required";
};

export type WorldConstructionPrimitive = {
  originalText: string;
  normalizedText: string;
  intentDetected: boolean;
  outcome: WorldConstructionOutcome;
  domain: WorldConstructionDomain;
  secondaryDomains: WorldConstructionDomain[];
  objectScope: WorldConstructionObjectScope;
  operation: WorldConstructionOperation;
  method: WorldConstructionMethod;
  materialSystem: WorldConstructionMaterialSystem;
  unit: GlobalUnitInput["normalizedUnit"];
  volume: number;
  workKey: string | null;
  workFamily: string;
  titleRu: string;
  complexity: WorldConstructionComplexity;
  riskClass: "normal" | "safety_sensitive" | "regulated";
  confidence: GlobalEstimateConfidence;
  assumptions: string[];
  exclusions: string[];
  costIncreaseFactors: string[];
  clarifyingQuestions: string[];
  disambiguationOptions: string[];
  localWarnings: string[];
};

export type WorldConstructionInterpretation = {
  primitive: WorldConstructionPrimitive;
  classification:
    | "EXPANDED_LOCAL_PROFESSIONAL_ESTIMATE_OK"
    | "AMBIGUOUS_NEEDS_DISAMBIGUATION"
    | "UNKNOWN_TEMPLATE_GAP_SAFE_TRIAGE"
    | "DANGEROUS_REGULATED_SAFE_ESTIMATE"
    | "UNKNOWN_NEEDS_TRACE";
  shouldCallGlobalEstimate: boolean;
  shouldAskClarifyingQuestion: boolean;
  shouldReturnTemplateGap: boolean;
};

export type WorldConstructionEstimateEngineInput = GlobalEstimateInput & {
  text: string;
};

export type WorldConstructionEstimateEngineResult = {
  interpretation: WorldConstructionInterpretation;
  estimate: GlobalEstimateResult | null;
  safeMessageRu: string;
  catalogBindingApplied: boolean;
  sourceEvidencePresent: boolean;
  taxWarningPresent: boolean;
};
