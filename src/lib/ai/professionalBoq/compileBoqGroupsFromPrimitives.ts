import type { GlobalEstimateSectionType } from "../globalEstimate";
import { getConstructionPrimitiveDomain } from "../constructionPrimitives";
import type { WorldConstructionPrimitive } from "../worldConstructionOntology";

export function compileBoqGroupsFromPrimitives(
  primitive: WorldConstructionPrimitive,
): GlobalEstimateSectionType[] {
  const domain = getConstructionPrimitiveDomain(primitive.domain);
  return [...new Set(domain.requiredBoqGroups)];
}
