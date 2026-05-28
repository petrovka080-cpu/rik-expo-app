import type { GlobalUnitInput } from "../globalEstimate";
import type {
  WorldConstructionDomain,
  WorldConstructionMethod,
} from "../worldConstructionOntology";
import type { ConstructionPrimitiveMethodNode } from "./constructionPrimitiveTypes";
import { CONSTRUCTION_PRIMITIVE_DOMAINS } from "./constructionDomainPrimitives";

function uniq<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function formulaPolicyFor(method: WorldConstructionMethod): string[] {
  if (method === "hydro_turbine_equipment_install") return ["hydropower_set_equipment", "commissioning_set"];
  if (method === "gable_roof_frame") return ["gable_roof_area", "roof_pitch_factor"];
  if (method === "asphalt_hot_mix") return ["surface_area", "layered_base_volume", "tonnage"];
  if (method === "rotary_well_drilling") return ["linear_depth"];
  if (method === "brick_mortar_masonry") return ["wall_area", "masonry_volume"];
  if (method === "duct_ventilation") return ["duct_network_area", "equipment_count"];
  if (method === "electrical_cable_install") return ["point_count", "cable_length"];
  return ["surface_area", "set_scope"];
}

const methods = new Map<WorldConstructionMethod, {
  domains: WorldConstructionDomain[];
  unitPolicy: GlobalUnitInput["normalizedUnit"][];
}>();

for (const domain of CONSTRUCTION_PRIMITIVE_DOMAINS) {
  for (const method of domain.methods) {
    const current = methods.get(method) ?? { domains: [], unitPolicy: [] };
    current.domains.push(domain.domain);
    current.unitPolicy.push(...domain.units);
    methods.set(method, current);
  }
}

export const CONSTRUCTION_METHOD_PRIMITIVES: readonly ConstructionPrimitiveMethodNode[] =
  [...methods.entries()].map(([method, value]) => ({
    method,
    domains: uniq(value.domains),
    unitPolicy: uniq(value.unitPolicy),
    formulaPolicy: formulaPolicyFor(method),
  }));
