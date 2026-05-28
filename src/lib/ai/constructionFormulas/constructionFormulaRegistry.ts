import type { GlobalUnitInput } from "../globalEstimate";
import {
  CONSTRUCTION_PRIMITIVE_DOMAINS,
  type ConstructionPrimitiveDomainNode,
} from "../constructionPrimitives";
import type { WorldConstructionDomain } from "../worldConstructionOntology";

export type ConstructionFormulaPolicy = {
  domain: WorldConstructionDomain;
  formulaCandidates: string[];
  allowedInputUnits: GlobalUnitInput["normalizedUnit"][];
  outputUnits: GlobalUnitInput["normalizedUnit"][];
};

function outputUnitsFor(domain: ConstructionPrimitiveDomainNode): GlobalUnitInput["normalizedUnit"][] {
  if (domain.domain === "hydropower") return ["set", "pcs", "kg", "linear_m"];
  if (domain.domain === "foundations" || domain.domain === "concrete") return ["m3", "kg", "set"];
  if (domain.domain === "well_drilling") return ["linear_m", "pcs", "set"];
  if (domain.domain === "roofing") return ["sq_m", "linear_m", "pcs", "kg", "set"];
  if (domain.domain === "roadworks" || domain.domain === "landscaping") return ["sq_m", "m3", "linear_m", "ton", "set"];
  if (domain.domain === "steel_structures") return ["kg", "ton", "pcs", "set"];
  return [...new Set<GlobalUnitInput["normalizedUnit"]>([...domain.units, "pcs", "set"])];
}

export const CONSTRUCTION_FORMULA_REGISTRY: readonly ConstructionFormulaPolicy[] =
  CONSTRUCTION_PRIMITIVE_DOMAINS.map((domain) => ({
    domain: domain.domain,
    formulaCandidates: domain.formulaCandidates,
    allowedInputUnits: domain.units,
    outputUnits: outputUnitsFor(domain),
  }));

export function getConstructionFormulaPolicy(domain: WorldConstructionDomain): ConstructionFormulaPolicy {
  return CONSTRUCTION_FORMULA_REGISTRY.find((item) => item.domain === domain) ?? CONSTRUCTION_FORMULA_REGISTRY[0];
}
