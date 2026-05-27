import { CONSTRUCTION_DOMAIN_MAP } from "./constructionDomainMap";
import { CONSTRUCTION_MATERIAL_SYSTEMS } from "./constructionMaterialSystemMap";
import type { WorldConstructionDomainDefinition } from "./worldConstructionTypes";

export type WorldConstructionOntologyValidation = {
  passed: boolean;
  failures: string[];
  domains: number;
  materialSystems: number;
};

export function validateWorldConstructionOntology(
  domains: readonly WorldConstructionDomainDefinition[] = CONSTRUCTION_DOMAIN_MAP,
): WorldConstructionOntologyValidation {
  const failures: string[] = [];
  for (const definition of domains) {
    if (definition.objects.length === 0) failures.push(`${definition.domain}:objects_missing`);
    if (definition.operations.length === 0) failures.push(`${definition.domain}:operations_missing`);
    if (definition.methods.length === 0) failures.push(`${definition.domain}:methods_missing`);
    if (definition.materialSystems.length === 0) failures.push(`${definition.domain}:material_systems_missing`);
    if (definition.units.length === 0) failures.push(`${definition.domain}:units_missing`);
    if (definition.requiredBoqGroups.length === 0) failures.push(`${definition.domain}:boq_groups_missing`);
    for (const key of definition.materialSystems) {
      if (!CONSTRUCTION_MATERIAL_SYSTEMS.some((system) => system.key === key)) {
        failures.push(`${definition.domain}:unknown_material_system:${key}`);
      }
    }
  }
  return {
    passed: failures.length === 0,
    failures,
    domains: domains.length,
    materialSystems: CONSTRUCTION_MATERIAL_SYSTEMS.length,
  };
}
