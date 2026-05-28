import type { GlobalUnitInput } from "../globalEstimate";
import {
  CONSTRUCTION_DOMAIN_MAP,
  type WorldConstructionComplexity,
  type WorldConstructionDomain,
} from "../worldConstructionOntology";
import type { ConstructionPrimitiveDomainNode } from "./constructionPrimitiveTypes";

const complexityByDomain = new Map<WorldConstructionDomain, WorldConstructionComplexity>(
  CONSTRUCTION_DOMAIN_MAP.map((definition) => [
    definition.domain,
    definition.dangerousOrRegulated || definition.domain === "hydropower" ? "infrastructure" :
      definition.requiredBoqGroups.length >= 4 ? "complex" :
        definition.requiredBoqGroups.length >= 3 ? "medium" :
          "simple",
  ]),
);

function defaultFormulaCandidates(input: {
  domain: WorldConstructionDomain;
  units: readonly GlobalUnitInput["normalizedUnit"][];
}): string[] {
  if (input.domain === "hydropower") return ["hydropower_set_equipment", "commissioning_set"];
  if (input.domain === "foundations" || input.domain === "concrete") return ["volume_m3", "linear_length_volume"];
  if (input.domain === "well_drilling") return ["linear_depth"];
  if (input.domain === "roofing") return ["roof_area", "gable_roof_area"];
  if (input.domain === "roadworks" || input.domain === "landscaping") return ["surface_area", "layered_base_volume"];
  if (input.units.includes("sq_m")) return ["surface_area"];
  if (input.units.includes("linear_m")) return ["linear_length"];
  if (input.units.includes("pcs")) return ["count"];
  return ["set_scope"];
}

export const CONSTRUCTION_PRIMITIVE_DOMAINS: readonly ConstructionPrimitiveDomainNode[] =
  CONSTRUCTION_DOMAIN_MAP.map((definition) => ({
    ...definition,
    formulaCandidates: defaultFormulaCandidates({
      domain: definition.domain,
      units: definition.units,
    }),
  }));

export function getConstructionPrimitiveDomain(
  domain: WorldConstructionDomain,
): ConstructionPrimitiveDomainNode {
  return CONSTRUCTION_PRIMITIVE_DOMAINS.find((item) => item.domain === domain) ?? CONSTRUCTION_PRIMITIVE_DOMAINS[0];
}

export function complexityForConstructionPrimitiveDomain(domain: WorldConstructionDomain): WorldConstructionComplexity {
  return complexityByDomain.get(domain) ?? "medium";
}
