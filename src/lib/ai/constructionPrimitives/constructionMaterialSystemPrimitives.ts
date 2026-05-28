import {
  CONSTRUCTION_MATERIAL_SYSTEMS,
  type WorldConstructionMaterialSystem,
  type WorldConstructionDomain,
} from "../worldConstructionOntology";
import type { ConstructionPrimitiveMaterialSystemNode } from "./constructionPrimitiveTypes";
import { CONSTRUCTION_PRIMITIVE_DOMAINS } from "./constructionDomainPrimitives";

function uniq<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

const fallbackSystem: WorldConstructionMaterialSystem = {
  key: "industrial_equipment",
  labelRu: "industrial equipment",
  materialKeys: ["equipment", "controls", "cable", "mounting"],
  catalogPolicy: "candidate_or_gap_warning",
};

const systems = new Map<string, WorldConstructionMaterialSystem>();
for (const item of CONSTRUCTION_MATERIAL_SYSTEMS) systems.set(item.key, item);
systems.set(fallbackSystem.key, systems.get(fallbackSystem.key) ?? fallbackSystem);

export const CONSTRUCTION_MATERIAL_SYSTEM_PRIMITIVES: readonly ConstructionPrimitiveMaterialSystemNode[] =
  [...systems.values()].map((system) => ({
    ...system,
    domains: uniq(
      CONSTRUCTION_PRIMITIVE_DOMAINS
        .filter((domain) => domain.materialSystems.includes(system.key))
        .map((domain) => domain.domain as WorldConstructionDomain),
    ),
  }));

export function getConstructionMaterialSystemPrimitive(key: string): ConstructionPrimitiveMaterialSystemNode {
  return CONSTRUCTION_MATERIAL_SYSTEM_PRIMITIVES.find((item) => item.key === key) ??
    CONSTRUCTION_MATERIAL_SYSTEM_PRIMITIVES.find((item) => item.key === "general_building") ??
    CONSTRUCTION_MATERIAL_SYSTEM_PRIMITIVES[0];
}
