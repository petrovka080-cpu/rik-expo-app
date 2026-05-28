import type {
  GlobalEstimateSectionType,
} from "../globalEstimate";
import type {
  WorldConstructionDomain,
  WorldConstructionOperation,
} from "../worldConstructionOntology";
import type { ConstructionPrimitiveOperationNode } from "./constructionPrimitiveTypes";
import { CONSTRUCTION_PRIMITIVE_DOMAINS } from "./constructionDomainPrimitives";

function uniq<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

const operations = new Map<WorldConstructionOperation, {
  domains: WorldConstructionDomain[];
  requiredBoqGroups: GlobalEstimateSectionType[];
}>();

for (const domain of CONSTRUCTION_PRIMITIVE_DOMAINS) {
  for (const operation of domain.operations) {
    const current = operations.get(operation) ?? { domains: [], requiredBoqGroups: [] };
    current.domains.push(domain.domain);
    current.requiredBoqGroups.push(...domain.requiredBoqGroups);
    operations.set(operation, current);
  }
}

export const CONSTRUCTION_OPERATION_PRIMITIVES: readonly ConstructionPrimitiveOperationNode[] =
  [...operations.entries()].map(([operation, value]) => ({
    operation,
    domains: uniq(value.domains),
    requiredBoqGroups: uniq(value.requiredBoqGroups),
  }));
