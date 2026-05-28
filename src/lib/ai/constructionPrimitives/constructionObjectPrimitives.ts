import type { GlobalUnitInput } from "../globalEstimate";
import type {
  WorldConstructionDomain,
  WorldConstructionObjectScope,
  WorldConstructionOperation,
} from "../worldConstructionOntology";
import type { ConstructionPrimitiveObjectNode } from "./constructionPrimitiveTypes";
import { CONSTRUCTION_PRIMITIVE_DOMAINS } from "./constructionDomainPrimitives";

function uniq<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

const objects = new Map<WorldConstructionObjectScope, {
  domains: WorldConstructionDomain[];
  operations: WorldConstructionOperation[];
  defaultUnits: GlobalUnitInput["normalizedUnit"][];
}>();

for (const domain of CONSTRUCTION_PRIMITIVE_DOMAINS) {
  for (const object of domain.objects) {
    const current = objects.get(object) ?? { domains: [], operations: [], defaultUnits: [] };
    current.domains.push(domain.domain);
    current.operations.push(...domain.operations);
    current.defaultUnits.push(...domain.units);
    objects.set(object, current);
  }
}

export const CONSTRUCTION_OBJECT_PRIMITIVES: readonly ConstructionPrimitiveObjectNode[] =
  [...objects.entries()].map(([object, value]) => ({
    object,
    domains: uniq(value.domains),
    operations: uniq(value.operations),
    defaultUnits: uniq(value.defaultUnits),
  }));
