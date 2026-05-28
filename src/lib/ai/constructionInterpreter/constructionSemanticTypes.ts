import type { GlobalEstimateConfidence, GlobalWorkCategory } from "../globalEstimate/globalEstimateTypes";

export type ConstructionDomain =
  | "flooring"
  | "paving"
  | "masonry"
  | "metalworks"
  | "roofing"
  | "waterproofing"
  | "renovation"
  | "tile"
  | "unknown";

export type ConstructionObject =
  | "linoleum_floor"
  | "paving_stone_surface"
  | "brick_wall"
  | "metal_canopy"
  | "gable_roof"
  | "roof"
  | "bathroom"
  | "apartment"
  | "tile_surface"
  | "unknown";

export type ConstructionOperation =
  | "laying"
  | "masonry"
  | "installation"
  | "waterproofing"
  | "capital_renovation"
  | "repair"
  | "preparation"
  | "unknown";

export type ConstructionMethod =
  | "adhesive_flooring"
  | "layered_paving_base"
  | "welded_metal_frame"
  | "pitched_roof_system"
  | "roof_membrane_or_mastic"
  | "wet_area_waterproofing"
  | "full_apartment_renovation"
  | "masonry_mortar"
  | "tile_adhesive"
  | "unknown";

export type ConstructionComplexity = "simple" | "medium" | "complex" | "infrastructure";

export type ConstructionWorkKey =
  | "linoleum_laying"
  | "paving_stone_laying"
  | "brick_masonry"
  | "metal_canopy_installation"
  | "apartment_capital_renovation"
  | "gable_roof_installation"
  | "roof_waterproofing"
  | "bathroom_waterproofing"
  | "tile_laying";

export type ConstructionQuantity = {
  volume: number;
  unit: string;
  formulaId: string;
  inputVolume?: number;
  inputUnit?: string;
  dimensions?: {
    areaSqM?: number;
    baseAreaSqM?: number;
    ridgeHeightM?: number;
    roofAreaSqM?: number;
  };
};

export type ConstructionWorkPlan = {
  originalText: string;
  normalizedText: string;
  estimateIntentDetected: boolean;
  workKey: ConstructionWorkKey;
  workFamily: GlobalWorkCategory;
  domain: ConstructionDomain;
  object: ConstructionObject;
  operation: ConstructionOperation;
  method: ConstructionMethod;
  complexity: ConstructionComplexity;
  titleRu: string;
  quantity: ConstructionQuantity;
  formulaId: string;
  templateId: string;
  confidence: GlobalEstimateConfidence;
};

export type ConstructionWorkPlanValidation = {
  passed: boolean;
  failures: string[];
};
