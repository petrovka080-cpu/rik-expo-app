import type {
  ConstructionDomain,
  ConstructionMethod,
  ConstructionObject,
  ConstructionOperation,
} from "./constructionSemanticTypes";

export function resolveConstructionMethod(input: {
  domain?: ConstructionDomain;
  object?: ConstructionObject;
  operation?: ConstructionOperation;
}): ConstructionMethod {
  if (input.object === "linoleum_floor") return "adhesive_flooring";
  if (input.object === "paving_stone_surface") return "layered_paving_base";
  if (input.object === "metal_canopy") return "welded_metal_frame";
  if (input.object === "gable_roof") return "pitched_roof_system";
  if (input.object === "roof") return "roof_membrane_or_mastic";
  if (input.object === "bathroom") return "wet_area_waterproofing";
  if (input.object === "apartment") return "full_apartment_renovation";
  if (input.object === "brick_wall") return "masonry_mortar";
  if (input.object === "tile_surface") return "tile_adhesive";
  return "unknown";
}
