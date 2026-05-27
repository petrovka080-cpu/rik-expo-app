import {
  CONSTRUCTION_METHOD_RULES,
  type WorldConstructionDomain,
  type WorldConstructionMethod,
  type WorldConstructionObjectScope,
  type WorldConstructionOperation,
} from "../worldConstructionOntology";
import { normalizeConstructionPrompt } from "./normalizeConstructionPrompt";

export function resolveConstructionMethod(input: {
  text: string;
  domain: WorldConstructionDomain;
  objectScope: WorldConstructionObjectScope;
  operation: WorldConstructionOperation;
}): WorldConstructionMethod {
  const normalized = normalizeConstructionPrompt(input.text);
  const explicit = CONSTRUCTION_METHOD_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(normalizeConstructionPrompt(keyword))),
  );
  if (explicit) return explicit.method;
  if (input.domain === "hydropower") return "hydro_turbine_equipment_install";
  if (input.domain === "roadworks") return "asphalt_hot_mix";
  if (input.domain === "masonry") return "brick_mortar_masonry";
  if (input.domain === "drywall") return "drywall_metal_frame";
  if (input.domain === "flooring") return "laminate_floating";
  if (input.domain === "well_drilling") return "rotary_well_drilling";
  if (input.domain === "ventilation") return "duct_ventilation";
  if (input.domain === "solar") return "solar_mounting";
  if (input.domain === "electrical") return "electrical_cable_install";
  if (input.operation === "waterproofing" && input.objectScope === "roof") return "roll_membrane";
  return "generic_professional_method";
}
