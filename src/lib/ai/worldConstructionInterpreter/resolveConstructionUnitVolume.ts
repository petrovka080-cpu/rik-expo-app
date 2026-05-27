import { defaultConstructionUnit, parseConstructionVolume } from "../worldConstructionOntology";
import type { WorldConstructionObjectScope, WorldConstructionOperation } from "../worldConstructionOntology";

export function resolveConstructionUnitVolume(input: {
  text: string;
  objectScope: WorldConstructionObjectScope;
  operation: WorldConstructionOperation;
}): ReturnType<typeof parseConstructionVolume> {
  const fallbackUnit = defaultConstructionUnit(input);
  return parseConstructionVolume(input.text, fallbackUnit);
}
